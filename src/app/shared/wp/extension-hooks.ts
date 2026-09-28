/**
 * Central reference for every @wordpress/hooks extension point this admin
 * SPA fires. See DEVELOPMENT_GUIDELINES.md §8 — don't scatter undocumented
 * hook name string literals through the codebase; every hook actually fired
 * anywhere in src/app is named here, once, and the firing site imports its
 * name from this file instead of retyping the string.
 *
 * @file
 * @since 1.1.0
 */

/**
 * Filter — the row-action menu (⋮) items built for one subscription.
 *
 * Fired in `modules/subscriptions/hooks/useSubscriptionActions.tsx`.
 *
 * @param {ActionItem[]}         actions      The default action list for this row.
 * @param {SubscriptionRecord}   subscription The subscription the menu is being built for.
 * @return {ActionItem[]} The (optionally modified) action list to render.
 */
export const SUBSCRIPTION_ACTIONS_FILTER = 'purecart/dashboard/subscriptionActions';

/**
 * Filter — the row-action menu (⋮) items built for one SaaS account.
 *
 * Same contract as SUBSCRIPTION_ACTIONS_FILTER, for the other module whose
 * rows carry a per-row action menu: a companion plugin or Pro add-on can
 * add a tenant-management action (open the tenant in the merchant's own
 * console, force a plan sync, …) without forking the hook that builds it.
 *
 * Fired in `modules/saas-accounts/hooks/useSaasAccountActions.tsx`.
 *
 * @param {ActionItem[]}      actions The default action list for this row.
 * @param {SaasAccountRecord} account The SaaS account the menu is being built for.
 * @return {ActionItem[]} The (optionally modified) action list to render.
 */
export const SAAS_ACCOUNT_ACTIONS_FILTER = 'purecart/dashboard/saasAccountActions';

/**
 * Action — fired after a subscription is successfully patched via the
 * generic update path (pause/resume/cancel-via-patch, etc. each have their
 * own dedicated thunk and don't currently fire this — only the general
 * `updateSubscription` PATCH route does).
 *
 * Fired in `modules/subscriptions/store/subscriptions.slice.ts`
 * (`patchSubscription` thunk, after the API call resolves).
 *
 * @param {SubscriptionRecord} subscription The updated subscription record.
 */
export const SUBSCRIPTION_UPDATED_ACTION = 'purecart/dashboard/subscriptionUpdated';
