# PureCart Subscriptions — Final Feature R&D (Reconciled)

**Plugin:** PureCart (folder: `woo-digital-downloads`, text-domain: `purecart`)
**Module:** Subscriptions — Phase 2
**Status:** Reconciled from all prior R&D drafts. This is the feature spec devs should build against.
**Companion doc:** `subscription-final-dev-plan.md` — architecture, DB schema, REST API, and the step-by-step build plan.

---

## 0. How this document was built

Six prior documents covered subscription R&D, and they disagreed on fundamentals — not just wording, three different naming conventions and two different feature scopes. This doc reconciles them into one spec. Every section below is tagged with where its content came from, so you can go back to the original if you need more context.

**Source legend:**

| Tag | File |
|---|---|
| `[RND]` | `docs/RND-subscriptions.md` |
| `[RND-FE]` | `docs/RND-subscriptions-frontend.md` |
| `[nym-RND]` | `docs/nym/RND-subscription-nym.md` |
| `[nym-ARCH]` | `docs/nym/ARCH-subscription-backend-nym.md` |
| `[dev-plan]` | `docs/dev-plan-subscriptions.md` |
| `[dev-plan-FE]` | `docs/dev-plan-subscriptions-frontend.md` |
| `[bangla-plan]` | `docs/subscription-plan-bangla.md` |

### Why the docs disagreed, and what won

I checked all three lineages against the actual codebase (`includes/`, `src/app/`, `purecart.php`, `package.json`) before reconciling:

| Lineage | Prefix / tables | Verified against real code |
|---|---|---|
| `[RND]` + `[RND-FE]` | `purecart_` / `wp_purecart_*`, `PC_*` classes | **Matches.** Plugin is named PureCart (`purecart.php` header), text-domain `purecart`, 11 real `purecart_*` usages already in `includes/`. Frontend tech stack (Tailwind, `lucide-react`, `recharts`, M3 tokens) matches `package.json` and `src/app/components/ui/` exactly. |
| `[dev-plan]` + `[dev-plan-FE]` | `wdd_` / `wp_wdd_*` | **Stale.** Zero `wdd_` usage anywhere in `includes/`. Written against the old plugin slug before the PureCart rebrand. Frontend plan proposes `@wordpress/components` + PHP templates, which doesn't match the Tailwind/Recharts React app already built for every other module. |
| `[nym-RND]` + `[nym-ARCH]` | `pct_` / `pct_subscriptions` | **Not used**, and assumes Licensing/SaaS are separate "companion plugins" — they're actually sibling modules in this same plugin (`includes/Licensing/`, `includes/SaaS/` already exist). |
| `[bangla-plan]` | — | Not a competing spec — explicitly defers to `[RND]`/`[RND-FE]` for technical detail. Used here only as a plain-language cross-check. |

**Reconciliation decisions (confirmed with the team):**
1. **Naming:** `purecart_` / `wp_purecart_*` / `PC_*` is canonical — it's what the real code already uses. `[dev-plan]`'s `wdd_` naming and `[nym-ARCH]`'s `pct_` naming are both translated to `purecart_` wherever reused below.
2. **Delivery types:** Kept `[RND]`'s six built-in delivery types (software / SaaS / membership / download / course / service), but adopted `[nym-ARCH]`'s pluggable registry pattern — `delivery_type` is `VARCHAR`, not a fixed `ENUM`, and new types register via a filter instead of a schema migration. See `subscription-final-dev-plan.md` § Delivery Type Registry.
3. **Feature scope:** All of `[nym-RND]`'s extra research (multi-currency, usage-based billing, gift subscriptions, tax compliance, fraud prevention, merchant migration, offline gateways) is folded in below, not dropped. It's organized as its own set of sections so the origin is traceable.

---

## 1. Overview

The Subscriptions module is a complete, self-contained recurring billing system built into PureCart. It adds a subscription product type to WooCommerce, handles recurring billing via Stripe and PayPal, manages the full lifecycle (trial → active → paused → cancelled → expired), and ties renewals directly to license expiry and SaaS account status when those modules are enabled. `[RND]`

Enable via **Settings → PureCart → Modules → Subscriptions**. Standalone — works without Licensing or SaaS enabled; when they are enabled, renewals extend license expiry / reactivate SaaS accounts automatically. `[RND]`

---

## 2. Competitor Landscape

### Plugins analyzed end-to-end `[RND]`

| Plugin | Type | Approach | Key differentiators |
|---|---|---|---|
| Easy Digital Downloads (EDD) | Full platform | Custom orders + CPT | Customer-centric model, licensing add-on, bundles, download logs |
| ArraySubs | WC subscription | PSR-4, feature-providers | Retention flow, plan switching w/ proration, card expiry, SCA reauth |
| Paid Member Subscriptions | Membership | Custom CPT | Grace period, payment retry, plan upgrade/downgrade with sign-up fee |
| Subscriptions for WooCommerce (WP Swings) | WC subscription | CPT-based | Basic free tier, membership + content restriction |
| Milo Subscriptions | WC subscription | Custom order type (HPOS) | Gateway-scheduled payment detection, idempotency guard, staging block, zero-total renewals |
| YITH WC Subscription | WC subscription | CPT-based | PayPal billing agreements, hourly renewal cron |
| Recurio | WC subscription | Custom table | Split/installment payments, subscribe-&-save, churn score, LTV, revenue goals, early renewal |

### Competitor pricing reference (2026) `[nym-RND]`

| Plugin / platform | Model | Price |
|---|---|---|
| WooCommerce Subscriptions | Annual license | $279/yr |
| YITH WooCommerce Subscription | Annual license | ~€199/yr |
| WP Swings Pro | Annual license | $129/yr |
| WebToffee Subscriptions | Annual license | $89/yr |
| WPSubscription | Annual / lifetime | $89/yr or $179 one-time |
| SUMO Subscriptions | One-time | ~$49 one-time |
| Sublium (FunnelKit) | Annual license | Mid-range SaaS pricing |

**Positioning `[bangla-plan]`:** Build a full engine like WooCommerce Subscriptions, but built into PureCart (no separate purchase), plus the best ideas from SUMO (drip content) and ArraySubs (retention flow) folded in natively.

See § 25 for the full feature-by-feature competitor matrix.

---

## 3. Core Billing & Product Model

`[RND]` §"Subscription Product Types", `[nym-RND]` §"কোর বিলিং"

| Feature | Description | Notes |
|---|---|---|
| Billing interval | Daily / weekly / monthly / yearly, custom interval count (e.g. every 3 months) | `[RND]` |
| Free trial | N-day trial before first charge; card captured via $0 auth / SetupIntent, not charged | `[RND]` `[nym-RND]` |
| Sign-up fee | One-time fee on first payment only, separate line item, not repeated on renewal | `[RND]` `[nym-RND]` |
| Subscription length | Max duration (e.g. 12 months); empty = indefinite | `[RND]` |
| Variable subscriptions | Product variations with different prices/intervals per tier (Starter/Pro/Enterprise pattern) | `[RND]` `[nym-RND]` |
| Mixed cart | Subscription + non-subscription products in one checkout | `[RND]` |
| Multiple subscriptions | Multiple subscription products in one checkout → separate subscription record per item | `[RND]` |
| Subscription coupons | Sign-up-fee-only coupon type + recurring-fee coupon type (first N renewals or forever) | `[RND]` `[nym-RND]` |
| Subscribe & Save | Recurring price discounted vs. one-time purchase; dual pricing shown on product page | `[RND]` `[nym-RND]` (inspired by Recurio) |
| Split payments | Pay in N installments; access granted immediately or after final payment | `[RND]` `[nym-RND]` (inspired by Recurio) |
| Stepped renewal pricing | Introductory price for first N cycles, then steps to regular price; 7-day advance notice email | `[RND]` `[nym-RND]` |
| Renewal sync | Align all subscriptions for a product to a fixed calendar date, with prorated first payment | `[RND]` `[nym-RND]` |
| One trial per customer | Trial stripped if customer already trialled this product (prevents cancel+resubscribe abuse) | `[RND]` — `[nym-RND]` extends the check to `user_id` + `billing_email` + `payment_token_fingerprint` combined, not just user meta |
| Proration (upgrade/downgrade) | 3 modes: prorate immediately / apply at renewal (default) / no proration | `[RND]` §8, `[nym-RND]` |
| Drip content | Deliver downloadable files incrementally over time | `[RND]` — Phase 4, requires Downloads module |
| Physical / subscription box | Shipping order auto-created in sync with each successful renewal charge | `[nym-RND]` — **new**, not in `[RND]`. Proposed as a 7th delivery type (see § 4) rather than a separate product type, so it reuses the same registry. |

**Worked examples (`[nym-RND]`):**
- Renewal sync: customer subscribes June 15 to a $9.99/mo product synced to the 1st. First charge is prorated: 16/30 × $9.99 = $5.16 (June 15 → July 1). Full $9.99 from July 1 onward.
- Proration: upgrade from $19/mo to $49/mo with 15 days left in the cycle → charge = ($49 − $19) × 15/30 = $15, charged immediately.
- Stepped pricing: $9/mo for 3 months → $29/mo ongoing, with a reminder email 7 days before the step.

---

## 4. Subscription Product Types & Delivery Types

`[RND]` §"Subscription Delivery Types", `[nym-ARCH]` §"এক্সটেনসিবিলিটি আর্কিটেকচার", `[nym-RND]` §"প্রোডাক্ট টাইপ"

PureCart subscriptions support **six built-in delivery types**, each driving what gets provisioned on activation:

| Type | Value | What's provisioned | Module dependency |
|---|---|---|---|
| Software / Plugin | `software` | License key + domain activations | Licensing module (`includes/Licensing/`) |
| SaaS Platform | `saas` | SaaS account + seat allocation | SaaS module (`includes/SaaS/`) |
| Membership | `membership` | WP role + content restriction tier | None (built-in) |
| Digital Downloads | `download` | Per-cycle download quota + drip schedule | Downloads module |
| Learning / Course | `course` | LMS enrollment (LearnDash / LifterLMS / Tutor LMS) | None (LMS API) |
| Service / Retainer | `service` | Deliverable tracking + optional invoice | None (built-in) |

`software` and `saas` store their linked entity IDs directly on the subscriptions table (`license_id`, `saas_account_id`) since Licensing/SaaS are sibling modules with their own tables. The other four store type-specific data in a linked-entities table. `[RND]`

**Reconciled decision — pluggable registry, not a fixed list:** `[nym-ARCH]` proposes making `delivery_type` a `VARCHAR` validated at runtime by a filter-based registry, rather than a hard-coded `ENUM`, so a future 7th type (e.g. the physical/subscription-box type from § 3) can register without a schema migration:

```php
add_filter( 'purecart_subscription_delivery_handlers', function ( $handlers ) {
    $handlers['physical_box'] = new PC_Box_Delivery_Handler();
    return $handlers;
} );

interface PC_Subscription_Delivery_Handler {
    public function activate( $subscription );
    public function renew( $subscription );
    public function deactivate( $subscription );
    public function get_linked_data( $subscription );
    public function validate_linked_data( array $data );
}
```
`[nym-ARCH]` (adapted to `PC_` naming — see dev-plan doc for full detail)

This keeps `[RND]`'s six types as the built-in set (they're the only ones with real product-market use cases today) while adopting `[nym-ARCH]`'s extensibility so Licensing and SaaS remain "companion module" style integrations and everything else is a lightweight registered handler.

### Delivery-type-specific features `[RND]`

**Membership:** named tier (Gold/Silver/Bronze), grace period after cancellation before role removal (default 3 days), admin tier change, role re-sync on renewal.

**Digital Downloads:** per-cycle download quota (0 = unlimited), quota resets on renewal, drip content at configured intervals, access revoked on cancellation.

**Course/LMS:** LMS plugin selector (LearnDash/LifterLMS/Tutor), course IDs linked per product, enrollment on activation, access extended on renewal, revoked on cancellation/expiry, admin can manually extend access.

**Service/Retainer:** deliverable notes template, next-deliverable-due date advances each renewal, admin marks deliverables complete, optional auto-invoice on renewal (none / WC order / PDF).

---

## 5. Customer Self-Service

`[RND]` §"Subscription Management (Customer)", `[nym-RND]` §"কাস্টমার সেলফ-সার্ভিস"

| Feature | Description |
|---|---|
| Pause | Vacation mode — billing suspended, access maintained; `next_payment_at` advances by pause duration on resume |
| Resume | New `next_payment_at` calculated from resume date |
| Skip next renewal | `next_payment_at` jumps one interval; license/SaaS access extends to cover it; admin-configurable annual skip limit |
| Pending cancellation | Cancel at end of period — status `pending_cancel`, access continues until period end, no new charge (inspired by Milo) |
| Cancel immediately | Status → `cancelled`; retention flow runs first |
| Change payment method | Update card/PayPal for future renewals, no admin contact needed |
| Upgrade / downgrade | Self-service tier switch with automatic proration |
| Auto-downgrade (retention) | Schedule a downgrade for next renewal as a retention offer instead of cancelling |
| Resubscribe | Re-activate a cancelled/expired subscription — two paths (see below) |
| Early renewal | Renew before the due date; extends `next_payment_at` by one cycle immediately (inspired by Recurio) |
| Update quantity | Change subscription quantity if the product allows it |
| View renewal history | Full log of payments, status changes, retries, emails |

**Resubscribe — two paths `[nym-RND]`** (more detail than `[RND]` provides, adopted here):
- **Within the reactivation window** (admin-configurable days): the *same* subscription record is reactivated — payment history, event log, and LTV calculation stay continuous.
- **After the window:** a *new* subscription record is created, linked back via `previous_subscription_id`, and `one_trial_per_customer` is re-checked before offering a trial again.

---

## 6. Retention Flow (Cancellation)

`[RND]` §7, `[nym-RND]` §"রিটেনশন ফ্লো", §"ডাউনগ্রেড — রিটেনশন অফার হিসেবে"

When a customer initiates cancellation, a retention flow intercepts before the subscription is actually cancelled:

```
Customer clicks "Cancel"
    │
    ├── Step 1: Cancellation reason selection (admin-configurable list)
    │       "Too expensive" · "Not using it" · "Missing features" ·
    │       "Switching provider" · "Pausing use" · "Other"
    │
    └── Step 2: Retention offer (matched to reason, configurable per reason)
            ├── Offer A: Discount   → X% or $X off next N renewals
            ├── Offer B: Pause      → Pause for N days instead of cancelling
            ├── Offer C: Skip cycle → Skip next billing charge (free extension)
            ├── Offer D: Downgrade  → Switch to a lower-tier plan at next renewal
            └── Offer E: Contact    → Redirect to support URL
                │
                ├── Accepts → Apply offer, abort cancel, log retention event
                └── Declines → Confirm cancellation (immediate or end-of-period)
```

### Offer eligibility rules `[RND]` (inspired by ArraySubs)

| Rule | Description |
|---|---|
| `trigger_reasons` | Which cancellation reasons trigger this offer; empty = all |
| `min_subscription_age_days` | Minimum tenure before this offer is eligible |
| `min_subscription_value` / `max_subscription_value` | Price-range targeting |
| `min_user_total_value` / `max_user_total_value` | Targets by lifetime spend — e.g. park high-LTV customers with a stronger offer `[nym-RND]` |
| `min_remaining_days` / `max_remaining_days` | Days left in current billing period |
| `product_ids` | Restrict to specific products |
| One-time-use guard | Discount offers track `_purecart_retention_discount_applied_date`; not shown twice for the same subscription |

### Downgrade-as-retention-offer detail `[nym-RND]`

The downgrade offer is **not immediate** — it's scheduled via `pending_switch_product` and applied at the next renewal, with a confirmation email sent right away:

```
Sofia tries to cancel Pro ($29/mo), reason: "too expensive"
Offer shown: "Switch to Starter ($9/mo) — keep all your data, upgrade back anytime"
Sofia accepts:
  → status stays active, no immediate change
  → pending_switch_product = starter_plan_id
  → next renewal: charges $9, switches Pro → Starter
  → "Downgrade scheduled" email sent
```

Every accepted offer is logged (`_purecart_retention_offer_history` / `subscription_logs`) so admin reports can show acceptance rates by offer type. `[RND]` `[nym-RND]`

---

## 7. Failed Payment Recovery & Dunning

`[RND]` §4-5, §"Renewal Lifecycle", `[nym-RND]` §"ফেইলড পেমেন্ট রিকভারি ও ডানিং"

**Grace-period flow `[RND]`:**

```
Day 0:   Charge fails → status 'past_due'. Access stays active. Email sent.
Day N:   Retry (configurable schedule, e.g. [1, 3, 5] days).
         Success → renewal-complete flow. Failure → overdue reminder.
Day X:   Active grace exhausted (default 7 days) → status 'suspended'.
         License/SaaS suspended. Email sent.
Day X+N: Retries continue during suspended grace.
         Success → status 'active', access restored, reactivation email.
Day X+Y: Suspended grace exhausted (default 7 days) → status 'cancelled'.
         License stays valid until its own expires_at, then expires naturally.
```

**Intelligent retry targeting `[nym-RND]`** — adopted as a refinement to the retry logic: distinguish **hard declines** (`stolen_card`, `invalid_account` — don't retry, these will never succeed) from **soft declines** (`insufficient_funds` — worth retrying). This should gate whether `DunningManager` schedules a retry at all, not just when.

**One-click card updater `[nym-RND]`** — adopted as an enhancement to `[RND]`'s existing "send-card-update" endpoint: dunning emails carry a cryptographically signed, time-limited magic link (SHA-256 hash of `subscription_id` + `user_id` + expiry, valid 14 days) that lets the customer update their card **without logging in**. Successful card save triggers an immediate auto-retry.

**Recovery email sequence `[nym-RND]`** (maps onto `[RND]`'s existing dunning emails, with example copy):

| Email | Timing | Subject |
|---|---|---|
| 1 | Day 0 | "Your $29.99 payment failed — update your card" + magic link |
| 2 | Day 3 | Friendly reminder before next retry |
| 3 | Day 7 | "Your access is about to be suspended" |
| 4 | Day 14 | Final notice — cancellation warning |

Expected recovery rate on soft declines: **15–25%** `[nym-ARCH]`.

---

## 8. Admin & Analytics

`[RND]` §3, §9, `[nym-RND]` §"অ্যাডমিন ও অ্যানালিটিক্স"

| Feature | Description |
|---|---|
| Admin subscription list | Sortable list, filter by status/product/customer/date range/churn band |
| Subscription detail page | Full detail, payment log, status history |
| Manual status change / renewal / cancellation | With reason, hooks fire |
| Bulk actions | Bulk cancel, bulk retry, bulk export |
| Subscription logs | Per-subscription event log (payment attempt, status change, email sent) |
| Churn risk score | 0–100, computed from payment failure history, tenure, recency — see § 9 |
| Customer LTV | 24-month projected value stored on record — see § 9 |
| Revenue goals | Admin sets targets per period, auto-updated on each payment |
| Health check scanner | Scans for expired/missing payment methods (inspired by Milo) |
| Privacy / GDPR | Data export + eraser hooks for WP's personal data tools |
| Granular manual control | Renewal date override, next-payment amount override, custom credit injection, force manual renewal `[nym-RND]` |
| Recurring coupons | First-payment-only / first-N-renewals / lifetime discount coupon types `[nym-RND]` (see § 3 for the coupon types themselves) |

### Core analytics formulas `[nym-RND]`

| Metric | Formula | Example |
|---|---|---|
| MRR | Sum of normalized monthly-equivalent recurring revenue across active subs | $2,310 |
| ARR | MRR × 12 | $27,720 |
| ARPU | MRR / active subscriber count | $2,310 / 90 = $25.67 |
| User churn rate | (cancelled users / active at month start) × 100 | (3/90) × 100 = 3.3% |
| Revenue churn rate | (lost MRR / starting MRR) × 100 | ($87/$2,310) × 100 = 3.8% |
| LTV | ARPU × avg customer lifespan (months) | $25.67 × 24 = $616 |

---

## 9. Churn Risk Score & Customer LTV

`[RND]` §"Churn Risk Scoring", §"Customer LTV Calculation", `[nym-RND]` §"চার্ন রিস্ক স্কোর", §"কাস্টমার LTV ইঞ্জিন"

### Churn risk score (0–100)

```
Increases:  payment_failed (+20) · retry_failed (+10/retry) ·
            customer_initiated_cancel (+30) · skip_next_cycle (+5) · pause (+10)
Decreases:  payment_success (−15, floor 0) · every 12 renewals (−5)

Bands:  0–25 Low (green) · 26–50 Medium (yellow) · 51–75 High (orange) · 76–100 Critical (red)
```
`[RND]` — recomputed by `ChurnScorer::compute()` after every payment event, stored on the subscription record.

`[nym-RND]` maps the same bands to admin actions: Low → nothing, Medium → activity monitor, High → highlight in admin list, Critical → proactive check-in / email offer queue. Worth adopting as the UI treatment (see dev-plan doc's frontend section).

### Customer LTV

`[RND]`'s formula (used as canonical — simpler, works from list price without needing full payment history):
```php
$monthly_equivalent = billing_amount normalized to a monthly rate;
$ltv = $monthly_equivalent × avg_lifetime_months (filterable, default 24);
```

`[nym-RND]` proposes a variant that blends in actual paid history rather than projecting from price alone — worth adopting as a **v2 refinement** once real payment data exists:
```
LTV = historical_paid_revenue + (monthly_equivalent × expected_remaining_months)
Example: Sofia, $29/mo, 6 months active
  historical = $29 × 6 = $174
  remaining  = 24 − 6 = 18 months
  LTV = $174 + ($29 × 18) = $696
```

---

## 10. Payment Health — Card Expiry & SCA Reauthorization

`[RND]` §"Card Expiry Warnings", §"SCA / Payment Reauthorization", `[nym-RND]` §"কার্ড মেয়াদ শেষ হওয়ার সতর্কতা", §"SCA ও 3DS2"

**Card expiry:** daily scan of stored payment tokens; warning email sent at configurable threshold (default 30 days before expiry). `[RND]` `[nym-RND]` refines this to a two-stage warning: T-30 and T-7 days, both with a one-click update link.

**SCA/3DS2 reauthorization:** off-session renewal charges that require bank authentication trigger a reauth flow instead of failing outright:

```
Renewal charge → bank requires 3DS challenge
    ├── Create pending renewal order, store _purecart_reauth_required
    ├── Generate signed one-time payment link (order-pay page + nonce)
    └── Email customer: "Confirm your $29 payment →"
        └── Customer completes 3DS challenge → standard renewal-complete flow
```
`[RND]`

`[nym-RND]` proposes this become an explicit subscription status, `pending_reauth` (grace period active, access retained), rather than only an order-level flag. **Adopted** — see the reconciled status enum in § 22; it makes the state visible in the admin list/filters instead of being buried in order meta.

---

## 11. Webhook Handling & Idempotency

`[nym-RND]` §"ইনবাউন্ড ওয়েবহুক হ্যান্ডলিং ও আইডেমপোটেন্সি" — **new section, not covered in `[RND]`**, which only describes idempotency for PureCart-initiated renewals (§5 of `[RND]`), not inbound gateway webhooks generally.

- **Security:** HMAC signature verification required before parsing any webhook payload.
- **Idempotency:** every webhook event ID is logged; duplicate events return HTTP `200 OK` without reprocessing.

**Stripe event mapping:**

| Stripe event | PureCart action |
|---|---|
| `charge.succeeded` | Complete renewal, advance dates |
| `charge.failed` | Trigger dunning |
| `payment_intent.payment_failed` | Non-SCA failure — start dunning |
| `invoice.payment_action_required` | SCA challenge needed → `pending_reauth` status, reauth email |
| `customer.updated` | Default card changed → update `payment_token_id` |
| `customer.subscription.deleted` | → `cancelled` |
| `charge.dispute.created` | Flag high churn/fraud risk, freeze access |

**PayPal event mapping:**

| PayPal event | PureCart action |
|---|---|
| `PAYMENT.SALE.COMPLETED` | Complete renewal, advance dates |
| `PAYMENT.SALE.DENIED` | Trigger dunning |
| `PAYMENT.SALE.REFUNDED` | Log refund, update status |
| `BILLING.SUBSCRIPTION.CANCELLED` | → `cancelled` |
| `BILLING.SUBSCRIPTION.SUSPENDED` | → `suspended` |
| `BILLING.SUBSCRIPTION.PAYMENT.FAILED` | Trigger dunning |

---

## 12. Tax Compliance & Dynamic Recalculation

`[nym-RND]` §"ট্যাক্স কমপ্লায়েন্স ও ডায়নামিক রিক্যালকুলেশন" — **new, Phase 2/Pro.** Not covered in `[RND]` beyond a simple "include tax in renewal" toggle.

- Support EU VAT OSS, UK VAT, US Sales Tax (Avalara / TaxJar / WooCommerce Tax integration).
- Tax rate is **recalculated on every renewal** based on the customer's current billing/shipping jurisdiction, not locked at signup.
- Example: a German customer subscribed at $29/mo pays 19% VAT ($34.51 total). If they later move to the UK, the next renewal recalculates at 20% VAT automatically.

---

## 13. Usage-Based / Metered Billing

`[nym-RND]` §"ইউসেজ-বেসড ও মিটার্ড বিলিং" — **new, Phase 2/Pro.** Not in `[RND]` at all.

```
"PureCart API Access" plan
Base price: $19/mo, includes 10,000 API calls
Overage: $0.50 per additional 1,000 calls

July usage: base $19.00 + 8,000 extra calls × $0.50/1,000 = $4.00 → total charge $23.00
```

- Usage recorded via `POST /purecart/v1/subscriptions/{id}/usage`.
- Final renewal charge = base recurring price + accumulated metered units for the cycle.

---

## 14. Multi-Currency & Exchange Rate Locking

`[nym-RND]` §"মাল্টি-কারেন্সি ও এক্সচেঞ্জ রেট লকিং" — **new, Phase 2/Pro.**

- **Mode A (locked currency):** customer locks in the exact currency + amount at signup; every renewal charges that same amount regardless of FX movement.
- **Mode B (base currency conversion):** a fixed base price is converted to the customer's local currency at the *current* exchange rate on each renewal.

---

## 15. Gift Subscriptions & Prepaid Vouchers

`[nym-RND]` §"গিফট সাবস্ক্রিপশন ও প্রিপেইড ভাউচার ফ্লো" — **new, Phase 2/Pro.** Not in `[RND]`.

```
Buyer purchases a 6-month gift subscription ($29 × 6 = $174), enters recipient's email.
→ Unique redemption code generated (GIFT-2026-ABCD1234), emailed to the recipient.
Recipient redeems: sets up account + shipping details — no card required.
→ 6-month prepaid subscription activates.
15 days before the gift period ends: recipient is prompted to add a card to
continue at $29/mo, or the subscription simply expires.
```

See § 24 for the full gift-subscription user journey.

---

## 16. Data Privacy, GDPR & Right to Erasure

`[RND]` §"Privacy/GDPR" (brief), `[nym-RND]` §"ডেটা প্রাইভেসি, GDPR" (detailed process — used here as canonical)

On a WP user-erasure request:
1. Active recurring subscriptions are cancelled immediately; gateway payment tokens are scrubbed.
2. Financial transaction logs are retained for tax/legal compliance, but personal identifiers (name, email, IP) are anonymized (e.g. `deleted_user_4829`).
3. Personal data is scrubbed directly from the subscription event log.

Implemented via WP's built-in personal-data exporter/eraser hooks (`PrivacyHandler` class, `[RND]`).

---

## 17. Merchant Migration & Bulk Import/Export

`[nym-RND]` §"মার্চেন্ট মাইগ্রেশন ও বাল্ক ইম্পোর্ট/এক্সপোর্ট" — **new, Phase 2/Pro.** Not in `[RND]`.

CSV import path from WooCommerce Subscriptions, ReCharge, or Stripe:

```csv
customer_email,gateway_token,product_id,next_renewal_date,billing_frequency,amount
rahim@example.com,cus_StripeABC123,42,2026-08-01,monthly,29.00
```

- Dry-run validation before commit: flags missing products, invalid tokens, bad date formats.
- Example validation report: *"98 records OK. 2 issues found: line 15 — product_id 99 doesn't exist. Line 23 — bad date format."*
- On execution: records import into the subscriptions table, future renewal jobs scheduled based on imported dates.

See § 24 for the full merchant migration journey.

---

## 18. Offline & Manual Payment Gateways

`[nym-RND]` §"অফলাইন ও ম্যানুয়াল পেমেন্ট গেটওয়ে" — **new, Phase 2/Pro.**

Supports BACS, direct bank transfer, cheque, and manual invoice renewals:

```
Renewal date: automatic charge skipped, invoice emailed instead ("$299 due — see payment instructions"), order → pending_payment
Grace reminder a week later if unpaid.
Bank confirmation arrives → admin manually approves the order → subscription renews.
```

---

## 19. Fraud Prevention & Velocity Control

`[nym-RND]` §"ফ্রড প্রিভেনশন ও ভেলোসিটি কন্ট্রোল" — **new, Phase 2/Pro.**

- Rate-limit trial/subscription checkouts by IP and device fingerprint. Example rule: more than 5 trial signups from the same IP in 1 hour → auto-block + admin alert.
- Integrate with gateway-native risk scoring (Stripe Radar, PayPal Fraud Protection).
- Minimum authorization check before creating a subscription on a $0 trial, to validate the card is real.

---

## 20. Mixed Cart Validation Rules

`[nym-RND]` §"মিক্সড কার্ট ভ্যালিডেশন নিয়ম" (rules table below) + `[RND]`'s "Mixed cart" feature entry (§3) and `filter_gateways_for_subscriptions()` hook — merged.

| Scenario | Allowed? | Rule |
|---|---|---|
| Subscription + non-subscription | ✓ | Both processed together at checkout |
| Two subscriptions to the *same* product | ✗ | "You're already subscribed to this plan" |
| Two *different* subscriptions | Configurable | Admin `allow_multiple_subscriptions` setting |
| Subscription + gift subscription | ✗ | Requires a separate checkout session |

**Gateway filtering:** when the cart contains a subscription, any gateway that doesn't support tokenization/off-session charging is hidden from checkout (e.g. Cash on Delivery). `[RND]`

---

## 21. Refund Policy

`[nym-RND]` §"রিফান্ড পলিসি" — **new, not covered in `[RND]`.**

| Scenario | Behavior | Resulting status |
|---|---|---|
| Full refund + immediate cancel | Charge fully reversed, access ends now | `cancelled` |
| Full refund + cancel at period end | Charge reversed, access continues until period end | `pending_cancel` |
| Partial refund | Partial amount reversed, subscription continues unaffected | `active` (unchanged) |
| Renewal-specific refund | A specific renewal order is refunded | Admin's discretion |

Refunds are logged against the specific payment record (`status=refunded`, `refunded_amount`) and as an audit event (`actor_type=admin`).

---

## 22. Complete Email Notification List

Merged from `[RND]` (37 total: 25 core + 12 delivery-type-specific, `[RND-FE]` §4.11), `[nym-RND]`'s recovery sequence (§7 above), and `[dev-plan]`'s MVP subset of 16.

**Build in phases** — the 16 in `[dev-plan]` are the MVP set; the remaining ~21 are delivery-type-specific or advanced-feature emails that ship with their corresponding feature.

### MVP set (16) `[dev-plan]`
Subscription Created · Trial Started · Trial Ending Soon · Trial Converted · Renewal Reminder · Renewal Successful · Payment Failed · Payment Retry Scheduled · Overdue Notice · Suspend Notice · Suspended Grace Ending · Cancellation Notice · Expiration Notice · Resubscription Confirmed · Plan Changed · Skip Renewal Confirmed

### Additional core emails (9) `[RND]`
Renewal Invoice · Card Expiring Soon · Payment Reauthorization · Retention Discount Accepted · Early Renewal Completed · Split Payment Installment · Split Payment Completed · Subscription On Hold · Auto-Downgrade Scheduled

### Delivery-type-specific emails (12) `[RND-FE]` §4.11
Membership Tier Upgraded/Downgraded · Membership Access Expiring · Membership Grace Period Notice · New Content Available (Drip) · Download Quota Reset · Download Limit Reached · Course Access Granted/Expiring/Revoked · Deliverable Submitted · Invoice Sent (Service)

### Admin-facing emails `[nym-RND]`
New Subscriber Notification · Payment Failure Admin Alert

All templates support 50+ placeholders (`{first_name}`, `{subscription_id}`, `{amount}`, `{next_payment_date}`, `{churn_risk}`, etc.) `[RND]`. Multiple pre-renewal reminders are configurable (e.g. 7/3/1 days before).

---

## 23. Subscription Lifecycle & Status States

Reconciled status enum — base is `[RND]`'s (matches the real `purecart_` naming convention), with `pending_reauth` added per the § 10 decision, and `[nym-RND]`'s access/billing-active matrix layered on top for clarity.

| Status | Billing active? | Access? | Description |
|---|---|---|---|
| `trialing` | No | Yes | Free trial window active |
| `active` | Yes | Yes | Standard operating state |
| `paused` | No | No | Customer/admin paused; auto-resumes on scheduled date |
| `past_due` | Retrying | Yes (grace) | Payment declined, active dunning retries running |
| `pending_reauth` | Retrying | Yes (grace) | Bank requires SCA/3DS confirmation — **added from `[nym-RND]`, see § 10** |
| `suspended` | No | No | All retries exhausted, access revoked, hard-cancel pending |
| `pending_cancel` | No | Yes | Cancellation requested; access continues until paid period ends |
| `cancelled` | No | No | Permanently ended, no auto-renewal |
| `expired` | No | No | Fixed-length subscription reached its max cycle count |
| `completed` | No | Yes | Split-payment subscription — all installments paid |

`[RND]`'s DB schema (see dev-plan doc) does not currently include `pending_reauth` — that's a schema change to make as part of adopting this reconciled enum.

### Primary transition triggers `[RND]` §"Subscription Lifecycle", cross-checked against `[nym-RND]`'s diagram

```
Order completed → trialing (if trial) or active
trialing → active                    (trial ends, first charge succeeds)
active → past_due                    (renewal charge declines)
past_due → pending_reauth            (SCA challenge required, new)
past_due/pending_reauth → active     (retry or reauth succeeds)
past_due → suspended                 (active grace days exhausted)
suspended → active                   (late retry succeeds — reactivation)
suspended → cancelled                (suspended grace days exhausted)
active → paused → active             (customer pause / resume)
active → pending_cancel → cancelled  (cancel at period end)
active → cancelled                   (cancel immediately)
cancelled/expired → active           (resubscribe)
active (split payment) → completed   (final installment paid)
```

---

## 24. User Journeys

`[nym-RND]` §"ইউজার জার্নি" — **new section, not present in `[RND]`.** Adopted in full as it's genuinely useful onboarding/UX reference material with no equivalent elsewhere.

### Merchant onboarding
1. **Install & activate** — plugin installed, `purecart_*` tables created automatically, Action Scheduler hooks registered.
2. **Gateway setup** — connect Stripe/PayPal API keys, enable tokenization + off-session charging, configure webhook secret.
3. **Create subscription product** — set price, trial length, sign-up fee, delivery type, plan tiers.
4. **Configure emails & dunning rules** — customize templates, set retry matrix (e.g. retry at 3/7/14 days, then cancel).
5. **Publish & monitor** — live dashboard shows MRR, active subscriber count, churn rate, upcoming 7-day renewal total.

### Customer journey
1. **Plan selection** — tier + billing frequency chosen on product page, with a clear trial/first-charge preview.
2. **Checkout & token capture** — payment token created via gateway iframe; $0 auth for trials.
3. **Active subscription cycle** — renewal reminder 3 days out, automatic charge, receipt email.
4. **Self-service (My Account)** — pause (up to a configured max), skip a delivery, update payment method, upgrade tier.
5. **Exception/retention flow** — failed payment → magic link → card update → auto-retry. Cancel attempt → retention offer modal (pause/discount/downgrade).

### Gift subscription journey
Buyer selects "buy as gift," pays for a prepaid term, unique redemption code is generated and emailed to the recipient. Recipient redeems (no card required), account is set up, prepaid period activates. 15 days before expiry, recipient is prompted to add a card to continue.

### Merchant migration journey
1. **Legacy data export** — CSV export from WooCommerce Subscriptions / ReCharge.
2. **CSV mapping** — uploaded to PureCart Importer, columns mapped (email, gateway token, next renewal date, price, frequency).
3. **Validation dry-run** — token format, user accounts, and product IDs checked; summary report generated.
4. **Live execution** — records imported into `wp_purecart_subscriptions`, future renewal jobs scheduled from imported dates.

---

## 25. Full Competitor Feature Matrix

`[RND]` §"Competitor Feature Matrix (Updated)" — reproduced in full since it's the most complete competitive positioning artifact across all source docs, with `[nym-RND]`'s Phase 2 additions appended.

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
| Membership delivery (role + tier) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ (Pro) | ❌ | **✅** |
| Digital download quota per cycle | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | **✅** |
| Drip content delivery | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | add-on | **✅** |
| LMS course enrollment delivery | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **✅** |
| Service / retainer delivery | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **✅** |
| Stepped renewal pricing | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | **✅** |
| Renewal sync to calendar date | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **✅** |
| HPOS compatible | ✅ | ✅ | ✅ | ❌ | ⚠️ | ⚠️ | N/A | **✅** |
| Action Scheduler (not raw cron) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | N/A | **✅** |
| **Multi-currency locking** `[nym-RND]` | ⚠️ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **✅ (Phase 2)** |
| **Usage-based/metered billing** `[nym-RND]` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **✅ (Phase 2)** |
| **Gift subscriptions** `[nym-RND]` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **✅ (Phase 2)** |
| **Merchant CSV migration tool** `[nym-RND]` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **✅ (Phase 2)** |

**Key PureCart differentiators `[RND]`:** license-linked and SaaS-linked renewals, split payments, subscribe & save, idempotency guard, gateway-scheduled payment detection, zero-total renewal handling, staging block, churn risk scoring, customer LTV + revenue goals, retention offer eligibility rules, card expiry + SCA reauth coverage, revenue ledger table, six delivery types handled by a single engine — all built in, no separate plugin purchase.
