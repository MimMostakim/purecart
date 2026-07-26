# RND — Subscription Module
**Plugin:** PureCart
**Module:** Subscriptions
**Phase:** 2
**Standalone:** Yes — works independently; links to Licensing and SaaS modules when both are active
**Third-party dependency:** None — fully built-in
**Last R&D update:** 2026-07-26 (end-to-end analysis of 7 competitor plugins)

---

## Competitor Plugins Analyzed (End-to-End)

| Plugin | Type | Approach | Key Differentiators |
|---|---|---|---|
| **Easy Digital Downloads (EDD)** | Full platform | Custom orders + CPT | Customer-centric model, licensing add-on, bundles, download logs |
| **ArraySubs** | WooCommerce subscription | PSR-4, feature-providers | Retention flow, plan switching with proration, card expiry, SCA reauth |
| **Paid Member Subscriptions (PMS)** | Membership | Custom CPT | Grace period, payment retry, plan upgrade/downgrade with sign-up fee |
| **Subscriptions for WooCommerce (WP Swings)** | WooCommerce subscription | CPT-based | Basic free tier, membership system with content restriction |
| **Milo Subscriptions** | WooCommerce subscription | Custom order type (HPOS) | Gateway-scheduled payment detection, idempotency guard, staging block, zero-total renewals, external renewal recording |
| **YITH WooCommerce Subscription** | WooCommerce subscription | CPT-based | PayPal billing agreements, hourly renewal cron, pending/trash cleanup |
| **Recurio** | WooCommerce subscription | Custom table | Split/installment payments, subscribe-&-save, churn score, customer LTV, revenue goals, early renewal, access timing |

---

## Overview

The Subscriptions module is a complete, self-contained recurring billing management system built directly into PureCart. It adds a subscription product type to WooCommerce, handles recurring billing via Stripe and PayPal (through WooCommerce's gateway layer), manages the full subscription lifecycle (trial → active → paused → cancelled → expired), and ties renewals directly to license expiry and SaaS account status when those modules are enabled.

This is not a billing layer wrapper — it is a full subscription engine.

---

## Standalone Usage

Enable this module in **Settings → PureCart → Modules → Subscriptions**.

Without any other PureCart module:
- Create subscription products with recurring pricing, free trials, sign-up fees
- Auto-renew via Stripe or PayPal
- Customer self-service: pause, resume, cancel, skip, change payment method, upgrade/downgrade
- Admin: manage all subscriptions, trigger manual renewals, bulk actions
- Dunning: configurable retry and email sequence on payment failure
- Reports: active/expired/cancelled counts, MRR, LTV, churn score, CSV export

With **Licensing** enabled: renewal automatically extends license expiry.
With **SaaS** enabled: renewal re-activates suspended SaaS account; cancellation suspends it.

---

## Feature Specification

### 1. Subscription Product Types

| Feature | Description | Developer Notes |
|---|---|---|
| Subscription product type | Admin creates `purecart_subscription` product in WooCommerce | Register via `woocommerce_product_class` + product meta boxes |
| Recurring price | Recurring billing amount | `_purecart_sub_price` |
| Billing interval | Daily / Weekly / Monthly / Yearly | `_purecart_sub_interval` + `_purecart_sub_period` |
| Free trial | Optional free trial period before first billing | `_purecart_sub_trial_length` + `_purecart_sub_trial_period` |
| Sign-up fee | Optional one-time fee collected on first payment | `_purecart_sub_signup_fee` |
| Subscription length | Max duration (e.g., 12 months); empty = indefinite | `_purecart_sub_length` |
| Variable subscriptions | Product variations with different prices/intervals | WC variable product + per-variation override meta |
| Mixed cart | Subscription + non-subscription products in one checkout | WC cart compatibility required |
| Multiple subscriptions | Multiple subscription products in one checkout | Separate subscription record per item |
| Subscription coupons | Sign-up fee coupon + recurring fee coupon types | Custom WC coupon discount types |
| **Subscribe & Save** | Recurring subscription price is discounted vs. one-time purchase | `_purecart_sub_discount_type` + `_purecart_sub_discount_value`; show both prices on product page (inspired by Recurio) |
| **Split payments** | Pay a product in N installments; access granted immediately or after final payment | `_purecart_payment_type` = `split`, `_purecart_max_payments`; each installment = product price / N (inspired by Recurio) |
| Drip content | Deliver downloadable files incrementally over time | Phase 4 — requires Downloads module |

---

### 2. Subscription Management (Customer)

| Feature | Description |
|---|---|
| My Account subscriptions tab | Customer views all active/past subscriptions |
| Pause subscription | Customer pauses (vacation mode); billing suspended, access maintained; `next_payment_at` advances by pause duration on resume |
| Resume subscription | Resume from paused state; new `next_payment_at` calculated from resume date |
| Skip next renewal | Customer skips one upcoming renewal; `next_payment_at` jumps one interval; license/SaaS access extends to cover the skipped cycle; `skip_count` incremented |
| **Pending cancellation** | Customer cancels at end of period; status = `pending_cancel`; access continues; when renewal Action Scheduler fires, finalize cancellation instead of charging (inspired by Milo) |
| Cancel immediately | Status → `cancelled`; cancel scheduled renewal; run retention flow first |
| Change payment method | Customer updates card/PayPal for future renewals |
| Upgrade plan | Switch to higher-tier; 3 proration modes |
| Downgrade plan | Switch to lower-tier; 3 proration modes; effective at renewal or immediately |
| Auto-downgrade | Schedule a downgrade for next renewal as a retention offer; email confirmation sent |
| Resubscribe | Re-activate a cancelled or expired subscription |
| Update quantity | Change subscription quantity (if product allows) |
| View renewal history | Full log of payments, status changes, retries, emails |
| **Early renewal** | Customer renews before the due date; extends `next_payment_at` by one cycle; new renewal order created and charged immediately (inspired by Recurio) |

---

### 3. Admin Features

| Feature | Description |
|---|---|
| Admin subscription list | Sortable WP_List_Table of all subscriptions |
| Filter subscriptions | Filter by status, product, customer, date range |
| Subscription detail page | View all details, payment log, status history |
| Manual status change | Admin changes status with reason; hook fires |
| Manual renewal trigger | Admin forces renewal from detail page |
| Manual cancellation | Admin cancels with optional grace period |
| Bulk actions | Bulk cancel, bulk retry payment, bulk export |
| Overdue/suspend period | Configurable days before overdue → suspended |
| Payment retry settings | Number of retries and intervals (configurable) |
| Renewal reminder emails | Multiple pre-renewal reminders (configurable days before) |
| Tax in renewal | Include or exclude tax in renewal orders |
| Shipping in renewal | Snapshot shipping method + amount from original order; include or exclude in renewals |
| Subscription logs | Per-subscription log of all events (payment attempt, status change, email sent) |
| **Churn risk score** | Score computed from payment failure history, tenure, recency; surfaced in list table |
| **Customer LTV** | Estimated lifetime value stored on record (billing_amount × 24-month projection) |
| **Revenue goals** | Admin sets revenue targets per period; updated automatically on each payment |
| **Health check scanner** | Scan for subscriptions with expired/missing payment methods; surface for admin action (inspired by Milo) |
| **Privacy/GDPR** | Data export (personal data exporter) + data eraser hooks for WP personal data tools |

---

### 4. Renewal Methods

| Method | Requirement |
|---|---|
| Auto-renewal via Stripe | WooCommerce Stripe Gateway active |
| Auto-renewal via PayPal | WooCommerce PayPal Payments active |
| Auto-renewal via PayPal Subscriptions | PayPal billing agreements API |
| **Gateway-scheduled payments** | Some gateways (e.g. WooPayments, Stripe Billing) manage their own billing schedule; PureCart detects the `gateway_scheduled_payments` capability and skips creating its own renewal; gateway webhook calls `RenewalEngine::record_external_renewal()` to sync PureCart's schedule (inspired by Milo) |
| Manual renewal | Customer pays renewal invoice manually via any WC gateway |
| Fallback to manual | If auto-renewal fails or gateway is disconnected, subscription switches to manual mode |

**Gateway meta key transfer:** When creating a renewal order, PureCart copies gateway-specific meta keys from the subscription to the renewal order so gateways can process off-session charges. Keys copied (filterable via `purecart_gateway_meta_keys`):

```php
// Default set — extend via filter
[
    '_stripe_customer_id',
    '_stripe_source_id',
    '_stripe_card_id',
    '_stripe_upe_payment_type',
    '_paypal_subscription_id',
    '_ppcp_billing_agreement_id',
]
```

---

### 5. Renewal Engine — Idempotency & Safety

These patterns prevent double-charging and runaway renewals (inspired by Milo):

**Idempotency guard:** Before creating a renewal order, `RenewalEngine` checks `_purecart_current_renewal_order_id` on the subscription. If a renewal order already exists for this cycle:
- If it is paid → skip (already charged this cycle).
- If it is unpaid → retry payment on the same order, not a new one.

After successful payment, `_purecart_current_renewal_order_id` is cleared so the next cycle creates a fresh order.

**Zero-total renewal:** If renewal order total ≤ 0 (fully discounted or $0 subscription), call `payment_complete()` immediately without routing to a gateway. Advances schedule, fires all renewal hooks, sends "renewal successful" email.

**Staging site block:** A filter allows blocking renewals on staging/development sites:
```php
apply_filters( 'purecart_process_renewal', true, $subscription_id )
// Return false on staging to prevent billing
```

**Pending-cancel handling:** When `process_renewal` fires for a `pending_cancel` subscription, finalize the cancellation instead of charging:
```php
if ( $subscription->has_status( 'pending_cancel' ) ) {
    SubscriptionManager::finalize_cancellation( $subscription_id,
        'Prepaid period ended; cancellation finalized.' );
    return;
}
```

---

### 6. Notifications (Email)

All emails use WooCommerce's HTML email infrastructure. Templates overridable in `your-theme/woocommerce/emails/`.

| Email | Trigger | Customizable |
|---|---|---|
| Subscription created | Order completed with subscription product | Yes |
| Trial started | Subscription enters `trialing` status | Yes |
| Trial ending soon | N days before trial ends (configurable) | Yes |
| Trial converted | Trial period ends, first billing collected | Yes |
| Renewal reminder | N days before renewal (configurable; multiple reminders) | Yes |
| Renewal invoice | Renewal order created (manual renewal path) | Yes |
| Renewal successful | Payment captured | Yes |
| Payment failed | Auto-renewal charge fails | Yes |
| Payment retry scheduled | Dunning retry queued | Yes |
| Overdue notice | Payment still outstanding — active grace period | Yes |
| Suspend notice | Subscription suspended after active grace days | Yes |
| Suspended grace ending | N days before hard cancel during suspended grace | Yes |
| Cancellation notice | Customer or admin cancels | Yes |
| Pending cancellation | Cancel-at-end-of-period confirmed | Yes |
| Expiration notice | Fixed-length subscription reaches end | Yes |
| Resubscription confirmed | Customer resubscribes | Yes |
| Plan changed | Upgrade or downgrade applied | Yes |
| Auto-downgrade scheduled | Downgrade scheduled for next renewal as retention offer | Yes |
| Skip renewal confirmed | Customer skips next billing cycle | Yes |
| **Card expiring soon** | Customer's stored payment card expires within N days (configurable; default 30) | Yes |
| **Payment reauthorization** | SCA/3DS reauthorization required for off-session charge; customer must re-authenticate | Yes |
| **Retention discount accepted** | Customer accepted a retention discount offer | Yes |
| Early renewal completed | Customer renewed early | Yes |
| Split payment installment | Each installment paid (split payment products) | Yes |
| Split payment completed | All installments paid; access fully granted | Yes |

All email templates support 50+ placeholders: `{first_name}`, `{subscription_id}`, `{product_name}`, `{amount}`, `{next_payment_date}`, `{trial_end_date}`, `{cancel_date}`, `{license_key}`, `{plan_name}`, `{churn_risk}`, `{installment_number}`, `{installments_remaining}`, and more.

Multiple pre-renewal reminders can be configured (e.g., 7 days before, 3 days before, 1 day before).

---

### 7. Retention Flow (Cancellation)

When a customer initiates cancellation, a retention flow intercepts before the subscription is cancelled.

```
Customer clicks "Cancel"
    │
    ├── Step 1: Cancellation reason selection (admin-configurable list)
    │       Examples: "Too expensive", "Not using it", "Missing features",
    │                 "Switching provider", "Pausing use", "Other"
    │
    └── Step 2: Retention offer (matched to reason — configurable per reason)
            ├── Offer A: Discount     → X% or $X off next N renewals
            ├── Offer B: Pause        → Pause for N days instead of cancelling
            ├── Offer C: Skip cycle   → Skip next billing charge (free extension)
            ├── Offer D: Downgrade    → Switch to a lower-tier plan (schedule for next renewal)
            └── Offer E: Contact      → Redirect to support URL
                │
                ├── Customer accepts → Apply offer, abort cancel, log retention event
                └── Customer declines → Confirm cancellation (immediate or end-of-period)
```

#### Retention Offer Eligibility Rules

Each offer can be filtered by (inspired by ArraySubs):

| Rule | Description |
|---|---|
| `trigger_reasons` | Array of reason keys that trigger this offer; empty = show for all reasons |
| `min_subscription_age_days` | Minimum days since subscription start (e.g., only offer to customers who've paid at least once) |
| `min_subscription_value` | Minimum recurring price threshold |
| `max_subscription_value` | Maximum recurring price threshold |
| `min_user_total_value` | Minimum lifetime WooCommerce spend by customer |
| `max_user_total_value` | Maximum lifetime spend |
| `min_remaining_days` | Minimum days remaining in current billing period |
| `max_remaining_days` | Maximum days remaining |
| `product_ids` | Restrict offer to specific product IDs |
| One-time-use guard | Discount offers track `_purecart_retention_discount_applied_date`; once used, the same offer is not shown again for this subscription |

#### Retention Offer History

Each accepted offer is appended to `_purecart_retention_offer_history` (JSON array) on the subscription, allowing admin reports to show offer acceptance rates and types.

#### Retention Data (Product Meta)

| Meta Key | Description |
|---|---|
| `_purecart_sub_retention_enabled` | bool — enable retention flow |
| `_purecart_sub_retention_reasons` | JSON array of reason labels |
| `_purecart_sub_retention_offers` | JSON array of offer configs per reason |

#### REST Endpoints (Retention)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/purecart/v1/subscriptions/{id}/cancellation/reasons` | List cancellation reasons |
| `GET` | `/purecart/v1/subscriptions/{id}/cancellation/offers` | List available retention offers |
| `POST` | `/purecart/v1/subscriptions/{id}/cancellation/accept-offer` | Accept a retention offer |
| `POST` | `/purecart/v1/subscriptions/{id}/cancel` | Confirm cancellation (immediate or end-of-period) |

---

### 8. Plan Upgrade / Downgrade with Proration

Three proration modes configurable per product and globally:

| Mode | Behaviour |
|---|---|
| `prorate_immediately` | Calculate unused credit, charge/refund difference now; reset cycle from today |
| `apply_at_renewal` | No charge today; new price takes effect at next renewal; cycle date unchanged |
| `no_proration` | Switch product immediately; customer pays new full price at next renewal; no credit |

**Default:** `apply_at_renewal`.

```
Customer upgrades from Plan A ($49/mo) to Plan B ($99/mo)
    │
    └── PlanUpgrade::process($subscription_id, $new_product_id, $mode)
            ├── days_remaining = (next_payment_at − NOW())
            ├── unused_credit = (days_remaining / days_in_cycle) × $49
            ├── prorated_charge = $99 − unused_credit
            ├── Create WC order for prorated_charge
            ├── Charge via stored gateway token
            ├── UPDATE wp_purecart_subscriptions { product_id, recurring_amount = $99 }
            └── [Licensing] Update plan_type and activation_limit
                [SaaS] Trigger plan-change webhook event

Downgrade: same logic; issue store credit for difference instead of charging.
```

#### Downgrade as Retention Offer

When a downgrade is offered via the retention flow, it is scheduled for the next renewal using `_purecart_sub_pending_switch` meta. The switch is applied when the next renewal order is created. An "auto-downgrade scheduled" email is sent immediately.

---

### 9. Reports

| Report | Description |
|---|---|
| Active subscriptions | Count by product, MRR breakdown |
| Expired subscriptions | Count and revenue lost |
| Cancelled subscriptions | Count, churn rate, top cancellation reasons |
| Trial to paid conversion | % of trials that converted |
| Revenue report | Total billed per period; MRR / ARR |
| **Churn risk summary** | Distribution of subscriptions by churn risk score |
| **Customer LTV** | Average LTV across active subscriptions |
| **Revenue goals** | Progress against admin-defined revenue targets |
| **Retention report** | Cancellation reason breakdown, offer acceptance rate, retention revenue saved |
| **Split payment progress** | Installments paid vs. remaining per subscription |
| Export to CSV | All subscription data including customer info, billing amounts, dates |

---

## Architecture

### Classes

| Class | File | Responsibility |
|---|---|---|
| `SubscriptionProduct` | `includes/Subscriptions/SubscriptionProduct.php` | Register product type, meta boxes, pricing display, subscribe & save |
| `SubscriptionManager` | `includes/Subscriptions/SubscriptionManager.php` | Create, renew, pause, cancel, skip, resubscribe, early renewal |
| `RenewalEngine` | `includes/Subscriptions/RenewalEngine.php` | Action Scheduler jobs; idempotency guard; zero-total; staging block; external renewal recording |
| `DunningManager` | `includes/Subscriptions/DunningManager.php` | 2-phase failed payment retry + emails |
| `PlanUpgrade` | `includes/Subscriptions/PlanUpgrade.php` | 3-mode proration, upgrade/downgrade, pending switch |
| `RetentionFlow` | `includes/Subscriptions/RetentionFlow.php` | Cancellation reason + offer eligibility + offer acceptance + history |
| `SplitPaymentManager` | `includes/Subscriptions/SplitPaymentManager.php` | Installment tracking, access timing, completion detection |
| `RenewalSync` | `includes/Subscriptions/RenewalSync.php` | Calendar-date alignment for first partial payment |
| `RoleManager` | `includes/Subscriptions/RoleManager.php` | WP role assignment on status transitions |
| `ChurnScorer` | `includes/Subscriptions/ChurnScorer.php` | Compute and update churn risk score on payment events |
| `HealthCheck` | `includes/Subscriptions/HealthCheck.php` | Scan for expired/missing payment methods; admin notices |
| `SubscriptionEmail` | `includes/Subscriptions/SubscriptionEmail.php` | All subscription email classes (25 types) |
| `SubscriptionReport` | `includes/Subscriptions/SubscriptionReport.php` | Admin reports and CSV export |
| `SubscriptionListTable` | `includes/Admin/SubscriptionListTable.php` | WP_List_Table implementation |
| `PrivacyHandler` | `includes/Subscriptions/PrivacyHandler.php` | GDPR data export + erase integration |

---

## Subscription Lifecycle

```
Order Completed (initial purchase — subscription product)
    │
    └── SubscriptionManager::create_from_order($order_id)
            ├── Extract subscription product meta
            ├── INSERT wp_purecart_subscriptions {
            │       status: 'trialing' (if trial) or 'active',
            │       trial_ends_at: NOW() + trial_days (or NULL),
            │       next_payment_at: NOW() + billing_interval,
            │       customer_ltv: estimated_24_month_value,
            │       churn_risk_score: 0
            │   }
            ├── [Split payment] Set payment_type='split', max_payments=N
            ├── [If Licensing active] → link license_id; set expires_at = next_payment_at
            ├── [If SaaS active]     → AccountProvisioner::provision()
            ├── Copy gateway meta keys from order to subscription record
            ├── Log event: 'created'
            └── Schedule: RenewalEngine::schedule_renewal(subscription_id, next_payment_at)

Renewal Due (Action Scheduler fires purecart_process_renewal)
    │
    └── RenewalEngine::process_renewal($subscription_id)
            ├── [Staging block] Check filter; abort if staging
            ├── [pending_cancel] Finalize cancellation, do NOT charge
            ├── [not 'active'] Return early
            │
            ├── [Gateway-scheduled] Check gateway capability 'gateway_scheduled_payments'
            │       └── If true → return; gateway will call record_external_renewal() via webhook
            │
            ├── [Idempotency] Check _purecart_current_renewal_order_id
            │       ├── Exists + paid  → skip (already charged)
            │       └── Exists + unpaid → retry payment on same order
            │
            ├── [No existing order] Create renewal order
            │       ├── Copy addresses + line items + shipping + fees from subscription
            │       ├── Copy gateway meta keys to renewal order
            │       ├── Copy _purecart_current_renewal_order_id to subscription
            │       └── Fire do_action('purecart_renewal_order_created', $renewal_order, $subscription_id)
            │
            ├── [Zero-total] If total <= 0: payment_complete(); return
            │
            ├── [Split payment] If installment model: charge installment amount
            │
            ├── [Auto] process_automatic_renewal → gateway hook
            │       └── Gateway fallbacks: handler → tokenization → manual
            └── [Manual] process_manual_renewal → on-hold + send invoice email

Renewal Payment Succeeds
    │
    └── maybe_complete_renewal($order_id) [triggered by woocommerce_order_status_completed/processing]
            ├── UPDATE next_payment_at += interval
            ├── UPDATE last_payment_at = NOW()
            ├── UPDATE renewal_count++
            ├── Clear _purecart_current_renewal_order_id
            ├── [Split] INCREMENT installment_count; if = max_payments → complete subscription
            ├── [Stepped pricing] If renewal_count >= step_after → apply step_price next cycle
            ├── [Licensing] LicenseManager::extend(license_id, interval_days)
            ├── [SaaS] AccountProvisioner::activate(account_id)
            ├── [Retention discount] Decrement remaining discount cycles; clean up if exhausted
            ├── ChurnScorer::on_payment_success($subscription_id)
            ├── Log event: 'payment_success'
            ├── Send "Renewal successful" email
            └── Schedule next renewal

Payment Failed (Dunning — 2-phase grace via Action Scheduler)
    │
    ├── Day 0:  Status → 'past_due'. Send "Payment failed" email.
    │           License/SaaS access REMAINS ACTIVE (active grace phase).
    │           ChurnScorer::on_payment_failed()
    ├── Day N:  Retry charge (purecart_sub_retry_intervals e.g. [1, 3, 5]).
    │           On success → Renewal Payment Succeeds flow above.
    │           On failure → Send overdue reminder email.
    ├── Day X:  Active grace days exhausted (default 7).
    │           Status → 'suspended'. License suspended. SaaS suspended.
    │           Send "Access suspended" email.
    ├── Day X+N: Retry charges continue during suspended grace.
    │           On success → Status → 'active'. Restore license/SaaS. Reactivation email.
    │           Send "Suspended grace ending soon" when N days remain.
    └── Day X+Y: Suspended grace days exhausted (default 7).
                 Status → 'cancelled'. Final cancellation email.
                 [Licensing] License stays until expires_at, then expires naturally.

External Renewal (Gateway-Scheduled — webhook path)
    │
    └── RenewalEngine::record_external_renewal($subscription_id, ['transaction_id' => $txn_id])
            ├── [Idempotency] Check existing renewal orders for this transaction_id; return if found
            ├── Create renewal order → payment_complete($txn_id)
            ├── maybe_complete_renewal() fires → advances schedule
            └── Fire do_action('purecart_external_renewal_recorded', $renewal_order, $subscription_id)

Customer Pauses Subscription
    │
    └── SubscriptionManager::pause($subscription_id, $pause_duration_days)
            ├── UPDATE status='paused', paused_at=NOW(), pause_end_date=NOW()+N_days
            ├── Cancel scheduled renewal Action Scheduler job
            └── [License stays valid during pause]

Customer Resumes Subscription
    │
    └── SubscriptionManager::resume($subscription_id)
            ├── Calculate pause_duration = NOW() - paused_at
            ├── UPDATE status='active', next_payment_at += pause_duration
            ├── Clear pause_start_date, pause_end_date
            └── Reschedule renewal job

Auto-Resume (scheduled via Action Scheduler when pause_end_date reached)
    └── Same as Customer Resumes above; log event: 'auto_resumed'

Customer Skips Next Renewal
    │
    └── SubscriptionManager::skip($subscription_id)
            ├── UPDATE next_payment_at += billing_interval, skip_count++
            ├── Reschedule Action Scheduler job
            ├── [License] LicenseManager::extend(license_id, interval_days)
            └── Send "Skip renewal confirmed" email

Customer Cancels — End of Period
    │
    └── SubscriptionManager::cancel($subscription_id, 'end_of_period')
            ├── UPDATE status='pending_cancel', cancellation_date=next_payment_at
            ├── Send "Pending cancellation" email
            └── When process_renewal fires: finalize_cancellation()
                    ├── UPDATE status='cancelled'
                    ├── [SaaS] Suspend account
                    └── Send "Cancellation" email

Customer Cancels — Immediately
    │
    └── SubscriptionManager::cancel($subscription_id, 'immediate')
            ├── UPDATE status='cancelled', cancelled_at=NOW()
            ├── Cancel scheduled renewal
            ├── Send "Cancellation" email
            ├── [License stays active until expires_at]
            └── [SaaS suspend — configurable: immediately or at period end]

Customer Resubscribes
    │
    └── SubscriptionManager::resubscribe($subscription_id)
            ├── New WC checkout for resubscription
            ├── Create new subscription record (or re-activate if within N days)
            ├── New payment collected immediately
            └── [Licensing] Extend existing license or generate new one

Early Renewal (customer-initiated before due date)
    │
    └── SubscriptionManager::early_renewal($subscription_id)
            ├── Check status is 'active' or 'trialing'
            ├── Create renewal order for billing_amount
            │       ├── Mark order: _purecart_is_early_renewal = 'yes'
            │       └── Store: _purecart_early_renewal_new_next_payment
            ├── Return checkout payment URL to customer
            └── On payment: advance next_payment_at, update renewal_count, log revenue
```

---

## Split Payment / Installment Model

Allows a product to be purchased via N installments. Inspired by Recurio.

```
Product: "PureCart Pro" — $300 total, paid as 3 × $100/month
    _purecart_payment_type   = 'split'
    _purecart_max_payments   = 3
    _purecart_sub_price      = 100       (per-installment amount)
    _purecart_access_timing  = 'immediate' | 'after_full_payment' | 'custom_duration'

On purchase:
    billing_amount = 300 / 3 = $100
    renewal_count = 1 (first installment paid with order)
    max_payments = 3
    status = 'active' (if access_timing = immediate)
          OR 'pending_payment' (if access_timing = after_full_payment)

On each renewal:
    renewal_count++
    if renewal_count >= max_payments:
        status → 'completed' (no more renewals)
        [if access_timing = after_full_payment] → provision license/SaaS now
        Send "Split payment completed" email
    else:
        continue billing as normal
```

`access_timing` values:
- `immediate` — license/SaaS granted at purchase
- `after_full_payment` — license/SaaS granted only after all installments paid
- `custom_duration` — access granted for `access_duration_value` × `access_duration_unit` from purchase date

---

## Subscribe & Save

Lets a product offer a discount to customers who subscribe vs. buying once. Inspired by Recurio.

```
Product: "PureCart Plugin" — $79 one-time OR $59/year (subscribe & save 25%)
    _purecart_allow_one_time             = 'yes'
    _purecart_sub_discount_type          = 'percentage' | 'fixed'
    _purecart_sub_discount_value         = 25

Cart display: shows both prices + savings badge.
On add-to-cart: purchase type ('subscription' or 'one-time') stored in cart/order item meta.
On order processing: if one-time → skip subscription creation.
```

---

## Churn Risk Scoring

A numeric score (0–100) stored on each subscription, updated after each payment event. Surfaced in admin list table and reports.

```
Score increases on:
    - payment_failed (+20)
    - retry_failed (+10 per retry)
    - customer_initiated_cancel (+30)
    - skip_next_cycle (+5)
    - pause (+10)

Score decreases on:
    - payment_success (−15, floor 0)
    - renewal_count milestone (−5 per 12 renewals)

Scoring bands:
    0–25: Low risk (green)
    26–50: Medium risk (yellow)
    51–75: High risk (orange)
    76–100: Critical (red)
```

`ChurnScorer::compute($subscription_id)` is called by `RenewalEngine` and `DunningManager` after every payment event. Result is stored in `wp_purecart_subscriptions.churn_risk_score`.

---

## Customer LTV Calculation

Estimated 24-month lifetime value, stored on the subscription at creation and updated on plan change or price update.

```php
// Industry average: 24 months
$avg_lifetime_months = apply_filters( 'purecart_sub_avg_lifetime_months', 24 );

$monthly_equivalent = match( $billing_period ) {
    'day'   => ($billing_amount * 30) / $billing_interval,
    'week'  => ($billing_amount * 4.33) / $billing_interval,
    'month' => $billing_amount / $billing_interval,
    'year'  => $billing_amount / ($billing_interval * 12),
};

$ltv = round( $monthly_equivalent * $avg_lifetime_months, 2 );
```

Stored in `wp_purecart_subscriptions.customer_ltv`.

---

## Card Expiry Warnings

`HealthCheck` runs daily via Action Scheduler and scans active subscriptions whose stored payment method card expires within the configured window (default 30 days). An expiry warning email is dispatched with a payment method update link.

```php
// Action Scheduler job
add_action( 'purecart_check_card_expiry', [ HealthCheck::class, 'dispatch_expiry_warnings' ] );

// Email sent per affected subscription
do_action( 'purecart_customer_card_expiring', $subscription_id, $days_until_expiry );
```

Card expiry data sourced from the WC payment token's `expiry_month` / `expiry_year` metadata.

---

## SCA / Payment Reauthorization

For Stripe (and other SCA-regulated gateways), off-session charges require the customer to reauthorize if authentication is needed. `RenewalEngine` detects SCA failures and sends a reauthorization email with a secure one-time payment link.

```
Renewal charge → SCA authentication required
    │
    ├── Create pending renewal order
    ├── Store _purecart_reauth_required = 'yes' on order
    ├── Generate signed reauth URL (WC order pay page + nonce)
    └── Send "Payment reauthorization required" email with link
        │
        └── Customer completes payment → standard renewal complete flow
```

---

## One Trial Per Customer

When `purecart_sub_one_trial_per_customer` is enabled, the trial is stripped if the customer already trialled this product (prevents trial abuse via cancel + resubscribe):

```php
$used = get_user_meta( $user_id, '_purecart_trial_used_' . $product_id, true );
if ( $used ) {
    // Strip trial; bill full price from day 1
}

// On trial conversion (first charge collected):
update_user_meta( $user_id, '_purecart_trial_used_' . $product_id, true );
```

---

## Stepped Renewal Pricing

Introductory price for the first N cycles, then permanent step to regular price.

**Example:** $9/mo for 3 months → $29/mo ongoing.

```
_purecart_sub_price      = 9.00   (introductory)
_purecart_sub_step_price = 29.00  (after N cycles)
_purecart_sub_step_after = 3

RenewalEngine::process_renewal():
    if ( step_price > 0 && renewal_count >= step_after ) {
        use step_price for this renewal order
    }
```

---

## Renewal Sync

Aligns all subscriptions for a product to a fixed calendar date.

```
Customer subscribes June 15.
purecart_sub_renewal_sync = true, purecart_sub_renewal_sync_date = 1

First payment: prorated amount June 15→July 1 (16/30 × price).
Second payment: full price July 1.
All subsequent: 1st of each month.
```

---

## Role Mapping

WordPress user roles assigned on subscription status transitions:

| Transition | Role action |
|---|---|
| Trial starts | Assign `_purecart_sub_role_trial` (if configured) |
| Trial converts | Remove trial role; assign `_purecart_sub_role_active` |
| Active → suspended / cancelled / expired | Remove active role; assign `_purecart_sub_role_cancelled` |
| Resubscribe | Re-assign active role |

`RoleManager` hooks into `purecart_subscription_status_changed`.

---

## Database Schema

### `wp_purecart_subscriptions`

```sql
CREATE TABLE {prefix}purecart_subscriptions (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id                 BIGINT UNSIGNED NOT NULL,
    product_id              BIGINT UNSIGNED NOT NULL,
    order_id                BIGINT UNSIGNED NOT NULL,        -- initial order
    license_id              BIGINT UNSIGNED NULL,
    saas_account_id         BIGINT UNSIGNED NULL,
    status                  ENUM(
                                'trialing',
                                'active',
                                'paused',
                                'past_due',
                                'suspended',
                                'pending_cancel',
                                'cancelled',
                                'expired',
                                'completed'                  -- split payment fully paid
                            ) DEFAULT 'active',
    billing_interval        INT UNSIGNED NOT NULL,
    billing_period          ENUM('day','week','month','year') NOT NULL,
    recurring_amount        DECIMAL(10,2) NOT NULL,
    currency                VARCHAR(10) DEFAULT 'USD',
    signup_fee              DECIMAL(10,2) DEFAULT 0.00,
    trial_ends_at           DATETIME NULL,
    next_payment_at         DATETIME NULL,
    last_payment_at         DATETIME NULL,
    max_length_at           DATETIME NULL,                   -- NULL = indefinite
    paused_at               DATETIME NULL,
    pause_end_date          DATETIME NULL,
    cancelled_at            DATETIME NULL,
    cancellation_date       DATETIME NULL,                   -- for pending_cancel
    gateway                 VARCHAR(50) NULL,
    gateway_subscription_id VARCHAR(255) NULL,
    payment_token_id        BIGINT UNSIGNED NULL,
    retry_count             TINYINT UNSIGNED DEFAULT 0,
    renewal_count           INT UNSIGNED DEFAULT 0,
    skip_count              INT UNSIGNED DEFAULT 0,
    max_renewals            INT UNSIGNED NULL,               -- NULL = unlimited
    -- Split payment fields
    payment_type            ENUM('recurring','split') DEFAULT 'recurring',
    max_payments            INT UNSIGNED NULL,               -- installments total
    access_timing           ENUM('immediate','after_full_payment','custom_duration') DEFAULT 'immediate',
    access_duration_value   INT UNSIGNED NULL,
    access_duration_unit    ENUM('day','week','month','year') NULL,
    access_end_date         DATETIME NULL,
    -- Stepped pricing
    step_price              DECIMAL(10,2) NULL,
    step_after              INT UNSIGNED NULL,
    -- Analytics
    churn_risk_score        TINYINT UNSIGNED DEFAULT 0,      -- 0-100
    customer_ltv            DECIMAL(10,2) DEFAULT 0.00,
    -- Pending plan switch
    pending_switch_product  BIGINT UNSIGNED NULL,
    pending_switch_type     ENUM('upgrade','downgrade') NULL,
    -- Shipping snapshot
    shipping_amount         DECIMAL(10,2) DEFAULT 0.00,
    shipping_method         VARCHAR(255) NULL,
    -- Addresses (JSON)
    billing_address         TEXT NULL,
    shipping_address        TEXT NULL,
    starts_at               DATETIME NOT NULL,
    created_at              DATETIME NOT NULL,
    updated_at              DATETIME NOT NULL,
    PRIMARY KEY (id),
    KEY idx_user_id (user_id),
    KEY idx_product_id (product_id),
    KEY idx_status (status),
    KEY idx_next_payment (next_payment_at),
    KEY idx_trial_ends (trial_ends_at),
    KEY idx_pause_end (pause_end_date),
    KEY idx_churn (churn_risk_score)
);
```

### `wp_purecart_subscription_logs`

```sql
CREATE TABLE {prefix}purecart_subscription_logs (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    subscription_id BIGINT UNSIGNED NOT NULL,
    event           VARCHAR(100) NOT NULL,
    old_status      VARCHAR(30) NULL,
    new_status      VARCHAR(30) NULL,
    amount          DECIMAL(10,2) NULL,
    order_id        BIGINT UNSIGNED NULL,
    note            TEXT NULL,
    created_at      DATETIME NOT NULL,
    PRIMARY KEY (id),
    KEY idx_subscription_id (subscription_id),
    KEY idx_event (event),
    KEY idx_created_at (created_at)
);
```

### `wp_purecart_subscription_revenue`

Separate revenue ledger for MRR/ARR analytics and revenue goals. Inspired by Recurio.

```sql
CREATE TABLE {prefix}purecart_subscription_revenue (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    subscription_id BIGINT UNSIGNED NOT NULL,
    amount          DECIMAL(10,2) NOT NULL,
    currency        VARCHAR(10) DEFAULT 'USD',
    billing_period  VARCHAR(20) NULL,
    period_start    DATE NOT NULL,
    period_end      DATE NOT NULL,
    transaction_id  VARCHAR(255) NULL,
    gateway         VARCHAR(50) NULL,
    created_at      DATETIME NOT NULL,
    PRIMARY KEY (id),
    KEY idx_subscription_id (subscription_id),
    KEY idx_period_start (period_start),
    UNIQUE KEY uniq_transaction (transaction_id)
);
```

### `wp_purecart_revenue_goals`

```sql
CREATE TABLE {prefix}purecart_revenue_goals (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name            VARCHAR(255) NOT NULL,
    target_amount   DECIMAL(10,2) NOT NULL,
    current_amount  DECIMAL(10,2) DEFAULT 0.00,
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    status          ENUM('active','achieved','missed') DEFAULT 'active',
    created_at      DATETIME NOT NULL,
    updated_at      DATETIME NOT NULL,
    PRIMARY KEY (id),
    KEY idx_status_dates (status, start_date, end_date)
);
```

---

## Product Meta Fields

| Meta Key | Type | Description |
|---|---|---|
| `_purecart_sub_price` | decimal | Recurring price |
| `_purecart_sub_interval` | int | Billing interval number |
| `_purecart_sub_period` | string | `day`, `week`, `month`, `year` |
| `_purecart_sub_trial_length` | int | Trial period number |
| `_purecart_sub_trial_period` | string | `day`, `week`, `month` |
| `_purecart_sub_signup_fee` | decimal | One-time sign-up fee |
| `_purecart_sub_length` | int | Max subscription length (0 = indefinite) |
| `_purecart_sub_length_period` | string | `month`, `year` |
| `_purecart_sub_limit` | int | Max active subscriptions per customer |
| `_purecart_sub_proration` | string | `prorate_immediately`, `apply_at_renewal`, `no_proration` |
| `_purecart_sub_step_price` | decimal | Stepped renewal price after N cycles |
| `_purecart_sub_step_after` | int | Cycles before stepped price kicks in |
| `_purecart_sub_include_shipping` | bool | Include shipping in renewal orders |
| `_purecart_sub_include_tax` | bool | Include tax in renewal orders |
| `_purecart_sub_retention_enabled` | bool | Enable retention flow |
| `_purecart_sub_retention_reasons` | JSON | Cancellation reason list |
| `_purecart_sub_retention_offers` | JSON | Offer configs keyed by reason |
| `_purecart_allow_one_time` | bool | Enable subscribe & save (show both prices) |
| `_purecart_sub_discount_type` | string | `percentage` or `fixed` |
| `_purecart_sub_discount_value` | decimal | Subscribe & save discount amount |
| `_purecart_payment_type` | string | `recurring` or `split` |
| `_purecart_max_payments` | int | Installment count (split payment) |
| `_purecart_access_timing` | string | `immediate`, `after_full_payment`, `custom_duration` |
| `_purecart_access_duration_value` | int | Duration value for custom_duration access |
| `_purecart_access_duration_unit` | string | Duration unit for custom_duration access |
| `_purecart_sub_downgrade_products` | array | Product IDs available as downgrade options |

---

## Configuration Options

| Option | Default | Description |
|---|---|---|
| `purecart_sub_auto_renew` | `true` | Enable automatic renewal |
| `purecart_sub_retry_attempts` | `3` | Failed payment retry attempts |
| `purecart_sub_retry_intervals` | `[1,3,5]` | Days between retries |
| `purecart_sub_active_grace_days` | `7` | Days in past_due before suspension |
| `purecart_sub_suspended_grace_days` | `7` | Days suspended before hard cancellation |
| `purecart_sub_proration_mode` | `apply_at_renewal` | Default proration mode |
| `purecart_sub_skip_limit` | `1` | Max skip-next-renewal uses per billing year (0 = unlimited) |
| `purecart_sub_renewal_sync` | `false` | Align renewals to fixed calendar date |
| `purecart_sub_renewal_sync_date` | `1` | Day of month for renewal sync |
| `purecart_sub_one_trial_per_customer` | `true` | Block trial for returning customers |
| `purecart_sub_trial_role` | `''` | WP role during active trial |
| `purecart_sub_active_role` | `''` | WP role for active subscriptions |
| `purecart_sub_cancelled_role` | `''` | WP role for cancelled/expired subscriptions |
| `purecart_sub_renewal_reminder_days` | `[7,3,1]` | Days before renewal for reminder emails |
| `purecart_sub_card_expiry_warning_days` | `30` | Days before card expiry to send warning |
| `purecart_sub_allow_pause` | `true` | Allow customer self-pause |
| `purecart_sub_allow_cancel` | `true` | Allow customer self-cancel |
| `purecart_sub_allow_upgrade` | `true` | Allow customer upgrade/downgrade |
| `purecart_sub_allow_early_renewal` | `true` | Allow customer early renewal |
| `purecart_sub_allow_skip` | `true` | Allow customer to skip next renewal |
| `purecart_sub_cancel_saas_immediately` | `false` | Suspend SaaS on cancel vs. at period end |
| `purecart_sub_avg_lifetime_months` | `24` | Months used for LTV projection |
| `purecart_sub_gateway_meta_keys` | `[...]` | Gateway meta keys copied to renewal orders |
| `purecart_sub_staging_domains` | `[]` | Domain patterns where renewals are blocked |

---

## REST API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/purecart/v1/subscriptions` | manage_woocommerce | List all subscriptions |
| `GET` | `/purecart/v1/subscriptions/{id}` | manage_woocommerce | Get subscription detail |
| `POST` | `/purecart/v1/subscriptions/{id}/pause` | Customer / Admin | Pause subscription |
| `POST` | `/purecart/v1/subscriptions/{id}/resume` | Customer / Admin | Resume subscription |
| `POST` | `/purecart/v1/subscriptions/{id}/cancel` | Customer / Admin | Cancel (immediate or end-of-period) |
| `POST` | `/purecart/v1/subscriptions/{id}/skip` | Customer / Admin | Skip next renewal |
| `POST` | `/purecart/v1/subscriptions/{id}/renew` | manage_woocommerce | Manual renewal trigger |
| `POST` | `/purecart/v1/subscriptions/{id}/early-renewal` | Customer / Admin | Early renewal |
| `POST` | `/purecart/v1/subscriptions/{id}/upgrade` | Customer / Admin | Upgrade / downgrade plan |
| `POST` | `/purecart/v1/subscriptions/{id}/resubscribe` | Customer / Admin | Resubscribe |
| `GET` | `/purecart/v1/subscriptions/{id}/logs` | manage_woocommerce | Event log |
| `GET` | `/purecart/v1/subscriptions/{id}/cancellation/reasons` | Public | Cancellation reasons |
| `GET` | `/purecart/v1/subscriptions/{id}/cancellation/offers` | Customer | Available retention offers |
| `POST` | `/purecart/v1/subscriptions/{id}/cancellation/accept-offer` | Customer | Accept retention offer |
| `POST` | `/purecart/v1/subscriptions/{id}/external-renewal` | Server / Webhook | Record external gateway renewal |
| `GET` | `/purecart/v1/subscriptions/revenue-goals` | manage_woocommerce | Revenue goals |
| `POST` | `/purecart/v1/subscriptions/revenue-goals` | manage_woocommerce | Create revenue goal |

---

## Admin Panel Structure

**PureCart → Subscriptions**

### List Table Columns

| Column | Description |
|---|---|
| Subscription ID | Unique ID (SUB-XXXXX) |
| Customer | Name + email |
| Product | Subscription product name |
| Status | Badge: active / trialing / paused / past_due / pending_cancel / suspended / cancelled / expired / completed |
| Recurring Amount | Price + billing cycle |
| Next Payment | Date of next renewal |
| Churn Risk | Color-coded score badge |
| Started | Start date |
| Actions | View, Cancel, Renew now |

Filterable by: status, product, date range, customer, churn risk band.

### Detail Page Tabs

- **Overview** — all subscription fields, status, dates, churn score, LTV
- **Payment Log** — all renewal attempts with order IDs, amounts, gateway responses
- **Status History** — every status change with timestamp and reason
- **Emails Sent** — log of all notifications for this subscription
- **Retention** — cancellation reason, offer shown, accepted/declined, discount cycles remaining

### Settings Tabs (PureCart Settings → Subscriptions)

| Tab | Key Options |
|---|---|
| General | Enable/disable, auto-renew, mixed cart, subscribe & save |
| Billing | Retry attempts, retry intervals, overdue/suspend days, split payments |
| Renewals | Reminder days, renewal email templates, card expiry warning |
| Upgrade/Downgrade | Proration mode, downgrade products |
| Retention | Cancellation reasons, offer types, eligibility rules |
| Customer Portal | Allow pause/cancel/upgrade/skip/early-renewal from My Account |
| Notifications | Email template customization per event |
| Reports | Revenue goals, churn thresholds |
| Advanced | Staging domains, gateway meta keys, debug mode |

---

## Developer Hooks

```php
// Subscription created from order
do_action( 'purecart_subscription_created', $subscription_id, $order_id, $product_id );

// Renewal order created (before payment attempt)
do_action( 'purecart_renewal_order_created', $renewal_order, $subscription_id );

// External (gateway-scheduled) renewal recorded
do_action( 'purecart_external_renewal_recorded', $renewal_order, $subscription_id );

// After successful renewal payment
do_action( 'purecart_subscription_renewed', $subscription_id, $order_id, $new_next_payment_at );

// After trial ends and first real payment occurs
do_action( 'purecart_subscription_trial_ended', $subscription_id );

// When license is extended on renewal
do_action( 'purecart_license_renewed', $license_id, $new_expires_at );

// After payment fails (before dunning starts)
do_action( 'purecart_subscription_payment_failed', $subscription_id, $order_id, $retry_count );

// When subscription is suspended
do_action( 'purecart_subscription_suspended', $subscription_id );

// When subscription is cancelled
do_action( 'purecart_subscription_cancelled', $subscription_id, $cancelled_by );

// When pending-cancel subscription is finalized
do_action( 'purecart_subscription_cancellation_finalized', $subscription_id );

// When subscription expires (fixed length)
do_action( 'purecart_subscription_expired', $subscription_id );

// When subscription is completed (split payment fully paid)
do_action( 'purecart_subscription_completed', $subscription_id );

// When subscription is paused
do_action( 'purecart_subscription_paused', $subscription_id, $pause_duration_days );

// When subscription is resumed
do_action( 'purecart_subscription_resumed', $subscription_id );

// When subscription is skipped
do_action( 'purecart_subscription_skipped', $subscription_id, $new_next_payment_at );

// When plan is upgraded or downgraded
do_action( 'purecart_subscription_plan_changed', $subscription_id, $old_product_id, $new_product_id, $proration_amount );

// When early renewal order is created
do_action( 'purecart_early_renewal_created', $subscription_id, $order_id );

// When a retention offer is accepted
do_action( 'purecart_retention_offer_accepted', $subscription_id, $offer_type, $offer_data );

// When card expiry warning is sent
do_action( 'purecart_customer_card_expiring', $subscription_id, $days_until_expiry );

// When SCA reauthorization is required
do_action( 'purecart_reauth_required', $subscription_id, $renewal_order_id );

// When churn score is updated
do_action( 'purecart_churn_score_updated', $subscription_id, $old_score, $new_score );

// Filter: block renewal on staging
apply_filters( 'purecart_process_renewal', true, $subscription_id );

// Filter: dunning schedule (days after failure for each retry)
apply_filters( 'purecart_dunning_schedule', [ 1, 3, 7, 14 ], $subscription_id );

// Filter: proration amount before charge
apply_filters( 'purecart_proration_amount', $amount, $subscription_id, $new_product_id );

// Filter: renewal order args before creation
apply_filters( 'purecart_renewal_order_args', $args, $subscription_id );

// Filter: gateway meta keys copied from subscription to renewal order
apply_filters( 'purecart_gateway_meta_keys', $default_keys );

// Filter: whether a gateway manages its own billing schedule
apply_filters( 'purecart_gateway_schedules_payments', $bool, $payment_method, $subscription_id );

// Filter: available retention offers for a subscription
apply_filters( 'purecart_available_retention_offers', $offers, $subscription_id, $selected_reason );

// Filter: LTV average lifetime months
apply_filters( 'purecart_sub_avg_lifetime_months', 24 );

// Filter: milo-compatible gateway scheduled payments support check
apply_filters( 'purecart_gateway_scheduled_payments', $supports, $gateway_id );
```

---

## Competitor Feature Matrix (Updated)

| Feature | WC Subscriptions | ArraySubs | Milo | Recurio | YITH | WP Swings | EDD (core) | **PureCart** |
|---|---|---|---|---|---|---|---|---|
| WooCommerce native | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | **✅** |
| Simple subscription products | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | add-on | **✅** |
| Variable subscription products | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (Pro) | add-on | **✅** |
| Free trial | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (Pro) | add-on | **✅** |
| Sign-up fee | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | add-on | **✅** |
| Mixed cart | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | **✅** |
| Pause / Resume | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ (Pro) | ❌ | **✅** |
| Skip renewal | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | **✅** |
| Pending cancellation | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | **✅** |
| Resubscribe | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | **✅** |
| Plan upgrade/downgrade | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | **✅** |
| Proration (3 modes) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | **✅** |
| Early renewal | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | **✅** |
| Auto-renewal (Stripe/PayPal) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | **✅** |
| Gateway-scheduled payment support | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | **✅** |
| Idempotency guard on renewal | ⚠️ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | **✅** |
| Zero-total renewal handling | ⚠️ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | **✅** |
| Staging site block | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | **✅** |
| Dunning / payment retry | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ (Pro) | ❌ | **✅** |
| Card expiry warning email | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | **✅** |
| SCA reauthorization email | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | **✅** |
| Retention flow (cancel) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | **✅** |
| Retention offer eligibility rules | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | **✅** |
| Subscribe & Save | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | **✅** |
| Split / installment payments | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | **✅** |
| Churn risk scoring | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | **✅** |
| Customer LTV calculation | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | **✅** |
| Revenue goals | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | **✅** |
| Revenue ledger table | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | **✅** |
| Subscription logs per record | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | **✅** |
| Renewal reminder emails | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | **✅** |
| Bulk admin actions | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | **✅** |
| CSV export | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | **✅** |
| GDPR / privacy integration | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | **✅** |
| Linked to software license | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | add-on | **✅** |
| Linked to SaaS account | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **✅** |
| Stepped renewal pricing | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | **✅** |
| Renewal sync to calendar date | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **✅** |
| Role assignment on status | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | **✅** |
| HPOS compatible | ✅ | ✅ | ✅ | ❌ | ⚠️ | ⚠️ | N/A | **✅** |
| Action Scheduler (not raw cron) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | N/A | **✅** |

### Key PureCart Differentiators

1. **License-linked renewals** — renewal automatically extends software license expiry
2. **SaaS-linked renewals** — renewal re-activates a suspended SaaS account
3. **Split payments** — installment model with configurable access timing (not found in any other WooCommerce subscription plugin)
4. **Subscribe & Save** — dual pricing (one-time vs. recurring) on the same product
5. **Idempotency guard** — prevents double-charging if Action Scheduler retries
6. **Gateway-scheduled payment detection** — works cleanly with Stripe Billing / WooPayments recurring
7. **Zero-total renewal** — never routes $0 through a gateway
8. **Staging block** — prevents accidental billing on dev/staging copies
9. **Churn risk scoring** — actionable score for every subscription
10. **Customer LTV + revenue goals** — built-in SaaS-grade analytics
11. **Retention offer eligibility rules** — sophisticated targeting (subscription age, value, spend, remaining days)
12. **Card expiry warnings + SCA reauth** — complete payment health coverage
13. **Revenue ledger table** — separate table for clean MRR/ARR reporting
14. **Built into PureCart** — no separate plugin install, no compatibility risk with PureCart modules
