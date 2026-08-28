/**
 * Subscriptions REST API Module.
 *
 * Handles subscription queries, lifecycle transitions, retention flows,
 * logs, payment ledgers, discounts, and CSV reporting.
 *
 * @file
 * @since 1.0.0
 */

import { apiFetch, delay, USE_DUMMY_DATA, getApiBase, getRestNonce } from '../client';
import {
	subscriptionsData,
	subscriptionLogsData,
	subscriptionEmailsData,
	paymentHistory,
} from '../../utils/static-data';
import type {
	SubscriptionRecord,
	SubscriptionLogEntry,
	SubscriptionEmailLogEntry,
	PaymentRecord,
} from '../../components/Subscriptions/types';
import {
	mapBackendSubscriptionToRecord,
	mapRecordToBackendPatch,
	mapBackendLogToEntry,
	mapBackendPaymentToRecord,
	addBillingInterval,
} from '../../components/Subscriptions/utils';

// In-memory mutable copy so dummy "writes" (pause/cancel/update) persist
// across calls within a session, the same way a real backend would persist
// them in the database. Reset on a full page reload, same as any client cache.
let dummySubscriptions: SubscriptionRecord[] = [...subscriptionsData];

/**
 * Filters & paginates dummy subscriptions for seamless mock testing.
 *
 * @since 1.0.0
 * @param {Record<string, unknown>} [params] Query filters and pagination.
 * @return {Promise<{items: SubscriptionRecord[], total: number, totalPages: number}>}
 */
export async function getDummySubscriptionsPaginated(params?: Record<string, unknown>) {
	const search = String(params?.search ?? '').toLowerCase();
	const status = String(params?.status ?? 'All');
	const product = String(params?.product ?? 'All');
	const cycle = String(params?.cycle ?? 'All');
	const deliveryType = String(params?.deliveryType ?? 'All');
	const paymentType = String(params?.paymentType ?? 'All');
	const churnRisk = String(params?.churnRisk ?? 'All');
	const page = Math.max(1, Number(params?.page ?? 1));
	const perPage = Math.max(1, Number(params?.per_page ?? 10));

	const filtered = dummySubscriptions.filter((r) => {
		const matchSearch =
			!search ||
			r.customer.toLowerCase().includes(search) ||
			r.product.toLowerCase().includes(search) ||
			r.id.toLowerCase().includes(search);
		const matchStatus = status === 'All' || r.status === status.toLowerCase().replace(/ /g, '_');
		const matchProduct = product === 'All' || r.product === product;
		const matchCycle = cycle === 'All' || r.cycle === cycle;
		const matchType = deliveryType === 'All' || r.deliveryType === deliveryType.toLowerCase();
		const matchPaymentType = paymentType === 'All' || r.paymentType === paymentType.toLowerCase();
		const matchChurnRisk =
			churnRisk === 'All' ||
			(churnRisk.toLowerCase() === 'low'
				? r.churnRiskScore <= 25
				: churnRisk.toLowerCase() === 'medium'
					? r.churnRiskScore > 25 && r.churnRiskScore <= 50
					: churnRisk.toLowerCase() === 'high'
						? r.churnRiskScore > 50 && r.churnRiskScore <= 75
						: r.churnRiskScore > 75);
		return (
			matchSearch &&
			matchStatus &&
			matchProduct &&
			matchCycle &&
			matchType &&
			matchPaymentType &&
			matchChurnRisk
		);
	});

	const total = filtered.length;
	const totalPages = Math.max(1, Math.ceil(total / perPage));
	const items = filtered.slice((page - 1) * perPage, page * perPage);

	return delay({ items, total, totalPages });
}

/**
 * GET /purecart/v1/subscriptions - list all subscriptions.
 *
 * @since 1.0.0
 * @return {Promise<SubscriptionRecord[]>} All subscription records.
 */
export async function fetchSubscriptions(): Promise<SubscriptionRecord[]> {
	if (USE_DUMMY_DATA) return delay([...dummySubscriptions]);
	const res = await apiFetch<any[]>('/subscriptions');
	return Array.isArray(res) ? res.map(mapBackendSubscriptionToRecord) : [];
}

/**
 * GET /purecart/v1/subscriptions/{id} - a single subscription.
 *
 * @since 1.0.0
 * @param {string} id Subscription ID, e.g. 'SUB-001'.
 * @return {Promise<SubscriptionRecord|undefined>} The matching record, or undefined if not found.
 */
export async function fetchSubscription(id: string): Promise<SubscriptionRecord | undefined> {
	if (USE_DUMMY_DATA) return delay(dummySubscriptions.find((r) => r.id === id));
	const numericId = parseInt(id.replace(/\D/g, ''), 10) || id;
	const res = await apiFetch<any>(`/subscriptions/${numericId}`);
	return res ? mapBackendSubscriptionToRecord(res) : undefined;
}

/**
 * POST /purecart/v1/subscriptions/{id}/early-renewal - early renewal triggered by customer or admin.
 */
export async function earlyRenewSubscription(id: string): Promise<SubscriptionRecord> {
	if (USE_DUMMY_DATA) {
		const sub = dummySubscriptions.find((r) => r.id === id);
		if (!sub) throw new Error(`Subscription ${id} not found`);
		const updated: SubscriptionRecord = {
			...sub,
			status: 'active',
			nextPayment: addBillingInterval(null, sub.billing),
			renewalCount: (sub.renewalCount || 0) + 1,
		};
		dummySubscriptions = dummySubscriptions.map((r) => (r.id === id ? updated : r));
		return delay(updated, 200);
	}
	const numericId = parseInt(id.replace(/\D/g, ''), 10) || id;
	const res = await apiFetch<any>(`/subscriptions/${numericId}/early-renewal`, {
		method: 'POST',
	});
	return mapBackendSubscriptionToRecord(res);
}

/**
 * POST /purecart/v1/subscriptions/{id}/renew - manual renewal triggered by admin.
 */
export async function renewSubscription(id: string): Promise<SubscriptionRecord> {
	if (USE_DUMMY_DATA) {
		return earlyRenewSubscription(id);
	}
	const numericId = parseInt(id.replace(/\D/g, ''), 10) || id;
	const res = await apiFetch<any>(`/subscriptions/${numericId}/renew`, {
		method: 'POST',
	});
	return mapBackendSubscriptionToRecord(res);
}

/**
 * POST /purecart/v1/subscriptions/{id}/pause - pause an active subscription.
 */
export async function pauseSubscription(id: string, resumeAt?: string | null): Promise<SubscriptionRecord> {
	if (USE_DUMMY_DATA) {
		const sub = dummySubscriptions.find((r) => r.id === id);
		if (!sub) throw new Error(`Subscription ${id} not found`);
		const updated: SubscriptionRecord = { ...sub, status: 'paused', nextPayment: null, pauseEndDate: resumeAt ?? null };
		dummySubscriptions = dummySubscriptions.map((r) => (r.id === id ? updated : r));
		return delay(updated, 200);
	}
	const numericId = parseInt(id.replace(/\D/g, ''), 10) || id;
	const res = await apiFetch<any>(`/subscriptions/${numericId}/pause`, {
		method: 'POST',
		body: JSON.stringify({ resume_at: resumeAt }),
	});
	return mapBackendSubscriptionToRecord(res);
}

/**
 * POST /purecart/v1/subscriptions/{id}/resume - resume a paused subscription.
 */
export async function resumeSubscription(id: string): Promise<SubscriptionRecord> {
	if (USE_DUMMY_DATA) {
		const sub = dummySubscriptions.find((r) => r.id === id);
		if (!sub) throw new Error(`Subscription ${id} not found`);
		const updated: SubscriptionRecord = { ...sub, status: 'active', nextPayment: addBillingInterval(null, sub.billing), pauseEndDate: null };
		dummySubscriptions = dummySubscriptions.map((r) => (r.id === id ? updated : r));
		return delay(updated, 200);
	}
	const numericId = parseInt(id.replace(/\D/g, ''), 10) || id;
	const res = await apiFetch<any>(`/subscriptions/${numericId}/resume`, {
		method: 'POST',
	});
	return mapBackendSubscriptionToRecord(res);
}

/**
 * POST /purecart/v1/subscriptions/{id}/cancel - cancel a subscription.
 */
export async function cancelSubscription(id: string, immediately: boolean = true, reason?: string | null): Promise<SubscriptionRecord> {
	if (USE_DUMMY_DATA) {
		const sub = dummySubscriptions.find((r) => r.id === id);
		if (!sub) throw new Error(`Subscription ${id} not found`);
		const updated: SubscriptionRecord = { ...sub, status: immediately ? 'cancelled' : 'pending_cancel' };
		dummySubscriptions = dummySubscriptions.map((r) => (r.id === id ? updated : r));
		return delay(updated, 200);
	}
	const numericId = parseInt(id.replace(/\D/g, ''), 10) || id;
	const res = await apiFetch<any>(`/subscriptions/${numericId}/cancel`, {
		method: 'POST',
		body: JSON.stringify({ immediately, reason }),
	});
	return mapBackendSubscriptionToRecord(res);
}

/**
 * GET /purecart/v1/subscriptions/{id}/cancellation/reasons
 */
export async function fetchCancellationReasons(id?: string): Promise<Record<string, string>> {
	if (USE_DUMMY_DATA) {
		return delay({
			too_expensive: 'Too expensive',
			not_using: 'Not using it',
			missing_features: 'Missing features',
			switching: 'Switching provider',
			pausing: 'Pausing use for now',
			other: 'Other',
		});
	}
	const numericId = id ? parseInt(id.replace(/\D/g, ''), 10) || 1 : 1;
	return apiFetch<Record<string, string>>(`/subscriptions/${numericId}/cancellation/reasons`);
}

/**
 * GET /purecart/v1/subscriptions/{id}/cancellation/offers?reason=...
 */
export async function fetchCancellationOffers(id: string, reason: string): Promise<any[]> {
	if (USE_DUMMY_DATA) {
		return delay([]);
	}
	const numericId = parseInt(id.replace(/\D/g, ''), 10) || id;
	return apiFetch<any[]>(`/subscriptions/${numericId}/cancellation/offers?reason=${encodeURIComponent(reason)}`);
}

/**
 * POST /purecart/v1/subscriptions/{id}/cancellation/accept-offer
 */
export async function acceptCancellationOffer(id: string, offerType: string, reason: string): Promise<SubscriptionRecord> {
	if (USE_DUMMY_DATA) {
		const sub = dummySubscriptions.find((r) => r.id === id);
		if (!sub) throw new Error(`Subscription ${id} not found`);
		return delay(sub, 200);
	}
	const numericId = parseInt(id.replace(/\D/g, ''), 10) || id;
	const res = await apiFetch<any>(`/subscriptions/${numericId}/cancellation/accept-offer`, {
		method: 'POST',
		body: JSON.stringify({ offer_type: offerType, reason }),
	});
	return mapBackendSubscriptionToRecord(res);
}

/**
 * POST /purecart/v1/subscriptions/{id}/skip - skip next renewal cycle.
 */
export async function skipSubscription(id: string): Promise<SubscriptionRecord> {
	if (USE_DUMMY_DATA) {
		const sub = dummySubscriptions.find((r) => r.id === id);
		if (!sub) throw new Error(`Subscription ${id} not found`);
		const updated: SubscriptionRecord = { ...sub, nextPayment: addBillingInterval(sub.nextPayment, sub.billing), skipCount: (sub.skipCount || 0) + 1 };
		dummySubscriptions = dummySubscriptions.map((r) => (r.id === id ? updated : r));
		return delay(updated, 200);
	}
	const numericId = parseInt(id.replace(/\D/g, ''), 10) || id;
	const res = await apiFetch<any>(`/subscriptions/${numericId}/skip`, {
		method: 'POST',
	});
	return mapBackendSubscriptionToRecord(res);
}

/**
 * POST /purecart/v1/subscriptions/{id}/retry-payment - retry failed charge.
 */
export async function retryPaymentSubscription(id: string): Promise<SubscriptionRecord> {
	if (USE_DUMMY_DATA) {
		const sub = dummySubscriptions.find((r) => r.id === id);
		if (!sub) throw new Error(`Subscription ${id} not found`);
		const updated: SubscriptionRecord = { ...sub, status: 'active', nextPayment: addBillingInterval(null, sub.billing) };
		dummySubscriptions = dummySubscriptions.map((r) => (r.id === id ? updated : r));
		return delay(updated, 200);
	}
	const numericId = parseInt(id.replace(/\D/g, ''), 10) || id;
	const res = await apiFetch<any>(`/subscriptions/${numericId}/retry-payment`, {
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
	if (USE_DUMMY_DATA) {
		const sub = dummySubscriptions.find((r) => r.id === id);
		if (!sub) throw new Error(`Subscription ${id} not found`);
		const updated: SubscriptionRecord = {
			...sub,
			pendingSwitchProduct: mode === 'apply_at_renewal' ? (planLabel || String(productId || 'Plan')) : null,
			pendingSwitchType: mode === 'apply_at_renewal' ? 'upgrade' : null,
		};
		dummySubscriptions = dummySubscriptions.map((r) => (r.id === id ? updated : r));
		return delay(updated, 200);
	}
	const numericId = parseInt(id.replace(/\D/g, ''), 10) || id;
	const res = await apiFetch<any>(`/subscriptions/${numericId}/upgrade`, {
		method: 'POST',
		body: JSON.stringify({
			product_id: productId,
			cycle,
			plan_label: planLabel,
			amount,
			mode,
		}),
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
	if (USE_DUMMY_DATA) {
		const sub = dummySubscriptions.find((r) => r.id === id);
		if (!sub) throw new Error(`Subscription ${id} not found`);
		const rem = duration === 'Forever' ? 999 : (cycles || parseInt(duration, 10) || 1);
		const updated: SubscriptionRecord = {
			...sub,
			discountPercent: percent,
			retentionDiscountRemaining: rem,
		};
		dummySubscriptions = dummySubscriptions.map((r) => (r.id === id ? updated : r));
		return delay(updated, 200);
	}
	const numericId = parseInt(id.replace(/\D/g, ''), 10) || id;
	const res = await apiFetch<any>(`/subscriptions/${numericId}/discount`, {
		method: 'POST',
		body: JSON.stringify({ percent, duration, cycles }),
	});
	return mapBackendSubscriptionToRecord(res);
}

/**
 * POST /purecart/v1/subscriptions/{id}/send-card-update - generates magic card-update link.
 */
export async function sendCardUpdate(id: string): Promise<{ token: string; url: string }> {
	if (USE_DUMMY_DATA) {
		const dummyToken = 'tok_' + Math.random().toString(36).slice(2, 10);
		return delay({
			token: dummyToken,
			url: `${window.location.origin}/?purecart_subscription=${id}&purecart_token=${dummyToken}`,
		}, 200);
	}
	const numericId = parseInt(id.replace(/\D/g, ''), 10) || id;
	return await apiFetch<{ token: string; url: string }>(`/subscriptions/${numericId}/send-card-update`, {
		method: 'POST',
	});
}

/**
 * POST /purecart/v1/subscriptions/{id}/resubscribe - reactivates or clones subscription.
 */
export async function resubscribeSubscription(id: string): Promise<SubscriptionRecord> {
	if (USE_DUMMY_DATA) {
		const sub = dummySubscriptions.find((r) => r.id === id);
		if (!sub) throw new Error(`Subscription ${id} not found`);
		const updated: SubscriptionRecord = {
			...sub,
			status: 'active',
			cancellationDate: null,
			cancellationReasonId: null,
			nextPayment: addBillingInterval(null, sub.billing),
		};
		dummySubscriptions = dummySubscriptions.map((r) => (r.id === id ? updated : r));
		return delay(updated, 200);
	}
	const numericId = parseInt(id.replace(/\D/g, ''), 10) || id;
	const res = await apiFetch<any>(`/subscriptions/${numericId}/resubscribe`, {
		method: 'POST',
	});
	return mapBackendSubscriptionToRecord(res);
}

/**
 * GET /purecart/v1/subscriptions/export - trigger browser download of CSV report.
 */
export async function exportSubscriptionsCsv(status?: string): Promise<void> {
	if (USE_DUMMY_DATA) {
		const filtered = status && status !== 'all'
			? dummySubscriptions.filter((s) => s.status.toLowerCase() === status.toLowerCase())
			: dummySubscriptions;
		const headers = ['ID', 'Customer Name', 'Email', 'Plan', 'Billing Cycle', 'Amount', 'Status', 'Start Date', 'Next Payment'];
		const rows = filtered.map((s) => [
			s.id,
			`"${(s.customer?.name || '').replace(/"/g, '""')}"`,
			`"${(s.customer?.email || '').replace(/"/g, '""')}"`,
			`"${(s.plan || '').replace(/"/g, '""')}"`,
			`"${(s.billing || '').replace(/"/g, '""')}"`,
			s.amount,
			s.status,
			s.startDate || '',
			s.nextPayment || '',
		]);
		const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
		const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.setAttribute('download', `purecart-subscriptions-${new Date().toISOString().slice(0, 10)}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
		return;
	}

	const params = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
	const apiBase = getApiBase();
	const res = await fetch(`${apiBase}/subscriptions/export${params}`, {
		method: 'GET',
		headers: {
			'X-WP-Nonce': getRestNonce(),
		},
	});

	if (!res.ok) {
		throw new Error(`Failed to export subscriptions CSV: ${res.status} ${res.statusText}`);
	}

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
	if (USE_DUMMY_DATA) {
		dummySubscriptions = dummySubscriptions.filter((r) => r.id !== id);
		return delay({ deleted: true, id }, 200);
	}
	const numericId = parseInt(id.replace(/\D/g, ''), 10) || id;
	return await apiFetch<{ deleted: boolean; id: string }>(`/subscriptions/${numericId}`, {
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
	if (USE_DUMMY_DATA) {
		dummySubscriptions = dummySubscriptions.map((r) =>
			r.id === id ? { ...r, ...patch } : r
		);
		const updated = dummySubscriptions.find((r) => r.id === id);
		if (!updated) throw new Error(`Subscription ${id} not found`);
		return delay(updated, 200);
	}

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
	const res = await apiFetch<any>(`/subscriptions/${numericId}`, {
		method: 'PATCH',
		body: JSON.stringify(backendPayload),
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
	if (USE_DUMMY_DATA) return delay(subscriptionLogsData[id] ?? []);
	const numericId = parseInt(id.replace(/\D/g, ''), 10) || id;
	const res = await apiFetch<any[]>(`/subscriptions/${numericId}/logs`);
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
	if (USE_DUMMY_DATA) return delay(subscriptionEmailsData[id] ?? []);
	const numericId = parseInt(id.replace(/\D/g, ''), 10) || id;
	return apiFetch<SubscriptionEmailLogEntry[]>(`/subscriptions/${numericId}/emails`);
}

/**
 * Per-charge payment ledger for one subscription.
 *
 * @since 1.0.0
 * @param {string} id Subscription ID.
 * @return {Promise<PaymentRecord[]>} That subscription's payment records.
 */
export async function fetchPaymentHistory(id: string): Promise<PaymentRecord[]> {
	if (USE_DUMMY_DATA) return delay(paymentHistory[id] ?? []);
	const numericId = parseInt(id.replace(/\D/g, ''), 10) || id;
	const res = await apiFetch<any[]>(`/subscriptions/${numericId}/payments`);
	return Array.isArray(res) ? res.map(mapBackendPaymentToRecord) : [];
}
