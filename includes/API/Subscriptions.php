<?php
/**
 * REST API routes for the Subscriptions module.
 *
 * @package PureCart\Api
 */

declare( strict_types=1 );

namespace PureCart\API;

use PureCart\Subscriptions\SubscriptionRepository;
use PureCart\Subscriptions\SubscriptionLogRepository;
use PureCart\Subscriptions\SubscriptionManager;
use PureCart\Subscriptions\SubscriptionReport;
use PureCart\Subscriptions\RetentionFlow;
use PureCart\Subscriptions\RenewalEngine;
use PureCart\Subscriptions\DunningManager;
use PureCart\Subscriptions\PlanUpgrade;
use PureCart\Subscriptions\WebhookHandler;
use PureCart\Subscriptions\ChurnScorer;

defined( 'ABSPATH' ) || exit;

/**
 * Registers its own routes on `rest_api_init` via PureCartApi::register(),
 * called explicitly from Subscriptions\Module rather than auto-wired in the
 * constructor — same explicit-call pattern as PureCartStore::create().
 *
 * Scope: implements REST endpoints for functionality that actually exists
 * (Steps 1-11). Deliberately NOT registered, because the underlying feature
 * doesn't exist yet in this module:
 *   - request-reauth (no SCA/3DS flow built anywhere — WebhookHandler already
 *     handles the *inbound* invoice.payment_action_required case, but there's
 *     no outbound "send a reauth email" to trigger, since Step 13 emails
 *     don't exist)
 *   - usage (feature doc § 13, explicitly Phase 2)
 *   - revenue-goals CRUD, report/summary, report/export (Step 15 — SubscriptionReport)
 *   - membership/downloads/courses/service-specific endpoints (Step 14/16 —
 *     those delivery handlers are still Step 3's stubs)
 *
 * @since 1.0.0
 */
class Subscriptions extends PureCartApi {

	/** @var SubscriptionRepository */
	private SubscriptionRepository $subscriptions;

	/** @var SubscriptionLogRepository */
	private SubscriptionLogRepository $logs;

	/** @var SubscriptionManager */
	private SubscriptionManager $manager;

	/** @var RetentionFlow */
	private RetentionFlow $retention;

	/** @var RenewalEngine */
	private RenewalEngine $renewal_engine;

	/** @var DunningManager */
	private DunningManager $dunning;

	/** @var PlanUpgrade */
	private PlanUpgrade $plan_upgrade;

	/** @var WebhookHandler */
	private WebhookHandler $webhooks;

	/** @var SubscriptionReport */
	private SubscriptionReport $report;

	/** CSV body waiting to be emitted by serve_pending_csv(). @var string|null */
	private ?string $pending_csv = null;

	/**
	 * All shared instances are injected from Module — none are freshly
	 * constructed here, since several of them (SubscriptionManager,
	 * RenewalEngine, DunningManager) register their own hooks in their
	 * constructors; a second `new` per request would double-register those.
	 *
	 * Route registration is NOT done here — caller calls ->register() which
	 * wires `rest_api_init` via the PureCartApi base class.
	 *
	 * @since 1.0.0
	 */
	public function __construct(
		SubscriptionManager $manager,
		RetentionFlow $retention,
		RenewalEngine $renewal_engine,
		DunningManager $dunning,
		PlanUpgrade $plan_upgrade,
		WebhookHandler $webhooks
	) {
		$this->subscriptions  = new SubscriptionRepository();
		$this->logs           = new SubscriptionLogRepository();
		$this->manager        = $manager;
		$this->retention      = $retention;
		$this->renewal_engine = $renewal_engine;
		$this->dunning        = $dunning;
		$this->plan_upgrade   = $plan_upgrade;
		$this->webhooks       = $webhooks;

		// Not injected: SubscriptionReport is read-only and registers no hooks.
		$this->report = new SubscriptionReport();
	}

	// -----------------------------------------------------------------------
	// Route registration
	// -----------------------------------------------------------------------

	/**
	 * @since 1.0.0
	 * @return void
	 */
	public function register_routes(): void {
		$ns   = PURECART_API_NAMESPACE;
		$base = '/subscriptions';

		register_rest_route(
			$ns,
			$base,
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'list_subscriptions' ),
				'permission_callback' => array( $this, 'permission_admin' ),
				'args'                => array(
					'status'       => array(
						'type'     => array( 'string', 'array' ),
						'required' => false,
					),
					'product'      => array(
						'type'     => array( 'string', 'integer', 'array' ),
						'required' => false,
					),
					'cycle'        => array(
						'type'     => array( 'string', 'array' ),
						'required' => false,
					),
					'type'         => array(
						'type'     => array( 'string', 'array' ),
						'required' => false,
					),
					'payment_type' => array(
						'type'     => array( 'string', 'array' ),
						'required' => false,
					),
					'churn_risk'   => array(
						'type'     => array( 'string', 'array' ),
						'required' => false,
					),
					'search'       => array(
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
						'required'          => false,
					),
					'page'         => array(
						'type'              => 'integer',
						'default'           => 1,
						'minimum'           => 1,
						'sanitize_callback' => 'absint',
						'required'          => false,
					),
					'per_page'     => array(
						'type'     => 'integer',
						'default'  => 20,
						'minimum'  => -1,
						'maximum'  => 100,
						'required' => false,
					),
				),
			)
		);

		register_rest_route(
			$ns,
			$base . '/(?P<id>\d+)',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_subscription' ),
				'permission_callback' => array( $this, 'permission_owner_or_admin' ),
			)
		);

		register_rest_route(
			$ns,
			$base . '/(?P<id>\d+)/logs',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_logs' ),
				'permission_callback' => array( $this, 'permission_admin' ),
			)
		);

		register_rest_route(
			$ns,
			$base . '/(?P<id>\d+)/pause',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'handle_action_pause' ),
				'permission_callback' => array( $this, 'permission_owner_or_admin' ),
				'args'                => array(
					'resume_at' => array(
						'type'        => array( 'string', 'null' ),
						'required'    => false,
						'description' => 'Optional MySQL datetime (Y-m-d H:i:s) or date string at which to auto-resume the subscription.',
					),
				),
			)
		);

		foreach ( array( 'resume', 'cancel', 'skip', 'early-renewal', 'resubscribe', 'upgrade' ) as $action ) {
			register_rest_route(
				$ns,
				$base . '/(?P<id>\d+)/' . $action,
				array(
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'handle_action_' . str_replace( '-', '_', $action ) ),
					'permission_callback' => array( $this, 'permission_owner_or_admin' ),
				)
			);
		}

		register_rest_route(
			$ns,
			$base . '/(?P<id>\d+)/renew',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'handle_action_renew' ),
				'permission_callback' => array( $this, 'permission_admin' ),
			)
		);

		register_rest_route(
			$ns,
			$base . '/(?P<id>\d+)/retry-payment',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'handle_retry_payment' ),
				'permission_callback' => array( $this, 'permission_admin' ),
			)
		);

		register_rest_route(
			$ns,
			$base . '/(?P<id>\d+)/send-card-update',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'handle_send_card_update' ),
				'permission_callback' => array( $this, 'permission_admin' ),
			)
		);

		register_rest_route(
			$ns,
			$base . '/(?P<id>\d+)/cancellation/reasons',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_cancellation_reasons' ),
				'permission_callback' => static fn() => true,
			)
		);

		register_rest_route(
			$ns,
			$base . '/(?P<id>\d+)/cancellation/offers',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_cancellation_offers' ),
				'permission_callback' => array( $this, 'permission_owner_or_admin' ),
			)
		);

		register_rest_route(
			$ns,
			$base . '/(?P<id>\d+)/cancellation/accept-offer',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'accept_cancellation_offer' ),
				'permission_callback' => array( $this, 'permission_owner_or_admin' ),
			)
		);

		register_rest_route(
			$ns,
			$base . '/(?P<id>\d+)/external-renewal',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'handle_external_renewal' ),
				'permission_callback' => static fn() => true, // verified via HMAC signature inside the callback, not a WP capability.
			)
		);

		register_rest_route(
			$ns,
			$base . '/(?P<id>\d+)/webhook-event',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'handle_webhook_event' ),
				'permission_callback' => static fn() => true, // same — HMAC-verified inside.
			)
		);

		// Reporting (Step 15). Both are site-wide aggregate data over every
		// customer's subscriptions, so both are strictly admin-only — there is
		// deliberately no owner-scoped variant of these.
		register_rest_route(
			$ns,
			'/reports/subscriptions/summary',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_report_summary' ),
				'permission_callback' => array( $this, 'permission_admin' ),
			)
		);

		register_rest_route(
			$ns,
			'/reports/subscriptions/export',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_report_export' ),
				'permission_callback' => array( $this, 'permission_admin' ),
			)
		);
	}

	// -----------------------------------------------------------------------
	// Permission callbacks
	// -----------------------------------------------------------------------

	/**
	 * @since 1.0.0
	 * @return bool
	 */
	public function permission_admin(): bool {
		return current_user_can( 'manage_woocommerce' );
	}

	/**
	 * Admin OR the subscription's own owner. A missing subscription passes
	 * through (returns true) so the callback itself 404s — a permission
	 * check should not leak "this ID does/doesn't exist" to an unauthorized caller.
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return bool
	 */
	public function permission_owner_or_admin( \WP_REST_Request $request ): bool {
		if ( current_user_can( 'manage_woocommerce' ) ) {
			return true;
		}

		$subscription = $this->subscriptions->find( (int) $request->get_param( 'id' ) );
		if ( ! $subscription ) {
			return true;
		}

		return is_user_logged_in() && get_current_user_id() === (int) $subscription->user_id;
	}

	/**
	 * Owner only, no admin bypass — matches subscription-final-dev-plan.md
	 * § 6's "Customer" auth level (as opposed to "Customer/Admin") for the
	 * two retention-offer endpoints specifically.
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return bool
	 */
	public function permission_owner_only( \WP_REST_Request $request ): bool {
		$subscription = $this->subscriptions->find( (int) $request->get_param( 'id' ) );
		if ( ! $subscription ) {
			return true;
		}

		return is_user_logged_in() && get_current_user_id() === (int) $subscription->user_id;
	}

	// -----------------------------------------------------------------------
	// Read endpoints
	// -----------------------------------------------------------------------

	/**
	 * GET /subscriptions — admin list, optionally filtered by status, product, cycle, type, payment_type, churn_risk, search, and paginated.
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response
	 */
	public function list_subscriptions( \WP_REST_Request $request ): \WP_REST_Response {
		$status       = $request->get_param( 'status' );
		$product      = $request->get_param( 'product' );
		$cycle        = $request->get_param( 'cycle' );
		$type         = $request->get_param( 'type' );
		$payment_type = $request->get_param( 'payment_type' );
		$churn_risk   = $request->get_param( 'churn_risk' );
		$search       = $request->get_param( 'search' );
		$page         = (int) ( $request->get_param( 'page' ) ?? 1 );
		$per_page     = (int) ( $request->get_param( 'per_page' ) ?? 20 );

		$result = $this->subscriptions->find_all(
			status:       ! empty( $status ) ? $status : null,
			product:      ! empty( $product ) ? $product : null,
			cycle:        ! empty( $cycle ) ? $cycle : null,
			type:         ! empty( $type ) ? $type : null,
			payment_type: ! empty( $payment_type ) ? $payment_type : null,
			churn_risk:   ! empty( $churn_risk ) ? $churn_risk : null,
			search:       ! empty( $search ) ? (string) $search : null,
			page:         $page,
			per_page:     $per_page
		);

		$prepared = array_map( array( $this, 'prepare_subscription' ), $result['items'] );

		$response = rest_ensure_response( $prepared );
		$response->header( 'X-WP-Total', (string) $result['total'] );
		$response->header( 'X-WP-TotalPages', (string) $result['total_pages'] );

		return $response;
	}

	/**
	 * GET /reports/subscriptions/summary — the § 8 metrics.
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response
	 */
	public function get_report_summary( \WP_REST_Request $request ): \WP_REST_Response {
		$period_start = sanitize_text_field( (string) $request->get_param( 'period_start' ) );
		$period_end   = sanitize_text_field( (string) $request->get_param( 'period_end' ) );

		return rest_ensure_response(
			$this->report->summary(
				'' !== $period_start ? $period_start : null,
				'' !== $period_end ? $period_end : null
			)
		);
	}

	/**
	 * GET /reports/subscriptions/export — CSV (default) or JSON rows.
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response
	 */
	public function get_report_export( \WP_REST_Request $request ): \WP_REST_Response {
		$status = sanitize_key( (string) $request->get_param( 'status' ) );
		$status = '' !== $status ? $status : null;

		if ( 'json' === $request->get_param( 'format' ) ) {
			return rest_ensure_response( $this->report->export_rows( $status ) );
		}

		// Correction to this method's first version, which just returned the
		// CSV string as a WP_REST_Response body with a text/csv header. That
		// does not work: WP_REST_Server::serve_request() runs
		// `wp_json_encode( $result )` over every response body it serves
		// (class-wp-rest-server.php, verified against this install), so the
		// caller received a JSON-quoted string with escaped newlines rather
		// than a CSV file. Response headers alone can't change that — the only
		// supported way to emit a non-JSON body is to short-circuit the
		// serializer via `rest_pre_serve_request`, which is what this does.
		$this->pending_csv = $this->report->to_csv( $status );

		add_filter( 'rest_pre_serve_request', array( $this, 'serve_pending_csv' ), 10, 2 );

		return new \WP_REST_Response();
	}

	/**
	 * `rest_pre_serve_request` handler: emit the prepared CSV verbatim and
	 * tell the REST server the request is already served, so it skips its own
	 * JSON encoding.
	 *
	 * @since 1.0.0
	 * @param bool              $served Whether the request has already been served.
	 * @param \WP_HTTP_Response $result The response about to be served.
	 * @return bool
	 */
	public function serve_pending_csv( bool $served, $result ): bool {
		if ( $served || null === $this->pending_csv ) {
			return $served;
		}

		$csv               = $this->pending_csv;
		$this->pending_csv = null;

		if ( ! headers_sent() ) {
			header( 'Content-Type: text/csv; charset=utf-8' );
			header( 'Content-Disposition: attachment; filename="purecart-subscriptions-' . gmdate( 'Y-m-d' ) . '.csv"' );
		}

		// Excel refuses to read UTF-8 CSV as UTF-8 without a byte-order mark,
		// mangling any non-ASCII customer name or product title.
		echo "\xEF\xBB\xBF" . $csv; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSV file body, not HTML; fputcsv() has already quoted every field.

		return true;
	}

	/**
	 * GET /subscriptions/{id}.
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function get_subscription( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$subscription = $this->subscriptions->find( (int) $request->get_param( 'id' ) );
		if ( ! $subscription ) {
			return $this->not_found();
		}

		return rest_ensure_response( $this->prepare_subscription( $subscription ) );
	}

	/**
	 * GET /subscriptions/{id}/logs.
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function get_logs( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$id = (int) $request->get_param( 'id' );
		if ( ! $this->subscriptions->find( $id ) ) {
			return $this->not_found();
		}

		return rest_ensure_response( $this->logs->find_by_subscription( $id ) );
	}

	/**
	 * @since 1.0.0
	 * @param object $subscription Subscription row.
	 * @return array<string, mixed>
	 */
	private function prepare_subscription( object $subscription ): array {
		$data = (array) $subscription;

		foreach ( array( 'id', 'user_id', 'product_id', 'order_id', 'license_id', 'saas_account_id', 'billing_interval', 'renewal_count', 'skip_count', 'retry_count', 'churn_risk_score' ) as $int_field ) {
			if ( isset( $data[ $int_field ] ) && null !== $data[ $int_field ] ) {
				$data[ $int_field ] = (int) $data[ $int_field ];
			}
		}

		foreach ( array( 'recurring_amount', 'signup_fee', 'customer_ltv' ) as $float_field ) {
			if ( isset( $data[ $float_field ] ) ) {
				$data[ $float_field ] = (float) $data[ $float_field ];
			}
		}

		// Resolved display fields. Without these the admin list can't render a
		// customer or product name without firing one /wp/v2/users and one
		// /wc/v3/products request per row — an N+1 the client shouldn't have to
		// solve. Same join SubscriptionReport::export_row() already does for CSV,
		// kept consistent here rather than being a second, different shape.
		$user                   = get_user_by( 'id', (int) $subscription->user_id );
		$data['customer_name']  = $user ? $user->display_name : '';
		$data['customer_email'] = $user ? $user->user_email : '';

		$product              = wc_get_product( (int) $subscription->product_id );
		$data['product_name'] = $product ? $product->get_name() : '';

		// Derived, so every client renders the same badge colour for the same
		// score instead of each re-implementing the 25/50/75 band boundaries.
		$data['churn_band'] = ChurnScorer::band( (int) $subscription->churn_risk_score );

		$interval = (int) ( $data['billing_interval'] ?? 1 );
		$period   = (string) ( $data['billing_period'] ?? 'month' );
		$label    = 1 === $interval ? ucfirst( $period ) . 'ly' : sprintf( 'Every %d %ss', $interval, $period );
		if ( 'dayly' === strtolower( $label ) ) {
			$label = 'Daily';
		} elseif ( 'weekly' === strtolower( $label ) ) {
			$label = 'Weekly';
		} elseif ( 'monthly' === strtolower( $label ) ) {
			$label = 'Monthly';
		} elseif ( 'yearly' === strtolower( $label ) ) {
			$label = 'Yearly';
		}

		$data['billing'] = array(
			'interval'     => $interval,
			'period'       => $period,
			'displayLabel' => $label,
		);

		/**
		 * Filters one subscription's REST representation.
		 *
		 * @since 1.0.0
		 * @param array<string, mixed> $data         Prepared subscription data.
		 * @param object               $subscription Raw subscription row.
		 */
		return apply_filters( 'purecart_rest_prepare_subscription', $data, $subscription );
	}

	/**
	 * @since 1.0.0
	 * @return \WP_Error
	 */
	private function not_found(): \WP_Error {
		return new \WP_Error( 'purecart_not_found', __( 'Subscription not found.', 'purecart' ), array( 'status' => 404 ) );
	}

	// -----------------------------------------------------------------------
	// Lifecycle actions (owner or admin)
	// -----------------------------------------------------------------------

	/**
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function handle_action_pause( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$id        = (int) $request->get_param( 'id' );
		$resume_at = $request->get_param( 'resume_at' );

		$resume_datetime = null;
		if ( ! empty( $resume_at ) ) {
			$ts = strtotime( (string) $resume_at );
			if ( $ts ) {
				$resume_datetime = gmdate( 'Y-m-d H:i:s', $ts );
			}
		}

		$success = $this->manager->pause( $id, $resume_datetime );

		return $this->action_result( $success, $id, __( 'Could not pause this subscription.', 'purecart' ) );
	}

	/**
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function handle_action_resume( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$id = (int) $request->get_param( 'id' );

		return $this->action_result( $this->manager->resume( $id ), $id, __( 'Could not resume this subscription.', 'purecart' ) );
	}

	/**
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function handle_action_cancel( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$id          = (int) $request->get_param( 'id' );
		$immediately = null === $request->get_param( 'immediately' ) ? true : (bool) $request->get_param( 'immediately' );
		$reason      = $request->get_param( 'reason' ) ? sanitize_text_field( (string) $request->get_param( 'reason' ) ) : null;

		return $this->action_result( $this->manager->cancel( $id, $immediately, $reason ), $id, __( 'Could not cancel this subscription.', 'purecart' ) );
	}

	/**
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function handle_action_skip( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$id = (int) $request->get_param( 'id' );

		return $this->action_result( $this->manager->skip( $id ), $id, __( 'Could not skip the next renewal for this subscription.', 'purecart' ) );
	}

	/**
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function handle_action_early_renewal( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$result = $this->renewal_engine->early_renewal( (int) $request->get_param( 'id' ) );

		return is_wp_error( $result ) ? $result : rest_ensure_response( $this->prepare_subscription( $this->subscriptions->find( (int) $request->get_param( 'id' ) ) ) );
	}

	/**
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function handle_action_resubscribe( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$result = $this->manager->resubscribe( (int) $request->get_param( 'id' ) );

		if ( ! $result ) {
			return new \WP_Error( 'purecart_resubscribe_failed', __( 'This subscription cannot be resubscribed.', 'purecart' ), array( 'status' => 400 ) );
		}

		return rest_ensure_response( $this->prepare_subscription( $result ) );
	}

	/**
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function handle_action_upgrade( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$id             = (int) $request->get_param( 'id' );
		$new_product_id = absint( $request->get_param( 'product_id' ) );
		$mode           = $request->get_param( 'mode' ) ? sanitize_key( (string) $request->get_param( 'mode' ) ) : null;

		if ( ! $new_product_id ) {
			return new \WP_Error( 'purecart_missing_product', __( 'A target product_id is required.', 'purecart' ), array( 'status' => 400 ) );
		}

		$result = $this->plan_upgrade->process( $id, $new_product_id, $mode );

		return is_wp_error( $result ) ? $result : rest_ensure_response( $this->prepare_subscription( $this->subscriptions->find( $id ) ) );
	}

	/**
	 * @since 1.0.0
	 * @param bool   $success   Whether the action succeeded.
	 * @param int    $id        Subscription row ID.
	 * @param string $error_msg Message to use if it failed.
	 * @return \WP_REST_Response|\WP_Error
	 */
	private function action_result( bool $success, int $id, string $error_msg ): \WP_REST_Response|\WP_Error {
		if ( ! $success ) {
			return new \WP_Error( 'purecart_action_failed', $error_msg, array( 'status' => 400 ) );
		}

		return rest_ensure_response( $this->prepare_subscription( $this->subscriptions->find( $id ) ) );
	}

	// -----------------------------------------------------------------------
	// Admin-only actions
	// -----------------------------------------------------------------------

	/**
	 * POST /subscriptions/{id}/renew — manual admin-triggered renewal.
	 *
	 * Reuses RenewalEngine::early_renewal() — an admin forcing a renewal
	 * "right now regardless of schedule" is the exact same operation as a
	 * customer's early renewal; only who initiated it differs, which this
	 * layer's own permission check (`permission_admin`) already captures.
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function handle_action_renew( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$id     = (int) $request->get_param( 'id' );
		$result = $this->renewal_engine->early_renewal( $id );

		return is_wp_error( $result ) ? $result : rest_ensure_response( $this->prepare_subscription( $this->subscriptions->find( $id ) ) );
	}

	/**
	 * POST /subscriptions/{id}/retry-payment.
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function handle_retry_payment( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$id = (int) $request->get_param( 'id' );
		if ( ! $this->subscriptions->find( $id ) ) {
			return $this->not_found();
		}

		$this->dunning->run_retry( $id, 0 );

		return rest_ensure_response( $this->prepare_subscription( $this->subscriptions->find( $id ) ) );
	}

	/**
	 * POST /subscriptions/{id}/send-card-update.
	 *
	 * Returns the generated magic-link token/URL directly in the response for
	 * now — Step 13 (emails) doesn't exist yet to actually send it, and no
	 * no-login landing page exists yet to consume it either (Customer Portal /
	 * Frontend Phase 6). This is the backend primitive both of those will use.
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function handle_send_card_update( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$id = (int) $request->get_param( 'id' );

		$token = $this->dunning->generate_card_update_token( $id );
		if ( '' === $token ) {
			return $this->not_found();
		}

		return rest_ensure_response(
			array(
				'token' => $token,
				'url'   => add_query_arg(
					array(
						'purecart_subscription' => $id,
						'purecart_token'        => $token,
					),
					home_url( '/' )
				),
			)
		);
	}

	// -----------------------------------------------------------------------
	// Retention flow (cancellation)
	// -----------------------------------------------------------------------

	/**
	 * GET /subscriptions/{id}/cancellation/reasons — Public.
	 *
	 * @since 1.0.0
	 * @return \WP_REST_Response
	 */
	public function get_cancellation_reasons(): \WP_REST_Response {
		return rest_ensure_response( $this->retention->get_reasons() );
	}

	/**
	 * GET /subscriptions/{id}/cancellation/offers.
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function get_cancellation_offers( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$id     = (int) $request->get_param( 'id' );
		$reason = sanitize_key( (string) $request->get_param( 'reason' ) );

		if ( ! $this->subscriptions->find( $id ) ) {
			return $this->not_found();
		}

		return rest_ensure_response( $this->retention->get_eligible_offers( $id, $reason ) );
	}

	/**
	 * POST /subscriptions/{id}/cancellation/accept-offer.
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function accept_cancellation_offer( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$id         = (int) $request->get_param( 'id' );
		$offer_type = sanitize_key( (string) $request->get_param( 'offer_type' ) );
		$reason     = sanitize_key( (string) $request->get_param( 'reason' ) );

		$result = $this->retention->accept_offer( $id, $offer_type, $reason );

		return is_wp_error( $result ) ? $result : rest_ensure_response( $this->prepare_subscription( $this->subscriptions->find( $id ) ) );
	}

	// -----------------------------------------------------------------------
	// Server / webhook endpoints (HMAC-verified, not capability-gated)
	// -----------------------------------------------------------------------

	/**
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function handle_external_renewal( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$verified = $this->verify_webhook_request( $request );
		if ( is_wp_error( $verified ) ) {
			return $verified;
		}

		$id      = (int) $request->get_param( 'id' );
		$payload = $verified;

		$recorded = $this->renewal_engine->record_external_renewal(
			$id,
			array(
				'transaction_id' => sanitize_text_field( (string) ( $payload['transaction_id'] ?? '' ) ),
				'amount'         => isset( $payload['amount'] ) ? (float) $payload['amount'] : null,
			)
		);

		return rest_ensure_response( array( 'recorded' => $recorded ) );
	}

	/**
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function handle_webhook_event( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$verified = $this->verify_webhook_request( $request );
		if ( is_wp_error( $verified ) ) {
			return $verified;
		}

		$result = $this->webhooks->handle( (int) $request->get_param( 'id' ), $verified );

		// A duplicate/already-processed event, or an unrecognized-but-harmless
		// event type, still returns 200 — the gateway shouldn't keep retrying
		// delivery for either (checklist: "duplicate webhook event ID returns
		// 200 without reprocessing").
		return is_wp_error( $result ) ? $result : rest_ensure_response( $result );
	}

	/**
	 * Shared signature verification + JSON decode for both webhook-style endpoints.
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request REST request.
	 * @return array<string, mixed>|\WP_Error Decoded payload, or a WP_Error (401/400).
	 */
	private function verify_webhook_request( \WP_REST_Request $request ): array|\WP_Error {
		$signature = (string) $request->get_header( 'X-PureCart-Sig' );
		$raw_body  = (string) $request->get_body();

		if ( ! $this->webhooks->verify_signature( $raw_body, $signature ) ) {
			return new \WP_Error( 'purecart_invalid_signature', __( 'Invalid webhook signature.', 'purecart' ), array( 'status' => 401 ) );
		}

		$payload = json_decode( $raw_body, true );
		if ( ! is_array( $payload ) ) {
			return new \WP_Error( 'purecart_invalid_payload', __( 'Invalid JSON payload.', 'purecart' ), array( 'status' => 400 ) );
		}

		return $payload;
	}
}
