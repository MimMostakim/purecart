/**
 * Local, non-backend UI constants for the Subscriptions module.
 *
 * Everything here is presentation-only vocabulary (dropdown options, a
 * pre-load default settings object) with no real REST source — unlike the
 * old static-data.tsx, this file deliberately does NOT hold sample/mock
 * records or analytics data; those now come from the real API
 * (see modules/subscriptions/api.ts and modules/analytics/api.ts).
 *
 * @file
 * @since 1.0.0
 */
import type { SubscriptionSettings } from './types';

/**
 * Plan tiers offered by ChangePlanModal.
 *
 * Fixed marketing copy, not tied to real WooCommerce product IDs — there is
 * no backend endpoint listing "the plans a customer can switch between" in
 * this generic form; that would require a real product catalog lookup,
 * which upgradeSubscription() doesn't currently have wired to this modal.
 */
export const PLAN_OPTIONS = [
	{
		label: 'Monthly',
		amount: '$9/mo',
		cycle: 'Monthly',
		note: 'Billed every month, cancel any time.',
	},
	{
		label: 'Annual',
		amount: '$99/yr',
		cycle: 'Annual',
		note: 'Save 8% vs monthly. Billed once per year.',
	},
	{
		label: 'Lifetime',
		amount: '$249',
		cycle: 'Lifetime',
		note: 'One-time payment, never pay again.',
	},
];

/** Duration options for ApplyDiscountModal's manual admin-granted discount. */
export const DISCOUNT_DURATIONS = [ 'Once', '3 months', '6 months', 'Forever' ] as const;

/** SettingsSubscriptions' initial state before the real settings fetch resolves. */
export const defaultSubscriptionSettings: SubscriptionSettings = {
	enableSubscriptions: true, enableAutoRenewal: true, allowMixedCart: true,
	oneTrialPerCustomer: true, allowMultipleSubscriptions: true, avgLifetimeMonths: 24,
	maxRetryAttempts: 3, retryIntervalDays: [ 1, 3, 5 ], activeGraceDays: 7,
	suspendedGraceDays: 7, sendDunningEmails: true,
	renewalReminderDays: [ 7, 3, 1 ], trialReminderDays: 3, cardExpiryWarningDays: 30,
	enableRenewalSync: false, renewalSyncDate: 1,
	defaultProrationMode: 'apply_at_renewal', allowCustomerUpgrade: true,
	retentionFlowEnabled: true, retentionDiscountPercent: 20, retentionDiscountCycles: 3,
	retentionPauseDays: 30, retentionContactUrl: '',
	allowSelfPause: true, allowSelfCancel: true, allowEarlyRenewal: true,
	allowSkipRenewal: true, skipLimitPerYear: 1, resubscribeWindowDays: 30,
	trialRole: null, activeRole: null, cancelledRole: null,
	subscribeSaveEnabled: true, discountType: 'percentage', discountValue: 15,
	savingsBadgeLabel: 'Save 15% with a subscription',
	stagingDomains: '', gatewayMetaKeys: '', cancelSaasImmediately: false, debugMode: false,
	membershipGraceDays: 3, contentRestrictionPlugin: 'none', availableTiers: 'Gold, Silver, Bronze',
	allowSelfTierUpgrade: true,
	downloadLimitPerCycle: 10, resetDownloadsOnRenewal: true, enableDripContent: false, dripIntervalDays: 7,
	lmsIntegration: 'none', lmsApiKey: '', defaultCourseAccessMonths: 12,
	enrollOnTrialStart: true, revokeEnrollmentOnCancel: true,
	defaultInvoicingMode: 'manual', invoiceDueDays: 7, enableDeliverableTracking: true,
	defaultDeliverableTemplate: '',
};
