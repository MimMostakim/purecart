# PureCart Subscriptions — Final Backend + Frontend Spec & Dev Plan (Reconciled)

**Companion doc:** `subscription-final-feature-rnd.md` — full feature spec, competitor research, user journeys. Read that first for *what* to build; this doc is *how*.

**Source legend:** same as the feature doc — `[RND]` `[RND-FE]` `[nym-RND]` `[nym-ARCH]` `[dev-plan]` `[dev-plan-FE]` `[bangla-plan]`. See that doc § 0 for the full file list and why `purecart_` naming won over `wdd_` and `pct_`.

---

## 0. Additional corrections found by reading the real codebase

Beyond the naming-convention conflict already resolved in the feature doc, checking `includes/Licensing/`, `includes/SaaS/`, `includes/Autoloader.php`, `includes/API/RestApi.php`, and `src/app/components/` surfaced four more corrections that apply to *all* the technical content below:

1. **Real classes use PSR-4 namespaces, not `PC_`-prefixed names.** `includes/Autoloader.php` registers a PSR-4 autoloader for `PureCart\` mapping `PureCart\Foo\Bar` → `includes/Foo/Bar.php`. `includes/Licensing/LicenseActivator.php` is `namespace PureCart\Licensing; class LicenseActivator`. `[RND]`'s code samples use old WP-style prefixed names (`PC_Product_Subscription`, `PC_Email_SubscriptionRenewalReminder`, `PC_SubscriptionManager::maybe_create_from_order`) — those are **stale**. Below, every class is namespaced under `PureCart\Subscriptions\`.
2. **Module folders are flat**, not nested under `Modules/`. `includes/Licensing/` and `includes/SaaS/` sit directly under `includes/`. `[dev-plan]`'s proposed `includes/Modules/Subscriptions/` doesn't match — `[RND]`'s own path table already got this right (`includes/Subscriptions/SubscriptionManager.php`), so that part of `[RND]` is used as-is.
3. **REST routes are centralized**, not one controller class per module. `includes/API/RestApi.php` is the single file registering all `purecart/v1` routes today. Subscriptions should follow the same pattern: a `PureCart\Subscriptions\RestController` class with a `register_routes()` method that `RestApi.php` calls into, not a separate `includes/Modules/Subscriptions/Api/SubscriptionsController.php` as `[dev-plan]` proposed.
4. **The frontend module folder already exists and is partially built.** `src/app/components/Subscriptions/SubscriptionsPage.tsx` is real, live code today — it's exactly what `[RND-FE]` documents (including the known bugs in `[RND-FE]` § 17: the duplicate "Product" column, the `SETTINGS_TABS` gap). `includes/Subscriptions/` (backend) does **not** exist yet — the backend is unbuilt. Sibling pages follow a `Page/AnalyticsPage` split (e.g. `Analytics/AbandonedCartAnalyticsPage.tsx` sits next to `AbandonedCart/AbandonedCartPage.tsx`), so `SubscriptionAnalyticsPage.tsx` belongs in `src/app/components/Analytics/`, not inside `Subscriptions/`.

`[dev-plan-FE]`'s tech stack (`@wordpress/components`, `@wordpress/data`, PHP templates, Chart.js) does not match the app that already exists (Tailwind + M3 tokens + `lucide-react` + Recharts + hand-rolled `useState<Page>` routing, confirmed in `package.json`). The frontend plan below follows `[RND-FE]`'s stack, not `[dev-plan-FE]`'s.

---

## 1. Architecture — Classes

Base: `[RND]` § Architecture, with paths and class names corrected to real PSR-4 namespacing (§0).

| Class | File | Responsibility |
|---|---|---|
| `SubscriptionProduct` | `includes/Subscriptions/SubscriptionProduct.php` | Register product type, meta boxes, pricing display, subscribe & save |
| `SubscriptionManager` | `includes/Subscriptions/SubscriptionManager.php` | Create, renew, pause, cancel, skip, resubscribe, early renewal |
| `RenewalEngine` | `includes/Subscriptions/RenewalEngine.php` | Action Scheduler jobs; idempotency guard; zero-total; staging block; external renewal recording |
| `DunningManager` | `includes/Subscriptions/DunningManager.php` | Grace-period retry + emails; hard vs. soft decline targeting `[nym-RND]` |
| `PlanUpgrade` | `includes/Subscriptions/PlanUpgrade.php` | 3-mode proration, upgrade/downgrade, pending switch |
| `RetentionFlow` | `includes/Subscriptions/RetentionFlow.php` | Cancellation reason + offer eligibility + acceptance + history |
| `SplitPaymentManager` | `includes/Subscriptions/SplitPaymentManager.php` | Installment tracking, access timing, completion detection |
| `RenewalSync` | `includes/Subscriptions/RenewalSync.php` | Calendar-date alignment for first partial payment |
| `RoleManager` | `includes/Subscriptions/RoleManager.php` | WP role assignment on status transitions |
| `ChurnScorer` | `includes/Subscriptions/ChurnScorer.php` | Compute and update churn risk score on payment events |
| `HealthCheck` | `includes/Subscriptions/HealthCheck.php` | Scan for expired/missing payment methods; card expiry warnings |
| `SubscriptionEmail` | `includes/Subscriptions/SubscriptionEmail.php` | Registers all subscription `WC_Email` subclasses |
| `SubscriptionReport` | `includes/Subscriptions/SubscriptionReport.php` | Admin reports, MRR/ARR/churn/LTV aggregation, CSV export |
| `SubscriptionListTable` | `includes/Subscriptions/SubscriptionListTable.php` | Admin list data source (backs the React table via REST) |
| `PrivacyHandler` | `includes/Subscriptions/PrivacyHandler.php` | GDPR data export + erase integration |
| `CustomerPortal` | `includes/Subscriptions/CustomerPortal.php` | My Account endpoint registration, AJAX handlers, self-service actions |
| `DeliveryManager` | `includes/Subscriptions/DeliveryManager.php` | Dispatches provisioning across all registered delivery types |
| `DeliveryHandlerRegistry` | `includes/Subscriptions/DeliveryHandlerRegistry.php` | **New** `[nym-ARCH]` — the pluggable delivery-type registry (§ 3) |
| `SubscriptionRepository` | `includes/Subscriptions/SubscriptionRepository.php` | All `wp_purecart_subscriptions` reads/writes (`[dev-plan]`'s repository-pattern discipline, adopted — keeps `$wpdb` calls out of business-logic classes) |
| `SubscriptionLogRepository` | `includes/Subscriptions/SubscriptionLogRepository.php` | All `wp_purecart_subscription_logs` reads/writes |
| `RestController` | `includes/Subscriptions/RestController.php` | Registers subscription routes; called from `includes/API/RestApi.php` |
| `WebhookHandler` | `includes/Subscriptions/WebhookHandler.php` | **New** `[nym-RND]` — inbound Stripe/PayPal webhook idempotency + event mapping (§ 5) |

Every class above is `namespace PureCart\Subscriptions;`. Email classes live in a sub-namespace: `PureCart\Subscriptions\Emails\SubscriptionRenewalReminderEmail`, etc. — file path `includes/Subscriptions/Emails/SubscriptionRenewalReminderEmail.php` per the PSR-4 mapping.

---

## 2. Database Schema

Base: `[RND]`'s `wp_purecart_subscriptions` + `wp_purecart_subscription_linked_entities` (schema already matches the real `purecart_` convention). Three changes and two new tables adopted from `[nym-ARCH]`, translated from `pct_` to `purecart_`:

- `delivery_type` → `VARCHAR(32)`, not `ENUM` (registry decision, feature doc § 4)
- `status` `ENUM` gains `pending_reauth` (feature doc § 10, § 23)
- `previous_subscription_id` added for resubscribe-chain tracking `[nym-ARCH]`
- **New:** `wp_purecart_subscription_payments` — per-charge-attempt ledger with refund tracking and webhook-idempotency unique key. `[RND]`'s idempotency approach only tracks the *current* cycle's order ID on the subscription row; it doesn't give a full audit trail of every attempt or a place to record partial refunds. `[nym-ARCH]`'s payments ledger fills that gap.
- **New:** `wp_purecart_subscription_items` — forward-looking, not needed for MVP. `[RND]` assumes one product per subscription; this table supports future bundle/multi-product subscriptions without a schema change later.

`wp_purecart_subscription_revenue` and `wp_purecart_revenue_goals` are unchanged from `[RND]` — `[nym-ARCH]`'s equivalent tables are functionally identical, just `pct_`-prefixed, so there's no separate table to add.

> Phase 2 features (gift subscriptions, usage-based billing, multi-currency, tax jurisdiction tracking — feature doc §§ 12–15, 17) do not have a designed schema in any source doc. Don't invent one here — design it when that phase is actually scheduled.

### `wp_purecart_subscriptions`

```sql
CREATE TABLE {prefix}purecart_subscriptions (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id                 BIGINT UNSIGNED NOT NULL,
    product_id              BIGINT UNSIGNED NOT NULL,
    order_id                BIGINT UNSIGNED NOT NULL,        -- initial order
    license_id              BIGINT UNSIGNED NULL,
    saas_account_id         BIGINT UNSIGNED NULL,
    delivery_type           VARCHAR(32) NOT NULL DEFAULT 'software',   -- VARCHAR + registry, not ENUM [nym-ARCH]
    status                  ENUM(
                                'trialing',
                                'active',
                                'paused',
                                'past_due',
                                'pending_reauth',            -- added [nym-RND]
                                'suspended',
                                'pending_cancel',
                                'cancelled',
                                'expired',
                                'completed'
                            ) DEFAULT 'active',
    billing_interval        INT UNSIGNED NOT NULL,
    billing_period           ENUM('day','week','month','year') NOT NULL,
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
    retry_count              TINYINT UNSIGNED DEFAULT 0,
    renewal_count            INT UNSIGNED DEFAULT 0,
    skip_count               INT UNSIGNED DEFAULT 0,
    max_renewals              INT UNSIGNED NULL,               -- NULL = unlimited
    -- Split payment fields
    payment_type            ENUM('recurring','split') DEFAULT 'recurring',
    max_payments             INT UNSIGNED NULL,
    access_timing            ENUM('immediate','after_full_payment','custom_duration') DEFAULT 'immediate',
    access_duration_value    INT UNSIGNED NULL,
    access_duration_unit     ENUM('day','week','month','year') NULL,
    access_end_date          DATETIME NULL,
    -- Stepped pricing
    step_price               DECIMAL(10,2) NULL,
    step_after                INT UNSIGNED NULL,
    -- Analytics
    churn_risk_score         TINYINT UNSIGNED DEFAULT 0,      -- 0-100
    customer_ltv              DECIMAL(10,2) DEFAULT 0.00,
    -- Pending plan switch
    pending_switch_product    BIGINT UNSIGNED NULL,
    pending_switch_type       ENUM('upgrade','downgrade') NULL,
    -- Shipping snapshot
    shipping_amount           DECIMAL(10,2) DEFAULT 0.00,
    shipping_method           VARCHAR(255) NULL,
    -- Addresses (JSON)
    billing_address           TEXT NULL,
    shipping_address          TEXT NULL,
    -- Resubscribe chain
    previous_subscription_id BIGINT UNSIGNED NULL,            -- added [nym-ARCH]
    starts_at                DATETIME NOT NULL,
    created_at                DATETIME NOT NULL,
    updated_at                DATETIME NOT NULL,
    PRIMARY KEY (id),
    KEY idx_user_id (user_id),
    KEY idx_product_id (product_id),
    KEY idx_status (status),
    KEY idx_next_payment (next_payment_at),
    KEY idx_trial_ends (trial_ends_at),
    KEY idx_pause_end (pause_end_date),
    KEY idx_churn (churn_risk_score),
    KEY idx_delivery_type (delivery_type),
    KEY idx_previous_subscription (previous_subscription_id)
);
```

### `wp_purecart_subscription_linked_entities`

Stores type-specific data for `membership`, `download`, `course`, `service`, and any future registered type. `software`/`saas` use `license_id`/`saas_account_id` on the parent table directly, since Licensing/SaaS are sibling modules with their own tables.

```sql
CREATE TABLE {prefix}purecart_subscription_linked_entities (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    subscription_id         BIGINT UNSIGNED NOT NULL,
    delivery_type           VARCHAR(32) NOT NULL,             -- VARCHAR, not ENUM [nym-ARCH]
    -- Membership
    membership_tier         VARCHAR(100) NULL,
    assigned_role            VARCHAR(100) NULL,
    content_access_label     VARCHAR(255) NULL,
    grace_ends_at            DATETIME NULL,
    -- Digital downloads
    downloads_this_cycle     INT UNSIGNED DEFAULT 0,
    download_limit           INT UNSIGNED NULL,
    next_drip_date           DATETIME NULL,
    -- Course / LMS
    lms_enrollment_id        VARCHAR(255) NULL,
    enrolled_course_ids      TEXT NULL,                       -- JSON array of int IDs
    course_access_until      DATETIME NULL,
    -- Service / Retainer
    deliverable_notes        TEXT NULL,
    next_deliverable_due     DATETIME NULL,
    last_deliverable_at      DATETIME NULL,
    -- Extension point: new delivery types store JSON here without a migration
    extra_data                LONGTEXT NULL,                   -- added [nym-ARCH]
    created_at                DATETIME NOT NULL,
    updated_at                DATETIME NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uniq_subscription (subscription_id),
    KEY idx_delivery_type (delivery_type),
    KEY idx_next_drip (next_drip_date),
    KEY idx_course_access (course_access_until),
    KEY idx_grace_ends (grace_ends_at)
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
    actor_type      VARCHAR(16) NOT NULL DEFAULT 'system',    -- added [nym-ARCH]: system|customer|admin|webhook
    actor_id        BIGINT UNSIGNED DEFAULT 0,                -- added [nym-ARCH]
    created_at      DATETIME NOT NULL,
    PRIMARY KEY (id),
    KEY idx_subscription_id (subscription_id),
    KEY idx_event (event),
    KEY idx_created_at (created_at)
);
```

### `wp_purecart_subscription_payments` — new, from `[nym-ARCH]`

Per-charge-attempt ledger. `uniq_transaction` is what makes inbound webhook processing idempotent (§ 5) — a duplicate Stripe/PayPal event fails the insert instead of double-processing.

```sql
CREATE TABLE {prefix}purecart_subscription_payments (
    id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    subscription_id    BIGINT UNSIGNED NOT NULL,
    order_id           BIGINT UNSIGNED NOT NULL,
    transaction_id     VARCHAR(255) NOT NULL,
    amount             DECIMAL(10,2) NOT NULL,
    currency           VARCHAR(10) DEFAULT 'USD',
    status             VARCHAR(32) NOT NULL,                  -- succeeded, failed, refunded
    is_partial_refund  TINYINT(1) NOT NULL DEFAULT 0,
    refunded_amount    DECIMAL(10,2) NULL,
    refund_reason      TEXT NULL,
    created_at         DATETIME NOT NULL,
    PRIMARY KEY (id),
    KEY idx_subscription_id (subscription_id),
    UNIQUE KEY uniq_transaction (transaction_id)
);
```

### `wp_purecart_subscription_items` — new, from `[nym-ARCH]`, forward-looking only

```sql
CREATE TABLE {prefix}purecart_subscription_items (
    id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    subscription_id  BIGINT UNSIGNED NOT NULL,
    product_id       BIGINT UNSIGNED NOT NULL,
    variation_id     BIGINT UNSIGNED DEFAULT 0,
    qty              INT UNSIGNED NOT NULL DEFAULT 1,
    line_subtotal    DECIMAL(10,2) NOT NULL,
    line_total       DECIMAL(10,2) NOT NULL,
    delivery_type    VARCHAR(32) NOT NULL DEFAULT 'membership',
    PRIMARY KEY (id),
    KEY idx_subscription_id (subscription_id)
);
```

### `wp_purecart_subscription_revenue` — unchanged, `[RND]`

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

### `wp_purecart_revenue_goals` — unchanged, `[RND]`

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

### Product meta & config options

Unchanged from `[RND]` §"Product Meta Fields" / §"Configuration Options" — all already use the correct `_purecart_sub_*` / `purecart_sub_*` prefix. Not reproduced here to avoid duplication; see `RND-subscriptions.md` directly, it doesn't need correction.

---

## 3. Delivery Type Registry

`[nym-ARCH]` §"এক্সটেনসিবিলিটি আর্কিটেকচার", adapted to `PureCart\` namespacing.

```php
namespace PureCart\Subscriptions;

interface Delivery_Handler_Interface {
    public function activate( array $subscription ): void;          // first charge succeeds, or trial starts
    public function renew( array $subscription ): void;              // every successful renewal
    public function deactivate( array $subscription ): void;         // suspended/cancelled/expired
    public function get_linked_data( array $subscription ): array;   // for admin panel / REST response
    public function validate_linked_data( array $data ): bool|\WP_Error;
}
```

Registration (any module — including third-party):

```php
add_filter( 'purecart_subscription_delivery_handlers', function ( $handlers ) {
    $handlers['membership'] = new PureCart\Subscriptions\Delivery\Membership_Handler();
    $handlers['download']   = new PureCart\Subscriptions\Delivery\Download_Handler();
    $handlers['course']     = new PureCart\Subscriptions\Delivery\Course_Handler();
    $handlers['service']    = new PureCart\Subscriptions\Delivery\Service_Handler();
    return $handlers;
} );
```

`software` and `saas` follow the **companion-module pattern** instead — `DeliveryManager` calls directly into `PureCart\Licensing\LicenseActivator` / `PureCart\SaaS\AccountProvisioner` (already-real classes) rather than going through the generic handler interface, since those modules have their own tables and richer domain logic. `[nym-ARCH]`'s "two extension patterns" framing (companion-module vs. native-registered-handler) is the right mental model here and is adopted as-is.

**Consistent event payload** `[nym-ARCH]`: every dispatch passes `subscription_id` (not the full object), so handlers always load fresh state instead of risking a stale reference:

```php
do_action( 'purecart_subscription_status_changed', $subscription_id, $old_status, $new_status, $context );
do_action( 'purecart_subscription_activated', $subscription_id );
do_action( 'purecart_subscription_renewed', $subscription_id, $order_id, $new_next_payment_at );
```

---

## 4. WooCommerce Integration Points

Technical content below is `[RND]` § WooCommerce Integration — verified accurate against how the plugin already integrates with WooCommerce elsewhere (`includes/Commerce/ProductTypes.php`, `includes/API/RestApi.php`). Only the class names are corrected to `PureCart\Subscriptions\*` namespacing per § 0. Full original hook code is in `RND-subscriptions.md` § WooCommerce Integration — reproduced here only where the correction matters or as a summary table; don't duplicate the rest.

| Integration point | Hook(s) | Handled by |
|---|---|---|
| Product type registration | `woocommerce_product_class`, `product_type_selector` | `SubscriptionProduct` |
| Product data tab | `woocommerce_product_data_tabs`, `woocommerce_product_data_panels`, `woocommerce_process_product_meta` | `SubscriptionProduct` |
| Checkout → subscription creation | `woocommerce_payment_complete`, `woocommerce_order_status_processing` | `SubscriptionManager::maybe_create_from_order()` |
| Cart display / totals | `woocommerce_get_item_data`, `woocommerce_cart_totals_order_total_html`, `woocommerce_cart_needs_payment` | `SubscriptionProduct` |
| Gateway filtering (subscriptions need tokenization) | `woocommerce_available_payment_gateways` | `SubscriptionProduct::filter_gateways_for_subscriptions()` |
| HPOS compatibility | `before_woocommerce_init` → `FeaturesUtil::declare_compatibility('custom_order_tables', ...)` | Plugin bootstrap |
| WC Blocks compatibility | `before_woocommerce_init` → `FeaturesUtil::declare_compatibility('cart_checkout_blocks', ...)` | Plugin bootstrap |
| Email registration | `woocommerce_email_classes` | `SubscriptionEmail` |
| Payment token lifecycle | `woocommerce_payment_token_deleted`, `woocommerce_payment_token_set_default` | `HealthCheck`, `SubscriptionManager::update_customer_token()` |
| My Account endpoints | `add_rewrite_endpoint`, `woocommerce_account_menu_items`, `woocommerce_account_{endpoint}_endpoint` | `CustomerPortal` |
| Admin order list link-back | `woocommerce_admin_order_actions`, `woocommerce_admin_order_data_after_order_details` | Admin integration in `SubscriptionManager` |
| WC Analytics revenue exclusion | `woocommerce_analytics_revenue_query_args` | `SubscriptionReport` |

Renewal orders carry `_purecart_renewal_for` (subscription ID) and `_purecart_renewal_order = 'yes'`. All order reads/writes go through `wc_get_order()` — never `get_post()` (HPOS requirement, already the convention elsewhere in this codebase). `[RND]`

---

## 5. Webhook Handling

`[nym-RND]` feature doc § 11 — new capability, no equivalent in `[RND]` beyond the renewal-order idempotency guard. `WebhookHandler` (new class, § 1) owns this.

- Verify HMAC signature before parsing any payload.
- Look up the event ID (Stripe: `evt_...`, PayPal: webhook event ID) against `wp_purecart_subscription_logs` — if already processed, return `200 OK` without reprocessing.
- Map the event to a `SubscriptionManager`/`DunningManager` call per the tables in the feature doc § 11.
- On `charge.succeeded` / `PAYMENT.SALE.COMPLETED`, insert into `wp_purecart_subscription_payments` first (the `uniq_transaction` key is the actual idempotency backstop — the log lookup above is a fast-path check).

---

## 6. REST API Endpoints

Merged from `[RND]`'s full list + `[nym-RND]`'s usage-billing endpoint + the webhook endpoint from § 5. All registered by `RestController::register_routes()`, called from `includes/API/RestApi.php` per § 0.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/purecart/v1/subscriptions` | `manage_woocommerce` | List all subscriptions |
| GET | `/purecart/v1/subscriptions/{id}` | `manage_woocommerce` or owner | Get subscription detail |
| POST | `/purecart/v1/subscriptions/{id}/pause` | Customer/Admin | Pause |
| POST | `/purecart/v1/subscriptions/{id}/resume` | Customer/Admin | Resume |
| POST | `/purecart/v1/subscriptions/{id}/cancel` | Customer/Admin | Cancel (immediate or end-of-period) |
| POST | `/purecart/v1/subscriptions/{id}/skip` | Customer/Admin | Skip next renewal |
| POST | `/purecart/v1/subscriptions/{id}/renew` | `manage_woocommerce` | Manual renewal trigger |
| POST | `/purecart/v1/subscriptions/{id}/early-renewal` | Customer/Admin | Early renewal |
| POST | `/purecart/v1/subscriptions/{id}/upgrade` | Customer/Admin | Upgrade/downgrade plan |
| POST | `/purecart/v1/subscriptions/{id}/resubscribe` | Customer/Admin | Resubscribe |
| GET | `/purecart/v1/subscriptions/{id}/logs` | `manage_woocommerce` | Event log |
| GET | `/purecart/v1/subscriptions/{id}/cancellation/reasons` | Public | Cancellation reasons |
| GET | `/purecart/v1/subscriptions/{id}/cancellation/offers` | Customer | Available retention offers |
| POST | `/purecart/v1/subscriptions/{id}/cancellation/accept-offer` | Customer | Accept retention offer |
| POST | `/purecart/v1/subscriptions/{id}/external-renewal` | Server/Webhook | Record gateway-scheduled renewal |
| POST | `/purecart/v1/subscriptions/{id}/webhook-event` | Server/Webhook | **New** `[nym-RND]` — generic inbound gateway event intake, routed by `WebhookHandler` |
| POST | `/purecart/v1/subscriptions/{id}/retry-payment` | `manage_woocommerce` | Manually trigger a retry |
| POST | `/purecart/v1/subscriptions/{id}/send-card-update` | `manage_woocommerce` | Send card update magic link |
| POST | `/purecart/v1/subscriptions/{id}/request-reauth` | `manage_woocommerce` | Trigger SCA reauth email |
| POST | `/purecart/v1/subscriptions/{id}/usage` | Server | **New** `[nym-RND]` — record a usage/metered-billing unit (Phase 2 — see feature doc § 13) |
| GET | `/purecart/v1/subscriptions/revenue-goals` | `manage_woocommerce` | List revenue goals |
| POST | `/purecart/v1/subscriptions/revenue-goals` | `manage_woocommerce` | Create revenue goal |
| DELETE | `/purecart/v1/subscriptions/revenue-goals/{goal_id}` | `manage_woocommerce` | Delete revenue goal |
| POST | `/purecart/v1/subscriptions/{id}/membership/change-tier` | `manage_woocommerce` | Change membership tier |
| POST | `/purecart/v1/subscriptions/{id}/membership/set-grace-period` | `manage_woocommerce` | Set/extend grace period |
| POST | `/purecart/v1/subscriptions/{id}/membership/sync-role` | `manage_woocommerce` | Force role re-sync |
| POST | `/purecart/v1/subscriptions/{id}/downloads/reset-quota` | `manage_woocommerce` | Reset download counter |
| POST | `/purecart/v1/subscriptions/{id}/downloads/trigger-drip` | `manage_woocommerce` | Manually trigger drip delivery |
| POST | `/purecart/v1/subscriptions/{id}/courses/extend-access` | `manage_woocommerce` | Extend course access |
| POST | `/purecart/v1/subscriptions/{id}/courses/revoke` | `manage_woocommerce` | Revoke LMS enrollments |
| POST | `/purecart/v1/subscriptions/{id}/service/complete-deliverable` | `manage_woocommerce` | Mark deliverable complete |
| POST | `/purecart/v1/subscriptions/{id}/service/send-invoice` | `manage_woocommerce` | Send invoice for current cycle |
| GET | `/purecart/v1/subscriptions/report/summary` | `manage_woocommerce` | MRR/ARR/churn/status counts `[dev-plan]` |
| GET | `/purecart/v1/subscriptions/report/export` | `manage_woocommerce` | CSV export `[dev-plan]` |

---

## 7. Frontend Architecture

`[RND-FE]` — this is the accurate lineage (§0). Not `[dev-plan-FE]`.

| Concern | Choice |
|---|---|
| Framework | React 18, TypeScript, strict mode |
| Styling | Tailwind utility classes + inline M3 token styles |
| Design tokens | M3 object (`static-data.tsx`) — already used across every other module page |
| Charts | Recharts |
| Routing | `useState<Page>` in `App.tsx` — no React Router |
| Icons | `lucide-react` |
| State | Local `useState` per page, no global store |
| API | Not yet wired — currently static data in `utils/static-data.tsx`, to be wired to § 6's REST endpoints |

**Existing code, verified real:** `src/app/components/Subscriptions/SubscriptionsPage.tsx` already exists and matches `[RND-FE]`'s documented "Current Component Inventory" (§ 2.2), including its known bugs (`[RND-FE]` § 17):
- Duplicate "Product" column (customer+product stacked in col 3, product repeated alone in col 4)
- `isPastDue` row highlight loses selection state on hover-out
- `SettingsPage` has no "Subscriptions" tab yet

**File placement, following the existing sibling-module pattern** (`Affiliates/AffiliatesPage.tsx` + `Analytics/AbandonedCartAnalyticsPage.tsx` split):

```
src/app/components/Subscriptions/
├── SubscriptionsPage.tsx          ← exists, needs the extensions in § 8
├── SubscriptionDetailPage.tsx     ← new
└── index.ts

src/app/components/Analytics/
└── SubscriptionAnalyticsPage.tsx  ← new — analytics pages live under Analytics/, not their own module folder
```

Full TypeScript data shapes, component specs, modal specs, and settings-tab layout are all in `[RND-FE]` (§§ 3–12) and don't need correction — reproduced there in complete, buildable detail. This doc doesn't duplicate them; treat `RND-subscriptions-frontend.md` as the frontend implementation reference and this doc as the sequencing/testing plan around it (§ 9).

---

## 8. Email System

Build in the phases from feature doc § 22. MVP set (16, from `[dev-plan]`) ships first; the rest ship alongside their corresponding feature. All registered by `SubscriptionEmail::register()` on `woocommerce_email_classes`, namespace `PureCart\Subscriptions\Emails\`.

---

## 9. Backend Step-by-Step Dev Plan

Adapted from `[dev-plan]`'s 15-step structure and testing discipline — corrected to `purecart_` naming, `includes/Subscriptions/` flat paths, `PureCart\Subscriptions\` namespacing, and expanded to cover the features `[dev-plan]` didn't scope (churn scoring, LTV, split payments, retention eligibility rules, delivery registry, webhooks) since those are now confirmed in-scope by the feature doc.

**Workflow (`[dev-plan]`'s "নিয়ম", kept as-is):** after each step, a manual test checklist is run; once it passes, get permission before starting the next step.

### Step 1 — Database Schema & Migration
Create all 6 tables from § 2 (`wp_purecart_subscriptions`, `_linked_entities`, `_logs`, `_payments`, `_items`, `_revenue`, `_revenue_goals` — 7 total) via `includes/Subscriptions/Schema.php`, wired into the plugin's existing migrator. Add `purecart_sub_*` option constants and `_purecart_sub_*` meta key constants.
- [ ] Plugin activates with no fatal error
- [ ] All 7 tables exist with correct columns + indexes (phpMyAdmin check)
- [ ] Deactivate → reactivate is idempotent (dbDelta-safe)

### Step 2 — SubscriptionsModule Bootstrap
`includes/Subscriptions/Module.php` — registers with the plugin's existing module system (mirrors how Licensing/SaaS bootstrap), admin submenu entry under the PureCart menu (not "Digital Downloads" — `[dev-plan]`'s menu location was wrong per § 0), settings REST route.
- [ ] "Subscriptions" appears under the PureCart admin menu
- [ ] Module enable/disable toggle works without PHP errors

### Step 3 — Subscription Product Type + Delivery Type Registry
`SubscriptionProduct` (product type registration, meta save) + `DeliveryHandlerRegistry` (§ 3) with the four native handlers (membership/download/course/service) stubbed, and `DeliveryManager` wired to call `PureCart\Licensing\LicenseActivator` / `PureCart\SaaS\AccountProvisioner` directly for `software`/`saas`.
- [ ] "Subscription" appears in the WC product type dropdown
- [ ] Product meta saves correctly, including `delivery_type`
- [ ] Registering a handler via `purecart_subscription_delivery_handlers` filter works end-to-end for a test type

### Step 4 — SubscriptionRepository + SubscriptionLogRepository + PaymentRepository
Repository classes for all 3 core tables (payments repository is new vs. `[dev-plan]`, needed for § 2's new ledger table). All queries via `$wpdb->prepare()`.
- [ ] Create/find/update/log methods all work against real tables
- [ ] `find_due_renewals()` correctly filters by `next_payment_at <= NOW()`

### Step 5 — SubscriptionManager (Core Lifecycle)
Create-from-order, pause, resume, cancel (immediate + pending), expire, resubscribe (both paths from feature doc § 5 — same-record reactivation within window, new-record + `previous_subscription_id` after).
- [ ] Order completion creates a subscription record with correct status/dates
- [ ] `_purecart_trial_used_{product_id}` blocks repeat trials
- [ ] Resubscribe within window reactivates the same record; after window creates a new one linked via `previous_subscription_id`
- [ ] Idempotent — duplicate hook firing doesn't create duplicate records

### Step 6 — RenewalEngine (Action Scheduler)
Idempotency guard, zero-total handling, staging block, gateway-scheduled-payment detection, stepped pricing, external renewal recording — all from `[RND]` § 5 and § "Renewal Methods", unchanged, just namespaced correctly.
- [ ] Scheduled renewal fires at `next_payment_at`
- [ ] Idempotency guard prevents double-charging on retry
- [ ] Zero-total renewals never route through a gateway
- [ ] Staging filter blocks renewals when returning `false`

### Step 7 — DunningManager
Grace-period flow (feature doc § 7) + hard/soft decline targeting `[nym-RND]` + one-click magic-link card updater `[nym-RND]`.
- [ ] Failed charge → `past_due`, retry scheduled per configured intervals
- [ ] Hard-decline reason codes skip retry scheduling entirely
- [ ] Magic link updates card without login and triggers an immediate retry
- [ ] Active grace exhausted → `suspended`; suspended grace exhausted → `cancelled`

### Step 8 — ChurnScorer + Customer LTV
New vs. `[dev-plan]` — `[dev-plan]` didn't scope this, but it's confirmed in-scope (feature doc § 9). Score deltas + bands from feature doc § 9; LTV formula (`[RND]`'s projected version for MVP, `[nym-RND]`'s paid-history blend noted as a v2 refinement).
- [ ] Score updates correctly on payment success/failure/cancel/skip/pause
- [ ] Band boundaries (25/50/75) match the admin list color coding
- [ ] LTV recalculates on plan change

### Step 9 — RetentionFlow
5 offer types + eligibility rules (feature doc § 6) + downgrade-as-retention-offer via `pending_switch_product`.
- [ ] Cancel request returns eligible offers matched to the selected reason
- [ ] Eligibility rules (age/value/LTV/remaining-days) correctly filter offers
- [ ] Accepted downgrade applies at next renewal, not immediately
- [ ] One-time-use guard prevents repeat discount offers

### Step 10 — PlanUpgrade (Proration)
3 modes from feature doc § 3, unchanged from `[RND]`.
- [ ] `prorate_immediately` charges the correct prorated amount
- [ ] `apply_at_renewal` charges nothing today, applies at next renewal
- [ ] `no_proration` switches immediately at full new price

### Step 11 — SplitPaymentManager
New vs. `[dev-plan]` — installment tracking, 3 access-timing modes, completion detection (feature doc § 3).
- [ ] Each installment increments `renewal_count`; hitting `max_payments` sets status `completed`
- [ ] `access_timing = after_full_payment` withholds provisioning until completion

### Step 12 — REST API + WebhookHandler
`RestController` (§ 6) registered via `includes/API/RestApi.php`, plus `WebhookHandler` (§ 5) with Stripe/PayPal event mapping and idempotency against `wp_purecart_subscription_payments.transaction_id`.
- [ ] All endpoints from § 6 respond correctly with proper permission checks
- [ ] Customer isolation enforced (owner-only access to their own subscription)
- [ ] Duplicate webhook event ID returns 200 without reprocessing
- [ ] `charge.dispute.created` flags the subscription without crashing the handler

### Step 13 — Email Classes (16 MVP + registration system)
`SubscriptionEmail` registry + the 16 MVP emails from feature doc § 22, built so the remaining ~21 can be added later without touching the registry.
- [ ] All 16 appear in WooCommerce → Settings → Emails, individually toggleable
- [ ] Placeholders resolve correctly
- [ ] Card-expiry and reauth emails (§ 10, § 7) are wired even though they're outside the MVP-16, since Steps 7–8 depend on them existing

### Step 14 — RoleManager + RenewalSync + Subscription Coupons
Role assignment on status transitions, calendar-date renewal sync with proration, sign-up-fee/recurring coupon types, mixed-cart validation (feature doc § 20).
- [ ] Role assigned/removed correctly across trial → active → cancelled transitions
- [ ] Renewal sync produces the correct prorated first charge
- [ ] Both coupon types apply correctly and stop at the configured cycle count

### Step 15 — SubscriptionReport (Data + CSV)
MRR/ARR/churn-rate/trial-conversion aggregation (feature doc § 8 formulas), retention stats, CSV export.
- [ ] Summary endpoint returns correct counts and MRR for known test data
- [ ] CSV export includes all required columns

### Step 16 — Final Integration Test
Licensing/SaaS integration verification, security audit (nonce/auth on every endpoint, customer isolation, prepared statements only, HPOS-safe order access via `wc_get_order()` never `get_post()`), full lifecycle walkthroughs.
- [ ] Renewal → license expiry extended; suspend → license suspended; cancel → license valid until natural expiry
- [ ] Renewal → SaaS account activated; suspend/cancel → SaaS suspended per `cancel_saas_immediately` setting
- [ ] Full lifecycle paths all pass: buy→renew, buy→fail→retry→active, buy→fail→suspend→cancel, buy→pause→resume, buy→upgrade, buy→cancel-with-retention-accept, buy→cancel-decline
- [ ] Customer A cannot access Customer B's subscription via REST
- [ ] SQL injection probes rejected by `prepare()`

---

## 10. Frontend Step-by-Step Dev Plan

Adapted from `[RND-FE]` § 15's roadmap (the accurate tech-stack lineage) merged with `[dev-plan-FE]`'s customer-portal/settings/email-template steps and its per-step manual-test discipline — corrected to the real Tailwind/M3/Recharts stack and the real file locations from § 7.

### Phase 1 — Table & data model fixes (no new pages)
Backend prerequisite: Step 4–5. Extend `SubscriptionRecord`, add `deliveryType`/`linkedEntity` fields, fix the duplicate-Product-column bug (`[RND-FE]` § 17), add `ChurnScoreBadge`/`InstallmentProgress`/`CardExpiryWarning`/`SubscriptionTypeBadge` components, expand KPI strip 4→6 cards, add Type/Churn Risk/Payment Type filter chips.
- [ ] Table renders without the duplicate Product column
- [ ] All 6 delivery types show correct type badge + linked-entity column content
- [ ] New status values (`pending_cancel`, `pending_reauth`, `completed`, `expired`, `suspended`) render correctly in `StatusBadge`

### Phase 2 — New modals
Backend prerequisite: Step 6, 9, 10, 11. 3-step `CancellationFlowModal` (replacing the current single confirm dialog), Early Renewal, Skip Cycle, Pause-with-duration, Change-Plan timing toggle, SCA Reauthorization modal.
- [ ] Cancellation flow correctly shows offers matched to the selected reason (live REST call)
- [ ] Retention offer accept/decline both work and update subscription state
- [ ] Reauth modal sends the email and shows the correct grace-period copy

### Phase 3 — Subscription Detail page
Backend prerequisite: Step 12, 13. New `SubscriptionDetailPage.tsx` at `src/app/components/Subscriptions/` (§ 7). Tabs: Overview, Payment Log, Status History, Emails Sent, Retention, plus a type-specific tab (License/Account/Access/Downloads/Courses/Deliverables) rendered by `deliveryType`.
- [ ] All tabs load real data once wired to REST (or static data matching the real shape in the interim)
- [ ] Type-specific tab renders correctly for all 6 delivery types
- [ ] Churn gauge and LTV card match the backend's computed values

### Phase 4 — Analytics extensions
Backend prerequisite: Step 8, 15. `SubscriptionAnalyticsPage.tsx` at `src/app/components/Analytics/` (§ 7, not under `Subscriptions/`). MRR/ARR trend chart, dunning funnel, subscription-mix-by-type pie chart, revenue-by-type bar chart, churn-by-reason pie chart, Revenue Goals widget, extended Churn Risk table.
- [ ] Charts render from real aggregated data matching § 9's formulas
- [ ] Revenue goal cards show correct progress percentage

### Phase 5 — Settings tab
Backend prerequisite: Step 2, 7, 9, 14. Add `'Subscriptions'` to `SETTINGS_TABS` (currently missing per `[RND-FE]` § 17), build all sections from `[RND-FE]` § 11 (General, Billing & Dunning, Renewals, Upgrade/Downgrade, Retention, Customer Portal, Role Mapping, Subscribe & Save, Advanced, Revenue Goals) plus the 4 delivery-type-specific sections (§ 4 of the feature doc).
- [ ] All settings persist correctly and reflect on reload
- [ ] Type-specific sections only render when a product of that type exists

### Phase 6 — Customer portal & cancellation UI
Backend prerequisite: Step 5, 9, 10. Server-rendered PHP templates in WooCommerce My Account (`[RND]` §"Customer My Account Portal" — this part is **not** React, it's PHP + AJAX, correctly scoped that way in both `[RND]` and `[dev-plan-FE]`). Subscriptions list, single subscription detail, change-plan UI, 3-step cancellation/retention flow.
- [ ] My Account → Subscriptions tab lists all of a customer's subscriptions with correct status
- [ ] Self-service actions (pause/resume/skip/cancel/upgrade) all respect the `purecart_sub_allow_*` settings
- [ ] Cancellation flow matches the admin-side retention flow logic exactly (same offers, same eligibility rules)

### Phase 7 — Email HTML templates
Backend prerequisite: Step 13. All 16 MVP templates, WooCommerce header/footer wrapped, responsive, plain-text versions.
- [ ] All 16 preview correctly in WooCommerce → Settings → Emails → Preview
- [ ] Mobile rendering (320px) has no horizontal scroll
- [ ] Placeholders resolve with real data

### Phase 8 — Customer profile integration
Backend prerequisite: none new. Extend the existing `CustomerDetailPage` subscriptions tab with churn score + LTV columns, wire "View Subscription Detail" navigation to Phase 3's page.
- [ ] Churn score and LTV display correctly per subscription row

---

## 11. Design Consistency Rules

Unchanged from `[RND-FE]` § 18 — these already reflect the real app's conventions and don't need correction:
- All new modals: `rounded-3xl`, `M3.surfaceContainer` background, `boxShadow: '0 8px 32px rgba(0,0,0,0.24)'`
- Modal headers: centered icon in a 48×48 colored circle
- Table headers: `text-xs font-medium uppercase`, `letterSpacing 0.5px`, `M3.onSurfaceVariant`
- Mono values (IDs, amounts, dates): `Roboto Mono`
- Danger actions always route through `ConfirmDialog` or a multi-step modal, never fire directly
- Always call `showToast()` after a mutation
- Settings fields always use `SettingsField`/`SettingsToggleField`/`SettingsSelectField`/`SettingsSectionHeader` — never a raw `<input>`
- No new external libraries — Recharts, `lucide-react`, and inline M3-token styles only

---

## 12. Progress Tracker

| # | Backend step | Frontend phase | Status |
|---|---|---|---|
| 1 | Database Schema & Migration | — | ⬜ Not Started |
| 2 | Module Bootstrap | — | ⬜ Not Started |
| 3 | Product Type + Delivery Registry | — | ⬜ Not Started |
| 4 | Repositories | — | ⬜ Not Started |
| 5 | SubscriptionManager (lifecycle) | — | ⬜ Not Started |
| 6 | RenewalEngine | — | ⬜ Not Started |
| 7 | DunningManager | — | ⬜ Not Started |
| 8 | ChurnScorer + LTV | — | ⬜ Not Started |
| 9 | RetentionFlow | — | ⬜ Not Started |
| 10 | PlanUpgrade | — | ⬜ Not Started |
| 11 | SplitPaymentManager | — | ⬜ Not Started |
| 12 | REST API + WebhookHandler | — | ⬜ Not Started |
| 13 | Email classes (16 MVP) | — | ⬜ Not Started |
| 14 | RoleManager + RenewalSync + Coupons | — | ⬜ Not Started |
| 15 | SubscriptionReport | — | ⬜ Not Started |
| 16 | Final Integration Test | — | ⬜ Not Started |
| — | Phase 1 | Table & data model fixes | ⬜ Not Started |
| — | Phase 2 | New modals | ⬜ Not Started |
| — | Phase 3 | Subscription Detail page | ⬜ Not Started |
| — | Phase 4 | Analytics extensions | ⬜ Not Started |
| — | Phase 5 | Settings tab | ⬜ Not Started |
| — | Phase 6 | Customer portal & cancellation UI | ⬜ Not Started |
| — | Phase 7 | Email HTML templates | ⬜ Not Started |
| — | Phase 8 | Customer profile integration | ⬜ Not Started |

**Icons:** ⬜ Not Started · 🔄 In Progress · ✅ Complete · ❌ Blocked
