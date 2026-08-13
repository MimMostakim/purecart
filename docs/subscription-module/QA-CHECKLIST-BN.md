# PureCart Subscriptions — ব্যাকএন্ড QA চেকলিস্ট

> প্রতিটা ধাপ ক্রমানুসারে করুন — পরেরটা আগেরটার উপর নির্ভরশীল।
> প্রতিটায় **কী করবেন** → **কী হওয়ার কথা** → **কোথায় মিলিয়ে দেখবেন** দেওয়া আছে।

---

## ⚠️ শুরুর আগে ৩টা কথা

### ১. কোনো payment gateway ইনস্টল করা নেই

`wp-content/plugins/`-এ Stripe/PayPal কিছুই নেই। মানে **আসল কার্ড চার্জ টেস্ট করা যাবে না** — `RenewalEngine` টোকেন খুঁজে না পেয়ে `no_payment_token` দিয়ে ফেল করবে।

**সমাধান — দুটো পথ:**

| পথ | কী টেস্ট হবে | কী হবে না |
|---|---|---|
| **A. Zero-total ট্রিক** (সহজ, এখনই করা যায়) | পুরো renewal chain: তারিখ এগোনো, license extend, revenue ledger, email, churn score | আসল টাকা কাটা |
| **B. Stripe test mode ইনস্টল** | সবকিছু, চার্জ সহ | — |

**Zero-total ট্রিক কীভাবে কাজ করে:** `RenewalEngine::process_renewal()`-এ আছে —
```php
if ( $amount <= 0.0 ) { $this->complete_renewal( ... ); return; }   // gateway একদম বাদ
```
তাই phpMyAdmin-এ `recurring_amount = 0` করে দিলে gateway ছাড়াই পুরো renewal flow চলে। **প্রথমে A দিয়ে সব logic টেস্ট করুন**, শেষে চাইলে B দিয়ে শুধু চার্জটা।

### ২. React ড্যাশবোর্ড দিয়ে টেস্ট করা যাবে না

SPA-টা এখনো পুরো mockup — কোনো API কল নেই, সব fake data. তাই যাচাই করতে হবে:
- **phpMyAdmin** (Local → Database → Adminer/phpMyAdmin) — মূল যাচাইয়ের জায়গা
- **debug.log** (`wp-content/debug.log`)
- **WooCommerce → Status → Scheduled Actions** — cron চালানোর জন্য
- **REST** — Application Password দিয়ে (নিচে §১৩)

### ৩. `wp-reset` প্লাগইন ইনস্টল আছে

টেস্ট নষ্ট হলে দ্রুত রিসেট করা যাবে — কিন্তু **সাবধান**, ভুল করে চালালে সব ডেটা যাবে। আগে Local-এ সাইটের একটা backup/clone করে নিন।

---

## ধাপ ০ — প্রস্তুতি

- [ ] `wp-config.php`-এ ডিবাগ চালু আছে কিনা:
  ```php
  define( 'WP_DEBUG', true );
  define( 'WP_DEBUG_LOG', true );
  define( 'WP_DEBUG_DISPLAY', false );
  ```
- [ ] `wp-content/debug.log` ফাইলটা মুছে ফেলুন (পরিষ্কার শুরুর জন্য)
- [ ] WooCommerce active, PureCart active
- [ ] **PureCart → Settings**-এ "Enable recurring subscriptions" টিক দেওয়া আছে
- [ ] ২টা টেস্ট customer অ্যাকাউন্ট বানান (`alice@test.com`, `bob@test.com`) — customer isolation টেস্টের জন্য লাগবে

---

## ধাপ ১ — ডাটাবেস টেবিল

**করুন:** PureCart deactivate → activate করুন। তারপর phpMyAdmin খুলুন।

**দেখুন — এই ৭টা টেবিল আছে কিনা:**

- [ ] `wp_purecart_subscriptions`
- [ ] `wp_purecart_subscription_logs`
- [ ] `wp_purecart_subscription_payments`
- [ ] `wp_purecart_subscription_revenue`
- [ ] `wp_purecart_subscription_items`
- [ ] `wp_purecart_subscription_revenue_goals`
- [ ] `wp_purecart_subscription_linked_entities`

- [ ] `wp_purecart_subscriptions`-এর `status` কলামে **সব মান আছে** কিনা দেখুন (Structure → status → Change):
  `trialing, active, past_due, suspended, paused, pending_cancel, cancelled, expired, completed`

  > এই জায়গায় আগে একটা আসল বাগ ছিল (dbDelta ENUM ভেঙে ফেলত)। ঠিক করা হয়েছে, কিন্তু আপনার DB পুরনো হলে মিলিয়ে নিন।

- [ ] **debug.log-এ কোনো error নেই**

---

## ধাপ ২ — Subscription প্রোডাক্ট তৈরি

**করুন:** Products → Add New → Product data ড্রপডাউনে **"PureCart – Subscription"** বাছুন।

- [ ] ড্রপডাউনে অপশনটা দেখা যাচ্ছে
- [ ] বাঁ পাশে **"Subscription"** ট্যাব এসেছে
- [ ] ট্যাবে এই ফিল্ডগুলো আছে: Recurring price, Billing interval, Billing period, Sign-up fee, Trial length/period, Length, Max subscriptions per customer, Proration, Delivery type
- [ ] **Delivery type** বদলালে নিচের সাব-ফিল্ড বদলায় (Membership → tier, Download → limit, Course → course IDs, Service → notes)

**৪টা প্রোডাক্ট বানিয়ে রাখুন** (পরের সব ধাপে লাগবে):

| নাম | Price | Interval | Delivery type | বাড়তি |
|---|---|---|---|---|
| **P1 – Basic** | 30 | 1 month | Membership | — |
| **P2 – Pro** | 60 | 1 month | Membership | — |
| **P3 – License** | 40 | 1 month | Software | License duration 30 days |
| **P4 – Trial** | 25 | 1 month | Membership | Trial length **7 day** |

- [ ] সেভ করার পর phpMyAdmin-এ `wp_postmeta`-তে দেখুন `_price` ও `_regular_price` **ফাঁকা নয়** (recurring + signup fee-র যোগফল)

  > এটাও একটা আসল বাগ ছিল — checkout-এ ভুল দাম যেত। ঠিক করা হয়েছে।

---

## ধাপ ৩ — কেনা (Subscription তৈরি)

**করুন:** Alice দিয়ে লগইন করে **P1** কিনুন → Admin থেকে order status **Completed** করুন।

- [ ] `wp_purecart_subscriptions`-এ নতুন row এসেছে
- [ ] `user_id` = Alice, `product_id` = P1, `order_id` = ঠিক আছে
- [ ] `status` = `active`
- [ ] `recurring_amount` = 30, `billing_interval` = 1, `billing_period` = month
- [ ] `next_payment_at` = আজ + ১ মাস
- [ ] `starts_at` ভরা আছে
- [ ] `customer_ltv` ভরা আছে (ChurnScorer বসিয়েছে)
- [ ] `wp_purecart_subscription_logs`-এ `created` ইভেন্ট আছে

**Idempotency টেস্ট:**
- [ ] order status আবার Processing → আবার Completed করুন → **নতুন row তৈরি হয়নি** (একটাই থাকবে)

**Guest checkout:**
- [ ] লগআউট করে guest হিসেবে কিনুন → subscription তৈরি **হবে না**, কিন্তু order-এ একটা **note** থাকবে ("no registered customer account")

---

## ধাপ ৪ — Renewal (সময় এগিয়ে নেওয়া)

এটাই সবচেয়ে গুরুত্বপূর্ণ ধাপ। মাস অপেক্ষা না করে "সময় এগিয়ে" নিতে হবে।

### সময় এগোনোর পদ্ধতি

1. **phpMyAdmin**-এ Alice-এর subscription row এডিট করুন:
   - `next_payment_at` → **গতকালের তারিখ** (যেমন `2026-08-10 00:00:00`)
   - `recurring_amount` → **0** ← gateway নেই বলে এটা জরুরি (§শুরুর কথা দেখুন)
2. **WooCommerce → Status → Scheduled Actions**
3. `purecart_scan_due_renewals` খুঁজুন → **Run** ক্লিক করুন

**দেখুন:**

- [ ] `renewal_count` **১ বেড়েছে**
- [ ] `last_payment_at` = আজ
- [ ] `next_payment_at` = **আগের due date + ১ মাস** (আজ + ১ মাস **নয়**)

  > ⚠️ এটা খুঁটিয়ে দেখুন। আগে বাগ ছিল — "এখন" থেকে হিসাব হতো, ফলে renewal দেরিতে চললে billing তারিখ প্রতি মাসে একটু একটু সরে যেত। এখন আগের due date থেকে হয়।

- [ ] `status` = `active`
- [ ] `wp_purecart_subscription_logs`-এ `renewed` ইভেন্ট
- [ ] **`wp_purecart_subscription_revenue`-তে নতুন row** — `period_start`/`period_end` ঠিক আছে (period_end = নতুন due date)
- [ ] `churn_risk_score` কমেছে (সফল payment = −১৫, তবে floor ০)

**দ্বিতীয়বার চালান (idempotency):**
- [ ] আবার `purecart_scan_due_renewals` Run করুন → **`renewal_count` আর বাড়েনি**, revenue-তে **দ্বিতীয় row আসেনি**

---

## ধাপ ৫ — Trial

**করুন:** Bob দিয়ে **P4 (Trial)** কিনুন → order Completed করুন।

- [ ] `status` = **`trialing`** (active নয়)
- [ ] `trial_ends_at` = আজ + ৭ দিন
- [ ] `next_payment_at` = `trial_ends_at`-এর সমান
- [ ] `wp_usermeta`-তে `_purecart_trial_used_<product_id>` = 1

**Trial → Active রূপান্তর:**
- [ ] `next_payment_at` গতকাল করুন, `recurring_amount` = 0 → cron Run করুন
- [ ] `status` = `active` হয়েছে
- [ ] logs-এ status change আছে

**এক customer এক trial:**
- [ ] Bob আবার P4 কিনুন → এইবার সরাসরি `active`, `trial_ends_at` **খালি**

---

## ধাপ ৬ — Customer action (pause / resume / skip / cancel)

REST দিয়ে করতে হবে (§১৩-এর Application Password পদ্ধতি), অথবা সরাসরি DB দেখে যাচাই।

### Pause / Resume
- [ ] pause → `status` = `paused`, `paused_at` ভরা
- [ ] `next_payment_at` মনে রাখুন
- [ ] `paused_at`-কে ১০ দিন আগের করে দিন → resume করুন
- [ ] `status` = `active`, **`next_payment_at` ঠিক ১০ দিন পিছিয়েছে** (কেনা সময় নষ্ট হয়নি)

### Skip
- [ ] skip → `next_payment_at` ১ মাস এগিয়েছে, `skip_count` = 1, **কোনো চার্জ হয়নি**
- [ ] আবার skip → **ব্যর্থ** (ডিফল্ট limit ১)

### Cancel — সাথে সাথে
- [ ] `status` = `cancelled`, `cancelled_at` ভরা
- [ ] logs-এ `cancelled` ইভেন্ট
- [ ] `churn_risk_score` +৩০ বেড়েছে

### Cancel — period শেষে
- [ ] `status` = **`pending_cancel`**, `cancellation_date` = পুরনো `next_payment_at`
- [ ] Scheduled Actions-এ `purecart_finalize_pending_cancellation` শিডিউল হয়েছে

### Resubscribe
- [ ] cancelled subscription resubscribe → **একই row** ফিরে এসেছে (`status` = active, নতুন row হয়নি)
- [ ] `cancelled_at` = NULL

---

## ধাপ ৭ — Dunning (পেমেন্ট ফেল)

gateway নেই বলে ফেল আপনাআপনিই হবে — `recurring_amount` **০-এর বেশি** রাখুন।

**করুন:** নতুন subscription-এ `recurring_amount` = 30, `next_payment_at` = গতকাল → cron Run।

- [ ] `status` = **`past_due`**
- [ ] `retry_count` = 1
- [ ] `wp_purecart_subscription_payments`-এ `failed` status-এ row
- [ ] Scheduled Actions-এ retry শিডিউল হয়েছে
- [ ] `churn_risk_score` +২০

**Suspend পর্যন্ত:**
- [ ] `next_payment_at` **১০ দিন আগের** করুন (grace ৭ দিন)
- [ ] `purecart_process_dunning` Run করুন
- [ ] `status` = **`suspended`**, `suspended_at` ভরা

**Cancel পর্যন্ত:**
- [ ] `suspended_at` **১০ দিন আগের** করুন → আবার `purecart_process_dunning` Run
- [ ] `status` = **`cancelled`**

**ফিরে আসা:**
- [ ] অন্য একটা suspended subscription-এ `recurring_amount` = 0 করে retry → `status` = `active`

---

## ধাপ ৮ — Retention offer

- [ ] REST: `GET /subscriptions/{id}/cancellation/reasons` → ৬টা কারণ আসে
- [ ] `GET /subscriptions/{id}/cancellation/offers?reason=too_expensive` → discount offer আসে
- [ ] `POST /subscriptions/{id}/cancellation/accept-offer` (body: `{"offer_type":"discount","reason":"too_expensive"}`)
- [ ] `discount_percent` = 20, `discount_renewals_remaining` = 3 বসেছে
- [ ] **`status` এখনো `active`** (cancel বাতিল হয়েছে)

**Discount সত্যিই কাজ করে কিনা:**
- [ ] `recurring_amount` = 100 করে renewal চালান → payments-এ **80** চার্জ হয়েছে
- [ ] `discount_renewals_remaining` কমে 2 হয়েছে
- [ ] ৩ বার renewal-এর পর ৪র্থ বার **পুরো 100** চার্জ, `discount_percent` খালি

---

## ধাপ ৯ — Plan change

- [ ] `POST /subscriptions/{id}/upgrade` (body: `{"product_id": <P2 id>, "mode":"apply_at_renewal"}`)
- [ ] `pending_switch_product` = P2, কিন্তু `product_id` **এখনো P1**
- [ ] renewal চালান → `product_id` = P2, `recurring_amount` = 60, `pending_switch_product` খালি

**Immediate proration:**
- [ ] `next_payment_at` আজ + ১৫ দিন করুন, mode = `prorate_immediately`
- [ ] `product_id` সাথে সাথে বদলেছে, logs-এ `plan_switched` ইভেন্টে প্রায় অর্ধেক পার্থক্যের অঙ্ক

---

## ধাপ ১০ — License ইন্টিগ্রেশন (সবচেয়ে জরুরি)

**করুন:** Alice দিয়ে **P3 (License)** কিনুন → Completed।

- [ ] `wp_purecart_licenses`-এ নতুন row
- [ ] subscription row-এর `license_id` সেই row-কে দেখাচ্ছে
- [ ] license `status` = `active`, `expires_at` = আজ + ৩০ দিন

**Renewal → মেয়াদ বাড়ে:**
- [ ] `expires_at` লিখে রাখুন → renewal চালান (`recurring_amount` = 0)
- [ ] license-এর `expires_at` **ঠিক ১ মাস বেড়েছে**

**Suspend → license suspend:**
- [ ] dunning দিয়ে suspend করান
- [ ] license `status` = **`suspended`**

**টাকা দিলে ফেরে:**
- [ ] retry সফল করান → license `status` = **`active`**

**Cancel → মেয়াদ পর্যন্ত বৈধ থাকে:**
- [ ] subscription cancel করুন
- [ ] license `status` = **এখনো `active`** ✅, `expires_at` **অপরিবর্তিত**

  > এটাই সঠিক আচরণ — cancel মানে "আর টাকা নেব না", "যা কিনেছ কেড়ে নেব" না।

**Expire → license expire:**
- [ ] অন্য একটা subscription expire করান → license `status` = `expired`

---

## ধাপ ১১ — Coupon / Role / Renewal sync

### Coupon
- [ ] Marketing → Coupons → নতুন coupon → **Usage restriction** ট্যাবে "PureCart subscription scope" ড্রপডাউন দেখা যাচ্ছে
- [ ] "Recurring fee" + cycles = 3 সেট করে, Fixed cart discount = 20, প্রোডাক্ট price 40 — কিনুন
- [ ] subscription-এ `discount_percent` = 50, `discount_renewals_remaining` = 3
- [ ] "Sign-up fee only" coupon signup fee-র বেশি ছাড় দেয় না

### Role
- [ ] **PureCart → Settings**-এ ৩টা role ড্রপডাউন দেখা যাচ্ছে
- [ ] Active role = "Customer" সেট করুন → নতুন subscription কিনুন → Users-এ customer-এর role যোগ হয়েছে
- [ ] cancel করুন → role সরেছে, cancelled role যোগ হয়েছে
- [ ] **একজনের ২টা subscription** থাকলে একটা cancel করলেও role **থেকে যায়**

### Renewal sync
- [ ] `update_option('purecart_sub_renewal_sync', true)` ও `purecart_sub_renewal_sync_date = 1`
- [ ] মাসের মাঝামাঝি কিনুন → `next_payment_at` = **পরের মাসের ১ তারিখ**
- [ ] cart-এ দাম আংশিক (prorated) দেখাচ্ছে

---

## ধাপ ১২ — Report ও CSV

- [ ] **PureCart → Settings** → নিচে **"Download CSV"** বাটনে ক্লিক → **ফাইল নামছে**
- [ ] CSV Excel-এ খুলুন → ২৭টা কলাম, বাংলা/special character ঠিক আছে
- [ ] `user_email`, `product_name`, `monthly_equivalent`, `churn_band` কলামে সঠিক মান
- [ ] REST: `GET /reports/subscriptions/summary` → MRR হাতে মিলিয়ে দেখুন

  **হিসাব:** শুধু `active` subscription গোনা হয়। `$60/৩ মাস` = $20/মাস। `$120/বছর` = $10/মাস।
  `trialing` ও `past_due` **গোনা হয় না**।

- [ ] `subscriber_count` = **আলাদা customer সংখ্যা** (subscription সংখ্যা নয়)

---

## ধাপ ১৩ — নিরাপত্তা

### REST টেস্ট করার সহজ উপায় (Application Password)

ব্রাউজারে সরাসরি URL দিলে **401 আসবে** (nonce নেই)। তাই:

1. **Users → Profile → Application Passwords** → নতুন password বানান
2. Postman/curl-এ **Basic Auth** দিন: username = আপনার লগইন, password = সেই application password

```bash
curl -u "admin:xxxx xxxx xxxx xxxx" \
  "https://woodigital.local/wp-json/purecart/v1/reports/subscriptions/summary"
```

### Customer isolation (সবচেয়ে জরুরি)
- [ ] **Bob**-এর application password দিয়ে **Alice**-এর subscription পড়ার চেষ্টা:
  `GET /subscriptions/{alice_id}` → **403 আসতে হবে**
- [ ] Bob নিজের subscription পড়তে পারে → **200**
- [ ] Bob দিয়ে `GET /subscriptions` (admin list) → **403**
- [ ] Bob দিয়ে Alice-এর subscription cancel করার চেষ্টা → **403**
- [ ] লগইন ছাড়া (auth ছাড়া) যেকোনো endpoint → **401**

### অন্যান্য
- [ ] না-থাকা ID (`/subscriptions/999999`) → **404** (403 নয় — তাহলে "ID আছে কিনা" ফাঁস হতো)
- [ ] Bob দিয়ে `/reports/subscriptions/export` → **403**
- [ ] subscriber role-এর user দিয়ে product এডিট করার চেষ্টা → পারবে না

---

## ধাপ ১৪ — Email

Local-এ MailHog/Mailpit চালু থাকলে সেখানে দেখুন, নয়তো একটা SMTP প্লাগইন দিয়ে আসল মেইলে পাঠান।

- [ ] **WooCommerce → Settings → Emails**-এ **১৮টা** PureCart subscription email দেখা যাচ্ছে
- [ ] প্রতিটা আলাদা on/off করা যায়, subject/heading এডিট করা যায়
- [ ] নতুন subscription → "Subscription Created" মেইল গেছে
- [ ] Trial শুরু → "Trial Started"
- [ ] Renewal সফল → "Renewal Successful"
- [ ] Payment fail → "Payment Failed"
- [ ] Cancel → "Cancellation Notice"
- [ ] মেইলে `{first_name}`, `{product_name}`, `{amount}` **আসল মান দেখাচ্ছে**, placeholder টেক্সট নয়

**Reminder (scan-ভিত্তিক):**
- [ ] `next_payment_at` = আজ + ৩ দিন করুন → `purecart_scan_due_renewals` Run → "Renewal Reminder" গেছে
- [ ] **আবার Run করুন → দ্বিতীয়বার মেইল যায়নি** (dedup কাজ করছে)

---

## ধাপ ১৫ — শেষ যাচাই

- [ ] পুরো QA শেষে **debug.log-এ কোনো PHP error/warning/notice নেই**
- [ ] `wp_purecart_subscription_logs`-এ প্রতিটা কাজের ইতিহাস আছে
- [ ] WooCommerce → Status → Scheduled Actions-এ **failed** action নেই

---

## 🔴 যা টেস্ট করা যাবে না (জানা সীমাবদ্ধতা)

| বিষয় | কেন |
|---|---|
| আসল কার্ড চার্জ | কোনো gateway ইনস্টল নেই |
| Gateway webhook (Stripe/PayPal) | একই কারণ |
| SCA/3DS reauth | একই কারণ |
| Card expiry warning | saved token লাগে |
| SaaS delivery | `purecart_saas_webhook_url` সেট করা লাগবে |
| React ড্যাশবোর্ড | এখনো mockup, API যুক্ত নয় |

---

## বাগ পেলে যা লিখে রাখবেন

1. কোন ধাপ ও কোন চেকবক্স
2. কী হওয়ার কথা ছিল / আসলে কী হলো
3. `wp_purecart_subscriptions`-এর ওই row-এর screenshot
4. debug.log-এর প্রাসঙ্গিক অংশ
5. Scheduled Actions-এ ওই action-এর status

এই ৫টা থাকলে সমস্যা ধরা অনেক সহজ হবে।
