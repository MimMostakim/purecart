# Implementation Plan: Connect Subscriptions Module to Real Backend API & Database

## Overview

The PureCart Subscriptions UI (`src/app/components/Subscriptions/`) was constructed with static mock data. The WordPress backend (`includes/Subscriptions/`, `includes/API/Subscriptions.php`, `includes/Store/`) already has custom database tables, repositories, lifecycle managers, and REST endpoints.

This document provides the technical roadmap, including comprehensive **API-to-React Component Mapping Matrices** showing exactly where each API endpoint connects in the frontend codebase and vice versa.

---

### 1. REST Endpoint to React Component Mapping Matrix

*Base API Prefix: `/purecart/v1`*

| REST Endpoint | Backend Handler | React Component(s) | State / Hook | UI Trigger |
| :--- | :--- | :--- | :--- | :--- |
| `GET /subscriptions` | `Subscriptions::list_subscriptions` | [`SubscriptionsPage.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/SubscriptionsPage.tsx)<br>[`SubscriptionsTable.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/SubscriptionsTable.tsx)<br>[`SubscriptionsFilterBar.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/SubscriptionsFilterBar.tsx) | [`subscriptionsSlice.ts`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/store/slices/subscriptionsSlice.ts)<br>`loadSubscriptions` | Page load, filters, search, pagination |
| `GET /subscriptions/{id}` | `Subscriptions::get_subscription` | [`SubscriptionDetailPage.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/SubscriptionDetailPage.tsx)<br>[`OverviewTab.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/detail-tabs/OverviewTab.tsx)<br>[`DeliveryTypeTab.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/detail-tabs/DeliveryTypeTab.tsx) | [`api.ts`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/utils/api.ts)<br>`fetchSubscriptionById` | Clicking subscription ID / deep link |
| `GET /subscriptions/{id}/logs` | `Subscriptions::get_logs` | [`StatusHistoryTab.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/detail-tabs/StatusHistoryTab.tsx) | Local state / `fetchSubscriptionLogs` | Opening "Status History" tab |
| `GET /subscriptions/{id}/payments` *(New)* | `PaymentRepository::find_by_subscription` | 1. [`PaymentLogTab.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/detail-tabs/PaymentLogTab.tsx)<br>2. [`PaymentHistoryModal.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/modals/PaymentHistoryModal.tsx) | [`api.ts`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/utils/api.ts)<br>`fetchPaymentHistory` | 1. Detail "Payment History" tab<br>2. Row "Payment History" action |
| `GET /subscriptions/{id}/emails` *(New)* | `SubscriptionLogRepository` | [`EmailsSentTab.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/detail-tabs/EmailsSentTab.tsx) | Local state / `fetchSubscriptionEmails` | Opening "Emails Sent" tab |
| `POST /subscriptions/{id}/pause` | `Subscriptions::handle_action_pause` | [`PauseDurationModal.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/modals/PauseDurationModal.tsx) | `patchSubscription` / `useSubscriptionActions` | Submitting "Pause Subscription" modal |
| `POST /subscriptions/{id}/resume` | `Subscriptions::handle_action_resume` | [`useSubscriptionActions.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/useSubscriptionActions.tsx) | `patchSubscription` / `useSubscriptionActions` | Clicking "Resume Subscription" |
| `POST /subscriptions/{id}/cancel` | `Subscriptions::handle_action_cancel` | [`CancellationFlowModal.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/modals/CancellationFlowModal.tsx) | `patchSubscription` / `useSubscriptionActions` | Confirming final cancellation |
| `GET /subscriptions/{id}/cancellation/reasons` | `RetentionFlow::get_reasons` | [`CancellationFlowModal.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/modals/CancellationFlowModal.tsx)<br>[`RetentionTab.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/detail-tabs/RetentionTab.tsx) | `fetchCancellationReasons` | Cancel modal Step 1 (reasons) |
| `GET /subscriptions/{id}/cancellation/offers` | `RetentionFlow::get_eligible_offers` | [`CancellationFlowModal.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/modals/CancellationFlowModal.tsx)<br>[`RetentionTab.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/detail-tabs/RetentionTab.tsx) | `fetchRetentionOffers` | Cancel modal Step 2 (offers) |
| `POST /subscriptions/{id}/cancellation/accept-offer` | `RetentionFlow::accept_offer` | [`CancellationFlowModal.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/modals/CancellationFlowModal.tsx) | `acceptRetentionOffer` | Clicking "Accept Offer" in cancel modal |
| `POST /subscriptions/{id}/skip` | `Subscriptions::handle_action_skip` | [`subscriptionDialogs.ts`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/modals/subscriptionDialogs.ts) | `patchSubscription` / `useSubscriptionActions` | Confirming "Skip Next Renewal" dialog |
| `POST /subscriptions/{id}/early-renewal` | `Subscriptions::handle_action_early_renewal` | [`subscriptionDialogs.ts`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/modals/subscriptionDialogs.ts) | `patchSubscription` / `useSubscriptionActions` | Clicking "Renew Early" button |
| `POST /subscriptions/{id}/renew` | `Subscriptions::handle_action_renew` | [`useSubscriptionActions.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/useSubscriptionActions.tsx) | `patchSubscription` / `useSubscriptionActions` | Admin clicking "Force Renewal Charge" |
| `POST /subscriptions/{id}/retry-payment` | `Subscriptions::handle_retry_payment` | [`useSubscriptionActions.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/useSubscriptionActions.tsx)<br>[`PaymentLogTab.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/detail-tabs/PaymentLogTab.tsx) | `patchSubscription` / `useSubscriptionActions` | Clicking "Retry Payment" |
| `POST /subscriptions/{id}/send-card-update` | `Subscriptions::handle_send_card_update` | [`subscriptionDialogs.ts`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/modals/subscriptionDialogs.ts) | `useSubscriptionActions` | Admin clicking "Send Card Update Link" |
| `POST /subscriptions/{id}/resubscribe` | `Subscriptions::handle_action_resubscribe` | [`useSubscriptionActions.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/useSubscriptionActions.tsx) | `patchSubscription` / `useSubscriptionActions` | Clicking "Resubscribe" on expired row |
| `POST /subscriptions/{id}/upgrade` | `Subscriptions::handle_action_upgrade` | [`ChangePlanModal.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/modals/ChangePlanModal.tsx) | `patchSubscription` / `useSubscriptionActions` | Submitting "Change Plan" modal |
| `POST /subscriptions/{id}/apply-discount` | `Subscriptions::handle_apply_discount` | [`ApplyDiscountModal.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/modals/ApplyDiscountModal.tsx) | `patchSubscription` / `useSubscriptionActions` | Submitting "Apply Discount" modal |
| `GET /reports/subscriptions/summary` | `Subscriptions::get_report_summary` | [`SubscriptionsKpiStrip.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/SubscriptionsKpiStrip.tsx)<br>[`SubscriptionAnalyticsPage.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Analytics/SubscriptionAnalyticsPage.tsx) | Redux / `fetchSubscriptionAnalytics` | KPI strip load & Analytics dashboard |
| `GET /reports/subscriptions/export` | `Subscriptions::get_report_export` | [`SubscriptionsPage.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/SubscriptionsPage.tsx) | Direct browser download | Clicking "Export CSV / JSON" |
| `GET /subscriptions/revenue-goals` *(New)* | `wp_purecart_revenue_goals` store | [`RevenueGoalsWidget.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Analytics/RevenueGoalsWidget.tsx) | Local state / `fetchRevenueGoals` | Analytics page load |
| `POST /subscriptions/revenue-goals` *(New)* | `wp_purecart_revenue_goals` store | [`RevenueGoalsWidget.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Analytics/RevenueGoalsWidget.tsx) | Local state / `saveRevenueGoal` | Submitting "Add/Edit Goal" |

---

## 2. React Component to API Mapping Matrix

| Component | File | Endpoints | Trigger | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **`SubscriptionsPage`** | [`SubscriptionsPage.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/SubscriptionsPage.tsx) | • `GET /subscriptions`<br>• `GET /reports/subscriptions/export` | Mount & Export click | Loads list into Redux; exports reports. |
| **`SubscriptionsTable`** | [`SubscriptionsTable.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/SubscriptionsTable.tsx) | • `GET /subscriptions`<br>• Delegates to `useSubscriptionActions` | Sorting, selection, row menu | Displays data table, status badges, & actions. |
| **`SubscriptionsFilterBar`** | [`SubscriptionsFilterBar.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/SubscriptionsFilterBar.tsx) | `GET /subscriptions` *(with params)* | Status pills, search, filters | Dispatches `loadSubscriptions` with filters. |
| **`SubscriptionsBulkBar`** | [`SubscriptionsBulkBar.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/SubscriptionsBulkBar.tsx) | • `POST .../{id}/pause`<br>• `POST .../{id}/resume`<br>• `POST .../{id}/cancel` | Bulk action clicks | Iterates selected IDs to trigger mutations. |
| **`SubscriptionsKpiStrip`** | [`SubscriptionsKpiStrip.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/SubscriptionsKpiStrip.tsx) | `GET /reports/subscriptions/summary` | Component mount | Shows summary metrics (MRR, ARR, Churn). |
| **`SubscriptionDetailPage`** | [`SubscriptionDetailPage.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/SubscriptionDetailPage.tsx) | `GET /subscriptions/{id}` | Detail page route navigation | Loads complete entity & schedule metadata. |
| **`OverviewTab`** | [`OverviewTab.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/detail-tabs/OverviewTab.tsx) | • `GET /subscriptions/{id}`<br>• Fast actions (`/pause`, `/resume`, etc.) | Tab view & quick buttons | Shows summary, schedule, customer & cards. |
| **`StatusHistoryTab`** | [`StatusHistoryTab.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/detail-tabs/StatusHistoryTab.tsx) | `GET /subscriptions/{id}/logs` | Tab switch | Renders timeline of lifecycle audit events. |
| **`PaymentLogTab`** | [`PaymentLogTab.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/detail-tabs/PaymentLogTab.tsx) | • `GET .../payments`<br>• `POST .../retry-payment` | Tab switch & Retry click | Displays payment ledger & retry charges. |
| **`EmailsSentTab`** | [`EmailsSentTab.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/detail-tabs/EmailsSentTab.tsx) | `GET /subscriptions/{id}/emails` | Tab switch | Displays transactional email history. |
| **`RetentionTab`** | [`RetentionTab.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/detail-tabs/RetentionTab.tsx) | • `GET .../reasons`<br>• `GET .../offers` | Tab switch | Shows churn risk score, survey reasons, & saves. |
| **`DeliveryTypeTab`** | [`DeliveryTypeTab.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/detail-tabs/DeliveryTypeTab.tsx) | `GET /subscriptions/{id}` | Tab switch | Displays license keys, SaaS account, or files. |
| **`PauseDurationModal`** | [`PauseDurationModal.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/modals/PauseDurationModal.tsx) | `POST /subscriptions/{id}/pause` | Modal submit | Sends pause request with `resume_at` date. |
| **`CancellationFlowModal`** | [`CancellationFlowModal.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/modals/CancellationFlowModal.tsx) | • `GET .../reasons`<br>• `GET .../offers`<br>• `POST .../accept-offer`<br>• `POST .../cancel` | Cancel wizard steps | Manages survey reasons, save offers, or cancel. |
| **`ChangePlanModal`** | [`ChangePlanModal.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/modals/ChangePlanModal.tsx) | `POST /subscriptions/{id}/upgrade` | Modal submit | Sends plan upgrade/downgrade & proration. |
| **`ApplyDiscountModal`** | [`ApplyDiscountModal.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/modals/ApplyDiscountModal.tsx) | `POST /subscriptions/{id}/apply-discount` | Modal submit | Applies recurring discount & cycle limit. |
| **`PaymentHistoryModal`** | [`PaymentHistoryModal.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/modals/PaymentHistoryModal.tsx) | `GET /subscriptions/{id}/payments` | Row action click | Quick overlay for charge history & receipts. |
| **`subscriptionDialogs`** | [`subscriptionDialogs.ts`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/modals/subscriptionDialogs.ts) | • `POST .../skip`<br>• `POST .../early-renewal`<br>• `POST .../send-card-update` | Dialog confirm | Confirmation dialog helper builders. |
| **`useSubscriptionActions`** | [`useSubscriptionActions.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/useSubscriptionActions.tsx) | All `POST /subscriptions/{id}/*` | Action buttons / menu | Central mutation hook; handles toasts & updates. |
| **`SubscriptionAnalyticsPage`** | [`SubscriptionAnalyticsPage.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Analytics/SubscriptionAnalyticsPage.tsx) | • `GET /reports/subscriptions/summary`<br>• `GET /subscriptions/revenue-goals` | Page mount | MRR charts, churn trends, ARPU, and goals. |
| **`RevenueGoalsWidget`** | [`RevenueGoalsWidget.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Analytics/RevenueGoalsWidget.tsx) | • `GET .../revenue-goals`<br>• `POST .../revenue-goals` | Mount & Form submit | Fetches & saves monthly/quarterly goals. |

---

## Atomized Step-by-Step Plan

### Phase 1: Backend REST API Enhancements (`includes/API/Subscriptions.php`)
1. **Payment History Endpoint**:
   - Register `GET /subscriptions/{id}/payments`.
   - Call `PaymentRepository::find_by_subscription($id)` to return real transaction entries.
2. **Email Logs Endpoint**:
   - Register `GET /subscriptions/{id}/emails`.
   - Query email-triggered events from `wp_purecart_subscription_logs`.
3. **Revenue Goals Endpoints**:
   - Register `GET /subscriptions/revenue-goals` and `POST /subscriptions/revenue-goals`.
4. **Enhanced Entity & Payment DTO**:
   - In `prepare_subscription()`:
     - Join license details from `wp_purecart_licenses` for `software` delivery type.
     - Join SaaS account details from `wp_purecart_saas_accounts` for `saas` delivery type.
     - Join linked entity record from `wp_purecart_subscription_linked_entities` for `membership`, `download`, `course`, `service`.
     - Extract payment method brand/last4 from WooCommerce token.

---

### Phase 2: Frontend API Client & Data Normalization (`src/app/utils/`)
1. **Configure API Discovery ([`api.ts`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/utils/api.ts))**:
   - Read base URL from `window.purecartAdmin.apiUrl` and nonce from `window.purecartAdmin.restNonce`.
   - Set `USE_DUMMY_DATA = false`.
2. **DTO Mapper Utility ([`subscription-mappers.ts`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/utils/subscription-mappers.ts))**:
   - Convert backend `snake_case` DB rows to frontend `camelCase` `SubscriptionRecord` shape:
     - Formats `$recurring_amount` -> `$99.00/yr`.
     - Maps `$billing_interval` & `$billing_period` -> `billing.displayLabel`.
     - Normalizes `linkedEntity` union.
3. **Connect API Functions**:
   - Export typed fetch and mutation methods matching each backend endpoint.

---

### Phase 3: Redux Store Integration ([`subscriptionsSlice.ts`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/store/slices/subscriptionsSlice.ts))
1. **Async Thunks**:
   - Connect `loadSubscriptions` to `GET /subscriptions`.
   - Add action thunks: `pauseSubscriptionThunk`, `resumeSubscriptionThunk`, `cancelSubscriptionThunk`, `skipRenewalThunk`, `earlyRenewalThunk`.
2. **State Updates**:
   - Update Redux store on action completion to reflect state changes immediately in the UI.

---

### Phase 4: Hook & UI Modal Integration
1. **[`useSubscriptionActions.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/useSubscriptionActions.tsx)**:
   - Connect action functions directly to API endpoints and show success/error toasts.
2. **Modals ([`PauseDurationModal.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/modals/PauseDurationModal.tsx), [`CancellationFlowModal.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/modals/CancellationFlowModal.tsx), [`ChangePlanModal.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/modals/ChangePlanModal.tsx), [`ApplyDiscountModal.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/modals/ApplyDiscountModal.tsx), [`PaymentHistoryModal.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/modals/PaymentHistoryModal.tsx))**:
   - Replace dummy state mutations with live API requests.
3. **Detail Tabs ([`OverviewTab.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/detail-tabs/OverviewTab.tsx), [`StatusHistoryTab.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/detail-tabs/StatusHistoryTab.tsx), [`PaymentLogTab.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/detail-tabs/PaymentLogTab.tsx), [`EmailsSentTab.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/detail-tabs/EmailsSentTab.tsx), [`RetentionTab.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/detail-tabs/RetentionTab.tsx), [`DeliveryTypeTab.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Subscriptions/detail-tabs/DeliveryTypeTab.tsx))**:
   - Fetch real logs, payments, retention data, and emails on mount.

---

### Phase 5: Analytics & Reporting
1. **[`SubscriptionAnalyticsPage.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Analytics/SubscriptionAnalyticsPage.tsx)**:
   - Connect KPI cards and charts to `GET /reports/subscriptions/summary`.
2. **[`RevenueGoalsWidget.tsx`](file:///c:/wamp64/www/woo-digital-downloads/wp-content/plugins/woo-digital-downloads/src/app/components/Analytics/RevenueGoalsWidget.tsx)**:
   - Connect to `GET /subscriptions/revenue-goals`.

---

## Verification Plan

### Automated Build Verification:
- `cmd /c npm run build` to ensure all TypeScript types and imports compile cleanly.
- `php -l` check on all modified backend PHP files.

### Manual Verification:
- Navigate to **PureCart -> Subscriptions** in WordPress admin.
- Verify that table rows are loaded from MySQL via `wp-json/purecart/v1/subscriptions`.
- Test Pause, Resume, and Cancel actions and verify rows update in `wp_purecart_subscriptions`.
- Navigate to **PureCart -> Subscriptions -> Analytics** and verify real aggregate metrics.

