/**
 * Subscription DTO Mappers.
 *
 * Provides bidirectional translation between the WordPress REST API / MySQL database
 * representation (flat snake_case columns) and the React frontend representation
 * (camelCase, nested discriminated unions, and precomputed display strings).
 *
 * @file
 * @since 1.0.0
 */

import type {
	SubscriptionRecord,
	BillingPeriod,
	BillingCycle,
	SubscriptionDeliveryType,
	SubscriptionLinkedEntity,
	SubscriptionStatus,
} from '../types';

/**
 * Computes human-readable billing display labels and cycle category types from
 * interval and period values.
 *
 * @since 1.0.0
 *
 * @description
 * Translates raw database schedule pairs (e.g. `interval: 1, period: 'month'` or
 * `interval: 3, period: 'month'`) into presentation labels (e.g. `'Monthly'` or
 * `'Every 3 months'`) and groups them into standard BillingCycle categories
 * (`'Monthly'`, `'Annual'`, `'Custom'`).
 *
 * @param {number}        [interval=1]       The frequency number (e.g. 1, 3, 6, 12). Must be >= 1.
 * @param {BillingPeriod} [period='month']   The time unit ('day' | 'week' | 'month' | 'year').
 *
 * @return {{ interval: number; period: BillingPeriod; displayLabel: string; cycle: BillingCycle }}
 * An object containing normalized interval/period, formatted display string, and cycle group.
 *
 * @example
 * // Input:
 * formatBillingSchedule( 1, 'year' );
 * // Output:
 * // { interval: 1, period: 'year', displayLabel: 'Yearly', cycle: 'Annual' }
 *
 * @example
 * // Input:
 * formatBillingSchedule( 3, 'month' );
 * // Output:
 * // { interval: 3, period: 'month', displayLabel: 'Every 3 months', cycle: 'Custom' }
 */
export function formatBillingSchedule(
	interval = 1,
	period: BillingPeriod = 'month'
): { interval: number; period: BillingPeriod; displayLabel: string; cycle: BillingCycle } {
	const validInterval = Math.max( 1, Number( interval ) || 1 );
	const validPeriod = ( [ 'day', 'week', 'month', 'year' ].includes( period ) ? period : 'month' ) as BillingPeriod;

	let displayLabel = '';
	let cycle: BillingCycle = 'Custom';

	if ( validInterval === 1 ) {
		switch ( validPeriod ) {
			case 'day':
				displayLabel = 'Daily';
				cycle = 'Custom';
				break;
			case 'week':
				displayLabel = 'Weekly';
				cycle = 'Custom';
				break;
			case 'month':
				displayLabel = 'Monthly';
				cycle = 'Monthly';
				break;
			case 'year':
				displayLabel = 'Yearly';
				cycle = 'Annual';
				break;
		}
	} else {
		displayLabel = `Every ${ validInterval } ${ validPeriod }s`;
		cycle = 'Custom';
	}

	return {
		interval: validInterval,
		period: validPeriod,
		displayLabel,
		cycle,
	};
}

/**
 * Formats a raw number amount into a currency string with a frequency suffix.
 *
 * @since 1.0.0
 *
 * @description
 * Converts a numeric recurring amount into a formatted currency string (with symbol,
 * comma grouping, and two decimal places) combined with billing frequency indicator.
 *
 * @param {number}        amount             Raw price amount (e.g. 29.99, 120).
 * @param {number}        [interval=1]       Billing interval frequency (e.g. 1, 3).
 * @param {BillingPeriod} [period='month']   Billing period unit ('day' | 'week' | 'month' | 'year').
 * @param {string}        [currency='USD']   Currency code ('USD' | 'EUR' | 'GBP').
 *
 * @return {string} Formatted currency string with period suffix (e.g. '$29.99/mo').
 *
 * @example
 * // Input:
 * formatAmount( 99, 1, 'year', 'USD' );
 * // Output:
 * // '$99.00/yr'
 *
 * @example
 * // Input:
 * formatAmount( 45.5, 3, 'month', 'USD' );
 * // Output:
 * // '$45.50 / 3 months'
 */
export function formatAmount(
	amount: number,
	interval = 1,
	period: BillingPeriod = 'month',
	currency = 'USD'
): string {
	const symbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
	const numStr = Number( amount || 0 ).toLocaleString( undefined, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	} );

	if ( interval === 1 ) {
		const periodSuffix = period === 'year' ? '/yr' : period === 'month' ? '/mo' : period === 'week' ? '/wk' : '/day';
		return `${ symbol }${ numStr }${ periodSuffix }`;
	}
	return `${ symbol }${ numStr } / ${ interval } ${ period }s`;
}

/**
 * Normalizes or creates a safe fallback LinkedEntity object for the given delivery type.
 *
 * @since 1.0.0
 *
 * @description
 * Constructs a type-safe discriminated union object (`SubscriptionLinkedEntity`) matching
 * one of the 6 supported delivery types (`software`, `saas`, `membership`, `download`,
 * `course`, `service`). Ensures that UI table cells and detail tabs always have non-null,
 * correctly typed metadata even if the database row had missing or partial joins.
 *
 * @param {Record<string, unknown>} raw          Raw database row or linked entity object.
 * @param {SubscriptionDeliveryType} deliveryType Delivery type category ('software' | 'saas' | 'membership' | 'download' | 'course' | 'service').
 *
 * @return {SubscriptionLinkedEntity} Fully formed, type-safe linked entity object.
 *
 * @example
 * // Input:
 * normalizeLinkedEntity( { license_id: '12', license_key: 'ABCD-1234', domains_used: 1, domain_limit: 3 }, 'software' );
 * // Output:
 * // {
 * //   type: 'software',
 * //   licenseId: '12',
 * //   licenseKey: 'ABCD-1234',
 * //   domainCount: '1/3',
 * //   domainsUsed: 1,
 * //   domainLimit: 3
 * // }
 */
export function normalizeLinkedEntity( raw: any, deliveryType: SubscriptionDeliveryType ): SubscriptionLinkedEntity {
	switch ( deliveryType ) {
		case 'software':
			return {
				type: 'software',
				licenseId: String( raw.licenseId ?? raw.license_id ?? '' ),
				licenseKey: String( raw.licenseKey ?? raw.license_key ?? '—' ),
				domainCount: String( raw.domainCount ?? raw.domain_count ?? `${ raw.domains_used ?? 0 }/${ raw.domain_limit ?? 1 }` ),
				domainsUsed: Number( raw.domainsUsed ?? raw.domains_used ?? 0 ),
				domainLimit: Number( raw.domainLimit ?? raw.domain_limit ?? 1 ),
			};
		case 'saas':
			return {
				type: 'saas',
				saasAccountId: String( raw.saasAccountId ?? raw.saas_account_id ?? '' ),
				saasAccountName: String( raw.saasAccountName ?? raw.saas_account_name ?? 'Primary Account' ),
				seatUsage: String( raw.seatUsage ?? raw.seat_usage ?? `${ raw.seats_used ?? 1 }/${ raw.seats_total ?? 1 }` ),
				seatsUsed: Number( raw.seatsUsed ?? raw.seats_used ?? 1 ),
				seatsTotal: Number( raw.seatsTotal ?? raw.seats_total ?? 1 ),
			};
		case 'membership':
			return {
				type: 'membership',
				membershipTier: String( raw.membershipTier ?? raw.membership_tier ?? 'Standard' ),
				assignedRole: String( raw.assignedRole ?? raw.assigned_role ?? 'subscriber' ),
				contentAccessLabel: String( raw.contentAccessLabel ?? raw.content_access_label ?? 'Full Access' ),
				graceEndsAt: raw.graceEndsAt ?? raw.grace_ends_at ?? null,
			};
		case 'download':
			return {
				type: 'download',
				downloadsThisCycle: Number( raw.downloadsThisCycle ?? raw.downloads_this_cycle ?? 0 ),
				downloadLimit: raw.downloadLimit !== undefined ? raw.downloadLimit : ( raw.download_limit !== undefined ? ( raw.download_limit === null ? null : Number( raw.download_limit ) ) : null ),
				nextDripDate: raw.nextDripDate ?? raw.next_drip_date ?? null,
			};
		case 'course':
			return {
				type: 'course',
				enrolledCourses: Array.isArray( raw.enrolledCourses )
					? raw.enrolledCourses
					: ( Array.isArray( raw.enrolled_courses )
						? raw.enrolled_courses
						: ( raw.enrolled_courses ? [ String( raw.enrolled_courses ) ] : [] ) ),
				lmsEnrollmentId: String( raw.lmsEnrollmentId ?? raw.lms_enrollment_id ?? '' ),
				courseAccessUntil: raw.courseAccessUntil ?? raw.course_access_until ?? null,
				progressPct: raw.progressPct ?? ( raw.progress_pct !== undefined && raw.progress_pct !== null ? Number( raw.progress_pct ) : null ),
			};
		case 'service':
			return {
				type: 'service',
				deliverableNotes: String( raw.deliverableNotes ?? raw.deliverable_notes ?? '' ),
				nextDeliverableDue: raw.nextDeliverableDue ?? raw.next_deliverable_due ?? null,
				lastDeliverableAt: raw.lastDeliverableAt ?? raw.last_deliverable_at ?? null,
			};
		default:
			return {
				type: 'software',
				licenseId: '',
				licenseKey: '—',
				domainCount: '0/1',
				domainsUsed: 0,
				domainLimit: 1,
			};
	}
}

/**
 * Maps a raw backend REST API response object into a complete, type-safe SubscriptionRecord.
 *
 * @since 1.0.0
 *
 * @description
 * Primary ingestion transformer. Resolves snake_case DB columns (e.g. `billing_interval`,
 * `customer_name`, `recurring_amount`), generates precomputed presentation fields
 * (`billing.displayLabel`, formatted `amount`, formatted `id` string), and builds a valid
 * `linkedEntity` object.
 *
 * @param {Record<string, unknown>} raw Raw JSON object from WordPress REST API (`/purecart/v1/subscriptions`).
 *
 * @return {SubscriptionRecord} Fully populated frontend subscription record.
 *
 * @example
 * // Input (from REST API):
 * const raw = {
 *   id: 1,
 *   user_id: 5,
 *   customer_name: 'Alex Mercer',
 *   customer_email: 'alex@example.com',
 *   product_id: 101,
 *   product_name: 'Ultimate Bundle',
 *   delivery_type: 'software',
 *   status: 'active',
 *   recurring_amount: 99.00,
 *   currency: 'USD',
 *   billing_interval: 1,
 *   billing_period: 'year',
 *   next_payment_at: '2026-10-01 00:00:00',
 *   churn_risk_score: 20,
 *   customer_ltv: 297.00
 * };
 *
 * // Output:
 * const record = mapBackendSubscriptionToRecord( raw );
 * // record is:
 * // {
 * //   id: 'SUB-001',
 * //   customer: 'Alex Mercer',
 * //   customerId: 'CUST-5',
 * //   email: 'alex@example.com',
 * //   product: 'Ultimate Bundle',
 * //   productId: 101,
 * //   amount: '$99.00/yr',
 * //   amountRaw: 99.00,
 * //   currency: 'USD',
 * //   billing: { interval: 1, period: 'year', displayLabel: 'Yearly' },
 * //   cycle: 'Annual',
 * //   status: 'active',
 * //   deliveryType: 'software',
 * //   linkedEntity: { type: 'software', licenseId: '', licenseKey: '—', ... },
 * //   nextPayment: '2026-10-01 00:00:00',
 * //   churnRiskScore: 20,
 * //   customerLtv: 297.00,
 * //   ...
 * // }
 */
export function mapBackendSubscriptionToRecord( raw: any ): SubscriptionRecord {
	if ( ! raw || typeof raw !== 'object' ) {
		throw new Error( 'Invalid subscription data received' );
	}

	// Format ID (e.g. 1 -> "SUB-001", "SUB-001" -> "SUB-001")
	const id = String( raw.id ?? '' );
	const formattedId = id.startsWith( 'SUB-' ) ? id : `SUB-${ id.padStart( 3, '0' ) }`;

	// Delivery type
	const validDeliveryTypes: SubscriptionDeliveryType[] = [ 'software', 'saas', 'membership', 'download', 'course', 'service' ];
	const deliveryType: SubscriptionDeliveryType = validDeliveryTypes.includes( raw.delivery_type ?? raw.deliveryType )
		? ( raw.delivery_type ?? raw.deliveryType )
		: 'software';

	// Billing schedule & cycle
	const interval = Number( raw.billing?.interval ?? raw.billing_interval ?? 1 );
	const period: BillingPeriod = raw.billing?.period ?? raw.billing_period ?? 'month';
	const billingSchedule = formatBillingSchedule( interval, period );

	// Amount
	const amountRaw = Number( raw.amountRaw ?? raw.recurring_amount ?? 0 );
	const currency = String( raw.currency ?? 'USD' );
	const amount = raw.amount ?? formatAmount( amountRaw, interval, period, currency );

	// Linked entity
	const linkedEntity = raw.linkedEntity && typeof raw.linkedEntity === 'object' && raw.linkedEntity.type
		? raw.linkedEntity
		: normalizeLinkedEntity( raw.linked_entity ?? raw, deliveryType );

	// Status
	const status: SubscriptionStatus = raw.status ?? 'active';

	// Churn
	const churnRiskScore = Number( raw.churnRiskScore ?? raw.churn_risk_score ?? 0 );

	// Customer & Product names
	const customer = raw.customer ?? raw.customer_name ?? `User #${ raw.user_id ?? '?' }`;
	const customerId = raw.customerId ?? ( raw.user_id ? `CUST-${ raw.user_id }` : 'CUST-001' );
	const email = raw.email ?? raw.customer_email ?? '';
	const product = raw.product ?? raw.product_name ?? `Product #${ raw.product_id ?? '?' }`;
	const productId = Number( raw.productId ?? raw.product_id ?? 0 );

	return {
		id: formattedId,
		customer,
		customerId,
		email,
		product,
		productId,
		amount,
		amountRaw,
		currency,
		billing: {
			interval: billingSchedule.interval,
			period: billingSchedule.period,
			displayLabel: raw.billing?.displayLabel ?? billingSchedule.displayLabel,
		},
		cycle: raw.cycle ?? billingSchedule.cycle,
		status,
		nextPayment: raw.nextPayment ?? raw.next_payment_at ?? raw.next_payment_date ?? null,
		startDate: raw.startDate ?? raw.starts_at ?? raw.created_at ?? new Date().toISOString(),
		paymentMethod: raw.paymentMethod ?? ( raw.payment_token_id ? {
			brand: raw.card_brand || 'Card',
			last4: raw.card_last4 || '••••',
			expiryMonth: Number( raw.card_expiry_month || 12 ),
			expiryYear: Number( raw.card_expiry_year || 2028 ),
			isDefault: true,
		} : null ),
		deliveryType,
		linkedEntity,
		paymentType: raw.paymentType ?? raw.payment_type ?? 'recurring',
		paymentsCompleted: Number( raw.paymentsCompleted ?? raw.renewal_count ?? 0 ),
		maxPayments: raw.maxPayments !== undefined ? raw.maxPayments : ( raw.max_payments !== undefined ? ( raw.max_payments === null ? null : Number( raw.max_payments ) ) : null ),
		accessTiming: raw.accessTiming ?? raw.access_timing ?? 'immediate',
		accessEndDate: raw.accessEndDate ?? raw.access_end_date ?? null,
		pauseEndDate: raw.pauseEndDate ?? raw.pause_end_date ?? null,
		cancellationDate: raw.cancellationDate ?? raw.cancellation_date ?? null,
		cancellationReasonId: raw.cancellationReasonId ?? raw.cancellation_reason ?? null,
		skipCount: Number( raw.skipCount ?? raw.skip_count ?? 0 ),
		maxRenewals: raw.maxRenewals !== undefined ? raw.maxRenewals : ( raw.max_renewals !== undefined ? ( raw.max_renewals === null ? null : Number( raw.max_renewals ) ) : null ),
		maxLengthAt: raw.maxLengthAt ?? raw.max_length_at ?? null,
		churnRiskScore,
		customerLtv: Number( raw.customerLtv ?? raw.customer_ltv ?? 0 ),
		pendingSwitchProduct: raw.pendingSwitchProduct ?? ( raw.pending_switch_product ? String( raw.pending_switch_product) : null ),
		pendingSwitchType: raw.pendingSwitchType ?? raw.pending_switch_type ?? null,
		retentionDiscountRemaining: Number( raw.retentionDiscountRemaining ?? raw.discount_renewals_remaining ?? 0 ),
		discountPercent: raw.discountPercent !== undefined ? raw.discountPercent : ( raw.discount_percent !== undefined ? ( raw.discount_percent === null ? null : Number( raw.discount_percent ) ) : null ),
		cardExpiryDate: raw.cardExpiryDate ?? raw.card_expiry_date ?? null,
		cardExpiring: Boolean( raw.cardExpiring ?? raw.card_expiring ?? false ),
		stepPrice: raw.stepPrice !== undefined ? raw.stepPrice : ( raw.step_price !== undefined ? ( raw.step_price === null ? null : Number( raw.step_price ) ) : null ),
		stepAfter: raw.stepAfter !== undefined ? raw.stepAfter : ( raw.step_after !== undefined ? ( raw.step_after === null ? null : Number( raw.step_after ) ) : null ),
		tags: Array.isArray( raw.tags ) ? raw.tags : [],
	};
}

/**
 * Converts a frontend SubscriptionRecord patch to backend database snake_case fields.
 *
 * @since 1.0.0
 *
 * @description
 * Outbound mutation serializer. Extracts modified properties from a partial frontend
 * `SubscriptionRecord` (camelCase) and translates them into MySQL column names (snake_case)
 * for sending in `PATCH /purecart/v1/subscriptions/{id}` request payloads.
 *
 * @param {Partial<SubscriptionRecord>} patch Partial subscription object containing changed fields.
 *
 * @return {Record<string, unknown>} Database-ready snake_case payload for REST API PATCH requests.
 *
 * @example
 * // Input (from frontend mutation):
 * const patch = {
 *   status: 'paused',
 *   pauseEndDate: '2026-11-01',
 *   amountRaw: 79.00
 * };
 *
 * // Output (sent in HTTP body):
 * const payload = mapRecordToBackendPatch( patch );
 * // payload is:
 * // {
 * //   status: 'paused',
 * //   pause_end_date: '2026-11-01',
 * //   recurring_amount: 79.00
 * // }
 */
export function mapRecordToBackendPatch( patch: Partial< SubscriptionRecord > ): Record< string, any > {
	const result: Record< string, any > = {};

	if ( patch.status !== undefined ) result.status = patch.status;
	if ( patch.nextPayment !== undefined ) result.next_payment_at = patch.nextPayment;
	if ( patch.pauseEndDate !== undefined ) result.pause_end_date = patch.pauseEndDate;
	if ( patch.cancellationDate !== undefined ) result.cancellation_date = patch.cancellationDate;
	if ( patch.cancellationReasonId !== undefined ) result.cancellation_reason = patch.cancellationReasonId;
	if ( patch.amountRaw !== undefined ) result.recurring_amount = patch.amountRaw;
	if ( patch.billing?.interval !== undefined ) result.billing_interval = patch.billing.interval;
	if ( patch.billing?.period !== undefined ) result.billing_period = patch.billing.period;
	if ( patch.skipCount !== undefined ) result.skip_count = patch.skipCount;
	if ( patch.maxRenewals !== undefined ) result.max_renewals = patch.maxRenewals;
	if ( patch.paymentType !== undefined ) result.payment_type = patch.paymentType;
	if ( patch.maxPayments !== undefined ) result.max_payments = patch.maxPayments;
	if ( patch.accessTiming !== undefined ) result.access_timing = patch.accessTiming;
	if ( patch.accessEndDate !== undefined ) result.access_end_date = patch.accessEndDate;
	if ( patch.pendingSwitchProduct !== undefined ) result.pending_switch_product = patch.pendingSwitchProduct;
	if ( patch.pendingSwitchType !== undefined ) result.pending_switch_type = patch.pendingSwitchType;
	if ( patch.churnRiskScore !== undefined ) result.churn_risk_score = patch.churnRiskScore;
	if ( patch.customerLtv !== undefined ) result.customer_ltv = patch.customerLtv;

	return result;
}
