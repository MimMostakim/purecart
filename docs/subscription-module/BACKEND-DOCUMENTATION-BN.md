# PureCart Subscriptions — ব্যাকএন্ড ডকুমেন্টেশন

> **কার জন্য:** যিনি এই মডিউলের ফ্রন্টএন্ড (React SPA / customer portal) বানাবেন, তাঁর জন্য।
> **অবস্থা:** ব্যাকএন্ডের ১৬টি ধাপই সম্পূর্ণ। ফ্রন্টএন্ডের কোনো কাজ এখানে করা হয়নি।
> **কোড:** `wp-content/plugins/purecart/includes/Subscriptions/`

---

## ১. এক নজরে

WooCommerce-এর উপর একটা সম্পূর্ণ recurring subscription সিস্টেম। WooCommerce Subscriptions প্লাগইন লাগে না — নিজস্ব টেবিল, নিজস্ব billing engine, নিজস্ব dunning।

মূল ধারণাগুলো:

| ধারণা | মানে |
|---|---|
| **Subscription** | একটা customer + একটা product-এর recurring সম্পর্ক। নিজস্ব টেবিলে থাকে, WooCommerce order-এ না। |
| **Delivery type** | subscription active হলে customer আসলে *কী* পাবে — license key, SaaS account, membership, download, course, service। |
| **Renewal** | নির্দিষ্ট তারিখে saved card থেকে অটো চার্জ (Action Scheduler cron)। |
| **Dunning** | চার্জ ফেল করলে retry → grace period → suspend → cancel-এর ধাপগুলো। |
| **Retention** | customer cancel করতে চাইলে তার আগে discount/pause/skip অফার দেখানো। |

### ফাইল সংগঠন

```
includes/Subscriptions/
├── Module.php                  ← সব ক্লাস এখানে boot হয় (শুরুর পয়েন্ট)
├── Schema.php                  ← ৭টা DB টেবিল
├── SubscriptionProduct.php     ← WooCommerce product type + cart/checkout
├── SubscriptionManager.php     ← lifecycle: create/pause/resume/skip/cancel/expire/resubscribe
├── RenewalEngine.php           ← billing cron + charge
├── DunningManager.php          ← ফেল হওয়া পেমেন্ট হ্যান্ডলিং
├── RetentionFlow.php           ← cancel ঠেকানোর অফার
├── PlanUpgrade.php             ← plan পরিবর্তন + proration
├── SplitPaymentManager.php     ← installment পেমেন্ট
├── ChurnScorer.php             ← churn risk score + LTV
├── RoleManager.php             ← WP role অটো assign/remove
├── RenewalSync.php             ← calendar-date billing alignment
├── SubscriptionCoupon.php      ← subscription-specific coupon
├── SubscriptionReport.php      ← MRR/ARR/churn অ্যানালিটিক্স
├── SubscriptionExport.php      ← CSV ডাউনলোড
├── RestController.php          ← সব REST endpoint
├── WebhookHandler.php          ← gateway webhook
├── DeliveryManager.php         ← provisioning dispatch
├── BillingClock.php            ← timezone-safe date math
├── *Repository.php             ← সব DB query (৪টা)
├── Delivery/                   ← ৪টা delivery handler
└── Emails/                     ← ১৮টা email + base class
```

---

## ২. ডাটাবেস

৭টা টেবিল, `Schema.php` তৈরি করে। প্লাগইন activate/upgrade-এ `Activator.php` থেকে চলে।

| টেবিল | কী রাখে |
|---|---|
| `wp_purecart_subscriptions` | মূল টেবিল — প্রতি subscription এক row |
| `wp_purecart_subscription_logs` | প্রতিটা ঘটনার ইতিহাস (status change, payment, email) |
| `wp_purecart_subscription_payments` | প্রতিটা charge **চেষ্টা** (সফল/ব্যর্থ/refund) |
| `wp_purecart_subscription_revenue` | recognized revenue — কোন billing period-এর টাকা |
| `wp_purecart_subscription_items` | (তৈরি আছে, এখনো ব্যবহৃত হয়নি) |
| `wp_purecart_subscription_revenue_goals` | admin-এর revenue target (তৈরি আছে, এখনো ব্যবহৃত হয়নি) |
| `wp_purecart_subscription_linked_entities` | (তৈরি আছে, এখনো ব্যবহৃত হয়নি) |

### `payments` বনাম `revenue` — পার্থক্যটা জরুরি

- **payments** = "আমরা কী চার্জ করার চেষ্টা করেছি, সফল হয়েছে কি না?" — চেষ্টার সময় স্ট্যাম্প হয়।
- **revenue** = "এই টাকাটা কোন সার্ভিস পিরিয়ডের?" — `period_start`/`period_end` থাকে।

কেন দরকার: একটা renewal ৩ দিন দেরিতে চার্জ হলেও সেটা **তার নিজের cycle-এর** আয়, retry-র দিনের না। রিপোর্টে এই পার্থক্য না রাখলে মাসিক হিসাব ভুল হয়।

### `subscriptions` টেবিলের গুরুত্বপূর্ণ কলাম

```
id, user_id, product_id, order_id
status              ← নিচে দেখুন
delivery_type       ← software | saas | membership | download | course | service
license_id          ← software হলে purecart_licenses.id
saas_account_id     ← saas হলে purecart_saas_accounts.id
billing_interval    ← সংখ্যা, যেমন 3
billing_period      ← day | week | month | year   (৩ + month = প্রতি ৩ মাসে)
recurring_amount, currency, signup_fee
trial_ends_at, next_payment_at, last_payment_at, max_length_at
paused_at, pause_end_date, suspended_at, cancelled_at, cancellation_date
gateway, gateway_subscription_id, payment_token_id
retry_count, renewal_count, skip_count
discount_percent, discount_renewals_remaining     ← retention/coupon discount
churn_risk_score (0-100), customer_ltv
pending_switch_product, pending_switch_type       ← পরের renewal-এ plan বদলাবে
payment_type, max_payments, access_timing         ← split payment
previous_subscription_id                          ← resubscribe chain
starts_at, created_at, updated_at
```

### Status মান (ENUM)

| status | মানে |
|---|---|
| `trialing` | ফ্রি ট্রায়ালে আছে, এখনো টাকা নেওয়া হয়নি |
| `active` | স্বাভাবিক, চালু |
| `past_due` | চার্জ ফেল করেছে, retry চলছে |
| `suspended` | grace period শেষ, access বন্ধ (কিন্তু ফেরানো যায়) |
| `paused` | customer নিজে pause করেছে, access চালু আছে |
| `pending_cancel` | cancel করেছে কিন্তু paid period শেষ না হওয়া পর্যন্ত চলবে |
| `cancelled` | সম্পূর্ণ বন্ধ |
| `expired` | নির্দিষ্ট মেয়াদ শেষ |
| `completed` | split payment-এর সব কিস্তি শেষ |

> ⚠️ `$wpdb` **সব কলাম string হিসেবে ফেরত দেয়**, INT/BIGINT হলেও। তাই `(int)` cast করে নিন। এই কারণে আগে একটা fatal error হয়েছিল।

---

## ৩. Subscription কীভাবে তৈরি হয়

```
Customer checkout করে
   ↓
Order status → "completed"
   ↓
SubscriptionManager::maybe_create_from_order()
   ↓
প্রতিটা subscription-type লাইন আইটেমের জন্য একটা row
   ↓
DeliveryManager::activate()  →  license/SaaS/membership তৈরি
   ↓
do_action( 'purecart_subscription_activated', $id )
```

**গুরুত্বপূর্ণ:** trigger হলো `woocommerce_order_status_completed`, `payment_complete` না। (Licensing/SaaS মডিউলও এই একই hook ব্যবহার করে, তাই consistent রাখা হয়েছে।)

**Guest checkout সাপোর্ট করা নেই** — recurring billing-এর জন্য অ্যাকাউন্ট লাগে। guest হলে order-এ একটা note যোগ হয় (চুপচাপ fail করে না)।

---

## ৪. REST API

সব endpoint namespace: **`purecart/v1`**

### ⚠️ Authentication — এটা না জানলে সব 401 আসবে

REST endpoint-এ ব্রাউজার থেকে সরাসরি URL দিলে **কাজ করবে না**। WordPress nonce ছাড়া রিকোয়েস্টকে logged-out ধরে (`rest_cookie_check_errors()` → `wp_set_current_user(0)`)।

প্রতিটা `fetch`-এ nonce header পাঠাতে হবে:

```js
fetch( '/wp-json/purecart/v1/subscriptions', {
    headers: { 'X-WP-Nonce': wpApiSettings.nonce },
} )
```

### Endpoint তালিকা

| Method | Path | কে পারবে |
|---|---|---|
| GET | `/subscriptions` | Admin |
| GET | `/subscriptions/{id}` | Owner বা Admin |
| GET | `/subscriptions/{id}/logs` | Admin |
| POST | `/subscriptions/{id}/pause` | Owner বা Admin |
| POST | `/subscriptions/{id}/resume` | Owner বা Admin |
| POST | `/subscriptions/{id}/cancel` | Owner বা Admin |
| POST | `/subscriptions/{id}/skip` | Owner বা Admin |
| POST | `/subscriptions/{id}/early-renewal` | Owner বা Admin |
| POST | `/subscriptions/{id}/resubscribe` | Owner বা Admin |
| POST | `/subscriptions/{id}/upgrade` | Owner বা Admin |
| POST | `/subscriptions/{id}/renew` | **শুধু Admin** |
| POST | `/subscriptions/{id}/retry-payment` | **শুধু Admin** |
| POST | `/subscriptions/{id}/send-card-update` | **শুধু Admin** |
| GET | `/subscriptions/{id}/cancellation/reasons` | সবাই (শুধু লেবেল লিস্ট) |
| GET | `/subscriptions/{id}/cancellation/offers` | **শুধু Owner** (admin-ও না) |
| POST | `/subscriptions/{id}/cancellation/accept-offer` | **শুধু Owner** |
| POST | `/subscriptions/{id}/external-renewal` | HMAC signature |
| POST | `/subscriptions/{id}/webhook-event` | HMAC signature |
| GET | `/reports/subscriptions/summary` | Admin |
| GET | `/reports/subscriptions/export` | Admin |

**তিন ধরনের permission:**
- `permission_admin` — `manage_woocommerce` capability
- `permission_owner_or_admin` — নিজের subscription, অথবা admin
- `permission_owner_only` — **শুধু নিজের**, admin-ও ঢুকতে পারবে না (retention offer গুলো customer-এর ব্যক্তিগত সিদ্ধান্ত)

**নোট:** না-থাকা ID দিলে permission check `true` ফেরত দেয়, যাতে callback ৪০৪ দেয় — ৪০৩ দিলে "এই ID আছে কি নেই" ফাঁস হয়ে যেত।

### Report summary যা ফেরত দেয়

```json
{
  "mrr": 2310.00, "arr": 27720.00, "arpu": 25.67, "ltv": 616.00,
  "active_count": 90, "trialing_count": 12, "past_due_count": 3,
  "paused_count": 0, "suspended_count": 1, "cancelled_count": 20,
  "expired_count": 0, "pending_cancel_count": 2, "completed_count": 0,
  "total_count": 128, "subscriber_count": 90,
  "counts_by_status": { "active": 90, "trialing": 12 },
  "user_churn_rate": 3.3, "revenue_churn_rate": 3.8,
  "trial_conversion_rate": 62.5,
  "churn_bands": { "low": 60, "medium": 20, "high": 8, "critical": 2 },
  "recognized_revenue": 2180.00,
  "revenue_by_month": [ { "month": "2024-06", "total": 2180.00, "periods": 87 } ],
  "currency": "USD",
  "period_start": "...", "period_end": "...", "generated_at": "..."
}
```

Query param: `?period_start=YYYY-MM-DD HH:MM:SS&period_end=...` (না দিলে চলতি মাস)

**হিসাবের নিয়ম** (ডকে অস্পষ্ট ছিল, এখানে ঠিক করা হয়েছে):
- MRR-এ শুধু `active` গোনা হয় — `trialing` (এখনো টাকা দেয়নি) আর `past_due` (টাকা আসেনি) বাদ
- "subscriber count" = **distinct customer**, subscription না (একজনের ৩টা থাকলে সে একজনই)

### CSV Export — দুটো উপায়

**১. ব্রাউজার থেকে ডাউনলোড (সহজ)** — `admin-post.php`, normal cookie auth:

```php
// PHP থেকে SPA-তে URL pass করুন
\PureCart\Subscriptions\SubscriptionExport::download_url();
// → admin-post.php?action=purecart_export_subscriptions&status=&_wpnonce=...
```

শুধু এই লিংকে navigate করলেই ফাইল নামবে। **এটাই সবচেয়ে সহজ পথ।**

**২. REST থেকে (blob হিসেবে)**:

```js
const res  = await fetch( '/wp-json/purecart/v1/reports/subscriptions/export',
                          { headers: { 'X-WP-Nonce': wpApiSettings.nonce } } );
const blob = await res.blob();
const url  = URL.createObjectURL( blob );
const a    = document.createElement( 'a' );
a.href = url; a.download = 'subscriptions.csv'; a.click();
URL.revokeObjectURL( url );
```

`?format=json` দিলে CSV-র বদলে array-of-rows আসবে।
`?status=active` দিয়ে filter করা যায়।

> 🔴 **ফ্রন্টএন্ড ডেভেলপারের জন্য জরুরি:** `SubscriptionsPage.tsx`-এ এখন যে "Export CSV" বাটন আছে সেটা **placeholder** — শুধু একটা toast দেখায় (`showToast('Subscriptions exported as CSV')`), কোনো ফাইল নামায় না। উপরের দুটোর যেকোনো একটা দিয়ে ওটা replace করতে হবে।

CSV-তে ২৭টা কলাম আছে (id, user_email, product_name, status, monthly_equivalent, churn_band, customer_ltv, তারিখগুলো ইত্যাদি)। UTF-8 BOM দেওয়া আছে যাতে Excel-এ বাংলা/non-ASCII নাম না ভাঙে।

---

## ৫. Hooks — ফ্রন্টএন্ড/এক্সটেনশনের জন্য

### Action (ঘটনার নোটিফিকেশন)

| Hook | কখন | প্যারামিটার |
|---|---|---|
| `purecart_subscription_activated` | নতুন subscription | `$id` |
| `purecart_subscription_status_changed` | যেকোনো status বদল | `$id, $old, $new` |
| `purecart_subscription_renewed` | সফল renewal | `$id, $order_id, $next_payment_at` |
| `purecart_subscription_payment_failed` | চার্জ ফেল | `$id, $order_id, $reason` |
| `purecart_subscription_suspended` | grace শেষ | `$id` |
| `purecart_subscription_reactivated` | suspend থেকে ফেরত | `$id` |
| `purecart_subscription_skipped` | cycle skip | `$id` |
| `purecart_subscription_resubscribed` | আবার সাবস্ক্রাইব | `$id` |
| `purecart_subscription_plan_changed` | plan বদলেছে | `$id` |
| `purecart_retention_offer_accepted` | অফার গ্রহণ | `$id, $offer, $reason` |
| `purecart_split_payment_completed` | সব কিস্তি শেষ | `$id` |
| `purecart_dunning_retry_scheduled` | retry শিডিউল | `$id, $attempt, $at` |
| `purecart_subscription_reauth_required` | SCA/3DS দরকার | `$id` |
| `purecart_subscription_disputed` | chargeback | `$id` |

### Filter (আচরণ পাল্টানোর জন্য)

| Hook | কাজ |
|---|---|
| `purecart_allow_renewal` | `false` দিলে সব renewal বন্ধ (staging সাইটে জরুরি) |
| `purecart_renewal_amount` | renewal-এর টাকার অঙ্ক বদলানো |
| `purecart_initial_next_payment_at` | প্রথম billing তারিখ বদলানো |
| `purecart_should_activate_delivery` | provisioning আটকানো |
| `purecart_subscription_delivery_handlers` | নতুন delivery type যোগ |
| `purecart_gateway_manages_schedule` | gateway নিজে billing করলে |
| `purecart_subscription_export_columns` | CSV কলাম বদলানো |

> **স্টেজিং সাইটে অবশ্যই:** `add_filter( 'purecart_allow_renewal', '__return_false' );` — নাহলে ডেটাবেস কপি করা staging সাইট আসল customer-দের কার্ড চার্জ করে ফেলবে।

---

## ৬. প্রতিটা ক্লাস কী করে

### SubscriptionManager — lifecycle
`pause()` `resume()` `skip()` `cancel()` `expire()` `resubscribe()`

- **pause/resume** — pause-এ যত দিন গেছে, resume-এ `next_payment_at` ঠিক তত দিন পিছিয়ে যায়, তাই কেনা সময় নষ্ট হয় না।
- **cancel** — দুই রকম: সাথে সাথে, অথবা `pending_cancel` (paid period শেষ হলে অটো cancel হবে)।
- **resubscribe** — window-এর ভেতরে হলে **একই row** ফিরে আসে (payment history, LTV অক্ষুণ্ন); window-এর পরে **নতুন row** + `previous_subscription_id` দিয়ে লিংক।

### RenewalEngine — billing
প্রতি ঘণ্টায় Action Scheduler cron (`purecart_scan_due_renewals`) due subscription খুঁজে saved token দিয়ে চার্জ করে।

গুরুত্বপূর্ণ নিরাপত্তাগুলো:
- **Idempotency** — payments ledger দেখে, একই cycle দুবার চার্জ হয় না
- **Date anchoring** — পরের তারিখ হিসাব হয় আগের **due date** থেকে, "এখন" থেকে না। নাহলে renewal দেরিতে চললে billing তারিখ প্রতি মাসে একটু একটু করে সরে যেত।
- **Zero-total** — ১০০% discount হলে charge না করেই renewal সফল ধরে
- **Gateway-managed** — Stripe Billing নিজে schedule চালালে PureCart চার্জ করে না, webhook-এর অপেক্ষা করে

### DunningManager — ফেল হওয়া পেমেন্ট

```
চার্জ ফেল
   ↓
Hard decline (কার্ড চুরি/বন্ধ)?  → সরাসরি suspend
Soft decline (টাকা নেই)?         → retry শিডিউল (ডিফল্ট ১, ৩, ৫ দিন পর)
   ↓
সব retry শেষ + active grace (৭ দিন) শেষ  →  suspended
   ↓
suspended grace (৭ দিন) শেষ              →  cancelled
```

**Card update magic link** — customer-কে HMAC-signed লিংক পাঠানো যায় (`hash_equals()` দিয়ে timing-safe যাচাই), সেখানে কার্ড আপডেট করলেই সাথে সাথে retry হয়।

### RetentionFlow — cancel ঠেকানো
৬টা কারণ, ৫ ধরনের অফার (discount / pause / skip / downgrade / contact)। কে কোন অফার পাবে তা eligibility rule দিয়ে ঠিক হয় (subscription কত পুরনো, কত টাকার, customer-এর lifetime spend কত ইত্যাদি)।

**ফ্রন্টএন্ড flow:**
```
Cancel ক্লিক
  → GET  /cancellation/reasons      (কারণের লিস্ট দেখান)
  → GET  /cancellation/offers       (কারণ বেছে নেওয়ার পর, ?reason=too_expensive)
  → POST /cancellation/accept-offer (গ্রহণ করলে — cancel বাতিল হয়ে যাবে)
     অথবা
  → POST /cancel                    (declined করলে)
```

### ChurnScorer — ঝুঁকির স্কোর
০-১০০। payment fail +২০, retry fail +১০, cancel +৩০, pause +১০, skip +৫; সফল payment −১৫, প্রতি ১২ renewal −৫।

ব্যান্ড: **0-25 Low** (সবুজ) · **26-50 Medium** (হলুদ) · **51-75 High** (কমলা) · **76-100 Critical** (লাল)

`ChurnScorer::band( $score )` দিয়ে ব্যান্ড পাওয়া যায়। Admin list-এ রঙ দিয়ে দেখানোর জন্য।

### PlanUpgrade — ৩টা মোড
- `prorate_immediately` — এখনই বাকি দিনের হিসাবে পার্থক্য চার্জ
- `apply_at_renewal` (ডিফল্ট) — পরের renewal-এ কার্যকর
- `no_proration` — এখনই বদল, কিন্তু বাড়তি চার্জ নেই

> ⚠️ Downgrade-এ টাকা ফেরত (credit) দেওয়ার কোনো ব্যবস্থা নেই। শুধু `purecart_subscription_downgrade_credit_due` hook fire হয় — store credit লাগলে সেখানে নিজে বানাতে হবে।

### RoleManager — WP role
`trialing` → trial role · `active` → active role · cancel/suspend/expire → cancelled role

**PureCart → Settings** পেজে ৩টা dropdown থেকে সেট করতে হয়। ফাঁকা রাখলে role-এ হাত দেওয়া হয় না।

একজন customer-এর একাধিক subscription থাকলে একটা cancel হলেও অন্যটার কারণে role থেকে যায় — এই safeguard আছে।

### RenewalSync — একই তারিখে বিলিং
সব subscription মাসের নির্দিষ্ট তারিখে (যেমন ১ তারিখে) আনার জন্য। প্রথম চার্জ আংশিক দিনের হিসাবে prorate হয়। শুধু monthly, non-trial product-এ কাজ করে।

### SubscriptionCoupon — ২ রকম
- **Sign-up fee only** — শুধু প্রথম অর্ডারের signup fee-তে ছাড়
- **Recurring fee** — পরের N টা renewal-এ (বা চিরকাল) ছাড়

Coupon edit স্ক্রিনে "Usage restriction" ট্যাবে dropdown আসবে।

> WooCommerce-এর নিজের discount engine শুধু `percent`/`fixed_product`/`fixed_cart` চেনে — নতুন discount type নাম রেজিস্টার করলে ছাড় $0 হয়ে যেত। তাই সাধারণ coupon type-এর উপর একটা "scope" flag হিসেবে বানানো হয়েছে।

### SplitPaymentManager — কিস্তি
`_purecart_max_payments` টা কিস্তির পর status `completed` হয়ে যায়, `next_payment_at` null। `access_timing` = `after_full_payment` হলে সব কিস্তি শেষ না হওয়া পর্যন্ত access দেওয়া হয় না।

### Email — ১৮টা
WooCommerce → Settings → Emails-এ সবগুলো দেখা যাবে, আলাদা আলাদা on/off ও টেক্সট এডিট করা যাবে।

Subscription Created, Trial Started/Ending/Converted, Renewal Reminder/Successful, Payment Failed/Retry Scheduled, Overdue, Suspend Notice, Suspended Grace Ending, Cancellation, Expiration, Resubscription, Plan Changed, Skip Confirmed, Card Expiring Soon, Payment Reauthorization

Placeholder: `{first_name}` `{product_name}` `{amount}` `{next_payment_date}` ইত্যাদি।

> নিজস্ব HTML template ফাইল নেই — WooCommerce-এর header/footer + টেক্সট বডি ব্যবহার করা হয়। ডিজাইন কাস্টমাইজ করতে চাইলে template ফাইল বানাতে হবে।

---

## ৭. Licensing / SaaS ইন্টিগ্রেশন

| ঘটনা | License (software) | SaaS account |
|---|---|---|
| কেনা | নতুন license তৈরি | নতুন account provision |
| Renewal | **expiry তারিখ ১ period বাড়ে** | account active করা হয় |
| Suspend (টাকা আসেনি) | **status → suspended** | **status → suspended** |
| Suspend-এর পর payment | **status → active** | **status → active** |
| Cancel | **কিছুই হয় না** — যত দিন কেনা ছিল তত দিন চলবে | setting অনুযায়ী (ডিফল্ট: চলবে) |
| Expire | status → expired | suspended |

**যুক্তি:** cancel মানে "আর টাকা নেব না", "যা কিনেছ তা কেড়ে নেব" না। তাই license তার নিজের `expires_at` পর্যন্ত বৈধ থাকে, শুধু আর বাড়ে না।

Lifetime license-এ expiry নেই, তাই renewal-এ হাত দেওয়া হয় না।

SaaS-এর জন্য `purecart_sub_cancel_saas_immediately` option (ডিফল্ট `false`) — `true` করলে cancel-এ সাথে সাথে account বন্ধ।

---

## ৮. সব Settings option

| Option | ডিফল্ট | কাজ |
|---|---|---|
| `purecart_sub_enabled` | `true` | পুরো মডিউল চালু/বন্ধ |
| `purecart_sub_one_trial_per_customer` | `true` | একজন একই product-এ একবারই trial |
| `purecart_sub_resubscribe_window_days` | `30` | কত দিনের মধ্যে resubscribe করলে একই record |
| `purecart_sub_skip_limit` | `1` | সর্বোচ্চ কতবার skip |
| `purecart_sub_retry_intervals` | `[1,3,5]` | ফেল করলে কত দিন পর পর retry |
| `purecart_sub_retry_attempts` | `3` | সর্বোচ্চ retry |
| `purecart_sub_active_grace_days` | `7` | past_due → suspended হতে কত দিন |
| `purecart_sub_suspended_grace_days` | `7` | suspended → cancelled হতে কত দিন |
| `purecart_sub_renewal_reminder_days` | `[7,3,1]` | renewal-এর কত দিন আগে মনে করানো |
| `purecart_sub_trial_reminder_days` | `3` | trial শেষের কত দিন আগে |
| `purecart_sub_card_expiry_warning_days` | `30` | কার্ড মেয়াদ শেষের কত দিন আগে |
| `purecart_sub_avg_lifetime_months` | `24` | LTV হিসাবের ভিত্তি |
| `purecart_sub_trial_role` / `_active_role` / `_cancelled_role` | `''` | WP role ম্যাপিং |
| `purecart_sub_allow_multiple_subscriptions` | `true` | একাধিক ভিন্ন subscription allowed? |
| `purecart_sub_renewal_sync` / `_sync_date` | `false` / `1` | calendar-date বিলিং |
| `purecart_sub_cancel_saas_immediately` | `false` | cancel-এ SaaS সাথে সাথে বন্ধ? |
| `purecart_sub_retention_discount_percent` / `_cycles` | `20` / `3` | retention discount |
| `purecart_sub_retention_pause_days` | `30` | retention pause কত দিন |
| `purecart_webhook_secret` | `''` | webhook HMAC secret (Licensing মডিউলের সাথে শেয়ার্ড) |

সবগুলোর জন্য admin UI নেই — role ৩টা আর module toggle **PureCart → Settings**-এ আছে, বাকিগুলো `update_option()` দিয়ে সেট করতে হয়। **এগুলোর Settings UI বানানো ফ্রন্টএন্ডের কাজ।**

---

## ৯. নিরাপত্তা (অডিট করা)

| বিষয় | অবস্থা |
|---|---|
| SQL injection | সব query হয় static, নয়তো `$wpdb->prepare()` দিয়ে। ৬ রকম injection probe দিয়ে টেস্ট করা। |
| HPOS compatible | কোথাও `get_post()` দিয়ে order পড়া হয় না, সব `wc_get_order()`। |
| Customer isolation | Customer A কোনোভাবে Customer B-র subscription পড়তে/বদলাতে পারে না — টেস্ট করা। |
| Nonce + capability | প্রতিটা admin write-এ আছে (WooCommerce-এর নিজের + আমাদের defense-in-depth)। |
| Webhook | HMAC-SHA256, `hash_equals()` (timing-safe), secret ফাঁকা থাকলে reject। |
| Superglobal | প্রতিটা `$_POST`/`$_GET` read sanitize করা। |
| REST | ১৪টা route-এর সবগুলোতে permission callback আছে। |

---

## ১০. ফ্রন্টএন্ড হ্যান্ডঅফ — কোন ডেটা কোথায় বসবে

> এই সেকশনটা ফ্রন্টএন্ড ডেভেলপারের জন্য। **ব্যাকএন্ডে কেউ ফ্রন্টএন্ড কোডে হাত দেয়নি** — নিচের সবই করণীয়।

### ১০.১ এখনকার অবস্থা

`src/app`-এ **একটাও API কল নেই**। সব ডেটা আসে [`utils/static-data.tsx`](../../src/app/utils/static-data.tsx)-এর হাতে লেখা mock array থেকে। বাটনগুলো শুধু toast দেখায়, কিছু করে না।

তাই প্রথম কাজ: **একটা API লেয়ার বানানো**, তারপর mock গুলো একে একে সরানো।

### ১০.২ শুরুর সেটআপ (এটা ছাড়া কিছুই চলবে না)

REST-এ nonce লাগে। এখন PHP থেকে JS-এ nonce pass করার কোনো কোড নেই — যোগ করতে হবে:

```php
// যেখানে React অ্যাপের script enqueue হয়
wp_localize_script( 'purecart-admin', 'purecartData', array(
    'nonce'      => wp_create_nonce( 'wp_rest' ),
    'apiRoot'    => esc_url_raw( rest_url( 'purecart/v1' ) ),
    'exportUrl'  => \PureCart\Subscriptions\SubscriptionExport::download_url(),
    'currency'   => get_woocommerce_currency_symbol(),
) );
```

তারপর `@wordpress/api-fetch` ব্যবহার করলে nonce নিজে হ্যান্ডল করে:

```ts
import apiFetch from '@wordpress/api-fetch';
apiFetch.use( apiFetch.createNonceMiddleware( window.purecartData.nonce ) );
apiFetch.use( apiFetch.createRootURLMiddleware( window.purecartData.apiRoot ) );

export const getSubscriptions = () => apiFetch( { path: '/subscriptions' } );
export const pauseSubscription = ( id: number ) =>
    apiFetch( { path: `/subscriptions/${ id }/pause`, method: 'POST' } );
```

### ১০.৩ Field mapping — mock থেকে আসল API

`subscriptionsData`-র প্রতিটা fake ফিল্ড কোথা থেকে আসবে:

| এখনকার mock ফিল্ড | আসল API ফিল্ড | নোট |
|---|---|---|
| `id: 'SUB-001'` | `id: 1` | **সংখ্যা**, `SUB-` prefix নেই। দেখানোর জন্য চাইলে নিজে prefix বসান |
| `customer: 'Sarah Johnson'` | `customer_name` | ✅ API-তে যোগ করা হয়েছে |
| — | `customer_email` | ✅ নতুন |
| `product: 'Plugin Pro'` | `product_name` | ✅ নতুন |
| `amount: '$99/yr'` | `recurring_amount` (number) + `billing_interval` + `billing_period` | **ফরম্যাটিং ফ্রন্টএন্ডের কাজ** — API কাঁচা সংখ্যা দেয় |
| `cycle: 'Annual'` | `billing_interval` + `billing_period` | `1 + year` → "Annual", `3 + month` → "Every 3 months" |
| `status: 'past-due'` | `status: 'past_due'` | ⚠️ **হাইফেন নয়, আন্ডারস্কোর** |
| `nextPayment: '2025-06-15'` | `next_payment_at: '2025-06-15 10:00:00'` | পুরো datetime, `null`ও হতে পারে |
| — | `churn_risk_score` (0-100) | ব্যাজের জন্য |
| — | `churn_band` | ✅ নতুন — `low`/`medium`/`high`/`critical`, রঙ ঠিক করার জন্য |
| — | `customer_ltv`, `renewal_count`, `discount_percent`, `trial_ends_at` | ইত্যাদি |

**গুরুত্বপূর্ণ:** সংখ্যাগুলো (`id`, `recurring_amount`, `churn_risk_score`) API-তে **আসল number** হিসেবে আসে, string নয় — `prepare_subscription()` cast করে দেয়।

**Status মান** (৯টা): `trialing` `active` `past_due` `suspended` `paused` `pending_cancel` `cancelled` `expired` `completed`

### ১০.৪ প্রতিটা বাটন কোন endpoint-এ যাবে

কোডে যত `showToast()` placeholder আছে, তার ম্যাপিং:

| UI-তে যে বাটন | Endpoint | অবস্থা |
|---|---|---|
| Pause | `POST /subscriptions/{id}/pause` | ✅ রেডি |
| Resume | `POST /subscriptions/{id}/resume` | ✅ রেডি |
| Cancel | `POST /subscriptions/{id}/cancel` | ✅ রেডি |
| Bulk pause / bulk cancel | উপরেরগুলোই লুপ করে | ✅ রেডি |
| Plan পরিবর্তন | `POST /subscriptions/{id}/upgrade` | ✅ রেডি |
| Payment retry | `POST /subscriptions/{id}/retry-payment` | ✅ রেডি |
| Payment method update link | `POST /subscriptions/{id}/send-card-update` | ✅ রেডি |
| Export CSV | `window.purecartData.exportUrl`-এ navigate | ✅ রেডি |
| Customer profile | `/wp-admin/user-edit.php?user_id={user_id}` | ✅ WP-র নিজের |
| Discount প্রয়োগ | `POST /cancellation/accept-offer` | ⚠️ **শুধু owner পারে** — admin দিয়ে 403 |
| **Refund** | — | ❌ **ব্যাকএন্ড নেই** |
| **Trial extend** | — | ❌ **ব্যাকএন্ড নেই** |
| **Subscription delete** | — | ❌ **নেই, ইচ্ছাকৃত** — delete নয়, cancel করা হয় |
| **Receipt পাঠানো** | — | ❌ **ব্যাকএন্ড নেই** |
| **Payment history export** | — | ❌ **নেই** (`/logs` থেকে আংশিক পাওয়া যাবে) |

> 🔴 লাল দাগানো ৫টার UI আছে কিন্তু পেছনে কিছু নেই। ওগুলো হয় লুকিয়ে রাখুন, নয়তো ব্যাকএন্ডে আগে বানাতে হবে।

### ১০.৫ Analytics পেজের ম্যাপিং

| mock | আসল | নোট |
|---|---|---|
| `subTrendData` | `summary.revenue_by_month` | মাসভিত্তিক আয়। **active/new/churned মাসভিত্তিক ভাঙা নেই** — ব্যাকএন্ডে যোগ করতে হবে |
| `subPlanMix` | — | ❌ নেই। `/subscriptions` থেকে `billing_period` গুনে ফ্রন্টএন্ডে বানানো যায় |
| `subRevenueByProduct` | — | ❌ নেই। ব্যাকএন্ডে যোগ করা লাগবে |
| KPI কার্ড | `summary.mrr` `arr` `arpu` `ltv` `active_count` `user_churn_rate` `revenue_churn_rate` `trial_conversion_rate` | ✅ সব রেডি |
| Churn ব্যাজ | `summary.churn_bands` | ✅ রেডি |

### ১০.৬ Retention modal (নতুন বানাতে হবে, UI-ও নেই)

ব্যবসায়িকভাবে সবচেয়ে গুরুত্বপূর্ণ অংশ — cancel ঠেকায়। তিন ধাপ:

```
Cancel ক্লিক
  ↓
GET  /subscriptions/{id}/cancellation/reasons          → ৬টা কারণ দেখান
  ↓ (customer কারণ বাছল)
GET  /subscriptions/{id}/cancellation/offers?reason=X  → যোগ্য অফার দেখান
  ↓
গ্রহণ করলে → POST /cancellation/accept-offer  { offer_type, reason }
              (cancel বাতিল, subscription active থাকবে)
না করলে   → POST /cancel                      { immediately, reason }
```

⚠️ `offers` ও `accept-offer` **শুধু subscription-এর মালিক** পারে — admin-ও না। তাই এটা **customer portal**-এর অংশ, admin ড্যাশবোর্ডের নয়।

### ১০.৭ কাজের ক্রম (সুপারিশ)

1. **API লেয়ার + nonce সেটআপ** — এটা ছাড়া কিছুই হবে না
2. **Subscription লিস্ট** আসল ডেটায় চালানো
3. **Row action** গুলো (pause/resume/cancel/retry) যুক্ত করা
4. **Export CSV** ঠিক করা (সহজ, এক লাইন)
5. **Analytics পেজ** summary endpoint-এ
6. **Subscription detail পেজ** (`/logs` + payment history) — এখন নেই
7. **Settings পেজ** — ২৫+ option, কোনো UI নেই
8. **Customer portal + retention modal** — সবচেয়ে বড় নতুন কাজ

### ১০.৮ যা ব্যাকএন্ডেও নেই (UI বানানোর আগে জানুন)

| বিষয় | কেন |
|---|---|
| Guest checkout | recurring billing-এ অ্যাকাউন্ট লাগে |
| Refund endpoint | gateway-initiated refund webhook আছে, admin-initiated নেই |
| Trial extend / delete / receipt resend | কোনো ধাপে scope-এ ছিল না |
| Downgrade-এ store credit | শুধু hook fire হয়, ব্যবস্থা নেই |
| Product-ভিত্তিক retention offer | এখন site-wide |
| Revenue goals | টেবিল আছে, ব্যবহার নেই |
| প্রতি-মাসে active/new/churned | শুধু মোট আয় মাসভিত্তিক আছে |

এগুলোর কোনোটা দরকার হলে **আগে ব্যাকএন্ডে বলুন**, UI বানিয়ে ফেলার পর নয়।

---

## ১১. টেস্টিং

১৩টা standalone টেস্ট ফাইল আছে (SQLite দিয়ে, WordPress ছাড়াই চলে)। শেষ ধাপের টেস্টটা আসল Licensing/SaaS ক্লাস ব্যবহার করে, stub না।

চালাতে: `php test-step16.php` (scratchpad ফোল্ডারে)

মোট ~৪০০+ assertion। প্রতিটা ধাপে নতুন কোড লেখার পর পুরনো সব টেস্ট আবার চালানো হয়েছে।

---

*সব ব্যাকএন্ড ধাপ (১-১৬) সম্পূর্ণ।*
