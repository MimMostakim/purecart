# RND — Update Manager Module
**Plugin:** purecart  
**Module:** Updates  
**Phase:** 1 (WP plugins/themes + generic software) · Phase 2 (signed packages, rollback, Electron feed) · Phase 3 (delta updates, Composer/APT/YUM, CI/CD push)  
**Depends on:** `RND-licensing.md` — license key validation gates update access  
**Standalone:** Yes — works with or without the Licensing module

---

## Overview

PureCart's Update Manager turns your WooCommerce store into a self-hosted update server for any digital product — WordPress plugins, WordPress themes, desktop applications, CLI tools, SDKs, fonts, templates, and anything else that ships as a file.

### The Two Update Flows

**WordPress Plugin/Theme Updates** — The customer ships a small `PureCartUpdater` class alongside their plugin or theme. This class hooks into WordPress's native `pre_set_site_transient_update_plugins` / `pre_set_site_transient_update_themes` filters so updates appear on the customer's WP Admin → Plugins screen exactly like WP.org updates. The customer clicks "Update Now" and WordPress handles the rest.

**Non-WP Software Updates** — Desktop apps (macOS, Windows, Linux), CLI tools, SDKs, mobile apps, and any other software that manages its own update cycle. The software polls a simple JSON endpoint to discover the latest version, receives a signed and expiring download URL, downloads the package, verifies its SHA-256 checksum, and self-updates.

### Problem It Solves

- WooCommerce has no concept of software versioning or update delivery
- EDD Software Licensing update delivery requires a $199/yr add-on
- YahnisElsts Plugin Update Checker is excellent but open-source only — no license gate, no package hosting, WP only
- WooCommerce's own `WC_Plugin_Api_Updater` works only for WooCommerce Marketplace extensions
- Freemius requires migrating to a proprietary SaaS platform with a revenue share
- No existing WooCommerce solution delivers updates for non-WP software (desktop apps, CLI tools, etc.)
- No solution supports per-platform packages (separate `.dmg` / `.exe` / `.AppImage` for the same product)

---

## Supported Product Types

| Type | File Extension(s) | Update Mechanism |
|---|---|---|
| WordPress Plugin | `.zip` | WP transient API (`pre_set_site_transient_update_plugins`) |
| WordPress Theme | `.zip` | WP transient API (`pre_set_site_transient_update_themes`) |
| macOS Application | `.dmg`, `.pkg`, `.zip` | Generic JSON API |
| Windows Application | `.exe`, `.msi`, `.zip` | Generic JSON API |
| Linux Package | `.deb`, `.rpm`, `.AppImage`, `.tar.gz` | Generic JSON API |
| CLI Tool | `.zip`, binary (no ext) | Generic JSON API |
| PHP Library / SDK | `.zip` | Generic JSON API or Composer (Phase 3) |
| Desktop Font / Icon Pack | `.zip` | Generic JSON API |
| Template / Figma Kit | `.zip` | Generic JSON API |
| Mobile App (sideload) | `.apk`, `.ipa` | Generic JSON API |
| Other | Any | Generic JSON API |

Product type is stored in `_purecart_product_type` product meta. The update check response shape is the same for all types; only the WP-specific fields (`requires`, `tested`, `requires_php`) are omitted for non-WP types.

---

## Architecture

### Classes

| Class | File | Responsibility |
|---|---|---|
| `UpdateServer` | `includes/Updates/UpdateServer.php` | REST endpoint: check for updates, validate license, return version info + signed URL |
| `UpdatePackageManager` | `includes/Updates/UpdatePackageManager.php` | Upload, store, version, and manage package files in DB |
| `UpdateDelivery` | `includes/Updates/UpdateDelivery.php` | Issue signed, expiring download tokens; serve files |
| `UpdateInfo` | `includes/Updates/UpdateInfo.php` | Return plugin/theme info for WP's `plugins_api` modal |
| `UpdateChannelRouter` | `includes/Updates/UpdateChannelRouter.php` | Route license to stable/beta/nightly channel |
| `UpdateNotifier` | `includes/Updates/UpdateNotifier.php` | Email active license holders when new version is published |
| `UpdateRollback` | `includes/Updates/UpdateRollback.php` | Roll back to a previous package version (Phase 2) |
| `ChangelogManager` | `includes/Updates/ChangelogManager.php` | Store and retrieve per-version changelogs |
| `GitHubSync` | `includes/Updates/GitHubSync.php` | GitHub/Bitbucket webhook receiver → auto-import on tag push (Phase 3) |

### Customer-Side Class (shipped with customer's product)

```
your-plugin/
└── includes/
    └── PureCartUpdater.php   ← single-file, zero-dependency class
```

`PureCartUpdater` is a standalone PHP class (no Composer, no autoloader) that the plugin author includes in their product. The store owner provides it as a download alongside each plugin product.

---

## WordPress Plugin/Theme Update Flow

### Server Side (PureCart store)

```
GET /wp-json/purecart/v1/plugin/update-check
    ?slug=my-plugin
    &version=1.2.0
    &license_key=A1B2C3D4-...
    &domain=customer-site.com
    &wp_version=6.7
    &php_version=8.2
    &channel=stable

UpdateServer::update_check()
    ├── Resolve product by _purecart_plugin_slug meta
    ├── [If _purecart_update_requires_license] LicenseActivator::validate(license_key, domain)
    ├── UpdateChannelRouter::resolve(license_id, product_id)  → stable|beta|nightly
    ├── UpdatePackageManager::get_latest(product_id, channel, platform='all')
    ├── version_compare(request_version, latest_version)
    ├── [Update available] UpdateDelivery::issue_token(package_id, license_id)
    └── Return JSON response

Response 200 (update available):
{
  "update":        true,
  "version":       "1.3.0",
  "requires":      "6.5",
  "requires_php":  "8.0",
  "tested":        "6.8",
  "download_url":  "https://yourstore.com/purecart-update/{token}",
  "checksum":      "sha256:e3b0c44298fc1c149afbf4c8996fb924...",
  "changelog":     "<ul><li>Fix: settings page crash on PHP 8.2</li></ul>",
  "last_updated":  "2026-07-15 10:00:00"
}

Response 200 (up to date):
{
  "update":  false,
  "version": "1.2.0"
}
```

### Client Side — PureCartUpdater Class

```php
// In customer's plugin bootstrap (wp-plugins only):
if ( is_admin() ) {
    require_once __DIR__ . '/includes/PureCartUpdater.php';
    new \MyPlugin\PureCartUpdater( [
        'api_url'      => 'https://yourstore.com',
        'plugin_file'  => __FILE__,
        'product_slug' => 'my-plugin',
        'license_key'  => get_option( 'my_plugin_license_key' ),
        'version'      => MY_PLUGIN_VERSION,
    ] );
}
```

`PureCartUpdater` hooks:

```php
add_filter( 'pre_set_site_transient_update_plugins', [ $this, 'check_update' ] );
add_filter( 'plugins_api',                           [ $this, 'plugin_info' ], 10, 3 );
add_action( 'upgrader_process_complete',             [ $this, 'after_update' ], 10, 2 );
add_filter( 'auto_update_plugin',                    [ $this, 'auto_update_control' ], 10, 2 );
```

**`check_update` flow:**
1. Called when WP fires the update transient check
2. Calls `GET /purecart/v1/plugin/update-check` with license key + current version
3. Caches response in site transient for 12 hours
4. If `update: true`, injects `stdClass` into `$transient->response[ plugin_basename ]`
5. WP Admin shows "Update available" badge automatically — no custom UI needed

**`plugin_info` flow:**
1. Triggered when admin clicks "View Details" on the plugin row
2. Calls `GET /purecart/v1/plugin/info?slug=my-plugin`
3. Returns `stdClass` matching WP `plugins_api()` shape: `sections.changelog`, `sections.description`, `banners`, `icons`, `requires`, `tested`, `author`
4. Displayed in WP's standard plugin info modal

**`auto_update_control`:**
```php
// Disables WP core auto-updates for the plugin if license is expired
apply_filters( 'purecart_allow_auto_update', true, $plugin_file, $license_key );
```

### WordPress Theme Update Flow

Same pattern using:
```php
add_filter( 'pre_set_site_transient_update_themes', [ $this, 'check_theme_update' ] );
add_filter( 'themes_api', [ $this, 'theme_info' ], 10, 3 );
```

Response shape matches WP's `themes_api` object. `UpdateInfo::for_theme()` returns `screenshot_url`, `description`, `author`, `tags`, `sections.changelog`.

---

## Non-WP Software Update Flow

For desktop apps, CLI tools, SDKs, and any software managing its own update lifecycle:

```
GET /wp-json/purecart/v1/plugin/update-check
    ?slug=my-desktop-app
    &version=2.1.0
    &license_key=A1B2C3D4-...
    &platform=darwin-arm64    (optional — for platform-specific packages)
    &channel=stable

Response 200 (update available):
{
  "update":        true,
  "version":       "2.2.0",
  "download_url":  "https://yourstore.com/purecart-update/{token}",
  "checksum":      "sha256:abc123...",
  "release_notes": "Bug fixes and performance improvements.",
  "min_version":   "2.0.0",
  "platform":      "darwin-arm64",
  "published_at":  "2026-07-20T12:00:00Z"
}
```

PureCart prescribes the update discovery protocol but not the installation process. How the software downloads, verifies, and applies the update is the developer's responsibility.

### Electron / Squirrel Auto-Update Feed (Phase 2)

```
GET /wp-json/purecart/v1/plugin/latest.json
    ?slug=my-electron-app&license_key=...&platform=darwin-arm64

Response:
{
  "url":      "https://yourstore.com/purecart-update/{token}",
  "version":  "2.2.0",
  "pub_date": "2026-07-20T12:00:00Z",
  "notes":    "Bug fixes and performance improvements."
}
```

Compatible with Squirrel's JSON feed format. Electron apps can call `autoUpdater.setFeedURL()` directly to use PureCart as their update server.

---

## Database Tables

### wp_purecart_product_versions — Version Package Registry

```sql
CREATE TABLE {prefix}purecart_product_versions (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    product_id      BIGINT UNSIGNED NOT NULL,
    version         VARCHAR(32)  NOT NULL,
    platform        VARCHAR(64)  NOT NULL DEFAULT 'all',
    channel         ENUM('stable','beta','nightly') NOT NULL DEFAULT 'stable',
    file_path       VARCHAR(1024) NOT NULL,
    file_size       BIGINT UNSIGNED NOT NULL DEFAULT 0,
    checksum_sha256 VARCHAR(64)  NOT NULL,
    requires_wp     VARCHAR(16)  NULL,
    requires_php    VARCHAR(16)  NULL,
    tested_wp       VARCHAR(16)  NULL,
    changelog       LONGTEXT     NULL,
    release_notes   TEXT         NULL,
    is_active       TINYINT(1)   NOT NULL DEFAULT 1,
    download_count  BIGINT UNSIGNED NOT NULL DEFAULT 0,
    released_at     DATETIME     NOT NULL,
    created_by      BIGINT UNSIGNED NULL,
    PRIMARY KEY (id),
    KEY idx_product_version (product_id, version),
    KEY idx_channel         (product_id, channel, is_active),
    KEY idx_platform        (product_id, platform),
    KEY idx_released_at     (released_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Version ordering** uses PHP's built-in `version_compare()` which handles WordPress-style versions, semver, and four-part versions. No custom parser needed.

**Per-platform packages:** Same product, different `platform` values. `UpdatePackageManager::get_latest()` matches on `(product_id, channel, platform)` — first tries exact platform match, falls back to `platform='all'`.

---

## REST API Endpoints

### Customer-Facing

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/purecart/v1/plugin/update-check` | License key | Check for update; returns version info + signed download URL |
| `GET` | `/purecart/v1/plugin/info` | None | Plugin/theme info for WP `plugins_api` modal |
| `GET` | `/purecart/v1/plugin/changelog/{slug}` | None (public) | Full version changelog for a product |
| `GET` | `/purecart/v1/plugin/latest.json` | License key | Electron/Squirrel-compatible update feed (Phase 2) |
| `GET` | `/purecart-update/{token}` | Signed token | Serve update package (rewrite rule, not REST) |
| `POST` | `/purecart/v1/plugin/rollback` | License key | Request download URL for a previous version (Phase 2) |

### Admin

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/purecart/v1/plugin/version` | manage_woocommerce | Upload new package version |
| `GET` | `/purecart/v1/plugin/version` | manage_woocommerce | List all versions for a product |
| `DELETE` | `/purecart/v1/plugin/version/{id}` | manage_woocommerce | Delete a specific version |
| `POST` | `/purecart/v1/plugin/version/{id}/activate` | manage_woocommerce | Toggle version active/inactive |
| `POST` | `/purecart/v1/plugin/github-webhook` | HMAC-SHA256 | GitHub/Bitbucket tag push → auto-import (Phase 3) |

---

## Signed Download URL — Token Design

Every update package download goes through a signed, time-limited, single-use token URL — never a guessable direct path to the file.

```php
$payload = [
    'pkg'  => $package_id,       // wp_purecart_product_versions.id
    'lic'  => $license_id,       // wp_purecart_licenses.id (null if no license gate)
    'exp'  => time() + 900,      // 15-minute TTL (filterable)
    'jti'  => wp_generate_uuid4(), // single-use ID
];
$token = base64_url_encode( wp_json_encode( $payload ) );
$sig   = hash_hmac( 'sha256', $token, PURECART_UPDATE_SECRET );
$url   = home_url( '/purecart-update/' . $token . '.' . $sig );
```

On access, `UpdateDelivery::handle()`:
1. Split token + signature at last `.`
2. `hash_equals()` recompute — reject if mismatch
3. Decode payload, check `exp` — reject if expired
4. Check `jti` transient (set 15 min on first use) — reject replay
5. Validate license still active (if `lic` is set)
6. Increment `download_count` on version row
7. Serve file via configured delivery method

`PURECART_UPDATE_SECRET` — 32-byte random key in `wp_options`, generated on first activation. Regeneratable from PureCart → Settings → Updates → Regenerate Secret.

---

## SHA-256 Checksum Verification

Computed server-side at upload time:

```php
$checksum = 'sha256:' . hash_file( 'sha256', $tmp_file_path );
```

Returned in update-check response. `PureCartUpdater` optionally verifies before handing to WP upgrader:

```php
if ( ! hash_equals(
    $response->checksum,
    'sha256:' . hash_file( 'sha256', $downloaded_zip_path )
) ) {
    return new \WP_Error( 'purecart_checksum', 'Package checksum verification failed.' );
}
```

### Phase 2 — Minisign / GPG Package Signing

Store owner generates a key pair. Private key signs the package at upload time. The signature is included in the update-check response. `PureCartUpdater` verifies the signature before installation. Prevents MITM package substitution even if a signed URL is intercepted and the 15-minute window is exploited.

```
GET /wp-json/purecart/v1/plugin/public-key?slug=my-plugin
→ Returns PEM-encoded public key
```

---

## Version Channels

Each package belongs to one channel: `stable`, `beta`, or `nightly`.

`UpdateChannelRouter` resolves the channel for a given license:

```php
// Priority order: license-level meta > product meta > global default
$channel = get_option( 'purecart_license_channel_' . $license_id )
        ?? get_post_meta( $product_id, '_purecart_update_channel', true )
        ?: 'stable';
```

Channel visibility rules:
- `stable` — sees stable releases only
- `beta` — sees stable + beta releases (latest by version regardless of which is newer)
- `nightly` — sees all three channels

Customers can opt into beta via a filter they add to their site (documented in PureCart knowledge base):
```php
add_filter( 'purecart_update_channel', fn() => 'beta' );
```

---

## Rollback Support (Phase 2)

`UpdateRollback` allows downloading a specific prior version:

```
POST /wp-json/purecart/v1/plugin/rollback
{
  "slug":        "my-plugin",
  "license_key": "A1B2C3D4-...",
  "version":     "1.2.0"
}

Response:
{
  "download_url": "https://yourstore.com/purecart-update/{token}",
  "version":      "1.2.0",
  "checksum":     "sha256:..."
}
```

Admin can restrict rollback depth (default: unlimited). WP-CLI:
```bash
wp purecart update rollback --slug=my-plugin --version=1.2.0 --license=A1B2C3D4-...
```

---

## Package Delivery Methods

`UpdateDelivery` supports five methods (global setting, overridable per product):

| Method | Config | How It Works |
|---|---|---|
| PHP Streaming | `streaming` | Chunked `fread()` loop with `Content-Disposition: attachment` header |
| X-Sendfile | `xsendfile` | `X-Sendfile` header (Apache + `mod_xsendfile`) — zero-copy |
| X-Accel-Redirect | `xaccel` | `X-Accel-Redirect` header (nginx) — zero-copy |
| S3 Presigned URL | `s3` | `302` redirect to a 60-second AWS S3 presigned URL |
| Cloudflare R2 | `r2` | `302` redirect to a 60-second Cloudflare R2 presigned URL |

PHP Streaming is the safe default — works on any host. X-Sendfile/X-Accel-Redirect are significantly faster for large packages (zero-copy at OS level). Cloud redirect offloads all bandwidth from the WP server.

```php
switch ( get_option( 'purecart_update_delivery', 'streaming' ) ) {
    case 'xsendfile':
        header( 'X-Sendfile: ' . $abs_path );
        exit;
    case 'xaccel':
        header( 'X-Accel-Redirect: ' . $nginx_protected_path );
        exit;
    case 's3':
        wp_redirect( $this->s3_presign( $s3_key, 60 ) );
        exit;
    default: // 'streaming'
        $this->stream( $abs_path, $filename );
}
```

---

## Admin UI — Package Upload

Under **PureCart → Products → [Product] → Updates** tab:

1. Drag-and-drop ZIP / binary upload field
2. Version auto-detected from `readme.txt` (`Stable tag:` header) or entered manually
3. SHA-256 checksum computed on upload
4. Channel selector: stable / beta / nightly
5. Platform selector: all / darwin-arm64 / darwin-x64 / win-x64 / win-arm64 / linux-x86_64 / linux-arm64
6. Min WP version, Min PHP version, Tested up to (WP products only)
7. Changelog editor (HTML/Markdown)
8. Version history table: all versions, channel, platform, download count, active toggle, delete

**Auto-extraction of version from `readme.txt`:**
```php
preg_match( '/^Stable tag:\s*(.+)$/im', $readme, $m );
$version = trim( $m[1] ?? '' );
```

---

## Customer Email Notification

When a new `stable` package is published, `UpdateNotifier` emails all active license holders for that product via Action Scheduler (group `'purecart'`):

- **Subject:** "New version of [Product Name] available — v[version]"
- **Body:** Version number, changelog excerpt, update instructions
- **Template:** `purecart/templates/emails/update-available.php` (theme-overridable)

Batched in groups of 100 per Action Scheduler job to avoid memory exhaustion on stores with thousands of licenses.

```php
do_action( 'purecart_update_package_published', $package_id, $product_id, $version );
// UpdateNotifier listens → enqueues batched email jobs
```

Gated by `_purecart_update_notify_customers` (bool, default `true`).

---

## Product Meta Fields

| Meta Key | Type | Description |
|---|---|---|
| `_purecart_plugin_slug` | string | Unique product slug — matches `wp-content/plugins/{slug}` for WP plugins |
| `_purecart_product_type` | string | `wp-plugin`, `wp-theme`, `software`, `font`, `template`, `other` |
| `_purecart_update_channel` | string | Default channel: `stable` (default), `beta`, `nightly` |
| `_purecart_update_requires_license` | bool | Require valid license for update downloads (default: `true`) |
| `_purecart_update_delivery` | string | Override global delivery method per product |
| `_purecart_update_allow_rollback` | bool | Allow customers to download previous versions (default: `false`) |
| `_purecart_update_notify_customers` | bool | Email license holders on new stable release (default: `true`) |
| `_purecart_github_repo` | string | `owner/repo` — for GitHub webhook auto-import (Phase 3) |
| `_purecart_github_token` | string | GitHub PAT for private repo ZIP download (Phase 3) |
| `_purecart_beta_channel_enabled` | bool | Allow beta channel for this product (default: `false`) |

---

## Action Scheduler Jobs

All jobs use group `'purecart'`.

| Hook | Schedule | Description |
|---|---|---|
| `purecart_send_update_notification_batch` | Async (enqueued on package publish) | Send update email to a batch of 100 license holders |
| `purecart_cleanup_update_tokens` | Daily | Delete expired download token transients |
| `purecart_cleanup_old_packages` | Weekly | Remove package files older than configured limit (default: keep all) |

---

## Developer Hooks

```php
// Filter the update check response before returning to customer
apply_filters( 'purecart_update_check_response', $response, $product_id, $license_id );

// Filter which channel a license belongs to
apply_filters( 'purecart_update_channel', $channel, $license_id, $product_id );

// Filter the signed download token TTL in seconds (default: 900 = 15 min)
apply_filters( 'purecart_update_token_ttl', 900 );

// Filter allowed platforms for a product
apply_filters( 'purecart_update_platforms', $platforms, $product_id );

// Fired after a new package version is published
do_action( 'purecart_update_package_published', $package_id, $product_id, $version );

// Fired after a package is downloaded via signed URL
do_action( 'purecart_update_package_downloaded', $package_id, $license_id, $ip_address );

// Filter: allow rollback for a specific license
apply_filters( 'purecart_update_allow_rollback', true, $license_id, $product_id );

// Fired when GitHub webhook successfully imports a new version (Phase 3)
do_action( 'purecart_github_version_imported', $package_id, $product_id, $tag_name );
```

---

## WP-CLI Commands

```bash
# List all versions for a product
wp purecart update list --slug=my-plugin

# Upload a new package from filesystem
wp purecart update upload --slug=my-plugin --file=/srv/releases/my-plugin-1.3.0.zip \
    --version=1.3.0 --channel=stable

# Delete a specific version
wp purecart update delete --slug=my-plugin --version=1.2.0

# Generate a one-off signed download URL
wp purecart update generate-url --slug=my-plugin --version=1.3.0 --license=A1B2C3D4-...

# Rollback: send download URL to a specific license holder
wp purecart update rollback --slug=my-plugin --version=1.2.0 --license=A1B2C3D4-...
```

---

## GitHub / Bitbucket Integration (Phase 3)

`GitHubSync` receives webhook events on tag push:

```
POST /wp-json/purecart/v1/plugin/github-webhook
X-Hub-Signature-256: sha256=<HMAC of payload>
Body: { "ref": "refs/tags/v1.3.0", "repository": { "full_name": "acme/my-plugin" }, ... }
```

On valid tag push:
1. Verify HMAC against `purecart_github_webhook_secret` option
2. Match `repository.full_name` to `_purecart_github_repo` product meta
3. Download release ZIP from GitHub API using `_purecart_github_token`
4. Call `UpdatePackageManager::add()` — computes SHA-256, inserts DB row
5. Extract changelog from GitHub release body
6. Fire `purecart_github_version_imported` → triggers customer email notification

Push a git tag → your store auto-publishes the update. No manual upload step.

---

## Installed Plugins Audit

| Plugin | Slug | Installed | Notes |
|---|---|---|---|
| Easy Digital Downloads | `easy-digital-downloads` | ✅ | Has update delivery flow via Software Licensing add-on; reference for `process-download.php` |
| License Manager for WooCommerce | `license-manager-for-woocommerce` | ✅ | Freemius SDK embedded; reference for plugin updater design |
| Paid Member Subscriptions | `paid-member-subscriptions` | ✅ | Ships `EDD_SL_Plugin_Updater` — same `pre_set_site_transient_update_plugins` pattern used here |
| WooCommerce | `woocommerce` | ✅ | `WC_Plugin_Api_Updater`, `WC_Helper_Updater` — reference for `plugins_api` / `themes_api` integration |
| Plugin Update Checker (YahnisElsts) | `plugin-update-checker` | ❌ not installed | Open-source library; WP-only, no license gate — benchmarked for pattern reference |
| Freemius SDK | — | ❌ standalone not installed | Revenue-share SaaS; embedded in other plugins |

---

## Competitor Comparison

| Feature | EDD Software Licensing | YahnisElsts PUC | Freemius | WC Extensions Updater | purecart |
|---|---|---|---|---|---|
| WP plugin updates | Yes (add-on, $199/yr) | Yes (free, open-source) | Yes | WC extensions only | **Yes** |
| WP theme updates | Yes | Yes | Yes | WC themes only | **Yes** |
| Non-WP software updates | No | No | No | No | **Yes** |
| Desktop app / CLI updates | No | No | No | No | **Yes** |
| License-gated updates | Yes | No | Yes | WC license | **Yes** |
| Version channels (stable/beta/nightly) | No | No | Yes | No | **Yes** |
| Per-platform packages | No | No | Yes | No | **Yes** |
| SHA-256 checksum | No | No | Yes | No | **Yes** |
| Signed expiring download URL | No | No | Yes | No | **Yes** |
| Single-use download token | No | No | No | No | **Yes** |
| Rollback to previous version | No | No | No | No | **Yes (Phase 2)** |
| GPG/Minisign package signing | No | No | No | No | **Yes (Phase 2)** |
| Electron/Squirrel feed | No | No | No | No | **Yes (Phase 2)** |
| Customer update email | No | No | Yes | No | **Yes** |
| Admin package upload UI | Yes | No | Yes | Yes | **Yes** |
| Version history with download counts | No | No | Yes | Partial | **Yes** |
| WP-CLI commands | No | No | No | No | **Yes** |
| GitHub webhook auto-import | No | No | No | No | **Yes (Phase 3)** |
| Delta/diff updates | No | No | No | No | **Yes (Phase 3)** |
| Composer package endpoint | No | No | No | No | **Yes (Phase 3)** |
| Self-hosted | Yes | Yes | No (SaaS) | No (WC.com) | **Yes** |
| WooCommerce native | Cross-plugin | No | Partial | Yes | **Yes** |
| HPOS compatible | No | N/A | Partial | Yes | **Yes** |
| Price | $199/yr add-on | Free | % revenue share | WC.com subscription | **Included in PureCart** |

---

## Key Design Decisions

**1. License gate is optional.** `_purecart_update_requires_license` defaults `true`. Disabling it allows free plugin auto-updates without a license check — useful for freemium models where the free tier auto-updates publicly.

**2. Signed tokens, not raw file paths.** Update packages are never at a guessable URL. Every download is a 15-minute, single-use HMAC-SHA256 signed token. This prevents link sharing and hotlinking even for users who intercept the URL.

**3. `PureCartUpdater` is a single-file drop-in.** No Composer, no autoloader. The plugin author copies one PHP file into their product. This keeps the customer plugin's footprint minimal and avoids dependency conflicts.

**4. `version_compare()` for ordering.** PHP's built-in handles WordPress-style (`1.0.0-beta.1`), semver, and four-part versions without a custom parser.

**5. Per-platform packages via `platform` column.** A macOS `.dmg`, Windows `.exe`, and Linux `.AppImage` are separate DB rows with the same `product_id`. The update check matches on the `platform` query param, falling back to `all`.

**6. Channels are product-level with per-license override.** Product default is `stable`. Individual licenses can be overridden (e.g., grant a tester `beta` access). This keeps channel management simple.

**7. Customer email via Action Scheduler in batches of 100.** Emailing 10,000 license holders synchronously on package publish would time out. Action Scheduler batches the sends asynchronously.

**8. Changelog stored in DB, not in the package.** Packages are treated as opaque blobs. Changelog is a separate DB field editable without re-uploading the file.

---

## Phase Roadmap

**Phase 1 — Core (MVP)**
- `UpdateServer`, `UpdatePackageManager`, `UpdateDelivery`, `UpdateInfo`, `UpdateChannelRouter`, `UpdateNotifier`, `ChangelogManager`
- WP Plugin update flow (transient hook + signed URL)
- Non-WP software generic JSON API
- SHA-256 checksum
- stable / beta / nightly channels
- Per-platform packages
- PHP streaming delivery
- Admin package upload UI with version history
- Customer update email via Action Scheduler
- All developer hooks

**Phase 2 — Extended Delivery**
- `UpdateRollback` (previous-version download)
- WP Theme update flow (`pre_set_site_transient_update_themes`)
- Minisign / GPG package signing + `/public-key` endpoint
- Electron/Squirrel compatible `/latest.json` feed
- X-Sendfile / X-Accel-Redirect delivery
- S3 / Cloudflare R2 presigned URL delivery
- WP-CLI commands

**Phase 3 — Advanced / CI-CD**
- `GitHubSync` (GitHub / Bitbucket webhook auto-import)
- Delta/binary-diff updates (reduces bandwidth for large packages)
- Composer package repository endpoint (`/packages.json`)
- APT / YUM repository endpoint for Linux `.deb` / `.rpm` packages
- Auto-update scheduling (store owner can push mandatory security updates)
- Multi-file bundles (one purchase → multiple update streams)
