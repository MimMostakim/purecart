# RND — License Key Management Module
**Plugin:** purecart
**Module:** Licensing
**Phase:** 1 (MVP)
**Standalone:** Yes — works with any WooCommerce product

---

## Overview

The Licensing module generates cryptographically random license keys on order completion, tracks which domains have activated each key, enforces activation limits, and provides a REST API for your plugin to validate licenses at runtime. It includes a remote kill-switch for instant revocation and automatic staging/localhost exemption so developer environments don't consume activation slots.

### Problem It Solves
- WooCommerce has no concept of software licenses
- EDD's Software Licensing costs $199/yr
- WC Serial Numbers requires pre-generating keys and importing them manually
- DLM and LMFWC store encryption secrets in files — permanent data loss if files are lost
- No existing free WooCommerce solution tracks domain-level activations with staging exemption

---

## Standalone Usage

Enable this module alone to:
- Generate license keys for any WooCommerce product
- Track domain activations via REST API calls from your plugin
- Enforce per-site activation limits (e.g., "use on up to 3 sites")
- Exempt staging and local environments from activation limits
- Revoke licenses instantly via admin or REST API

The Plugin Updates module is optional — you can issue license keys without providing update delivery.

---

## Architecture

### Classes

| Class | File | Responsibility |
|---|---|---|
| `LicenseGenerator` | `includes/Licensing/LicenseGenerator.php` | Create keys, store in DB |
| `LicenseActivator` | `includes/Licensing/LicenseActivator.php` | Activate/deactivate domains, check limits |
| `LicenseValidator` | `includes/Licensing/LicenseValidator.php` | Validate key + return plan features |
| `LicenseExpiry` | `includes/Licensing/LicenseExpiry.php` | Cron-based expiry enforcement |
| `LicenseRevoke` | `includes/Licensing/LicenseRevoke.php` | Instant kill-switch |
| `LicenseCertificate` | `includes/Licensing/LicenseCertificate.php` | Generate PDF license certificate (Phase 3) |
| `LicenseMigrator` | `includes/Licensing/LicenseMigrator.php` | Import licenses from DLM or WC Serial Numbers (Phase 3) |

### License Key Format

```
XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX
```

40 hex chars split into 5 groups of 8, joined by hyphens.

```php
// LicenseGenerator::generate_key()
$raw = strtoupper( bin2hex( random_bytes( 20 ) ) ); // 40 hex chars
return implode( '-', str_split( $raw, 8 ) );
// Example: A1B2C3D4-E5F6A7B8-C9D0E1F2-A3B4C5D6-E7F8A9B0
```

### Activation Flow

```
Customer's plugin calls: POST /wp-json/purecart/v1/license/activate
    Body: { license_key, domain, environment }
    │
    └── LicenseActivator::activate()
            ├── get_by_key(license_key)           → 404 if not found
            ├── check status === 'active'          → 403 if revoked/expired/suspended
            ├── is_staging_or_local(domain)        → skip limit check if true
            ├── check activated_count < limit      → 403 if exceeded
            ├── INSERT wp_purecart_license_activations  → record domain + IP
            ├── UPDATE wp_purecart_licenses activated_count++
            └── return { success: true, data: { expiry, plan_type, activations_remaining } }
```

---

## Database Tables

### wp_purecart_licenses — License Registry
```sql
CREATE TABLE wp_purecart_licenses (
    id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_id         BIGINT UNSIGNED NOT NULL,
    user_id          BIGINT UNSIGNED NOT NULL,
    product_id       BIGINT UNSIGNED NOT NULL,
    license_key      VARCHAR(64) NOT NULL UNIQUE,
    plan_type        ENUM('single','multi','unlimited','lifetime') DEFAULT 'single',
    status           ENUM('active','expired','revoked','suspended') DEFAULT 'active',
    activation_limit INT UNSIGNED DEFAULT 1,
    activated_count  INT UNSIGNED DEFAULT 0,
    expires_at       DATETIME NULL,   -- NULL = lifetime
    created_at       DATETIME NOT NULL,
    updated_at       DATETIME NOT NULL,
    PRIMARY KEY (id),
    KEY idx_license_key (license_key),
    KEY idx_user_id (user_id),
    KEY idx_order_id (order_id),
    KEY idx_status (status),
    KEY idx_expires_at (expires_at)
);
```

### wp_purecart_license_activations — Domain Activation Records
```sql
CREATE TABLE wp_purecart_license_activations (
    id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    license_id   BIGINT UNSIGNED NOT NULL,
    domain       VARCHAR(255) NOT NULL,
    ip_address   VARCHAR(45),
    environment  ENUM('production','staging','local') DEFAULT 'production',
    activated_at DATETIME NOT NULL,
    last_check   DATETIME,            -- updated on each /license/check call
    PRIMARY KEY (id),
    KEY idx_license_id (license_id),
    KEY idx_domain (domain),
    UNIQUE KEY idx_license_domain (license_id, domain)
);
```

---

## REST API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/purecart/v1/license/activate` | License key | Activate key on a domain |
| `POST` | `/purecart/v1/license/deactivate` | License key | Remove a domain activation |
| `GET` | `/purecart/v1/license/check` | License key | Validate key, return plan info |
| `POST` | `/purecart/v1/license/revoke` | manage_woocommerce | Instantly revoke a license (admin) |

### Request / Response Examples

**Activate:**
```json
POST /wp-json/purecart/v1/license/activate
{
  "license_key": "A1B2C3D4-E5F6A7B8-C9D0E1F2-A3B4C5D6-E7F8A9B0",
  "domain": "example.com",
  "environment": "production"
}

Response 200:
{
  "success": true,
  "message": "License activated successfully.",
  "data": {
    "expires_at": "2027-06-24 00:00:00",
    "plan_type": "single",
    "activation_limit": 1,
    "activations_remaining": 0
  }
}
```

**Check:**
```json
GET /wp-json/purecart/v1/license/check?license_key=...&domain=example.com

Response 200:
{
  "success": true,
  "data": {
    "status": "active",
    "plan_type": "multi",
    "expires_at": "2027-06-24 00:00:00",
    "is_lifetime": false,
    "activated_count": 2,
    "activation_limit": 5
  }
}
```

---

## Plan Types

| Plan Type | Activation Limit | Expiry |
|---|---|---|
| `single` | 1 site | Based on `_purecart_license_duration_days` product meta |
| `multi` | Configured per product | Same |
| `unlimited` | No limit enforced | Same |
| `lifetime` | Configured per product | Never expires (expires_at = NULL) |

---

## Staging / Localhost Exemption

Domains matching these patterns are automatically classified as `local` or `staging` environment and **do not count against the activation limit**:

```php
$exempt_patterns = [
    'localhost',
    '127.0.0.1',
    '::1',
    '.local',
    '.test',
    '.staging.',
    'staging.',
    '.dev',
];
```

Environment is still recorded in `wp_purecart_license_activations` with `environment = 'local'` or `'staging'` for audit purposes.

---

## License Expiry (Cron)

`LicenseExpiry` hooks into WP-Cron via Action Scheduler:

```php
// Scheduled daily via Activator::activate()
add_action( 'purecart_check_expired_licenses', [ LicenseExpiry::class, 'run' ] );
```

On each run:
1. `SELECT * FROM wp_purecart_licenses WHERE status = 'active' AND expires_at < NOW()`
2. Bulk-update `status = 'expired'`
3. Fire `do_action( 'purecart_licenses_expired', $expired_ids )` — Subscriptions module listens to this

---

## Remote Kill-Switch (Revocation)

```php
POST /wp-json/purecart/v1/license/revoke
Authorization: WordPress nonce (manage_woocommerce required)
{
  "license_key": "A1B2C3D4-..."
}
```

- Sets `status = 'revoked'` in `wp_purecart_licenses`
- Does NOT delete activation records (audit trail preserved)
- Next call to `/license/check` from the customer's site returns `{ success: false, code: 'license_revoked' }`
- Customer's plugin should respond by deactivating features or showing upgrade notice

---

## Migration Tool (Phase 3)

`LicenseMigrator` provides a WP-CLI command and admin UI to import existing licenses:

```bash
wp purecart license migrate --from=dlm --dry-run
wp purecart license migrate --from=wc-serial-numbers
wp purecart license migrate --from=lmfwc
```

Imports:
- License keys (preserved as-is)
- Activation records (domain + environment)
- Order and user associations
- Status (active/expired/revoked)

Supported sources: Digital License Manager (DLM), WC Serial Numbers, License Manager for WooCommerce (LMFWC).

**Note on LMFWC migration:** LMFWC encrypts keys using two disk-stored secret files (`defuse.txt`, `secret.txt`). The migration tool requires those files to be present and readable to decrypt keys before re-storing them in ADD's format. If the files are missing, keys are unrecoverable — document this prominently.

---

## Order Item Meta

When a license is created for an order item, the license ID is stored as order item meta:

```php
wc_add_order_item_meta( $item_id, '_purecart_license_id', $license_id );
```

This makes the license accessible from the order item in admin and via WC REST API without an extra query.

---

## Product Meta Fields

Set via WDD meta box on each WooCommerce product:

| Meta Key | Type | Description |
|---|---|---|
| `_purecart_license_type` | string | `single`, `multi`, `unlimited`, `lifetime` |
| `_purecart_activation_limit` | int | Max domains (ignored for `unlimited`) |
| `_purecart_license_duration_days` | int | Days until expiry; empty = lifetime |
| `_purecart_plugin_slug` | string | Plugin slug (used by Update module) |
| `_purecart_license_certificate` | bool | Show PDF certificate download button in My Account |
| `_purecart_renewal_behavior` | string | `extend` (default) or `new_key` — controls what happens to the license on subscription renewal |

---

## My Account Integration

The Licenses tab (`/my-account/purecart-licenses/`) shows:
- Product name
- License key — displayed blurred by default; click to reveal (prevents shoulder-surfing)
- Copy-to-clipboard button next to revealed key (JS clipboard API with fallback)
- Status badge (active / expired / revoked / suspended)
- Sites used / limit (or ∞ for unlimited)
- Expiry date (or "Lifetime")
- **Manual activation row:** Customer can enter a domain URL and click "Activate" directly from My Account — no plugin install required for simple use cases
- **Download PDF Certificate** button (Phase 3 — when `LicenseCertificate` is enabled)

### Manual Activation from My Account

```
Customer enters domain in My Account → POST to /purecart/v1/license/activate
    Same flow as plugin-initiated activation
    Domain and environment auto-detected from submitted URL
    Result shown inline: "Activated on example.com (2 of 5 sites used)"
```

### License Key Reveal (UX)

```html
<!-- Blurred by default -->
<code class="wdd-license-key wdd-license-key--hidden" data-key="XXXX-XXXX-XXXX-XXXX-XXXX">
    ████-████-████-████-████
</code>
<button class="wdd-reveal-key">Click to reveal</button>
<button class="wdd-copy-key" style="display:none">Copy</button>
```

JS toggles `wdd-license-key--hidden` class on reveal click. Copy button uses `navigator.clipboard.writeText()` with a `document.execCommand('copy')` fallback.

---

## Developer Hooks

```php
// Fired after license key is created
do_action( 'purecart_license_created', $license_id, $order_id, $product_id );

// Before activation — return WP_Error to reject
apply_filters( 'purecart_pre_license_activate', null, $license_key, $domain );

// After activation
do_action( 'purecart_license_activated', $license_id, $domain, $environment );

// After deactivation
do_action( 'purecart_license_deactivated', $license_id, $domain );

// After revocation
do_action( 'purecart_license_revoked', $license_id );

// After expiry batch run
do_action( 'purecart_licenses_expired', $expired_license_ids );

// Filter staging/local exempt patterns
apply_filters( 'purecart_staging_exempt_patterns', $patterns );

// Filter renewal behavior (override product meta)
apply_filters( 'add_license_renewal_behavior', $behavior, $license_id, $subscription_id );

// After past-order retroactive key generation
do_action( 'add_license_past_order_generated', $license_id, $order_id, $product_id );
```

---

## Additional REST Endpoints

Beyond the four core endpoints, the Licensing module also exposes:

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/add/v1/license/ping` | None | Lightweight connection test — returns `{ status: 'ok', timestamp }`. Does not consume an activation or validate a key. Used by remote plugins to verify server reachability. |
| `GET` | `/add/v1/license/check?user_id={id}` | manage_woocommerce | Return all licenses for a customer (admin/server-to-server use). |

---

## Subscription Renewal Behavior

When a subscription renews, PureCart supports two configurable modes controlled by `_purecart_renewal_behavior` product meta:

| Value | Behavior |
|---|---|
| `extend` (default) | Extend the existing license key's `expires_at` by the subscription period. Customer keeps the same key. |
| `new_key` | Generate a brand-new license key on each renewal. Old key is marked `revoked`. Useful for metered/seat-limited models. |

This setting is configurable per product in the ADD meta box.

---

## Multi-Quantity Key Delivery

When a customer purchases an `add_plugin` product with qty > 1, `OrderHandler` generates one license key per unit:

```php
// In OrderHandler::add_provision_license()
$quantity = $item->get_quantity();
for ( $i = 0; $i < $quantity; $i++ ) {
    $license_id = LicenseGenerator::create( [...] );
    wc_add_order_item_meta( $item_id, '_purecart_license_id_' . $i, $license_id );
}
```

All generated keys are delivered in the order confirmation email and listed in the My Account Licenses tab grouped by order.

---

## Delivery Order Status Setting

Option: `add_license_delivery_status` (admin Settings → Licensing)

| Value | Trigger |
|---|---|
| `completed` (default) | `woocommerce_order_status_completed` |
| `processing` | `woocommerce_order_status_processing` |
| `both` | Both hooks, idempotent (won't re-issue if already provisioned) |

---

## Past-Order Retroactive Key Generation

An admin tool under **ADD → Licenses → Tools** lets store owners generate license keys for historical orders that predate the plugin installation. Useful for merchants migrating from manual key delivery or another system.

- Filters by product, date range, and order status
- Dry-run mode shows what would be generated
- Skips orders that already have PureCart license meta
- WP-CLI equivalent: `wp purecart license generate-past-orders --product-id=123 --dry-run`

---

## Competitor Comparison

| Feature | WC Serial Numbers (free) | EDD Software Licensing ($199/yr) | Digital License Manager (DLM) | License Manager for WooCommerce (LMFWC) | purecart |
|---|---|---|---|---|---|
| Key generation | Import required (auto-gen = Pro) | Yes | Yes (dynamic) | Yes (generator) | **Yes (random_bytes, dynamic)** |
| Safe crypto storage | — | Yes | Partial | **No — file loss = permanent loss** | **Yes — no static files** |
| Domain activation tracking | Basic via API | Yes | Yes | Yes | **Yes, per-domain DB record** |
| Staging/localhost exemption | No | Basic | No | **No** | **Yes, pattern-based** |
| Activation limit enforcement | Yes | Yes | Yes | Yes | **Yes** |
| Remote kill-switch | No | Yes | Yes | No | **Yes** |
| Lifetime licenses | No | Yes | Yes | Yes | **Yes** |
| Multi-site plans | Partial | Yes | Yes | Yes | **Yes** |
| Multi-qty key delivery | No | No | No | **Yes (free)** | **Yes** |
| Delivery on processing status | No | No | No | **Yes (free)** | **Yes (configurable)** |
| Past-order key generation | No | No | No | **Yes (free)** | **Yes (admin tool)** |
| Ping endpoint | No | No | No | Pro | **Yes (free)** |
| QR code activation | No | No | No | Pro | **Roadmap P3** |
| New key vs extend on renewal | No | No | No | Pro | **Yes (`_purecart_renewal_behavior`)** |
| REST API | Yes | Yes | Yes | Yes | **Yes** |
| WooCommerce native | Yes | No (EDD only) | Yes | Yes | **Yes** |
| Plugin Update delivery | No | Yes (add-on) | No | Pro only | **Yes (separate module)** |
| PDF license certificate | No | No | Yes (free) | **Yes (free)** | **Yes (Phase 3)** |
| License reveal (blur/click) | No | No | Yes | **Yes (free)** | **Yes** |
| Copy-to-clipboard | No | No | Yes | **Yes (free)** | **Yes** |
| My Account manual activation | No | No | Yes (free) | **Yes (free)** | **Yes** |
| Migration tool | No | No | No | Yes (from DLM) | **Yes (DLM + WC SN + LMFWC)** |
| HPOS compatible | Yes | No | Partial | **Yes** | **Yes** |
| Price | Free + Pro | $199/yr | Free + Pro | Free + Pro | **Included in ADD** |
