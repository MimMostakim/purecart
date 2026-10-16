/**
 * Subscriptions REST API Module.
 *
 * Handles subscription queries, lifecycle transitions, retention flows,
 * logs, payment ledgers, discounts, and CSV reporting.
 *
 * @file
 * @since 1.0.0
 */

import { purecartFetch, purecartFetchRaw, purecartFetchWithMeta } from '@/shared/api';
import type {
	SubscriptionSettings,
	SubscriptionRecord,
	SubscriptionStatus,
	SubscriptionLogEntry,
	SubscriptionEmailLogEntry,
	PaymentRecord,
	RevenueGoal,
} from './types';
import {
	mapBackendSubscriptionToRecord,
	mapRecordToBackendPatch,
	mapBackendLogToEntry,
	mapBackendPaymentToRecord,
} from './utils';

/**
 * GET /purecart/v1/subscriptions - list all subscriptions.
 *
 * @since 1.0.0
 * @return {Promise<SubscriptionRecord[]>} All subscription records.
 */
export async function fetchSubscriptions(): Promise<SubscriptionRecord[]> {
	const res = await purecartFetch<any[]>('/subscriptions');
	return Array.isArray(res) ? res.map(mapBackendSubscriptionToRecord) : [];
}

/**
 * GET /purecart/v1/subscriptions - how many subscriptions are in one status.
 *
 * Requests a single row and reads WordPress's X-WP-Total header instead of
 * counting a fetched page: callers that only need the number (the top bar's
 * notification feed) would otherwise pull the whole list to count it, and
 * the endpoint caps per_page at 100 anyway.
 *
 * @since 1.1.0
 * @param {SubscriptionStatus} status Status to count.
 * @return {Promise<number>} Number of subscriptions in that status.
 */
export async function fetchSubscriptionCount(status: SubscriptionStatus): Promise<number> {
	const { total } = await purecartFetchWithMeta<unknown[]>('/subscriptions', { status, per_page: 1 });
	return total;
}

/**
 * GET /purecart/v1/subscriptions/{id} - a single subscription.
 *
 * @since 1.0.0
 * @param {string} id Subscription ID, e.g. 'SUB-001'.
 * @return {Promise<SubscriptionRecord|undefined>} The matching record, or undefined if not found.
 */
export async function fetchSubscription(id: string): Promise<SubscriptionRecord | undefined> {
	const numericId = parseInt(id.replace(/\D/g, ''), 10) || id;
	const res = await purecartFetch<any>(`/subscriptions/${numericId}`);
	return res ? mapBackendSubscriptionToRecord(res) : undefined;
}

/**
 * POST /purecart/v1/subscriptions/{id}/early-renewal - early renewal triggered by customer or admin.
 */
export async function earlyRenewSubscription(id: string): Promise<SubscriptionRecord> {
	const numericId = parseInt(id.replace(/\D/g, ''), 10) || id;
	const res = await purecartFetch<any>(`/subscriptions/${numericId}/early-renewal`, {
		method: 'POST',
	});
	return mapBackendSubscriptionToRecord(res);
}

/**
 * POST /purecart/v1/subscriptions/{id}/renew - manual renewal triggered by admin.
 */
export async function renewSubscription(id: string): Promise<SubscriptionRecord> {
	const numericId = parseInt(id.replace(/\D/g, ''), 10) || id;
	const res = await purecartFetch<any>(`/subscriptions/${numericId}/renew`, {
		method: 'POST',
	});
	return mapBackendSubscriptionToRecord(res);
}

/**
 * POST /purecart/v1/subscriptions/{id}/pause - pause an active subscription.
 */
export async function pauseSubscription(id: string, resumeAt?: string | null): Promise<SubscriptionRecord> {
	const numericId = parseInt(id.replace(/\D/g, ''), 10) || id;
	const res = await purecartFetch<any>(`/subscriptions/${numericId}/pause`, {
		method: 'POST',
		data: { resume_at: resumeAt },
	});
	return mapBackendSubscriptionToRecord(res);
}

/**
 * POST /purecart/v1/subscriptions/{id}/resume - resume a paused subscription.
 */
export async function resumeSubscription(id: string): Promise<SubscriptionRecord> {
	const numericId = parseInt(id.replace(/\D/g, ''), 10) || id;
	const res = await purecartFetch<any>(`/subscriptions/${numericId}/resume`, {
		method: 'POST',
	});
	return mapBackendSubscriptionToRecord(res);
}

/**
 * POST /purecart/v1/subscriptions/{id}/cancel - cancel a subscription.
 */
export async function cancelSubscription(id: string, immediately: boolean = true, reason?: string | null): Promise<SubscriptionRecord> {
	const numericId = parseInt(id.replace(/\D/g, ''), 10) || id;
	const res = await purecartFetch<any>(`/subscriptions/${numericId}/cancel`, {
		method: 'POST',
		data: { immediately, reason },
	});
	return mapBackendSubscriptionToRecord(res);
}

/**
 * GET /purecart/v1/subscriptions/{id}/cancellation/reasons
 */
export async function fetchCancellationReasons(id?: string): Promise<Record<string, string>> {
	const numericId = id ? parseInt(id.replace(/\D/g, ''), 10) || 1 : 1;
	return purecartFetch<Record<string, string>>(`/subscriptions/${numericId}/cancellation/reasons`);
}

/**
 * GET /purecart/v1/subscriptions/{id}/cancellation/offers?reason=...
 */
export async function fetchCancellationOffers(id: string, reason: string): Promise<any[]> {
	const numericId = parseInt(id.replace(/\D/g, ''), 10) || id;
	return purecartFetch<any[]>(`/subscriptions/${numericId}/cancellation/offers?reason=${encodeURIComponent(reason)}`);
}

/**
 * POST /purecart/v1/subscriptions/{id}/cancellation/accept-offer
 */
export async function acceptCancellationOffer(id: string, offerType: string, reason: string): Promise<SubscriptionRecord> {
	const numericId = parseInt(id.replace(/\D/g, ''), 10) || id;
	const res = await purecartFetch<any>(`/subscriptions/${numericId}/cancellation/accept-offer`, {
		method: 'POST',
		data: { offer_type: offerType, reason },
	});
	return mapBackendSubscriptionToRecord(res);
}

/**
 * POST /purecart/v1/subscriptions/{id}/skip - skip next renewal cycle.
 */
export async function skipSubscription(id: string): Promise<SubscriptionRecord> {
	const numericId = parseInt(id.replace(/\D/g, ''), 10) || id;
	const res = await purecartFetch<any>(`/subscriptions/${numericId}/skip`, {
		method: 'POST',
	});
	return mapBackendSubscriptionToRecord(res);
}

/**
 * POST /purecart/v1/subscriptions/{id}/retry-payment - retry failed charge.
 */
export async function retryPaymentSubscription(id: string): Promise<SubscriptionRecord> {
	const numericId = parseInt(id.replace(/\D/g, ''), 10) || id;
	const res = await purecartFetch<any>(`/subscriptions/${numericId}/retry-payment`, {
		method: 'POST',
	});
	return mapBackendSubscriptionToRecord(res);
}

/**
 * POST /purecart/v1/subscriptions/{id}/upgrade - switch product plan/tier with proration.
 */
export async function upgradeSubscription(
	id: string,
	params: {
		productId?: number;
		cycle?: string;
		planLabel?: string;
		amount?: number;
		mode?: 'prorate_immediately' | 'apply_at_renewal' | 'no_proration';
	}
): Promise<SubscriptionRecord> {
	const { productId, cycle, planLabel, amount, mode = 'apply_at_renewal' } = params;
	const numericId = parseInt(id.replace(/\D/g, ''), 10) || id;
	const res = await purecartFetch<any>(`/subscriptions/${numericId}/upgrade`, {
		method: 'POST',
		data: {
			product_id: productId,
			cycle,
			plan_label: planLabel,
			amount,
			mode,
		},
	});
	return mapBackendSubscriptionToRecord(res);
}

/**
 * POST /purecart/v1/subscriptions/{id}/discount - apply manual admin discount.
 */
export async function applySubscriptionDiscount(
	id: string,
	percent: number,
	duration: string,
	cycles?: number
): Promise<SubscriptionRecord> {
	const numericId = parseInt(id.replace(/\D/g, ''), 10) || id;
	const res = await purecartFetch<any>(`/subscriptions/${numericId}/discount`, {
		method: 'POST',
		data: { percent, duration, cycles },
	});
	return mapBackendSubscriptionToRecord(res);
}

/**
 * POST /purecart/v1/subscriptions/{id}/send-card-update - generates magic card-update link.
 */
export async function sendCardUpdate(id: string): Promise<{ token: string; url: string }> {
	const numericId = parseInt(id.replace(/\D/g, ''), 10) || id;
	return await purecartFetch<{ token: string; url: string }>(`/subscriptions/${numericId}/send-card-update`, {
		method: 'POST',
	});
}

/**
 * POST /purecart/v1/subscriptions/{id}/resubscribe - reactivates or clones subscription.
 */
export async function resubscribeSubscription(id: string): Promise<SubscriptionRecord> {
	const numericId = parseInt(id.replace(/\D/g, ''), 10) || id;
	const res = await purecartFetch<any>(`/subscriptions/${numericId}/resubscribe`, {
		method: 'POST',
	});
	return mapBackendSubscriptionToRecord(res);
}

/**
 * GET /purecart/v1/subscriptions/export - trigger browser download of CSV report.
 */
export async function exportSubscriptionsCsv(status?: string): Promise<void> {
	const params = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
	const res = await purecartFetchRaw(`/subscriptions/export${params}`, { method: 'GET' });

	const blob = await res.blob();
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.setAttribute('download', `purecart-subscriptions-${new Date().toISOString().slice(0, 10)}.csv`);
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}

/**
 * DELETE /purecart/v1/subscriptions/{id} - permanently delete subscription record.
 */
export async function deleteSubscription(id: string): Promise<{ deleted: boolean; id: string }> {
	const numericId = parseInt(id.replace(/\D/g, ''), 10) || id;
	return await purecartFetch<{ deleted: boolean; id: string }>(`/subscriptions/${numericId}`, {
		method: 'DELETE',
	});
}

/**
 * Generic patch used by row-action mutations. Routes to dedicated action endpoints when live.
 *
 * @since 1.0.0
 * @param {string}                        id    Subscription ID to update.
 * @param {Partial<SubscriptionRecord>}   patch Fields to merge into the record.
 * @return {Promise<SubscriptionRecord>} The updated record.
 */
export async function updateSubscription(
	id: string,
	patch: Partial<SubscriptionRecord>
): Promise<SubscriptionRecord> {
	if (patch.status === 'paused') {
		return pauseSubscription(id, patch.pauseEndDate);
	}
	if (patch.status === 'active') {
		return resumeSubscription(id);
	}
	if (patch.status === 'cancelled' || patch.status === 'pending_cancel') {
		return cancelSubscription(id, patch.status === 'cancelled');
	}
	if (patch.skipCount !== undefined) {
		return skipSubscription(id);
	}

	const numericId = parseInt(id.replace(/\D/g, ''), 10) || id;
	const backendPayload = mapRecordToBackendPatch(patch);
	const res = await purecartFetch<any>(`/subscriptions/${numericId}`, {
		method: 'PATCH',
		data: backendPayload,
	});
	return mapBackendSubscriptionToRecord(res);
}

/**
 * GET /purecart/v1/subscriptions/{id}/logs - the status-history event log.
 *
 * @since 1.0.0
 * @param {string} id Subscription ID.
 * @return {Promise<SubscriptionLogEntry[]>} That subscription's log entries.
 */
export async function fetchSubscriptionLogs(id: string): Promise<SubscriptionLogEntry[]> {
	const numericId = parseInt(id.replace(/\D/g, ''), 10) || id;
	const res = await purecartFetch<any[]>(`/subscriptions/${numericId}/logs`);
	return Array.isArray(res) ? res.map(mapBackendLogToEntry) : [];
}

/**
 * Emails-sent history for one subscription.
 *
 * @since 1.0.0
 * @param {string} id Subscription ID.
 * @return {Promise<SubscriptionEmailLogEntry[]>} That subscription's sent-email log.
 */
export async function fetchSubscriptionEmails(id: string): Promise<SubscriptionEmailLogEntry[]> {
	const numericId = parseInt(id.replace(/\D/g, ''), 10) || id;
	return purecartFetch<SubscriptionEmailLogEntry[]>(`/subscriptions/${numericId}/emails`);
}

/**
 * Per-charge payment ledger for one subscription.
 *
 * @since 1.0.0
 * @param {string} id Subscription ID.
 * @return {Promise<PaymentRecord[]>} That subscription's payment records.
 */
export async function fetchPaymentHistory(id: string): Promise<PaymentRecord[]> {
	const numericId = parseInt(id.replace(/\D/g, ''), 10) || id;
	const res = await purecartFetch<any[]>(`/subscriptions/${numericId}/payments`);
	return Array.isArray(res) ? res.map(mapBackendPaymentToRecord) : [];
}

// ─── Settings API ──────────────────────────────────────────────────────

interface RawSubscriptionSettings {
	enable_subscriptions: boolean;
	enable_auto_renewal: boolean;
	allow_mixed_cart: boolean;
	one_trial_per_customer: boolean;
	allow_multiple_subscriptions: boolean;
	avg_lifetime_months: number;
	max_retry_attempts: number;
	retry_interval_days: number[];
	active_grace_days: number;
	suspended_grace_days: number;
	send_dunning_emails: boolean;
	renewal_reminder_days: number[];
	trial_reminder_days: number;
	card_expiry_warning_days: number;
	enable_renewal_sync: boolean;
	renewal_sync_date: number;
	default_proration_mode: string;
	allow_customer_upgrade: boolean;
	retention_flow_enabled: boolean;
	allow_self_pause: boolean;
	allow_self_cancel: boolean;
	allow_early_renewal: boolean;
	allow_skip_renewal: boolean;
	skip_limit_per_year: number;
	resubscribe_window_days: number;
	trial_role: string | null;
	active_role: string | null;
	cancelled_role: string | null;
	subscribe_save_enabled: boolean;
	discount_type: string;
	discount_value: number;
	savings_badge_label: string;
	staging_domains: string;
	gateway_meta_keys: string;
	cancel_saas_immediately: boolean;
	debug_mode: boolean;
	retention_discount_percent: number;
	retention_discount_cycles: number;
	retention_pause_days: number;
	retention_contact_url: string;
	membership_grace_days: number;
	content_restriction_plugin: string;
	available_tiers: string;
	allow_self_tier_upgrade: boolean;
	download_limit_per_cycle: number;
	reset_downloads_on_renewal: boolean;
	enable_drip_content: boolean;
	drip_interval_days: number;
	lms_integration: string;
	lms_api_key: string;
	default_course_access_months: number;
	enroll_on_trial_start: boolean;
	revoke_enrollment_on_cancel: boolean;
	default_invoicing_mode: string;
	invoice_due_days: number;
	enable_deliverable_tracking: boolean;
	default_deliverable_template: string;
}

function mapRawToSettings( raw: RawSubscriptionSettings ): SubscriptionSettings {
	return {
		enableSubscriptions: raw.enable_subscriptions,
		enableAutoRenewal: raw.enable_auto_renewal,
		allowMixedCart: raw.allow_mixed_cart,
		oneTrialPerCustomer: raw.one_trial_per_customer,
		allowMultipleSubscriptions: raw.allow_multiple_subscriptions,
		avgLifetimeMonths: raw.avg_lifetime_months,
		maxRetryAttempts: raw.max_retry_attempts,
		retryIntervalDays: raw.retry_interval_days,
		activeGraceDays: raw.active_grace_days,
		suspendedGraceDays: raw.suspended_grace_days,
		sendDunningEmails: raw.send_dunning_emails,
		renewalReminderDays: raw.renewal_reminder_days,
		trialReminderDays: raw.trial_reminder_days,
		cardExpiryWarningDays: raw.card_expiry_warning_days,
		enableRenewalSync: raw.enable_renewal_sync,
		renewalSyncDate: raw.renewal_sync_date,
		defaultProrationMode: raw.default_proration_mode as SubscriptionSettings[ 'defaultProrationMode' ],
		allowCustomerUpgrade: raw.allow_customer_upgrade,
		retentionFlowEnabled: raw.retention_flow_enabled,
		retentionDiscountPercent: raw.retention_discount_percent,
		retentionDiscountCycles: raw.retention_discount_cycles,
		retentionPauseDays: raw.retention_pause_days,
		retentionContactUrl: raw.retention_contact_url,
		allowSelfPause: raw.allow_self_pause,
		allowSelfCancel: raw.allow_self_cancel,
		allowEarlyRenewal: raw.allow_early_renewal,
		allowSkipRenewal: raw.allow_skip_renewal,
		skipLimitPerYear: raw.skip_limit_per_year,
		resubscribeWindowDays: raw.resubscribe_window_days,
		trialRole: raw.trial_role,
		activeRole: raw.active_role,
		cancelledRole: raw.cancelled_role,
		subscribeSaveEnabled: raw.subscribe_save_enabled,
		discountType: raw.discount_type as SubscriptionSettings[ 'discountType' ],
		discountValue: raw.discount_value,
		savingsBadgeLabel: raw.savings_badge_label,
		stagingDomains: raw.staging_domains,
		gatewayMetaKeys: raw.gateway_meta_keys,
		cancelSaasImmediately: raw.cancel_saas_immediately,
		debugMode: raw.debug_mode,
		membershipGraceDays: raw.membership_grace_days,
		contentRestrictionPlugin: raw.content_restriction_plugin,
		availableTiers: raw.available_tiers,
		allowSelfTierUpgrade: raw.allow_self_tier_upgrade,
		downloadLimitPerCycle: raw.download_limit_per_cycle,
		resetDownloadsOnRenewal: raw.reset_downloads_on_renewal,
		enableDripContent: raw.enable_drip_content,
		dripIntervalDays: raw.drip_interval_days,
		lmsIntegration: raw.lms_integration as SubscriptionSettings[ 'lmsIntegration' ],
		lmsApiKey: raw.lms_api_key,
		defaultCourseAccessMonths: raw.default_course_access_months,
		enrollOnTrialStart: raw.enroll_on_trial_start,
		revokeEnrollmentOnCancel: raw.revoke_enrollment_on_cancel,
		defaultInvoicingMode: raw.default_invoicing_mode as SubscriptionSettings[ 'defaultInvoicingMode' ],
		invoiceDueDays: raw.invoice_due_days,
		enableDeliverableTracking: raw.enable_deliverable_tracking,
		defaultDeliverableTemplate: raw.default_deliverable_template,
	};
}

function mapSettingsToRaw( settings: SubscriptionSettings ): Record< string, unknown > {
	return {
		enable_subscriptions: settings.enableSubscriptions,
		enable_auto_renewal: settings.enableAutoRenewal,
		allow_mixed_cart: settings.allowMixedCart,
		one_trial_per_customer: settings.oneTrialPerCustomer,
		allow_multiple_subscriptions: settings.allowMultipleSubscriptions,
		avg_lifetime_months: settings.avgLifetimeMonths,
		max_retry_attempts: settings.maxRetryAttempts,
		retry_interval_days: settings.retryIntervalDays,
		active_grace_days: settings.activeGraceDays,
		suspended_grace_days: settings.suspendedGraceDays,
		send_dunning_emails: settings.sendDunningEmails,
		renewal_reminder_days: settings.renewalReminderDays,
		trial_reminder_days: settings.trialReminderDays,
		card_expiry_warning_days: settings.cardExpiryWarningDays,
		enable_renewal_sync: settings.enableRenewalSync,
		renewal_sync_date: settings.renewalSyncDate,
		default_proration_mode: settings.defaultProrationMode,
		allow_customer_upgrade: settings.allowCustomerUpgrade,
		retention_flow_enabled: settings.retentionFlowEnabled,
		retention_discount_percent: settings.retentionDiscountPercent,
		retention_discount_cycles: settings.retentionDiscountCycles,
		retention_pause_days: settings.retentionPauseDays,
		retention_contact_url: settings.retentionContactUrl,
		allow_self_pause: settings.allowSelfPause,
		allow_self_cancel: settings.allowSelfCancel,
		allow_early_renewal: settings.allowEarlyRenewal,
		allow_skip_renewal: settings.allowSkipRenewal,
		skip_limit_per_year: settings.skipLimitPerYear,
		resubscribe_window_days: settings.resubscribeWindowDays,
		trial_role: settings.trialRole,
		active_role: settings.activeRole,
		cancelled_role: settings.cancelledRole,
		subscribe_save_enabled: settings.subscribeSaveEnabled,
		discount_type: settings.discountType,
		discount_value: settings.discountValue,
		savings_badge_label: settings.savingsBadgeLabel,
		staging_domains: settings.stagingDomains,
		gateway_meta_keys: settings.gatewayMetaKeys,
		cancel_saas_immediately: settings.cancelSaasImmediately,
		debug_mode: settings.debugMode,
		membership_grace_days: settings.membershipGraceDays,
		content_restriction_plugin: settings.contentRestrictionPlugin,
		available_tiers: settings.availableTiers,
		allow_self_tier_upgrade: settings.allowSelfTierUpgrade,
		download_limit_per_cycle: settings.downloadLimitPerCycle,
		reset_downloads_on_renewal: settings.resetDownloadsOnRenewal,
		enable_drip_content: settings.enableDripContent,
		drip_interval_days: settings.dripIntervalDays,
		lms_integration: settings.lmsIntegration,
		lms_api_key: settings.lmsApiKey,
		default_course_access_months: settings.defaultCourseAccessMonths,
		enroll_on_trial_start: settings.enrollOnTrialStart,
		revoke_enrollment_on_cancel: settings.revokeEnrollmentOnCancel,
		default_invoicing_mode: settings.defaultInvoicingMode,
		invoice_due_days: settings.invoiceDueDays,
		enable_deliverable_tracking: settings.enableDeliverableTracking,
		default_deliverable_template: settings.defaultDeliverableTemplate,
	};
}

/**
 * GET /purecart/v1/subscriptions/settings
 *
 * @since 1.0.0
 */
export async function fetchSubscriptionSettings(): Promise< SubscriptionSettings > {
	const raw = await purecartFetch< RawSubscriptionSettings >( '/subscriptions/settings' );
	return mapRawToSettings( raw );
}

/**
 * POST /purecart/v1/subscriptions/settings
 *
 * @since 1.0.0
 */
export async function saveSubscriptionSettings( settings: SubscriptionSettings ): Promise< void > {
	await purecartFetch( '/subscriptions/settings', {
		method: 'POST',
		data: mapSettingsToRaw( settings ),
	} );
}

// ─── Revenue Goals API ────────────────────────────────────────────────

export async function createRevenueGoal(
	goal: Omit< RevenueGoal, 'id' | 'current' | 'status' >
): Promise< RevenueGoal > {
	return purecartFetch< RevenueGoal >( '/subscriptions/revenue-goals', {
		method: 'POST',
		data: goal,
	} );
}

export async function deleteRevenueGoal( id: string ): Promise< void > {
	await purecartFetch( `/subscriptions/revenue-goals/${ id }`, {
		method: 'DELETE',
	} );
}

// ─── Roles API ────────────────────────────────────────────────────────

export interface WpRole {
	label: string;
	value: string;
}

export async function fetchWpRoles(): Promise< WpRole[] > {
	return purecartFetch< WpRole[] >( '/subscriptions/roles' );
}
