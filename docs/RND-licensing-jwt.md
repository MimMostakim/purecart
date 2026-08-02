# RND — License System + JWT Token Authentication
**Plugin:** purecart  
**Modules:** Licensing (JWT layer)  
**Phase:** 1 (core JWT) · Phase 2 (RS256, public-key distribution)  
**Depends on:** `RND-licensing.md` — read that first for the base license system

---

## Overview

PureCart's licensing module generates and validates license keys. This document adds a JWT token layer on top of it.

**The problem with polling:**  
Every time a customer's plugin boots, it calls `/license/check` to verify the license. A store with 10,000 active installs generates 10,000 HTTP requests per day minimum. This hammers the server, slows customer sites, and makes license validation a network-dependent operation.

**The JWT solution:**  
On activation, PureCart issues a short-lived JWT that the customer plugin caches locally. The plugin validates the JWT *cryptographically* on each boot — no network call. The plugin only phones home to refresh the token when it nears expiry (once every 7 days by default). Revocation is enforced at refresh time, giving the store owner a ~7-day revocation window, which is acceptable for most commercial plugins.

**Scope distinction:**  
The JWT plugins benchmarked in this document (jwt-authentication-for-wp-rest-api, Simple JWT Login, etc.) authenticate *WordPress users* calling the WP REST API. PureCart's JWT layer is different — it authenticates *remote plugin installations* calling the license API. The two systems do not conflict and can coexist on the same WordPress install.

---

## Installed Plugins Audit

The following plugins were found in `wp-content/plugins/`:

| Plugin | Slug | Installed | Notes |
|---|---|---|---|
| WC Key Manager | `wc-key-manager` | ✅ v1.3.9 | WC-native license key delivery |
| WRC Pricing Tables | `wrc-pricing-tables` | ✅ v2.7.1 | **Not a license manager** — pricing display tables only |
| Lemon Squeezy | `lemon-squeezy` | ✅ v1.4.3 | External SaaS merchant-of-record; WP plugin is a checkout connector |
| JWT Auth (tmeister) | `jwt-authentication-for-wp-rest-api` | ✅ v1.5.0 | WP user JWT auth for REST API |
| JWT Auth (usefulteam) | `jwt-auth` | ✅ v3.0.2 | WP user JWT auth, refresh tokens, last updated 2 years ago |
| CoCart JWT Auth | `cocart-jwt-authentication` | ✅ v3.0.3 | JWT auth for CoCart headless API only |
| Software License Manager | `software-license-manager` | ❌ not installed | Referenced for research only |
| Simple JWT Login | `simple-jwt-login` | ❌ not installed | Referenced for research only |
| WP REST API Authentication | `wp-rest-api-authentication` | ❌ not installed | Referenced for research only |
| JSON API Auth | `json-api-auth` | ❌ not installed | Referenced for research only; legacy/deprecated |
| WP OAuth Server | `oauth2-provider` | ❌ not installed | Referenced for research only |

> **WRC Pricing Tables note:** This plugin renders frontend pricing comparison tables via shortcode. It has no license key generation, activation API, or WooCommerce order hooks. It is listed here because it was included in the research request, but it is not a licensing competitor and is excluded from the licensing comparison matrix below. It may be useful as a reference for building PureCart's pricing plan display UI.

---

## Architecture

### How the JWT Layer Fits

```
PureCart License Module (existing)
    ├── LicenseGenerator       — create keys
    ├── LicenseActivator       — activate domains
    ├── LicenseValidator       — validate status
    ├── LicenseExpiry          — expire via Action Scheduler
    └── LicenseRevoke          — kill-switch

PureCart JWT Layer (new)
    ├── LicenseTokenIssuer     — sign + issue JWT on activation
    ├── LicenseTokenRefresher  — rotate access + refresh tokens
    ├── LicenseTokenValidator  — decode + verify incoming JWT
    └── LicenseTokenRevoker    — blacklist all JTIs for a license
```

### New Class Files

| Class | File | Responsibility |
|---|---|---|
| `LicenseTokenIssuer` | `includes/Licensing/LicenseTokenIssuer.php` | Issue access + refresh JWTs after activation |
| `LicenseTokenRefresher` | `includes/Licensing/LicenseTokenRefresher.php` | Validate refresh token, issue new access token |
| `LicenseTokenValidator` | `includes/Licensing/LicenseTokenValidator.php` | Decode + verify JWT signature and claims |
| `LicenseTokenRevoker` | `includes/Licensing/LicenseTokenRevoker.php` | Revoke all tokens for a license_id |
| `LicenseTokenCleanup` | `includes/Licensing/LicenseTokenCleanup.php` | Action Scheduler job: purge expired token rows |

---

## JWT Token Design

### Token Types

PureCart issues two tokens on activation (same pattern as `jwt-auth` v3 by usefulteam and CoCart JWT):

| Token | TTL | Storage | Purpose |
|---|---|---|---|
| **Access token** | 7 days (configurable) | `wp_options` on customer site | Locally-validated license proof; sent in API calls |
| **Refresh token** | 30 days (configurable) | `wp_options` on customer site | Used to request a new access token without re-activating |

### Access Token Claims

```json
{
  "iss": "https://yourstore.com",
  "iat": 1722470400,
  "nbf": 1722470400,
  "exp": 1723075200,
  "jti": "a1b2c3d4e5f6-unique-id",
  "lic": {
    "key":        "A1B2C3D4-E5F6A7B8-C9D0E1F2-A3B4C5D6-E7F8A9B0",
    "domain":     "example.com",
    "env":        "production",
    "plan":       "multi",
    "limit":      5,
    "count":      2,
    "expires_at": "2027-06-24T00:00:00Z",
    "features":   ["updates", "support"]
  }
}
```

**Claim notes:**
- `iss` — Site URL of the PureCart store. Customer plugin verifies this matches the known store URL.
- `jti` — Unique token ID stored in `wp_purecart_license_tokens`. Checked on refresh to detect revocation.
- `lic` — Custom claim namespace. All license data the customer plugin needs for local validation.
- `lic.features` — Array of enabled feature flags. The customer plugin gates features on these without a network call (e.g., `["updates", "priority_support", "beta_access"]`).
- `lic.expires_at` — License expiry (from `wp_purecart_licenses.expires_at`). Separate from JWT `exp`. Both are checked.

### Refresh Token Claims

```json
{
  "iss": "https://yourstore.com",
  "iat": 1722470400,
  "exp": 1725062400,
  "jti": "r-refresh-unique-id",
  "sub": "license_id:42",
  "domain": "example.com"
}
```

The refresh token carries minimal data — just enough to locate the license and domain on refresh.

### Signing Algorithm

**Default: HS256** (HMAC-SHA256)  
The secret key is defined as a WordPress constant:

```php
define( 'PURECART_JWT_SECRET_KEY', 'your-unique-secret' );
```

If undefined, PureCart auto-generates one on activation and stores it in `wp_options` as `purecart_jwt_secret_key`. Auto-generation uses `wp_generate_password( 64, true, true )`.

**Phase 2: RS256** (RSA-SHA256)  
Asymmetric signing. Store holds private key; customer plugin verifies with public key distributed in the plugin package or fetched once from `/purecart/v1/license/public-key`. Useful for open-source plugins where the HS256 secret cannot be embedded. Configurable via `apply_filters( 'purecart_jwt_algorithm', 'HS256' )`.

**Library:** `firebase/php-jwt` (same library used by jwt-authentication-for-wp-rest-api, jwt-auth, and CoCart JWT).

---

## Token Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. ACTIVATION                                                   │
│    Customer plugin: POST /purecart/v1/license/activate          │
│    Server: validates license → issues access_token + refresh    │
│    Server: stores jti(s) in wp_purecart_license_tokens          │
│    Customer plugin: stores tokens in wp_options                 │
└─────────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. LOCAL VALIDATION (on each WP load, no network call)          │
│    Decode JWT → check exp, iss, lic.domain, lic.expires_at      │
│    If valid: use lic.plan + lic.features for feature gating     │
│    If exp < NOW + 24h: schedule background refresh (next load)  │
│    If exp < NOW: hard refresh required                          │
└─────────────────────────────────────────────────────────────────┘
           │ (every ~7 days)
           ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. REFRESH                                                      │
│    Customer plugin: POST /purecart/v1/license/token/refresh     │
│    Body: { refresh_token }                                      │
│    Server checks:                                               │
│      - jti exists in DB and not revoked                         │
│      - license still active (not expired/revoked/suspended)     │
│      - domain still in activations table                        │
│    Server: issues new access_token (old jti superseded)         │
│    Server: optionally rotates refresh token (per-device)        │
│    Customer plugin: stores new tokens                           │
└─────────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. REVOCATION                                                   │
│    Admin: POST /purecart/v1/license/revoke                      │
│    → License status = 'revoked'                                 │
│    → All JTIs for license_id marked revoked in token table      │
│    → Next refresh: server returns 403 license_revoked           │
│    → Customer plugin: deactivates features, shows admin notice  │
└─────────────────────────────────────────────────────────────────┘
```

### Customer Plugin Integration Pattern

```php
// In customer's plugin bootstrap (e.g. my-plugin.php):

class MyPlugin_License {

    const OPTION_TOKEN   = 'myplugin_purecart_token';
    const OPTION_REFRESH = 'myplugin_purecart_refresh';
    const STORE_URL      = 'https://yourstore.com';

    public static function is_active(): bool {
        $token = get_option( self::OPTION_TOKEN );
        if ( ! $token ) {
            return false;
        }

        try {
            $decoded = \Firebase\JWT\JWT::decode(
                $token,
                new \Firebase\JWT\Key( self::get_secret(), 'HS256' )
            );
        } catch ( \Exception $e ) {
            // Token invalid/expired — try refresh on next request
            self::schedule_refresh();
            return false;
        }

        // Check license expiry (distinct from JWT exp)
        if ( $decoded->lic->expires_at && strtotime( $decoded->lic->expires_at ) < time() ) {
            return false;
        }

        // Schedule refresh if expiring within 24 hours
        if ( $decoded->exp < time() + DAY_IN_SECONDS ) {
            self::schedule_refresh();
        }

        return true;
    }

    public static function get_feature( string $flag ): bool {
        $token = get_option( self::OPTION_TOKEN );
        if ( ! $token ) return false;
        try {
            $decoded = \Firebase\JWT\JWT::decode(
                $token,
                new \Firebase\JWT\Key( self::get_secret(), 'HS256' )
            );
            return in_array( $flag, (array) $decoded->lic->features, true );
        } catch ( \Exception $e ) {
            return false;
        }
    }

    private static function schedule_refresh(): void {
        if ( ! wp_next_scheduled( 'myplugin_refresh_license_token' ) ) {
            wp_schedule_single_event( time() + 60, 'myplugin_refresh_license_token' );
        }
    }
}
```

---

## Database

### wp_purecart_license_tokens

```sql
CREATE TABLE {prefix}purecart_license_tokens (
    id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    license_id     BIGINT UNSIGNED NOT NULL,
    jti            VARCHAR(64)  NOT NULL,
    token_type     ENUM('access','refresh') NOT NULL DEFAULT 'access',
    domain         VARCHAR(255) NOT NULL,
    expires_at     DATETIME     NOT NULL,
    revoked        TINYINT(1)   NOT NULL DEFAULT 0,
    revoked_at     DATETIME     NULL,
    created_at     DATETIME     NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY  uniq_jti        (jti),
    KEY         idx_license_id  (license_id),
    KEY         idx_expires_at  (expires_at),
    KEY         idx_revoked     (revoked)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Query pattern — on refresh:**

```sql
-- 1. Find the refresh token row
SELECT lt.*, l.status AS license_status
FROM   wp_purecart_license_tokens lt
JOIN   wp_purecart_licenses l ON l.id = lt.license_id
WHERE  lt.jti       = %s
  AND  lt.token_type = 'refresh'
  AND  lt.revoked    = 0
  AND  lt.expires_at > NOW();

-- 2. If found and license active: issue new access token
INSERT INTO wp_purecart_license_tokens (license_id, jti, token_type, domain, expires_at, created_at)
VALUES (%d, %s, 'access', %s, %s, NOW());

-- 3. Optionally revoke old refresh token and issue new one (rotation)
UPDATE wp_purecart_license_tokens SET revoked = 1, revoked_at = NOW() WHERE jti = %s;
INSERT INTO wp_purecart_license_tokens (license_id, jti, token_type, domain, expires_at, created_at)
VALUES (%d, %s, 'refresh', %s, %s, NOW());
```

**Cleanup (Action Scheduler job):**

```sql
DELETE FROM wp_purecart_license_tokens
WHERE expires_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
```

---

## REST API Endpoints

### Updated Existing Endpoints

**`POST /purecart/v1/license/activate`** — now returns JWT in response:

```json
Request:
{
  "license_key": "A1B2C3D4-...",
  "domain": "example.com",
  "environment": "production"
}

Response 200:
{
  "success": true,
  "message": "License activated successfully.",
  "data": {
    "expires_at": "2027-06-24 00:00:00",
    "plan_type": "multi",
    "activation_limit": 5,
    "activations_remaining": 3,
    "token": {
      "access_token":  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expires_in":    604800
    }
  }
}
```

**`GET /purecart/v1/license/check`** — also accepts `Authorization: Bearer <access_token>`:

```
Authorization: Bearer <access_token>

OR (legacy):
?license_key=...&domain=example.com
```

When the Bearer token is present and valid, the server skips the DB lookup for the key — the validated JWT payload is the response source. This makes `/check` a near-zero-DB-cost operation for compliant clients.

### New Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/purecart/v1/license/token/refresh` | Refresh token in body | Issue new access token. Optionally rotate refresh token. |
| `POST` | `/purecart/v1/license/token/revoke-all` | `manage_woocommerce` | Revoke all tokens for a license key (admin). |
| `GET` | `/purecart/v1/license/public-key` | None | Return RSA public key for RS256 verification (Phase 2). |

#### Token Refresh — Request/Response

```json
POST /wp-json/purecart/v1/license/token/refresh
{
  "refresh_token": "eyJhbGci..."
}

Response 200:
{
  "success": true,
  "data": {
    "access_token":  "eyJhbGci...",
    "expires_in":    604800
  }
}

Response 403 (revoked):
{
  "success": false,
  "code":    "license_revoked",
  "message": "This license has been revoked."
}

Response 403 (expired license):
{
  "success": false,
  "code":    "license_expired",
  "message": "Your license has expired. Please renew to continue."
}

Response 401 (invalid refresh token):
{
  "success": false,
  "code":    "invalid_refresh_token",
  "message": "Refresh token is invalid or has expired."
}
```

---

## Security Considerations

### Why Not Validate JTI on Every `/check` Call?

Checking the token table on every `/check` call defeats the primary benefit of JWT (local, offline validation). PureCart validates the JTI **only on refresh** — this means revocation takes up to `jwt_ttl` time to propagate (7 days by default). This is explicitly documented as acceptable for WP plugin licensing (same approach used by Lemon Squeezy and similar platforms).

For immediate revocation requirements, the admin can additionally call `/license/deactivate` to remove the domain from the activations table. The next local JWT validation will pass (token still valid), but any `/check` call with domain verification will fail. Full revocation propagates on the next refresh (≤7 days).

### Token Storage on Customer Site

Tokens are stored in `wp_options` (not transients, to survive cache flushes). The option values are not directly exposed but are accessible to any WP admin. This is equivalent to how all WooCommerce Subscriptions tokens and payment gateway secrets are stored — acceptable for the WP plugin ecosystem.

### Shared Secret Security

The HS256 secret key is unique per store. It should never be committed to version control. For managed hosting environments, PureCart generates and rotates it automatically on major version upgrades (configurable, off by default to avoid invalidating all existing tokens).

### Replay Protection

Each `jti` is unique and single-use for refresh tokens. After a refresh token is used, it is revoked in the DB and a new one issued. This prevents an attacker with a stolen refresh token from generating unlimited new access tokens indefinitely.

### Rate Limiting

The `/license/token/refresh` endpoint is rate-limited: max 10 requests per license key per hour. Implemented via transients:

```php
$rate_key = 'purecart_refresh_rate_' . md5( $license_key );
$count    = (int) get_transient( $rate_key );
if ( $count >= 10 ) {
    return new \WP_Error( 'rate_limited', 'Too many refresh attempts.', [ 'status' => 429 ] );
}
set_transient( $rate_key, $count + 1, HOUR_IN_SECONDS );
```

---

## WooCommerce Integration

JWT issuance follows the same WooCommerce hooks as activation:

```php
// After license is activated (existing hook)
add_action( 'purecart_license_activated', function( $license_id, $domain, $environment ) {
    $issuer = new LicenseTokenIssuer();
    $tokens = $issuer->issue( $license_id, $domain );
    // Tokens are passed back through the activation REST response
}, 10, 3 );

// After license is revoked (existing hook)
add_action( 'purecart_license_revoked', function( $license_id ) {
    $revoker = new LicenseTokenRevoker();
    $revoker->revoke_all( $license_id );
}, 10, 1 );

// After license expires (existing hook)
add_action( 'purecart_licenses_expired', function( $expired_ids ) {
    $revoker = new LicenseTokenRevoker();
    foreach ( $expired_ids as $license_id ) {
        $revoker->revoke_all( $license_id );
    }
}, 10, 1 );
```

**Subscription renewal** — on `extend` behavior, existing tokens remain valid (license_id unchanged). On `new_key` behavior, old license is revoked (tokens blacklisted), new license activation flow issues fresh tokens.

---

## Action Scheduler Jobs

| Hook | Schedule | Description |
|---|---|---|
| `purecart_cleanup_expired_tokens` | Daily | Delete token rows expired > 30 days ago |
| `purecart_cleanup_refresh_tokens` | Daily | Delete refresh tokens expired > 1 day ago |

Group: `'purecart'` (consistent with rest of plugin).

---

## Developer Hooks

```php
/**
 * Filter the JWT payload before signing.
 * Add custom claims to the 'lic' namespace.
 *
 * @param array    $payload  JWT payload array.
 * @param stdClass $license  License DB row.
 * @param string   $domain   Activated domain.
 */
apply_filters( 'purecart_jwt_payload', $payload, $license, $domain );

/**
 * Filter the access token TTL in seconds.
 * Default: 7 * DAY_IN_SECONDS (604800).
 */
apply_filters( 'purecart_jwt_expire', 604800 );

/**
 * Filter the refresh token TTL in seconds.
 * Default: 30 * DAY_IN_SECONDS (2592000).
 */
apply_filters( 'purecart_jwt_refresh_expire', 2592000 );

/**
 * Filter the signing algorithm.
 * Supported: 'HS256', 'HS384', 'HS512' (Phase 1) | 'RS256', 'RS384', 'RS512' (Phase 2).
 */
apply_filters( 'purecart_jwt_algorithm', 'HS256' );

/**
 * Fired after a token pair is issued.
 *
 * @param string $access_jti   Access token JTI.
 * @param string $refresh_jti  Refresh token JTI.
 * @param int    $license_id   License ID.
 * @param string $domain       Activated domain.
 */
do_action( 'purecart_jwt_token_issued', $access_jti, $refresh_jti, $license_id, $domain );

/**
 * Fired after an access token is refreshed.
 *
 * @param string $new_jti  New access token JTI.
 * @param string $old_jti  Superseded JTI.
 * @param int    $license_id
 */
do_action( 'purecart_jwt_token_refreshed', $new_jti, $old_jti, $license_id );

/**
 * Fired after all tokens for a license are revoked.
 *
 * @param int $license_id
 */
do_action( 'purecart_jwt_tokens_revoked', $license_id );

/**
 * Filter the rate limit for token refresh per hour per license key.
 * Default: 10.
 */
apply_filters( 'purecart_jwt_refresh_rate_limit', 10 );
```

---

## Competitor Analysis

### Licensing Plugins

#### Software License Manager (v4.5.8 · 900+ installs)
- **Model:** Standalone license server, not WC-native. Requires separate integrations.
- **API:** `slm_activate`, `slm_deactivate`, `slm_check`, `slm_create_new` via GET/POST query string. Not WP REST API — uses `?slm_action=` URL parameter pattern.
- **Auth:** Secret key passed as `secret_key` query parameter. Not JWT.
- **Storage:** Plain text keys, no encryption.
- **HPOS:** Not compatible (no HPOS declaration).
- **WooCommerce:** Requires manual integration; no native WC order hooks.
- **JWT:** None.
- **Verdict:** Useful as a standalone license server model. PureCart improves on it with WC-native integration, HPOS support, proper REST API, and JWT layer.

#### WRC Pricing Tables (v2.7.1 · 2,000+ installs)
- **Scope:** Frontend pricing table display via shortcode. Not a license management plugin.
- **Relevance:** Reference only — useful for designing PureCart's pricing plan display UI in WC product pages and admin. Supports 22+ templates, comparison tables, ribbons, tooltips.
- **JWT:** Not applicable.
- **Verdict:** Excluded from license system comparison.

#### WC Key Manager (v1.3.9 · 200+ installs · **installed**)
- **Model:** WooCommerce-native. Generates/delivers keys on order completion or payment. Keys displayed in My Account and order emails.
- **API:** REST API supports generate, activate, deactivate, validate. HTTP-based API endpoint for external integration.
- **Auth:** License key passed in request body. No JWT.
- **Storage:** Keys in custom DB tables. No encryption by default (Pro: encrypted storage).
- **HPOS:** Compatible (tested up to WC 10.8).
- **WooCommerce:** Full WC native — hooks into `woocommerce_order_status_*`, WC My Account (`woocommerce_account_menu_items`), order details, WC Subscriptions sync (Pro).
- **JWT:** None.
- **Strengths:** The closest WC-native open-source competitor. Good base. Missing: JWT layer, staging exemption, revocation kill-switch (free tier), RS256 support.
- **Verdict:** PureCart's licensing module is architecturally similar but adds JWT caching layer, staging exemption, remote kill-switch, and deeper WC integration.

#### Lemon Squeezy (v1.4.3 · 400+ installs · **installed**)
- **Model:** External SaaS merchant-of-record. License server is hosted on Lemon Squeezy's infrastructure, not the store's WordPress server.
- **Auth:** OAuth 2.0 (the WP plugin connects via OAuth to the LS dashboard). License validation calls go to `api.lemonsqueezy.com`.
- **WP Update Delivery:** Yes — distributes theme/plugin updates through their CDN.
- **JWT:** Lemon Squeezy issues its own tokens internally; not exposed to WP plugin.
- **Weakness:** 3rd-party dependency. If Lemon Squeezy goes down, license validation fails. Transaction fees on top of Stripe. Limited WC integration.
- **Verdict:** Not a direct competitor for self-hosted WC stores. PureCart's self-hosted model is the differentiator — all data stays on the store's database.

---

### JWT Plugins

#### JWT Authentication for WP REST API (v1.5.0 · 60,000+ installs · **installed**)
- **Purpose:** Authenticate WP REST API calls with JWT (user auth, not license auth).
- **Endpoints:** `POST /jwt-auth/v1/token` (generate), `POST /jwt-auth/v1/token/validate`.
- **Algorithms:** HS256 only (free). RS256, ES256 in PRO.
- **Config:** `define('JWT_AUTH_SECRET_KEY', ...)` in wp-config.php. No admin UI (free).
- **No refresh/revoke** in free tier.
- **Hooks:** `jwt_auth_expire`, `jwt_auth_token_before_sign`, `jwt_auth_token_before_dispatch`, `jwt_auth_algorithm`, `jwt_auth_cors_allow_headers`.
- **Learnings for PureCart:**
  - HS256 + `firebase/php-jwt` is the established approach — adopt the same library.
  - Configurable secret via constant is developer-friendly — replicate for `PURECART_JWT_SECRET_KEY`.
  - Provide admin UI for secret key (don't require wp-config.php only).
  - Free tier should include refresh — the paid-wall on refresh frustrates developers.

#### Simple JWT Login (v3.6.6 · 4,000+ installs · not installed)
- **Purpose:** User auth for headless WP. Auto-login, register, delete users via JWT.
- **Endpoints:** `/simple-jwt-login/v1/auth` (generate), `/auth/refresh`, `/auth/revoke`, `/auth/validate`.
- **Algorithms:** HS256, HS512, HS384, RS256, RS384, RS512 — all supported free.
- **Features:** IP restriction, Google OAuth (beta), WPGraphQL (beta), endpoint protection, auth codes for role-based user creation.
- **Learnings for PureCart:**
  - All algorithms free — PureCart should match (not paywall RS256).
  - Revoke endpoint is straightforward: store blacklist in options/transients.
  - Auth codes pattern (additional layer on top of JWT) has direct parallel to PureCart's `secret_key` concept for admin-only endpoints.
  - `/auth/validate` returning user details is a good pattern — PureCart's `/license/check` with JWT should return plan details.

#### WP REST API Authentication / miniOrange (v4.3.0 · 20,000+ installs · not installed)
- **Purpose:** Multi-method WP REST API protection (JWT, Basic, API Key, OAuth 2.0, external tokens).
- **Auth methods:** JWT, Basic (username/password or client credentials), API Key, OAuth 2.0 (password grant, client credentials grant), external providers (Firebase, Google, Okta, Azure).
- **Notable:** Supports external token validation (verify tokens from Firebase etc. without issuing your own). Role-based access per endpoint. Refresh + revoke in premium.
- **Weakness:** Heavy upsell; locking down entire REST API without paying disables default WP endpoints. One review calls it a "fraud plugin."
- **Learnings for PureCart:**
  - External token validation (validate Firebase/Google JWTs) is a future PureCart use case if we ever support SSO for the customer's admin panel.
  - Role-based API access is a pattern to implement for PureCart's own REST endpoints (already done via `permission_callback`).
  - Do not paywall core functionality — PureCart's JWT layer is fully free.

#### CoCart JWT Authentication (v3.0.3 · 200+ installs · **installed**)
- **Purpose:** JWT auth for CoCart headless cart API (WooCommerce headless).
- **Algorithms:** HS256, HS384, HS512, RS256, RS384, RS512, ES256, ES384, ES512, PS256, PS384, PS512.
- **Multi-session:** Users can have multiple active token sessions (per-device PAT IDs). Tokens are tracked in user meta, linked to a PAT.
- **v3.0.0 highlight:** Dual-secured tokens with PAT (Personal Access Token) ID. Token proliferation prevention (returns existing token if already authenticated). Proper session rotation on refresh.
- **Rate limiting:** `/token/refresh` and `/token/validate` are rate-limited.
- **WP-CLI:** `wp cocart jwt-auth create`, `wp cocart jwt-auth destroy`, `wp cocart jwt-auth list`.
- **Debugging:** Detailed auth failure logs.
- **Learnings for PureCart:**
  - PAT ID concept: track each `jti` as a "Personal Access Token" linked to a domain. This is exactly what `wp_purecart_license_tokens` does — good validation of our DB design.
  - Session rotation on refresh: revoke old refresh token, issue new one — adopt this.
  - Rate limiting on refresh endpoint — adopt.
  - WP-CLI commands for token management — add `wp purecart license token` commands in Phase 2.
  - Multi-algorithm support free — adopt (don't limit to HS256 only).

#### JSON API Auth (v3.1.1 · 700+ installs · not installed)
- **Purpose:** Extension for the original JSON API plugin (closed on WP.org since 2019). Cookie-based auth.
- **Status:** Legacy/deprecated. The plugin's own readme now recommends migrating to "RESTful JSON API" plugin instead.
- **JWT:** None. Uses WordPress auth cookies (`generate_auth_cookie`, `validate_auth_cookie`).
- **Verdict:** Not relevant. Cookie-based auth has been superseded by JWT. Excluded from technical comparison.

#### JWT Auth by usefulteam (v3.0.2 · 6,000+ installs · **installed**)
- **Purpose:** WP REST API user authentication with JWT + refresh token rotation.
- **Endpoints:** `/jwt-auth/v1/token`, `/jwt-auth/v1/token/validate`, `/jwt-auth/v1/token/refresh`.
- **Refresh tokens:** Yes (30-day TTL). Rotation: per-device (pass `device` parameter).
- **Access token TTL:** 10 minutes (reduced from 7 days in v3).
- **Algorithms:** HS256 default. Configurable via `jwt_auth_alg` filter.
- **Status:** Last updated 2 years ago. Not compatible with latest 3 major WP versions (flagged on WP.org).
- **Learnings for PureCart:**
  - Short access token TTL (10 min) is good for WP user auth (frequent logins). For license tokens, 7 days is better (reduce network calls for every plugin load).
  - Refresh token rotation per-device is the right pattern — PureCart adopts the same with `domain` as the device identifier.
  - `jwt_auth_extra_token_check` filter for custom revocation logic is clever — PureCart has `purecart_pre_license_activate` equivalent.
  - Plugin is unmaintained — do not depend on it. Use `firebase/php-jwt` directly.

#### WP OAuth Server (v4.5.0 · 3,000+ installs · not installed)
- **Purpose:** Full OAuth 2.0 authorization server for WordPress. SSO for websites and mobile apps.
- **Grant types (free):** Authorization Code, Implicit, PKCE.
- **Grant types (pro):** User Credentials, Client Credentials, Refresh Token, OpenID Connect.
- **JWT:** RS256 (asymmetric, via OpenSSL key pair). ID tokens for OpenID Connect.
- **PKCE:** OAuth 2.0 PKCE supported (Proof Key for Code Exchange).
- **Known issues:** Security flaw — tokens not revoked on WP logout (reported Aug 2025). Appears partially abandoned (license keys no longer available per reviews).
- **Learnings for PureCart:**
  - Full OAuth 2.0 is overkill for license validation. PureCart's custom JWT approach is leaner and purpose-built.
  - OpenID Connect ID tokens (RS256, `sub` claim, `email`, user info endpoint) are useful if PureCart ever needs SSO — Phase 3 consideration.
  - PKCE is necessary for public clients (mobile apps, Electron desktop) — Phase 3 consideration.
  - Token revocation on logout is a basic security requirement — PureCart explicitly revokes on `purecart_license_revoked` action.

---

## Combined Competitor Matrix

| Feature | Software License Mgr | WC Key Manager | Lemon Squeezy | JWT Auth (tmeister) | Simple JWT Login | miniOrange REST Auth | CoCart JWT | PureCart |
|---|---|---|---|---|---|---|---|---|
| **License management** | ✅ | ✅ | ✅ (external) | ❌ | ❌ | ❌ | ❌ | ✅ |
| **WC-native** | ❌ | ✅ | Partial | ❌ | ❌ | ❌ | ✅ (CoCart) | ✅ |
| **HPOS compatible** | ❌ | ✅ | N/A | N/A | N/A | N/A | N/A | ✅ |
| **JWT for license** | ❌ | ❌ | Internal only | ❌ | ❌ | ❌ | ❌ | ✅ |
| **JWT for WP users** | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | N/A |
| **Refresh tokens** | ❌ | ❌ | N/A | PRO only | ✅ free | PRO only | ✅ free | ✅ free |
| **Token revocation** | ❌ | ❌ | N/A | PRO only | ✅ | PRO only | ✅ | ✅ |
| **HS256** | ❌ | ❌ | N/A | ✅ | ✅ | ✅ | ✅ | ✅ |
| **RS256** | ❌ | ❌ | N/A | PRO only | ✅ free | PRO only | ✅ free | Phase 2 |
| **Per-device token sessions** | ❌ | ❌ | N/A | ❌ | ❌ | ❌ | ✅ | ✅ (per domain) |
| **Token rate limiting** | ❌ | ❌ | N/A | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Staging exemption** | ❌ | ❌ | N/A | N/A | N/A | N/A | N/A | ✅ |
| **Remote kill-switch** | ❌ | ❌ (Pro) | ✅ | N/A | N/A | N/A | N/A | ✅ |
| **Local offline validation** | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **No network call on boot** | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Activation limit enforcement** | ✅ | ✅ | ✅ | N/A | N/A | N/A | N/A | ✅ |
| **Plan/feature claims in token** | ❌ | ❌ | Internal | N/A | N/A | N/A | N/A | ✅ (`lic` claim) |
| **Self-hosted (no 3rd party)** | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **WP-CLI support** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | Phase 2 |
| **firebase/php-jwt library** | ❌ | ❌ | N/A | ✅ | ✅ | N/A | ✅ | ✅ |
| **Price** | Free | Free + Pro | % fees | Free + PRO | Free | Free + PRO | Free | Included in PureCart |

---

## Key Design Decisions Summary

1. **JWT for license caching, not WP user auth** — Scoped purpose. The JWT authenticates a *license+domain pair*, not a WordPress user. No conflict with WP auth.

2. **`firebase/php-jwt` library** — Industry standard in WP. Used by jwt-authentication-for-wp-rest-api (60k installs), jwt-auth (6k), CoCart JWT. Composer require `firebase/php-jwt`.

3. **7-day access token, 30-day refresh token** — Balances network efficiency with revocation latency. Same TTLs as jwt-auth v2 (before they reduced to 10 min, which is appropriate for user auth but not for plugin license checks).

4. **HS256 default, RS256 opt-in (Phase 2)** — HS256 is sufficient for closed-source plugins where the store's secret never leaves the server. RS256 is needed for open-source plugins (secret can't be embedded in distributed code). Phase 2 adds a `/public-key` endpoint.

5. **PAT-style jti tracking per domain** — Borrowed from CoCart JWT v3. Each domain activation has its own token session tracked in `wp_purecart_license_tokens`. Enables per-domain revocation (e.g., deactivate one site without invalidating all sites for that license).

6. **Refresh token rotation** — On each refresh, the old refresh token is revoked and a new one issued. Prevents stolen refresh token from granting indefinite access (same pattern as jwt-auth v3).

7. **No JTI check on `/check` calls** — JTI is only checked on refresh. Local JWT validation (signature + exp + lic claims) is sufficient for routine checks. This is the core performance benefit of JWT.

8. **Revocation propagates in ≤ TTL** — Acceptable for commercial plugin licensing. For immediate revocation, admin additionally calls `/license/deactivate` to remove the domain, causing all subsequent authenticated `/check` calls with domain verification to fail immediately.

---

## Phase Roadmap

### Phase 1 (MVP)
- `LicenseTokenIssuer` — HS256, issue on activation
- `LicenseTokenRefresher` — validate refresh token, issue new access token, rotate refresh
- `LicenseTokenValidator` — decode + verify JWT for Bearer auth on `/check`
- `LicenseTokenRevoker` — mark all JTIs revoked on license revoke/expire
- `wp_purecart_license_tokens` DB table
- `LicenseTokenCleanup` — Action Scheduler daily cleanup
- Rate limiting on `/token/refresh`
- Developer hooks (`purecart_jwt_payload`, `purecart_jwt_expire`, etc.)

### Phase 2
- RS256 algorithm support
- `/purecart/v1/license/public-key` endpoint
- WP-CLI: `wp purecart license token create|list|destroy`
- Admin UI for secret key management (currently requires wp-config.php constant)
- Debug logging for token auth failures

### Phase 3
- External token validation (verify Firebase/Google JWTs for SSO)
- OAuth 2.0 PKCE for mobile/desktop app clients
- OpenID Connect `id_token` for customer SSO across multiple stores
