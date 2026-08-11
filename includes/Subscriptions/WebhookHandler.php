<?php
/**
 * Inbound Stripe/PayPal webhook idempotency + event mapping.
 *
 * @package PureCart\Subscriptions
 */

declare( strict_types=1 );

namespace PureCart\Subscriptions;

defined( 'ABSPATH' ) || exit;

/**
 * Feature doc § 11 event tables (Stripe + PayPal), mapped onto this module's
 * existing lifecycle methods rather than reimplementing status transitions —
 * a webhook-reported failure fires the exact same `purecart_subscription_payment_failed`
 * action a self-initiated renewal failure does, so DunningManager reacts
 * identically either way.
 *
 * Entry point is per-subscription (`POST /subscriptions/{id}/webhook-event`,
 * RestController) rather than one global receiver trying to parse an opaque
 * Stripe/PayPal payload and match it to a subscription — the subscription ID
 * is already in the URL. Matches subscription-final-dev-plan.md § 6's actual
 * documented endpoint. A single global multi-tenant webhook receiver that
 * identifies the subscription from `gateway_subscription_id` is real
 * gateway-integration work with no gateway wired up yet to build it against.
 *
 * Signature scheme reuses the convention this codebase already established
 * in PureCart\SaaS\AccountProvisioner::send_webhook() — HMAC-SHA256 over the
 * raw body, `X-PureCart-Sig` header, `purecart_webhook_secret` option — rather
 * than inventing a second one.
 *
 * @since 1.0.0
 */
class WebhookHandler {

	/** @var SubscriptionRepository */
	private SubscriptionRepository $subscriptions;

	/** @var SubscriptionLogRepository */
	private SubscriptionLogRepository $logs;

	/** @var PaymentRepository */
	private PaymentRepository $payments;

	/** @var RenewalEngine */
	private RenewalEngine $renewal_engine;

	/**
	 * @since 1.0.0
	 * @param RenewalEngine $renewal_engine Shared instance from Module.
	 */
	public function __construct( RenewalEngine $renewal_engine ) {
		$this->subscriptions  = new SubscriptionRepository();
		$this->logs           = new SubscriptionLogRepository();
		$this->payments       = new PaymentRepository();
		$this->renewal_engine = $renewal_engine;
	}

	/**
	 * Verify the request signature. Called by RestController before this
	 * class ever sees the payload.
	 *
	 * @since 1.0.0
	 * @param string $raw_body  Raw request body.
	 * @param string $signature Value of the `X-PureCart-Sig` header.
	 * @return bool
	 */
	public function verify_signature( string $raw_body, string $signature ): bool {
		$secret = (string) get_option( 'purecart_webhook_secret', '' );

		if ( '' === $secret || '' === $signature ) {
			return false;
		}

		$expected = hash_hmac( 'sha256', $raw_body, $secret );

		return hash_equals( $expected, $signature );
	}

	/**
	 * Process one webhook event for a specific subscription. Assumes the
	 * signature has already been verified by the caller.
	 *
	 * @since 1.0.0
	 * @param int                  $subscription_id Subscription row ID.
	 * @param array<string, mixed> $payload         Decoded JSON payload.
	 * @return array{status: string}|\WP_Error
	 */
	public function handle( int $subscription_id, array $payload ) {
		if ( ! $this->subscriptions->find( $subscription_id ) ) {
			return new \WP_Error( 'purecart_not_found', __( 'Subscription not found.', 'purecart' ), array( 'status' => 404 ) );
		}

		$event_id   = sanitize_text_field( (string) ( $payload['event_id'] ?? $payload['id'] ?? '' ) );
		$event_type = sanitize_text_field( (string) ( $payload['type'] ?? $payload['event_type'] ?? '' ) );

		if ( '' === $event_id || '' === $event_type ) {
			return new \WP_Error( 'purecart_invalid_event', __( 'Missing event id/type.', 'purecart' ), array( 'status' => 400 ) );
		}

		// Fast-path idempotency check against the log (cheap, avoids re-dispatching
		// for an event we've already seen). The *real* backstop for the
		// charge-succeeded path specifically is PaymentRepository's
		// `uniq_transaction` unique key (§ 5) — this check is a courtesy that
		// also covers event types that never touch the payments table at all
		// (cancellations, disputes, ...).
		if ( $this->already_processed( $subscription_id, $event_id ) ) {
			return array( 'status' => 'already_processed' );
		}

		$handled = $this->dispatch( $subscription_id, $event_type, $payload );

		$this->logs->log(
			$subscription_id,
			'webhook_event_processed',
			array( 'note' => "event_id={$event_id}, type={$event_type}, handled=" . ( $handled ? 'yes' : 'no' ) )
		);

		return array( 'status' => $handled ? 'processed' : 'ignored' );
	}

	/**
	 * @since 1.0.0
	 * @param int    $subscription_id Subscription row ID.
	 * @param string $event_id        Gateway event ID.
	 * @return bool
	 */
	private function already_processed( int $subscription_id, string $event_id ): bool {
		foreach ( $this->logs->find_by_subscription( $subscription_id ) as $log ) {
			if ( 'webhook_event_processed' === $log->event && false !== stripos( (string) $log->note, "event_id={$event_id}," ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Map a Stripe/PayPal event type to this module's own lifecycle methods.
	 *
	 * @since 1.0.0
	 * @param int                  $subscription_id Subscription row ID.
	 * @param string               $event_type      Gateway event type string.
	 * @param array<string, mixed> $payload         Decoded payload.
	 * @return bool Whether the event type was recognized and handled.
	 */
	private function dispatch( int $subscription_id, string $event_type, array $payload ): bool {
		switch ( $event_type ) {
			case 'charge.succeeded':
			case 'PAYMENT.SALE.COMPLETED':
				$this->renewal_engine->record_external_renewal(
					$subscription_id,
					array(
						'transaction_id' => sanitize_text_field( (string) ( $payload['transaction_id'] ?? $payload['id'] ?? '' ) ),
						'amount'         => isset( $payload['amount'] ) ? (float) $payload['amount'] : null,
					)
				);
				return true;

			case 'charge.failed':
			case 'payment_intent.payment_failed':
			case 'PAYMENT.SALE.DENIED':
			case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED':
				$this->mark_past_due( $subscription_id, $payload );
				return true;

			case 'invoice.payment_action_required':
				$this->request_reauth( $subscription_id );
				return true;

			case 'customer.subscription.deleted':
			case 'BILLING.SUBSCRIPTION.CANCELLED':
				( new SubscriptionManager() )->cancel( $subscription_id, true, 'gateway_cancelled' );
				return true;

			case 'BILLING.SUBSCRIPTION.SUSPENDED':
				$this->suspend( $subscription_id );
				return true;

			case 'PAYMENT.SALE.REFUNDED':
				$this->handle_refund( $payload );
				return true;

			case 'charge.dispute.created':
				$this->flag_dispute( $subscription_id, $payload );
				return true;

			case 'customer.updated':
				if ( ! empty( $payload['payment_token_id'] ) ) {
					$this->subscriptions->update( $subscription_id, array( 'payment_token_id' => absint( $payload['payment_token_id'] ) ) );
				}
				return true;

			default:
				return false;
		}
	}

	/**
	 * @since 1.0.0
	 * @param int                  $subscription_id Subscription row ID.
	 * @param array<string, mixed> $payload         Decoded payload.
	 * @return void
	 */
	private function mark_past_due( int $subscription_id, array $payload ): void {
		$subscription = $this->subscriptions->find( $subscription_id );
		if ( ! $subscription || in_array( $subscription->status, array( 'suspended', 'cancelled', 'completed' ), true ) ) {
			return;
		}

		$reason = sanitize_text_field( (string) ( $payload['decline_reason'] ?? $payload['failure_reason'] ?? 'gateway_declined' ) );

		$this->subscriptions->update(
			$subscription_id,
			array(
				'status'      => 'past_due',
				'retry_count' => (int) $subscription->retry_count + 1,
			)
		);

		$this->logs->log(
			$subscription_id,
			'payment_failed',
			array(
				'old_status' => $subscription->status,
				'new_status' => 'past_due',
				'note'       => $reason,
			)
		);

		// Reuses DunningManager's existing listener on this exact action (Step 7) —
		// a webhook-reported failure schedules retries the same way a
		// self-initiated one does, no separate dunning path needed.
		do_action( 'purecart_subscription_payment_failed', $subscription_id, 0, $reason );
	}

	/**
	 * @since 1.0.0
	 * @param int $subscription_id Subscription row ID.
	 * @return void
	 */
	private function request_reauth( int $subscription_id ): void {
		$subscription = $this->subscriptions->find( $subscription_id );
		if ( ! $subscription || in_array( $subscription->status, array( 'suspended', 'cancelled', 'completed' ), true ) ) {
			return;
		}

		$this->subscriptions->update( $subscription_id, array( 'status' => 'pending_reauth' ) );

		$this->logs->log(
			$subscription_id,
			'reauth_required',
			array( 'old_status' => $subscription->status, 'new_status' => 'pending_reauth' )
		);

		do_action( 'purecart_subscription_status_changed', $subscription_id, $subscription->status, 'pending_reauth' );

		// Full SCA/3DS reauthorization (feature doc § 10) — the signed
		// one-time payment link + "confirm your payment" email — isn't built
		// anywhere in this module yet (no step covers it explicitly). The
		// status transition alone is wired here so it's at least visible/
		// filterable; a real reauth flow is future work, not silently faked.
		do_action( 'purecart_subscription_reauth_required', $subscription_id );
	}

	/**
	 * @since 1.0.0
	 * @param int $subscription_id Subscription row ID.
	 * @return void
	 */
	private function suspend( int $subscription_id ): void {
		$subscription = $this->subscriptions->find( $subscription_id );
		if ( ! $subscription || in_array( $subscription->status, array( 'suspended', 'cancelled', 'completed' ), true ) ) {
			return;
		}

		$this->subscriptions->update(
			$subscription_id,
			array(
				'status'       => 'suspended',
				'suspended_at' => current_time( 'mysql' ),
			)
		);

		DeliveryManager::deactivate( (array) $subscription, DeliveryManager::REASON_SUSPENDED );

		$this->logs->log(
			$subscription_id,
			'suspended',
			array( 'old_status' => $subscription->status, 'new_status' => 'suspended', 'note' => 'gateway-reported suspension' )
		);

		do_action( 'purecart_subscription_status_changed', $subscription_id, $subscription->status, 'suspended' );
	}

	/**
	 * feature doc § 21 (Refund Policy) — records the refund against the
	 * payment ledger. Deliberately does not auto-cancel the subscription:
	 * the doc itself says a renewal-specific refund is "admin's discretion".
	 *
	 * @since 1.0.0
	 * @param array<string, mixed> $payload Decoded payload.
	 * @return void
	 */
	private function handle_refund( array $payload ): void {
		$transaction_id = sanitize_text_field( (string) ( $payload['transaction_id'] ?? '' ) );
		if ( '' === $transaction_id ) {
			return;
		}

		$payment = $this->payments->find_by_transaction( $transaction_id );
		if ( ! $payment ) {
			return;
		}

		$refund_amount = isset( $payload['amount'] ) ? (float) $payload['amount'] : (float) $payment->amount;

		$this->payments->mark_refunded( (int) $payment->id, $refund_amount, sanitize_text_field( (string) ( $payload['reason'] ?? '' ) ) );

		$this->logs->log(
			(int) $payment->subscription_id,
			'payment_refunded',
			array( 'amount' => $refund_amount, 'order_id' => $payment->order_id, 'note' => "transaction_id={$transaction_id}" )
		);

		do_action( 'purecart_subscription_payment_refunded', (int) $payment->subscription_id, $refund_amount );
	}

	/**
	 * Checklist: "charge.dispute.created flags the subscription without
	 * crashing the handler." No dedicated "disputed" status/column exists —
	 * no admin workflow around disputes is specified anywhere in the source
	 * docs to build schema against yet. Flags via churn score (straight into
	 * the critical band) + a clearly-tagged, searchable log entry instead of
	 * inventing unspecified schema.
	 *
	 * @since 1.0.0
	 * @param int                  $subscription_id Subscription row ID.
	 * @param array<string, mixed> $payload         Decoded payload.
	 * @return void
	 */
	private function flag_dispute( int $subscription_id, array $payload ): void {
		$this->subscriptions->update( $subscription_id, array( 'churn_risk_score' => 100 ) );

		$this->logs->log(
			$subscription_id,
			'charge_disputed',
			array( 'note' => 'Gateway reported a chargeback/dispute — review immediately.' )
		);

		do_action( 'purecart_subscription_disputed', $subscription_id, $payload );
	}
}
