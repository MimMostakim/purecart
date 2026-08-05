# Subscriptions Module — Backend Development Plan
**Plugin:** woo-digital-downloads
**Module:** Subscriptions
**Scope:** PHP backend only — REST API, database, business logic, email classes, hooks
**Frontend plan:** `docs/dev-plan-subscriptions-frontend.md`
**Reference:** `docs/RND-subscriptions.md`, `docs/plugin-guideline.md`

---

## নিয়ম

প্রতিটি Step শেষ করার পর:
1. Manual test checklist দেওয়া হবে
2. Test পাস করলে permission নিয়ে পরের Step শুরু হবে
3. Frontend এর কোনো কাজ এই plan এ নেই — UI/template/React আলাদা plan এ

---

## Step 1 — Database Schema & Migration

**কী করব:**
- `includes/Database/Schema.php` এ দুটি method add:
  - `wdd_subscriptions(string $prefix, string $charset): string`
  - `wdd_subscription_logs(string $prefix, string $charset): string`
- `includes/Database/Migrator.php` এ subscription tables run করানো
- `includes/Core/OptionKeys.php` এ সব `wdd_sub_*` option constants add
- `includes/Core/MetaKeys.php` এ সব `_wdd_sub_*` product/user meta key constants add

**Tables:**

`wp_wdd_subscriptions`:
```
id, user_id, product_id, order_id, license_id, saas_account_id,
status ENUM(trialing|active|paused|past_due|suspended|cancelled|expired),
billing_interval, billing_period ENUM(day|week|month|year),
recurring_amount, currency, signup_fee,
trial_ends_at, next_payment_at, last_payment_at, max_length_at,
paused_at, cancelled_at,
gateway, gateway_subscription_id,
retry_count, renewal_count,
starts_at, created_at, updated_at
```

`wp_wdd_subscription_logs`:
```
id, subscription_id, event VARCHAR(100), old_status, new_status,
amount, order_id, note, created_at
```

**Files:**
```
includes/Database/Schema.php      ← 2টি table schema method add
includes/Database/Migrator.php    ← subscription tables call add
includes/Core/OptionKeys.php      ← wdd_sub_* constants
includes/Core/MetaKeys.php        ← _wdd_sub_* constants
```

### Manual Test — Step 1
- [ ] Plugin activate করো — কোনো fatal error নেই
- [ ] phpMyAdmin এ `wp_wdd_subscriptions` table exist করে, সব column + index আছে
- [ ] phpMyAdmin এ `wp_wdd_subscription_logs` table exist করে
- [ ] Plugin deactivate → activate করলেও কোনো error নেই (dbDelta idempotent)

**Step 1 শেষে permission চাইব।**

---

## Step 2 — SubscriptionsModule Bootstrap

**কী করব:**
- `includes/Modules/Subscriptions/SubscriptionsModule.php` create করব (`AbstractModule` extend)
- `register()` — module সবসময় call হয়: admin menu sub-page register, settings REST route register
- `boot()` — enabled হলে call হয়: সব functional hooks register (এই step এ placeholder only)
- `includes/Plugin.php` এর `boot_modules()` array তে `subscriptions` add করব
- `Installer::activate()` এ subscription default options set করব

**Files:**
```
includes/Modules/Subscriptions/SubscriptionsModule.php   ← new
includes/Plugin.php                                       ← subscriptions entry add
includes/Installer.php                                    ← subscription defaults
```

### Manual Test — Step 2
- [ ] WP Admin → Digital Downloads menu এ "Subscriptions" sub-page exist করে
- [ ] Settings → Digital Downloads → Modules এ Subscriptions toggle আছে
- [ ] Module enable/disable করলে কোনো PHP error নেই
- [ ] `wdd_active_modules` option এ `subscriptions` correctly save/remove হচ্ছে

**Step 2 শেষে permission চাইব।**

---

## Step 3 — Subscription Product Type (Backend)

**কী করব:**
- `includes/Modules/Subscriptions/SubscriptionProduct.php` create করব
- `woocommerce_product_class` filter এ `wdd_subscription` product type register
- Product meta **save** logic (`woocommerce_process_product_meta` hook):
  - `_wdd_sub_price`, `_wdd_sub_interval`, `_wdd_sub_period`
  - `_wdd_sub_trial_length`, `_wdd_sub_trial_period`
  - `_wdd_sub_signup_fee`, `_wdd_sub_length`, `_wdd_sub_length_period`
  - `_wdd_sub_limit`, `_wdd_sub_proration`
  - `_wdd_sub_include_tax`, `_wdd_sub_include_shipping`
  - `_wdd_sub_step_price`, `_wdd_sub_step_after`
  - `_wdd_sub_retention_enabled`, `_wdd_sub_retention_offer_type`
  - `_wdd_sub_role_trial`, `_wdd_sub_role_active`, `_wdd_sub_role_cancelled`
- Product price display filter: "৳X / month" format (`woocommerce_get_price_html`)
- Cart item subscription info filter (billing frequency text)
- Product type: virtual = true, downloadable = false (no shipping)

> **Note:** Meta box UI (কোন field কোথায় দেখাবে) → Frontend plan এর Step 1

**Files:**
```
includes/Modules/Subscriptions/SubscriptionProduct.php   ← new
```

### Manual Test — Step 3
- [ ] WooCommerce → Product type dropdown এ "Subscription" option আছে
- [ ] Subscription product save করলে meta values DB তে correctly stored হচ্ছে (phpMyAdmin check)
- [ ] Product page এ price "৳X / month" format এ দেখাচ্ছে
- [ ] Subscription product এ shipping required নেই (virtual = true)
- [ ] Cart এ subscription product add করলে billing frequency text দেখাচ্ছে

**Step 3 শেষে permission চাইব।**

---

## Step 4 — SubscriptionRepository + SubscriptionLogRepository

**কী করব:**
- `includes/Modules/Subscriptions/SubscriptionRepository.php`:
  - `wdd_create(array $data): int`
  - `wdd_find(int $id): ?array`
  - `wdd_find_by_user(int $user_id, string $status = ''): array`
  - `wdd_find_due_renewals(int $limit = 50): array` — `next_payment_at <= NOW()` এবং status = active/trialing
  - `wdd_find_due_trial_endings(int $days = 3): array`
  - `wdd_update(int $id, array $data): bool`
  - `wdd_update_status(int $id, string $status): bool`
  - `wdd_get_all(array $filters, int $page, int $per_page): array` — paginated admin list
  - `wdd_count_by_status(): array`
  - `wdd_increment_renewal_count(int $id): void`

- `includes/Modules/Subscriptions/SubscriptionLogRepository.php`:
  - `wdd_add_log(int $sub_id, string $event, array $data = []): int`
  - `wdd_get_logs(int $sub_id, int $limit = 100): array`
  - `wdd_get_logs_by_event(int $sub_id, string $event): array`

**Rules:** সব query `$wpdb->prepare()` দিয়ে, সব DML `$wpdb->insert/update/delete()` দিয়ে, কোনো raw SQL class এর বাইরে না

**Files:**
```
includes/Modules/Subscriptions/SubscriptionRepository.php      ← new
includes/Modules/Subscriptions/SubscriptionLogRepository.php   ← new
```

### Manual Test — Step 4
- [ ] PHP syntax error নেই
- [ ] `wdd_create()` call করলে `wp_wdd_subscriptions` এ row insert হয়, return value = new ID
- [ ] `wdd_find(1)` call করলে সেই row return করে
- [ ] `wdd_update_status(1, 'paused')` call করলে status update হয়, `updated_at` change হয়
- [ ] `wdd_add_log()` call করলে `wp_wdd_subscription_logs` এ row insert হয়
- [ ] `wdd_find_due_renewals()` — `next_payment_at` past এ আছে এমন subscriptions return করে

**Step 4 শেষে permission চাইব।**

---

## Step 5 — SubscriptionManager (Core Lifecycle)

**কী করব:**
- `includes/Modules/Subscriptions/SubscriptionManager.php` create করব
- `woocommerce_order_status_completed` hook এ `wdd_create_from_order()`:
  1. Order items iterate করে `wdd_subscription` product type check
  2. Product meta থেকে billing info extract করে
  3. Trial check: `wdd_sub_one_trial_per_customer` + `_wdd_trial_used_{product_id}` user meta
  4. `next_payment_at` calculate করে (trial থাকলে trial end থেকে, না থাকলে now + interval)
  5. `SubscriptionRepository::wdd_create()` call করে
  6. `gateway_subscription_id` order payment method থেকে extract করে
  7. `do_action('wdd_subscription_created', $sub_id, $order_id, $product_id)` fire করে
  8. Log entry add করে

- `wdd_pause(int $sub_id, int $user_id): bool`:
  - Ownership check (customer বা admin)
  - `paused_at = NOW()`, status = 'paused'
  - Scheduled renewal unschedule (Step 6 এ RenewalEngine)
  - `do_action('wdd_subscription_paused', $sub_id)`

- `wdd_resume(int $sub_id, int $user_id): bool`:
  - `next_payment_at` recalculate (pause duration add করে বা fresh cycle)
  - status = 'active', `paused_at = NULL`
  - Renewal reschedule
  - `do_action('wdd_subscription_resumed', $sub_id)`

- `wdd_cancel(int $sub_id, string $cancelled_by = 'customer'): bool`:
  - `cancelled_at = NOW()`, status = 'cancelled'
  - Scheduled renewal unschedule
  - `do_action('wdd_subscription_cancelled', $sub_id, $cancelled_by)`

- `wdd_expire(int $sub_id): void`:
  - status = 'expired'
  - `do_action('wdd_subscription_expired', $sub_id)`

- `wdd_resubscribe(int $sub_id, int $user_id): bool`:
  - নতুন WC order create বা existing re-activate (N days এর মধ্যে হলে)
  - `do_action('wdd_subscription_resubscribed', $sub_id)`

**Files:**
```
includes/Modules/Subscriptions/SubscriptionManager.php   ← new
includes/Modules/Subscriptions/SubscriptionsModule.php   ← boot() এ hook add
```

### Manual Test — Step 5
- [ ] Subscription product কিনে order complete করলে `wp_wdd_subscriptions` এ row তৈরি হয়
- [ ] Status সঠিক: trial product → `trialing`, সাধারণ → `active`
- [ ] `next_payment_at` সঠিক date এ (monthly হলে ~1 month পরে)
- [ ] `wp_wdd_subscription_logs` এ `subscription_created` event log আছে
- [ ] Same product আবার কিনলে trial থাকলেও `_wdd_trial_used_{product_id}` check হচ্ছে
- [ ] `wdd_subscription_cancelled` hook fire হচ্ছে (temporary `add_action` দিয়ে test করো)
- [ ] Order এ duplicate hook run হলেও duplicate subscription তৈরি হচ্ছে না (idempotent)

**Step 5 শেষে permission চাইব।**

---

## Step 6 — RenewalEngine (Action Scheduler)

**কী করব:**
- `includes/Modules/Subscriptions/RenewalEngine.php` create করব

**Methods:**
- `wdd_schedule_renewal(int $sub_id, string $next_payment_at): void`:
  - `as_schedule_single_action(strtotime($next_payment_at), 'wdd_process_subscription_renewal', ['sub_id' => $sub_id], 'woo-digital-downloads')`

- `wdd_cancel_scheduled_renewal(int $sub_id): void`:
  - `as_unschedule_all_actions('wdd_process_subscription_renewal', ['sub_id' => $sub_id], 'woo-digital-downloads')`

- `wdd_process_renewal(int $sub_id): void` (Action Scheduler handler):
  1. Subscription load + status check (active বা trialing হতে হবে)
  2. Stepped price check: `renewal_count >= step_after` → `step_price` use করে
  3. Renewal WC order create (`wdd_renewal_order_args` filter apply করে)
  4. Gateway token দিয়ে charge attempt (`wdd_attempt_gateway_charge()`)
  5. **Success:**
     - `next_payment_at += interval`, `last_payment_at = NOW()`
     - `wdd_increment_renewal_count()`
     - `do_action('wdd_subscription_renewed', $sub_id, $order_id, $new_next_payment_at)`
     - Next renewal schedule
     - Log: `renewal_success`
  6. **Failure:**
     - `DunningManager::wdd_on_payment_failed($sub_id)` call

- `wdd_check_trial_endings(): void` (recurring AS job):
  - `trial_ends_at` থেকে N days আগের subscriptions find করে trial ending email trigger করে

- `wdd_check_upcoming_renewals(): void` (recurring AS job):
  - `next_payment_at` থেকে configured days আগের active subscriptions এ renewal reminder email

**Action Scheduler jobs (activation এ register):**
```
wdd_process_subscription_renewal   ← single, per subscription
wdd_check_trial_endings            ← recurring, daily
wdd_check_upcoming_renewals        ← recurring, daily
```

**Files:**
```
includes/Modules/Subscriptions/RenewalEngine.php         ← new
includes/Modules/Subscriptions/SubscriptionsModule.php   ← boot() এ AS hooks register
includes/Installer.php                                    ← recurring jobs schedule on activate
```

### Manual Test — Step 6
- [ ] Subscription create হলে Action Scheduler → Pending তে `wdd_process_subscription_renewal` scheduled দেখা যায়
- [ ] Scheduled time `next_payment_at` এর সাথে match করছে
- [ ] AS → "Run" manually করলে renewal order create হয়
- [ ] Successful renewal এ `next_payment_at` পরের cycle এ update হয়
- [ ] `renewal_count` ১ বাড়ে
- [ ] পরের renewal আবার scheduled হয়
- [ ] Subscription cancel করলে scheduled renewal টি AS থেকে remove হয়
- [ ] Stepped price: `_wdd_sub_step_after = 2`, `renewal_count = 2` → step_price use হয়

**Step 6 শেষে permission চাইব।**

---

## Step 7 — DunningManager (Failed Payment Handling)

**কী করব:**
- `includes/Modules/Subscriptions/DunningManager.php` create করব

**Methods:**
- `wdd_on_payment_failed(int $sub_id): void`:
  - Status → `past_due`
  - Log: `payment_failed`, retry_count = current value
  - `PaymentFailedEmail` trigger
  - First retry schedule (retry_delays[0] days later)

- `wdd_retry_payment(int $sub_id): void` (Action Scheduler handler):
  - Charge attempt
  - **Success** → `DunningManager::wdd_on_retry_success($sub_id)`
  - **Failure:**
    - `retry_count++`
    - Max retries পার হয়নি → পরের retry schedule, overdue email
    - `retry_count` thresholds:
      - Active grace শেষ (`active_grace_days`) → `wdd_suspend()`
      - সব retry শেষ কিন্তু suspended grace এ → continue retry

- `wdd_on_retry_success(int $sub_id): void`:
  - Status → `active`, `retry_count = 0`
  - License/SaaS restore: `do_action('wdd_subscription_reactivated', $sub_id)`
  - `RenewalSuccessfulEmail` trigger
  - Next renewal schedule

- `wdd_suspend(int $sub_id): void`:
  - Status → `suspended`
  - Log: `suspended`
  - `do_action('wdd_subscription_suspended', $sub_id)` (Licensing/SaaS listen করবে)
  - `SuspendNoticeEmail` trigger
  - Suspended grace tracking শুরু

- `wdd_hard_cancel(int $sub_id): void`:
  - Status → `cancelled`
  - Log: `hard_cancelled_after_dunning`
  - `CancellationNoticeEmail` trigger

**Configuration (OptionKeys):**
```
wdd_subs_retry_attempts       default: 3
wdd_subs_retry_delays         default: [1, 3, 5] days
wdd_sub_active_grace_days     default: 7
wdd_sub_suspended_grace_days  default: 7
```

**Files:**
```
includes/Modules/Subscriptions/DunningManager.php        ← new
includes/Modules/Subscriptions/SubscriptionsModule.php   ← boot() এ wdd_retry_payment AS hook
```

### Manual Test — Step 7
- [ ] RenewalEngine এ intentionally fail করালে (`status = past_due` manually) → dunning শুরু হয়
- [ ] AS তে retry jobs scheduled দেখা যায় (configured delay এ)
- [ ] `wp_wdd_subscription_logs` এ `payment_failed` event আছে
- [ ] `active_grace_days` পরে status `suspended` হয়
- [ ] Licensing module active থাকলে suspend এ license suspend হয়
- [ ] `suspended_grace_days` পরে status `cancelled` হয়
- [ ] Retry success এ status `active`, `retry_count = 0`, license restore

**Step 7 শেষে permission চাইব।**

---

## Step 8 — REST API Endpoints

**কী করব:**
- `includes/Modules/Subscriptions/Api/SubscriptionsController.php` create করব
- `includes/Core/RestApi.php` এ subscription routes register করব

**Endpoints:**

| Method | Endpoint | Permission |
|--------|----------|------------|
| GET | `/wdd/v1/subscriptions` | `manage_woocommerce` |
| GET | `/wdd/v1/subscriptions/{id}` | admin বা subscription owner |
| POST | `/wdd/v1/subscriptions/{id}/pause` | admin বা owner (allow_pause check) |
| POST | `/wdd/v1/subscriptions/{id}/resume` | admin বা owner |
| POST | `/wdd/v1/subscriptions/{id}/cancel` | admin বা owner (allow_cancel check) |
| POST | `/wdd/v1/subscriptions/{id}/renew` | `manage_woocommerce` |
| POST | `/wdd/v1/subscriptions/{id}/upgrade` | admin বা owner (allow_upgrade check) |
| GET | `/wdd/v1/subscriptions/{id}/logs` | `manage_woocommerce` |

**Rules:**
- সব endpoint এ `args` definition + sanitize callback
- Customer isolation: owner check — `$subscription['user_id'] === get_current_user_id()`
- Error codes: `wdd_subscription_not_found`, `wdd_permission_denied`, `wdd_subscription_not_pausable`, ইত্যাদি
- Controller thin: শুধু validate + delegate to SubscriptionManager/Repository

**Files:**
```
includes/Modules/Subscriptions/Api/SubscriptionsController.php   ← new
includes/Core/RestApi.php                                         ← routes add
```

### Manual Test — Step 8
- [ ] `GET /wp-json/wdd/v1/subscriptions` (admin cookie) → subscription list JSON
- [ ] `GET /wp-json/wdd/v1/subscriptions/1` (owner) → subscription data
- [ ] `GET /wp-json/wdd/v1/subscriptions/1` (অন্য user) → 403
- [ ] `POST /wp-json/wdd/v1/subscriptions/1/pause` (owner) → success, status = paused
- [ ] `POST /wp-json/wdd/v1/subscriptions/999/pause` → 404 `wdd_subscription_not_found`
- [ ] `POST /wp-json/wdd/v1/subscriptions/1/renew` (no auth) → 401
- [ ] `GET /wp-json/wdd/v1/subscriptions/1/logs` (admin) → event log array
- [ ] `allow_pause = false` setting এ pause endpoint → 400 error

**Step 8 শেষে permission চাইব।**

---

## Step 9 — Email PHP Classes (সব 16টি)

**কী করব:**
- প্রতিটি email `WC_Email` extend করবে, `includes/Email/Emails/` এ রাখব
- `includes/Modules/Subscriptions/SubscriptionEmail.php` — WC `woocommerce_email_classes` filter এ সব email register করবে
- প্রতিটি email class এ:
  - `$this->id`, `$this->title`, `$this->description`
  - `$this->template_html`, `$this->template_plain`
  - `$this->placeholders` array (50+ placeholder)
  - `trigger(int $sub_id, array $extra_data = []): void` method
- Template files: `templates/emails/subscription-*.php` (HTML) এবং `templates/emails/plain/subscription-*.php`

> **Note:** Template HTML/CSS design → Frontend plan এর Step 5

**16টি Email:**
1. `SubscriptionCreatedEmail` → `wdd_subscription_created` hook
2. `TrialStartedEmail` → `wdd_subscription_created` (trialing status)
3. `TrialEndingSoonEmail` → `wdd_check_trial_endings` job
4. `TrialConvertedEmail` → trial period end + first charge success
5. `RenewalReminderEmail` → `wdd_check_upcoming_renewals` job
6. `RenewalSuccessfulEmail` → `wdd_subscription_renewed` hook
7. `PaymentFailedEmail` → `wdd_on_payment_failed()`
8. `PaymentRetryScheduledEmail` → retry schedule এ
9. `OverdueNoticeEmail` → overdue threshold এ
10. `SuspendNoticeEmail` → `wdd_subscription_suspended` hook
11. `SuspendedGraceEndingEmail` → suspended grace N days remaining
12. `CancellationNoticeEmail` → `wdd_subscription_cancelled` hook
13. `ExpirationNoticeEmail` → `wdd_subscription_expired` hook
14. `ResubscriptionConfirmedEmail` → `wdd_subscription_resubscribed` hook
15. `PlanChangedEmail` → `wdd_subscription_plan_changed` hook
16. `SkipRenewalConfirmedEmail` → skip next renewal action

**Files:**
```
includes/Modules/Subscriptions/SubscriptionEmail.php          ← email registry
includes/Email/Emails/SubscriptionCreatedEmail.php            ← (এবং বাকি 15টি class)
templates/emails/subscription-created.php                     ← minimal HTML template
templates/emails/plain/subscription-created.php               ← plain text
```

### Manual Test — Step 9
- [ ] WooCommerce → Settings → Emails এ সব 16টি WDD subscription email দেখা যায়
- [ ] প্রতিটি email enable/disable করা যায়
- [ ] Subscription create → customer "Subscription Created" email পায়
- [ ] Manual renewal trigger → "Renewal Successful" email যায়
- [ ] Email এ `{first_name}`, `{subscription_id}`, `{product_name}`, `{amount}`, `{next_payment_date}` সঠিকভাবে replace হয়
- [ ] WooCommerce email header/footer দিয়ে wrap হচ্ছে (plain text ও আছে)

**Step 9 শেষে permission চাইব।**

---

## Step 10 — PlanUpgrade (Upgrade / Downgrade Logic)

**কী করব:**
- `includes/Modules/Subscriptions/PlanUpgrade.php` create করব

**Methods:**
- `wdd_process(int $sub_id, int $new_product_id, int $user_id): bool|\WP_Error`:
  - Ownership + `allow_upgrade` check
  - Proration mode read: product meta `_wdd_sub_proration` → fallback to global `wdd_subs_proration_mode`
  - Mode dispatch

- `wdd_calculate_proration(array $subscription, float $new_price): float`:
  - `days_remaining = (next_payment_at - NOW()) in days`
  - `days_in_cycle = billing_interval in days`
  - `unused_credit = (days_remaining / days_in_cycle) × old_price`
  - `charge = new_price − unused_credit` (upgrade), or `credit = unused_credit − new_price` (downgrade)
  - `apply_filters('wdd_proration_amount', $charge, $sub_id, $new_product_id)`

- `wdd_apply_prorate_immediately(array $sub, int $new_product_id, float $charge): bool`:
  - Prorated WC order create + charge
  - subscription product_id, price update
  - `next_payment_at = NOW() + interval` (cycle reset)
  - `do_action('wdd_subscription_plan_changed', $sub_id, $old_pid, $new_pid, $charge)`

- `wdd_apply_at_renewal(array $sub, int $new_product_id): bool`:
  - Subscription এ `pending_product_id` store করে (next renewal এ apply হবে)
  - RenewalEngine renewal time এ check করে apply করে

- `wdd_apply_no_proration(array $sub, int $new_product_id): bool`:
  - product_id, price সঙ্গে সঙ্গে update
  - next renewal এ full new price

**Files:**
```
includes/Modules/Subscriptions/PlanUpgrade.php   ← new
```

### Manual Test — Step 10
- [ ] REST: `POST /wdd/v1/subscriptions/1/upgrade` body: `{new_product_id: X, proration_mode: 'prorate_immediately'}` → prorated order create হয়
- [ ] `prorate_immediately`: charge = correct prorated amount
- [ ] `apply_at_renewal`: আজ কোনো charge নেই, `pending_product_id` stored, next renewal এ নতুন price
- [ ] `no_proration`: product_id update, পরের renewal এ full new price
- [ ] Downgrade `prorate_immediately`: WC store credit বা refund issue হয়
- [ ] `wp_wdd_subscription_logs` এ `plan_changed` event log আছে

**Step 10 শেষে permission চাইব।**

---

## Step 11 — RetentionFlow (Cancellation Logic)

**কী করব:**
- `includes/Modules/Subscriptions/RetentionFlow.php` create করব
- Customer cancel REST call কে intercept করে retention flow এ redirect করে (response তে `retention_required: true` + `reasons` + `offers` return করে)
- REST endpoint: `POST /wdd/v1/subscriptions/{id}/cancel` এ retention logic inject করা

**Methods:**
- `wdd_get_reasons(int $sub_id): array` — configured reason list return করে
- `wdd_get_offer(int $sub_id, string $reason): ?array` — reason based offer return করে (type + value)
- `wdd_accept_offer(int $sub_id, string $reason, string $offer_type): bool|\WP_Error`:
  - `discount` → WC coupon generate + apply to subscription
  - `pause` → `SubscriptionManager::wdd_pause()`
  - `skip` → next_payment_at advance
  - `downgrade` → `PlanUpgrade::wdd_process()`
  - Log: `retention_accepted`, reason, offer_type
- `wdd_decline_and_cancel(int $sub_id, string $reason): bool`:
  - Log: `retention_declined`, reason
  - `SubscriptionManager::wdd_cancel()`

**Product meta used:**
- `_wdd_sub_retention_enabled` (bool)
- `_wdd_sub_retention_reasons` (JSON array of reason strings)
- `_wdd_sub_retention_offer_type` (string: discount|pause|skip|downgrade)

**Files:**
```
includes/Modules/Subscriptions/RetentionFlow.php   ← new
```

### Manual Test — Step 11
- [ ] `POST /wdd/v1/subscriptions/1/cancel` (retention enabled product) → response: `{retention_required: true, reasons: [...], offer: {...}}`
- [ ] `POST /wdd/v1/subscriptions/1/cancel` body: `{action: 'accept_offer', reason: 'too_expensive', offer_type: 'discount'}` → coupon apply, subscription active
- [ ] `POST /wdd/v1/subscriptions/1/cancel` body: `{action: 'decline', reason: 'too_expensive'}` → subscription cancelled
- [ ] `_wdd_sub_retention_enabled = 0` product → cancel directly হয়, retention response নেই
- [ ] `wp_wdd_subscription_logs` এ `retention_accepted` বা `retention_declined` event log আছে

**Step 11 শেষে permission চাইব।**

---

## Step 12 — RoleManager

**কী করব:**
- `includes/Modules/Subscriptions/RoleManager.php` create করব
- `wdd_subscription_status_changed` action listen করে (SubscriptionManager সব status change এ এটি fire করবে)

**Status transition → Role action:**

| Transition | Action |
|------------|--------|
| any → trialing | `_wdd_sub_role_trial` role assign |
| trialing → active (trial converted) | trial role remove, `_wdd_sub_role_active` assign |
| any → active | `_wdd_sub_role_active` assign |
| active → suspended/cancelled/expired | active role remove, `_wdd_sub_role_cancelled` assign |
| any → active (resubscribe) | cancelled role remove, active role assign |

**Methods:**
- `wdd_on_status_changed(int $sub_id, string $old_status, string $new_status): void`
- `assign_role(int $user_id, string $meta_key, int $product_id): void` (private)
- `remove_role(int $user_id, string $meta_key, int $product_id): void` (private)

**SubscriptionManager update:** সব status change এ `do_action('wdd_subscription_status_changed', $sub_id, $old_status, $new_status)` fire করতে হবে

**Files:**
```
includes/Modules/Subscriptions/RoleManager.php    ← new
includes/Modules/Subscriptions/SubscriptionManager.php ← status_changed hook add
```

### Manual Test — Step 12
- [ ] `_wdd_sub_role_trial = 'subscriber'` set থাকলে trial subscription create এ user 'subscriber' role পায়
- [ ] Trial convert হলে (first charge success) trial role remove + active role assign
- [ ] Subscription cancel হলে active role remove + cancelled role assign
- [ ] Role transition `wp_wdd_subscription_logs` এ log হচ্ছে
- [ ] `_wdd_sub_role_*` meta set না থাকলে কোনো role change হয় না

**Step 12 শেষে permission চাইব।**

---

## Step 13 — SubscriptionReport (Data + CSV)

**কী করব:**
- `includes/Modules/Subscriptions/SubscriptionReport.php` create করব
- Raw data aggregation শুধু — frontend chart rendering → Frontend plan

**Methods:**
- `wdd_get_summary(): array`:
  ```php
  return [
      'active'    => count,
      'trialing'  => count,
      'paused'    => count,
      'past_due'  => count,
      'suspended' => count,
      'cancelled' => count,
      'expired'   => count,
      'mrr'       => decimal,  // active subscriptions এর monthly recurring revenue
      'arr'       => decimal,
  ];
  ```
- `wdd_get_mrr_by_product(): array` — product wise MRR
- `wdd_get_churn_rate(int $days = 30): float`
- `wdd_get_trial_conversion_rate(): float`
- `wdd_get_revenue_by_period(string $period = 'month', int $count = 12): array`
- `wdd_get_retention_stats(): array` — reason breakdown + acceptance rate
- `wdd_export_csv(array $filters = []): void` — headers set করে, `wp_wdd_subscriptions` থেকে CSV output করে

**REST endpoint (admin only):**
- `GET /wdd/v1/subscriptions/report/summary`
- `GET /wdd/v1/subscriptions/report/export` → CSV download

**Files:**
```
includes/Modules/Subscriptions/SubscriptionReport.php   ← new
includes/Core/RestApi.php                               ← report endpoints add
```

### Manual Test — Step 13
- [ ] `GET /wp-json/wdd/v1/subscriptions/report/summary` → JSON with counts + MRR
- [ ] MRR সঠিক (2টি $50/month active subscription → MRR = 100.00)
- [ ] `GET /wp-json/wdd/v1/subscriptions/report/export` → CSV file download হয়
- [ ] CSV এ customer name, email, product, status, amount, next_payment columns আছে
- [ ] Churn rate calculation: (cancelled this month / active start of month) × 100

**Step 13 শেষে permission চাইব।**

---

## Step 14 — RenewalSync + Subscription Coupons + Advanced

**কী করব:**

**RenewalSync** (`includes/Modules/Subscriptions/RenewalSync.php`):
- `wdd_sub_renewal_sync = true` হলে activate
- `wdd_calculate_first_payment_date(int $product_id): array`:
  - `sync_date` = `wdd_sub_renewal_sync_date` (1-28)
  - আজকের date থেকে পরের sync_date calculate
  - Return: `['first_payment_date' => 'Y-m-d', 'prorated_amount' => decimal]`
  - Prorated amount = `(days_until_sync / days_in_month) × price`
- SubscriptionManager::wdd_create_from_order() এ integration

**Subscription Coupons** (`includes/Modules/Subscriptions/SubscriptionCoupon.php`):
- `woocommerce_coupon_discount_types` filter এ দুটি type add:
  - `wdd_sub_signup_fee_discount` — sign-up fee তে apply হয়
  - `wdd_sub_recurring_discount` — N renewals পর্যন্ত recurring amount এ apply
- Coupon meta: `_wdd_sub_coupon_recurring_cycles` (int, 0 = forever)
- `woocommerce_get_discounted_price` filter এ apply logic

**Mixed Cart:**
- `woocommerce_add_to_cart_validation` — subscription + non-subscription allowed
- Multiple subscriptions: প্রতিটি subscription product এর জন্য আলাদা subscription record

**Files:**
```
includes/Modules/Subscriptions/RenewalSync.php        ← new
includes/Modules/Subscriptions/SubscriptionCoupon.php ← new
```

### Manual Test — Step 14
**RenewalSync:**
- [ ] `wdd_sub_renewal_sync = true`, `sync_date = 1` → June 20 subscribe → first charge = prorated (10 days/30 × price)
- [ ] First charge সফল → next_payment_at = July 1
- [ ] Second charge = full price on July 1
- [ ] `wdd_sub_renewal_sync = false` → normal billing, কোনো proration নেই

**Coupons:**
- [ ] WooCommerce → Coupons → Discount type dropdown এ "Subscription Sign-up Fee Discount" দেখা যায়
- [ ] "Subscription Recurring Discount" দেখা যায়
- [ ] Sign-up fee coupon: checkout এ sign-up fee তে apply হয়, recurring তে না
- [ ] Recurring coupon: configured N renewals পর্যন্ত apply হয়, তারপর full price

**Mixed Cart:**
- [ ] Subscription + regular product একসাথে cart এ add করা যায়
- [ ] Checkout complete করলে: regular order item + separate subscription record
- [ ] 2টি subscription product → 2টি আলাদা subscription record

**Step 14 শেষে permission চাইব।**

---

## Step 15 — Final Integration Test

**কী করব:**
- Licensing module এর সাথে integration verify:
  - `wdd_subscription_renewed` → `LicenseActivator::wdd_extend_expiry()`
  - `wdd_subscription_suspended` → `LicenseActivator::wdd_suspend()`
  - `wdd_subscription_cancelled` → License grace period পর্যন্ত valid
- SaaS module এর সাথে integration verify:
  - `wdd_subscription_created` → `AccountProvisioner::wdd_provision()`
  - `wdd_subscription_suspended` → `AccountProvisioner::wdd_suspend()`
  - `wdd_subscription_reactivated` → `AccountProvisioner::wdd_activate()`
- Security audit:
  - সব AJAX/REST এ nonce/auth check
  - Customer isolation (নিজের subscription ছাড়া অন্যটা access করতে পারছে না)
  - SQL injection: সব query prepared
  - No `get_post_meta()` on orders (HPOS compat)

### Final Manual Test — Step 15

**Licensing Integration:**
- [ ] Subscription renewal → license `expires_at` extend হয়
- [ ] Subscription suspend → license status = `suspended`
- [ ] Subscription cancel → license period শেষ পর্যন্ত valid, তারপর expire naturally

**SaaS Integration:**
- [ ] Subscription create → SaaS account provision webhook fire হয়
- [ ] Subscription suspend → SaaS suspend webhook fire হয়
- [ ] Subscription reactivate (retry success) → SaaS activate webhook fire হয়

**Full Lifecycle:**
- [ ] Buy → active → renewal → next cycle
- [ ] Buy → payment fail → past_due → retry → active
- [ ] Buy → payment fail → suspended → hard cancel
- [ ] Buy → pause → resume → correct billing date
- [ ] Buy → upgrade plan → correct proration charge
- [ ] Buy → cancel (with retention, accept offer) → active
- [ ] Buy → cancel (decline) → cancelled, license grace

**Security:**
- [ ] Customer A cannot access Customer B's subscription via REST
- [ ] Unauthenticated cancel request → 401
- [ ] Admin manual renewal without nonce → rejected
- [ ] SQL injection test: `?id=1 OR 1=1` → rejected by prepare()

---

## Progress Tracker

| Step | Description | Status |
|------|-------------|--------|
| Step 1 | Database Schema & Migration | ⬜ Not Started |
| Step 2 | SubscriptionsModule Bootstrap | ⬜ Not Started |
| Step 3 | Subscription Product Type (backend) | ⬜ Not Started |
| Step 4 | SubscriptionRepository + LogRepository | ⬜ Not Started |
| Step 5 | SubscriptionManager (Core Lifecycle) | ⬜ Not Started |
| Step 6 | RenewalEngine (Action Scheduler) | ⬜ Not Started |
| Step 7 | DunningManager (Failed Payment) | ⬜ Not Started |
| Step 8 | REST API Endpoints | ⬜ Not Started |
| Step 9 | Email PHP Classes (16 emails) | ⬜ Not Started |
| Step 10 | PlanUpgrade (Proration Logic) | ⬜ Not Started |
| Step 11 | RetentionFlow (Cancellation Logic) | ⬜ Not Started |
| Step 12 | RoleManager | ⬜ Not Started |
| Step 13 | SubscriptionReport (Data + CSV) | ⬜ Not Started |
| Step 14 | RenewalSync + Coupons + Advanced | ⬜ Not Started |
| Step 15 | Final Integration Test | ⬜ Not Started |

**Icons:** ⬜ Not Started | 🔄 In Progress | ✅ Complete | ❌ Blocked
