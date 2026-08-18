# PR #27 Code Review — "Subscription module working"

**PR:** https://github.com/theaminulai/purecart/pull/27  
**Branch:** `subscription-module-working` by @MimMostakim  
**Checklist:** `docs/code-review-checklist.md`  
**Verdict:** ❌ **CHANGES REQUESTED**

---

## Files Reviewed

| File | Result |
|------|--------|
| `includes/Activator.php` | ✅ Pass |
| `includes/Admin/Admin.php` | ❌ Fail |
| `includes/Licensing/LicenseGenerator.php` | ⚠️ Note |
| `includes/Plugin.php` | ✅ Pass |
| `includes/Subscriptions/BillingClock.php` | ✅ Pass |
| `includes/Subscriptions/ChurnScorer.php` | ❌ Fail |
| `includes/Subscriptions/DunningManager.php` | ❌ Fail |
| `includes/Subscriptions/Module.php` | ❌ Fail |
| `includes/Subscriptions/RenewalEngine.php` | ❌ Fail |
| `includes/Subscriptions/RestController.php` | ❌ Fail |
| `includes/Subscriptions/RoleManager.php` | ❌ Fail |
| `includes/Subscriptions/Schema.php` | ⚠️ Minor |
| `includes/Subscriptions/SubscriptionManager.php` | ❌ Fail |
| `includes/Subscriptions/SubscriptionRepository.php` | ⚠️ Minor |

**Not reviewed** (email class files returned empty from GitHub; ~30 additional files not fetched):  
19× `includes/Subscriptions/Emails/*.php`, `PlanUpgrade.php`, `RetentionFlow.php`, `RenewalSync.php`, `RevenueRepository.php`, `SplitPaymentManager.php`, `SubscriptionCoupon.php`, `SubscriptionExport.php`, `SubscriptionLogRepository.php`, `WebhookHandler.php`, `PaymentRepository.php`, `DeliveryManager.php` + delivery handlers, interface/registry files.

Given the systemic A5 and A11 pattern found in every class reviewed, these unreviewed files very likely carry the same violations and must be audited once the fixes below land.

---

## Violation Index

| ID | Rule | Severity | Files Affected |
|----|------|----------|----------------|
| V-01 | A5 — Hooks in constructor | 🔴 Critical | 7 classes |
| V-02 | A11 — Raw option/meta key strings | 🔴 Critical | 7 classes |
| V-03 | A8 — `'__return_true'` as permission_callback | 🔴 Fail | `RestController.php` |
| V-04 | A8 — Missing `args` on REST routes | 🟡 Fail | `RestController.php` |
| V-05 | A3 — Missing PHP return type declarations | 🟡 Fail | `RenewalEngine.php`, `RestController.php` |
| V-06 | A2 — Class responsibility creep | ⚠️ Note | `LicenseGenerator.php` |
| V-07 | A6 — Schema column defaults | ⚠️ Minor | `Schema.php` |
| V-08 | A12 — Missing phpcs:ignore on two queries | ⚠️ Minor | `SubscriptionRepository.php` |

---

## V-01 — Hooks in Constructor (CRITICAL — checklist Part D instant fail)

**Rule:** Hooks must never be registered inside `__construct()`. All hook calls belong in a `boot()` or `register_hooks()` method.

This violation appears in **seven classes** — every class in the module that registers hooks:

### `includes/Subscriptions/Module.php`
```php
public function __construct() {
    if (!self::is_enabled()) return;
    add_filter('purecart_subscription_delivery_handlers', [$this, 'register_native_delivery_handlers']);
    // ...
}
```

### `includes/Subscriptions/RenewalEngine.php`
```php
public function __construct() {
    // ...
    add_action(self::SCAN_HOOK, [$this, 'scan_due_renewals']);
    add_action(self::PROCESS_HOOK, [$this, 'process_renewal']);
    add_action('init', [$this, 'maybe_schedule_recurring_scan']);
}
```

### `includes/Subscriptions/RestController.php`
```php
public function __construct(...) {
    // ...
    add_action('rest_api_init', [$this, 'register_routes']);
}
```

### `includes/Subscriptions/SubscriptionManager.php`
```php
public function __construct() {
    $this->subscriptions = new SubscriptionRepository();
    $this->logs          = new SubscriptionLogRepository();
    add_action('woocommerce_order_status_completed',      [$this, 'maybe_create_from_order']);
    add_action('purecart_finalize_pending_cancellation',  [$this, 'finalize_pending_cancellation']);
}
```

### `includes/Subscriptions/DunningManager.php`
```php
public function __construct(RenewalEngine $renewal_engine) {
    // ...
    add_action('purecart_subscription_payment_failed', [$this, 'on_payment_failed'], 10, 3);
    add_action(self::RETRY_HOOK,                       [$this, 'run_retry'],          10, 2);
    add_action('purecart_process_dunning',             [$this, 'check_grace_periods']);
}
```

### `includes/Subscriptions/RoleManager.php`
```php
public function __construct() {
    $this->subscriptions = new SubscriptionRepository();
    add_action('purecart_subscription_activated',     [$this, 'on_activated']);
    add_action('purecart_subscription_status_changed',[$this, 'on_status_changed'], 10, 3);
    add_action('purecart_subscription_resubscribed',  [$this, 'on_resubscribed']);
}
```

### `includes/Subscriptions/ChurnScorer.php`
```php
public function __construct() {
    $this->subscriptions = new SubscriptionRepository();
    $this->logs          = new SubscriptionLogRepository();
    add_action('purecart_subscription_activated',      [$this, 'on_activated']);
    add_action('purecart_subscription_renewed',        [$this, 'on_payment_success']);
    add_action('purecart_subscription_payment_failed', [$this, 'on_payment_failed']);
    add_action('purecart_subscription_status_changed', [$this, 'on_status_changed'], 10, 3);
    add_action('purecart_subscription_skipped',        [$this, 'on_skipped']);
    add_action('purecart_subscription_plan_changed',   [$this, 'on_plan_changed']);
}
```

**Fix — apply to every affected class:**

```php
public function __construct() {
    $this->subscriptions = new SubscriptionRepository();
    $this->logs          = new SubscriptionLogRepository();
    // No hook calls here.
}

public function boot(): void {
    add_action('purecart_subscription_activated',      [$this, 'on_activated']);
    add_action('purecart_subscription_renewed',        [$this, 'on_payment_success']);
    // ...all other add_action/add_filter calls
}
```

Then in `Module.php`, call `->boot()` explicitly after instantiation:

```php
$this->churn_scorer = new ChurnScorer();
$this->churn_scorer->boot();
```

---

## V-02 — Raw Option Key Strings (CRITICAL — checklist Part D instant fail)

**Rule:** Option and meta keys must never appear as raw strings. Every option must be a constant in `OptionKeys.php`, read via `Settings::get(OptionKeys::CONSTANT)` and written via `Settings::set(OptionKeys::CONSTANT, $value)`.

The following new option keys are used as raw strings across 7 classes. **None of them exist in `OptionKeys.php`.**

| Raw String Key | Used In |
|----------------|---------|
| `'purecart_sub_enabled'` | `Module.php` (`OPTION_ENABLED` const), `Admin.php` |
| `'purecart_sub_trial_role'` | `Admin.php`, `RoleManager.php` |
| `'purecart_sub_active_role'` | `Admin.php`, `RoleManager.php` |
| `'purecart_sub_cancelled_role'` | `Admin.php`, `RoleManager.php` |
| `'purecart_sub_one_trial_per_customer'` | `SubscriptionManager.php` |
| `'purecart_sub_skip_limit'` | `SubscriptionManager.php` |
| `'purecart_sub_resubscribe_window_days'` | `SubscriptionManager.php` |
| `'purecart_sub_retry_intervals'` | `DunningManager.php` |
| `'purecart_sub_retry_attempts'` | `DunningManager.php` |
| `'purecart_sub_active_grace_days'` | `DunningManager.php` |
| `'purecart_sub_suspended_grace_days'` | `DunningManager.php` |
| `'purecart_sub_avg_lifetime_months'` | `ChurnScorer.php` |

**Fix — step 1:** Add all 12 keys to `includes/Settings/OptionKeys.php`:

```php
// Subscriptions module
public const SUB_ENABLED                  = 'purecart_sub_enabled';
public const SUB_TRIAL_ROLE               = 'purecart_sub_trial_role';
public const SUB_ACTIVE_ROLE              = 'purecart_sub_active_role';
public const SUB_CANCELLED_ROLE           = 'purecart_sub_cancelled_role';
public const SUB_ONE_TRIAL_PER_CUSTOMER   = 'purecart_sub_one_trial_per_customer';
public const SUB_SKIP_LIMIT               = 'purecart_sub_skip_limit';
public const SUB_RESUBSCRIBE_WINDOW_DAYS  = 'purecart_sub_resubscribe_window_days';
public const SUB_RETRY_INTERVALS          = 'purecart_sub_retry_intervals';
public const SUB_RETRY_ATTEMPTS           = 'purecart_sub_retry_attempts';
public const SUB_ACTIVE_GRACE_DAYS        = 'purecart_sub_active_grace_days';
public const SUB_SUSPENDED_GRACE_DAYS     = 'purecart_sub_suspended_grace_days';
public const SUB_AVG_LIFETIME_MONTHS      = 'purecart_sub_avg_lifetime_months';
```

**Fix — step 2:** Replace every raw `get_option()` / `update_option()` call. Examples:

```php
// Before (Module.php)
public static function is_enabled(): bool {
    return (bool) get_option(self::OPTION_ENABLED, true);
}

// After
public static function is_enabled(): bool {
    return (bool) Settings::get(OptionKeys::SUB_ENABLED, true);
}
```

```php
// Before (Admin.php)
update_option('purecart_sub_trial_role', sanitize_text_field($_POST['purecart_sub_trial_role']));

// After
Settings::set(OptionKeys::SUB_TRIAL_ROLE, sanitize_text_field($_POST[OptionKeys::SUB_TRIAL_ROLE]));
```

```php
// Before (DunningManager.php)
$intervals    = (array) get_option('purecart_sub_retry_intervals', [1, 3, 5]);
$max_attempts = (int)   get_option('purecart_sub_retry_attempts', 3);

// After
$intervals    = (array) Settings::get(OptionKeys::SUB_RETRY_INTERVALS, [1, 3, 5]);
$max_attempts = (int)   Settings::get(OptionKeys::SUB_RETRY_ATTEMPTS, 3);
```

The `Module::OPTION_ENABLED` class constant (a raw string `'purecart_sub_enabled'` defined directly on the class) must be removed; all references must use `OptionKeys::SUB_ENABLED`.

---

## V-03 — `'__return_true'` as permission_callback (FAIL)

**File:** `includes/Subscriptions/RestController.php`  
**Rule (checklist A8):** Public REST routes must return `true` explicitly. The string `'__return_true'` is not permitted.

```php
// Before — three routes use this pattern
'permission_callback' => '__return_true',

// After
'permission_callback' => static fn() => true,
```

Affected routes (at minimum): `GET /reasons`, external-renewal webhook, webhook-event handler. All three must use an explicit closure or a named method that `return true;`.

---

## V-04 — Missing `args` on REST Routes (FAIL)

**File:** `includes/Subscriptions/RestController.php`  
**Rule (checklist A8):** Every REST route that accepts query parameters or body fields must declare an `args` array with sanitize/validate callbacks.

Observed gaps:
- `GET /subscriptions` — accepts a `status` query param; no `args` array declared.
- `POST /subscriptions/{id}/pause` — accepts a `resume_at` body field; no `args` array declared.

Fix: add `args` for every parameter the route reads. Example:

```php
'args' => [
    'status' => [
        'type'              => 'string',
        'enum'              => ['active','trialing','paused','past_due','suspended','pending_cancel','cancelled','expired'],
        'sanitize_callback' => 'sanitize_text_field',
    ],
],
```

---

## V-05 — Missing PHP Return Type Declarations (FAIL)

**Rule (checklist A3):** Every method must have a PHP return type.

### `includes/Subscriptions/RenewalEngine.php`

| Method | Expected type |
|--------|--------------|
| `charge_one_off()` | `\WC_Order\|\WP_Error` |
| `early_renewal()` | `true\|\WP_Error` |

### `includes/Subscriptions/RestController.php`

| Method | Expected type |
|--------|--------------|
| `handle_action_pause()` | `\WP_REST_Response\|\WP_Error` |
| `handle_action_resume()` | `\WP_REST_Response\|\WP_Error` |
| `handle_action_cancel()` | `\WP_REST_Response\|\WP_Error` |
| (any other handler methods without return types) | `\WP_REST_Response\|\WP_Error` |

PHP 8.0+ union types are available. Example:

```php
public function charge_one_off( int $subscription_id ): \WC_Order|\WP_Error {
```

---

## V-06 — Class Responsibility Creep (Note)

**File:** `includes/Licensing/LicenseGenerator.php`  
**Rule (checklist A2):** Each class should have a single, clear responsibility.

Three new methods were added to `LicenseGenerator`: `get_by_id()`, `extend_expiry()`, and `set_status()`. These perform direct DB reads and writes via `global $wpdb`. `LicenseGenerator`'s responsibility is generating license key strings — these are repository-layer operations. They belong in a `LicenseRepository` class (consistent with `SubscriptionRepository` added in this same PR).

This is not a merge blocker on its own, but the same pattern that led to a `SubscriptionRepository` being correctly extracted here should be applied retroactively to `LicenseGenerator`. Recommend filing a follow-up task.

---

## V-07 — Schema Column Defaults (Minor)

**File:** `includes/Subscriptions/Schema.php`  
**Rule (checklist A6):** Timestamp columns that track row creation/modification must declare `DEFAULT CURRENT_TIMESTAMP` and `ON UPDATE CURRENT_TIMESTAMP` respectively.

```sql
-- Before
`created_at` DATETIME NOT NULL,
`updated_at` DATETIME NOT NULL,

-- After
`created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
`updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
```

Note: `SubscriptionRepository::create()` and `update()` both write `current_time('mysql')` manually, so runtime behaviour is currently correct. The DB defaults are a safety net (e.g., direct SQL inserts from migration scripts) and are still required by the checklist.

---

## V-08 — Missing phpcs:ignore on Two Queries (Minor)

**File:** `includes/Subscriptions/SubscriptionRepository.php`

All other direct-DB queries in this file have the required `phpcs:ignore WordPress.DB.DirectDatabaseQuery.*` comment with a justification. These two are missing it:

- `count_by_status()` — the `get_results()` call (no variable input, but still needs the comment)
- `find_all()` — the unfiltered `get_results()` branch (null === $status path)

Add the standard comment block before each:

```php
// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Export/aggregate query over a custom table; no user input.
```

---

## What Passes

The following are confirmed correct and should not be touched:

- **`Activator.php`** — DB version bump, `as_unschedule_all_actions()` in `deactivate()`, delegation to `Schema::create_tables()` ✅
- **`Plugin.php`** — `SubscriptionsModule` wired into `init()` ✅
- **`BillingClock.php`** — Timezone-safe date math using `wp_timezone()`; month-overflow clamping; all static methods, no constructor, no hooks ✅
- **`SubscriptionRepository.php`** — Clean `COLUMN_FORMATS` pattern, `filter_known_columns()` whitelist, `$wpdb->prepare()` on every parameterised query, phpcs:ignore comments with justification on nearly all direct queries, full return types ✅
- **`Schema.php`** — `dbDelta()`, `$wpdb->get_charset_collate()`, two-space DDL formatting, `ALTER TABLE` phpcs:ignore with justification ✅ (column defaults aside)
- **`SubscriptionManager.php`** — HPOS-correct (`$order->get_items()`, `$order->get_customer_id()`, `$order->get_currency()`), `as_schedule_single_action()` with `'purecart'` group, idempotency guard via `find_by_order_and_product()`, `apply_filters` and `do_action` naming convention ✅ (hooks-in-constructor aside)
- **`RenewalEngine.php`** — Action Scheduler used throughout; correct group `'purecart'`; `apply_filters('purecart_allow_renewal', ...)` naming ✅ (hooks-in-constructor and return types aside)
- **`RestController.php`** — `rest_ensure_response()` used consistently; `WP_Error` returned for failures; error codes follow `purecart_{noun}_{condition}`; `prepare_subscription()` formats before returning; `serve_pending_csv()` echo with justified phpcs:ignore ✅ (hooks, permission_callback, missing args, and return types aside)
- **`DunningManager.php`** — HMAC token signing via `hash_hmac('sha256', ..., wp_salt('auth'))` and `hash_equals()` for timing-safe verification ✅; hard-decline codes list ✅; all return types declared ✅ (hooks-in-constructor and raw options aside)
- **`RoleManager.php`** — Multi-subscription ownership guard (`user_still_needs_role()` checks all subscriptions before stripping a role) ✅; all return types declared ✅ (hooks-in-constructor and raw options aside)
- **`ChurnScorer.php`** — Score bands match spec exactly (25/50/75); `to_monthly_equivalent()` made `public static` for reuse by `RevenueRepository`; `pending_cancel → cancelled` double-count guard ✅ (hooks-in-constructor and raw options aside)

---

## Required Changes Before Merge

1. **All 7 classes:** Move every `add_action()` / `add_filter()` call out of `__construct()` into a `boot()` method. Update `Module.php` to call `->boot()` on each instantiated object.
2. **`includes/Settings/OptionKeys.php`:** Add the 12 new `SUB_*` constants listed in V-02.
3. **All 7 classes + `Admin.php`:** Replace every `get_option('purecart_sub_*')` and `update_option('purecart_sub_*')` with `Settings::get(OptionKeys::SUB_*)` and `Settings::set(OptionKeys::SUB_*)`.
4. **`RestController.php`:** Replace `'__return_true'` with explicit closures; add `args` arrays to all parameterised routes.
5. **`RenewalEngine.php` and `RestController.php`:** Add PHP return type declarations to all methods that are missing them.

Minor items (can be in the same PR, do not need a separate one):
6. **`Schema.php`:** Add `DEFAULT CURRENT_TIMESTAMP` and `ON UPDATE CURRENT_TIMESTAMP` to timestamp columns.
7. **`SubscriptionRepository.php`:** Add phpcs:ignore comments to the two unguarded queries.
