# RND — Frontend: Customer Account Portal
**Plugin:** purecart  
**Depends on:** `RND-licensing.md`, `RND-licensing-jwt.md`, `RND-secure-downloads.md`, `RND-auto-updates.md`, `RND-frontend-license-manager.md`, `RND-frontend-secure-downloads.md`, `RND-frontend-update-manager.md`  
**Stack:** PHP + Twig templates · Vanilla JS (ES6) · WooCommerce My Account extension  
**Scope:** Complete customer-facing portal — post-purchase flow, My Account tabs, emails  

---

## Overview

After a customer purchases a digital product, PureCart takes over three touchpoints:

1. **Order Confirmation** — thank-you page and email immediately after checkout
2. **My Account Portal** — persistent dashboard at `/my-account/` with PureCart tabs
3. **Transactional Emails** — license delivery, download links, expiry warnings, update alerts

All three must work cohesively. A customer who just purchased expects to:
1. See their license key and download link on the order confirmation page — immediately
2. Find everything again later in My Account
3. Receive an email with the same information

---

## PHP Architecture — Extending WooCommerce My Account

### Registering Custom Endpoints

```php
// includes/MyAccount/PureCartAccountEndpoints.php

class PureCartAccountEndpoints {

    public static function register(): void {
        add_action( 'init', [ __CLASS__, 'add_endpoints' ] );
        add_filter( 'woocommerce_account_menu_items', [ __CLASS__, 'menu_items' ], 20 );
        add_filter( 'woocommerce_get_query_vars', [ __CLASS__, 'query_vars' ] );
        add_action( 'woocommerce_account_purecart-licenses_endpoint',   [ __CLASS__, 'licenses_page' ] );
        add_action( 'woocommerce_account_purecart-downloads_endpoint',  [ __CLASS__, 'downloads_page' ] );
        add_action( 'woocommerce_account_purecart-updates_endpoint',    [ __CLASS__, 'updates_page' ] );
        add_action( 'woocommerce_account_purecart-product_endpoint',    [ __CLASS__, 'product_page' ] );
    }

    public static function add_endpoints(): void {
        add_rewrite_endpoint( 'purecart-licenses',  EP_ROOT | EP_PAGES );
        add_rewrite_endpoint( 'purecart-downloads', EP_ROOT | EP_PAGES );
        add_rewrite_endpoint( 'purecart-updates',   EP_ROOT | EP_PAGES );
        add_rewrite_endpoint( 'purecart-product',   EP_ROOT | EP_PAGES );  // /my-account/purecart-product/{product_id}/
    }

    public static function menu_items( array $items ): array {
        // Insert after 'orders'
        $new = [];
        foreach ( $items as $key => $label ) {
            $new[ $key ] = $label;
            if ( 'orders' === $key ) {
                $new['purecart-licenses']  = __( 'Licenses', 'purecart' );
                $new['purecart-downloads'] = __( 'Downloads', 'purecart' );
                $new['purecart-updates']   = __( 'Updates', 'purecart' );
            }
        }
        return $new;
    }

    public static function query_vars( array $vars ): array {
        $vars['purecart-licenses']  = 'purecart-licenses';
        $vars['purecart-downloads'] = 'purecart-downloads';
        $vars['purecart-updates']   = 'purecart-updates';
        $vars['purecart-product']   = 'purecart-product';
        return $vars;
    }

    // Each endpoint method loads the appropriate template:
    public static function licenses_page(): void {
        wc_get_template( 'myaccount/purecart-licenses.php', [], '', PURECART_TEMPLATES );
    }
    // ... similarly for downloads, updates, product
}
```

> **Flush rewrite rules** — `PureCartAccountEndpoints::add_endpoints()` is called on `init`. A one-time `flush_rewrite_rules()` is triggered on plugin activation via `register_activation_hook`.

---

## My Account Navigation (Tab Bar)

After PureCart activates, the My Account sidebar gains three new items between "Orders" and "Addresses":

```
Dashboard
Orders          ← WooCommerce native
Licenses        ← PureCart (hidden if Licensing module off)
Downloads       ← PureCart (hidden if Downloads module off)
Updates         ← PureCart (hidden if Updates module off)
Addresses
Account Details
Log out
```

**Active tab** — WooCommerce applies the `is-active` class to the current endpoint's `<li>`. No custom JS needed.

**Module gating** — each menu item is conditionally registered:
```php
// In menu_items filter:
if ( purecart_module_active('licensing') )  $new['purecart-licenses']  = __('Licenses','purecart');
if ( purecart_module_active('downloads') )  $new['purecart-downloads'] = __('Downloads','purecart');
if ( purecart_module_active('updates') )    $new['purecart-updates']   = __('Updates','purecart');
```

---

## Post-Purchase Flow

### Step 1 — Order Placed (any payment method)

On `woocommerce_order_status_changed` → `processing` or `completed`:
- `LicenseGenerator::generate_for_order($order_id)` — creates license records
- `TokenManager::create_for_order($order_id)` — creates download tokens
- If order goes to `completed`: `purecart_email_delivery` scheduled immediately via Action Scheduler

### Step 2 — Order Confirmation Page (Thank You Page)

**Hook:** `woocommerce_thankyou`  
**File:** `templates/order/purecart-thankyou.php`

```php
add_action( 'woocommerce_thankyou', 'purecart_render_thankyou_section', 10 );

function purecart_render_thankyou_section( int $order_id ): void {
    $order = wc_get_order( $order_id );
    if ( ! $order || $order->get_customer_id() !== get_current_user_id() ) return;

    $data = purecart_get_order_delivery_data( $order_id );
    if ( empty( $data ) ) return;

    wc_get_template(
        'order/purecart-thankyou.php',
        compact('order', 'data'),
        '',
        PURECART_TEMPLATES
    );
}
```

**Template layout:**

```
┌──────────────────────────────────────────────────────────────┐
│  🎉  Your digital products are ready                         │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Plugin Pro — Multi Site License                        │  │
│  │                                                        │  │
│  │  License Key                                           │  │
│  │  ████-████-████-████-████  [Click to reveal] [Copy]   │  │
│  │                                                        │  │
│  │  [⬇ Download Plugin Pro v2.0.4]                       │  │
│  │  [📄 Download Documentation PDF]                      │  │
│  │                                                        │  │
│  │  You'll also receive these links by email.            │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  [View all my licenses →]  [View all my downloads →]        │
└──────────────────────────────────────────────────────────────┘
```

**Key behaviors:**
- License key is blurred by default — same blur-reveal JS as My Account
- Download buttons call `TokenManager::get_url($token)` → `/purecart-download/{token}`
- "View all my licenses →" links to `/my-account/purecart-licenses/`
- If payment is pending (PayPal IPN delay, bank transfer): show a notice instead: "Your order is being processed. You'll receive your license and download links by email once payment is confirmed."
- Section only appears once — if the customer refreshes, it still shows (WC thank-you page persists for the session)

**Pending payment notice:**
```html
<div class="purecart-notice purecart-notice--info">
  <svg><!-- Info icon --></svg>
  <p>Your order is pending payment. Your license key and download links will be emailed to you once payment is confirmed.</p>
</div>
```

---

## My Account — Dashboard Tab (WC native, augmented)

**URL:** `/my-account/`  
**Hook:** `woocommerce_account_dashboard` (append to existing WC dashboard)  
**File:** `templates/myaccount/purecart-dashboard-widget.php`

PureCart inserts a summary widget below the default WC greeting:

```
┌──────────────────────────────────────────────────────────────┐
│  Your Digital Products                                        │
│                                                              │
│  3 Licenses    ●●● Active          [View Licenses →]        │
│  8 Downloads   2 files available   [View Downloads →]       │
│  1 Update      v2.1.0 available    [View Updates →]         │
└──────────────────────────────────────────────────────────────┘
```

- Each row is a link to the respective tab
- Counts come from `PureCartAccountData::get_summary( $customer_id )` — cached in transient `purecart_dashboard_{user_id}` for 1 hour
- "Update available" row is highlighted with `$md-statusWarningContainer` bg when there is a pending update
- Widget is hidden if customer has no PureCart orders

---

## My Account — Licenses Tab

**URL:** `/my-account/purecart-licenses/`  
**File:** `templates/myaccount/purecart-licenses.php`

See `RND-frontend-license-manager.md` for full component spec. Summary of the complete page:

### Page Header
```
Your Licenses               [? How to use your license key]
```
Help link opens a lightweight modal (`<dialog>`) with activation instructions.

### License Cards (one per license)

```
┌─────────────────────────────────────────────────────────────┐
│  [Product icon]  Plugin Pro                                  │
│                  Multi Site · 2 of 5 sites used             │
│                                                             │
│  License Key                                                │
│  ████-████-████-████-████  [Click to reveal]               │
│                             ↑ revealed: [Copy] [Hide]       │
│                                                             │
│  ● Active    Expires: Jan 24, 2027    Order: #1042         │
│                                                             │
│  ▶ Active Sites (2)                    [expand]            │
│  ── example.com    Production   Jan 5, 2026   [Deactivate] │
│  ── dev.site.com   Staging      Jan 3, 2026   (exempt)     │
│                                                             │
│  ──────────────────────────────────────────────────────    │
│  [Activate a new domain]  [Deactivate a domain]            │
│  [Download Certificate]   [Contact Support]                │
└─────────────────────────────────────────────────────────────┘
```

### Activate a New Domain (inline form)

Clicking "Activate a new domain" expands an inline form below the card footer:

```html
<form class="purecart-activate-form" method="POST">
  <label for="domain_{id}">Website URL</label>
  <input type="url" id="domain_{id}" name="purecart_domain"
         placeholder="https://your-website.com" required />
  <button type="submit" class="btn btn--filled btn--small">Activate</button>
  <button type="button" class="btn btn--text btn--small js-cancel">Cancel</button>
  <?php wp_nonce_field('purecart_activate_' . $license_id, 'purecart_nonce'); ?>
  <input type="hidden" name="purecart_license_id" value="<?php echo esc_attr($license_id); ?>" />
</form>
```

**Server-side handler:**
```php
// processes on 'init' before headers sent
add_action('init', function() {
    if ( ! isset($_POST['purecart_license_id'], $_POST['purecart_domain']) ) return;
    $license_id = absint($_POST['purecart_license_id']);
    // nonce check, ownership check, then:
    $result = LicenseActivator::activate([
        'license_id' => $license_id,
        'domain'     => sanitize_url($_POST['purecart_domain']),
        'user_id'    => get_current_user_id(),
    ]);
    wp_safe_redirect( add_query_arg(
        $result->success ? ['purecart_msg' => 'activated'] : ['purecart_error' => $result->code],
        wc_get_account_endpoint_url('purecart-licenses')
    ));
    exit;
});
```

**Success/error notices** — rendered at the top of the licenses tab:
```php
if ( isset($_GET['purecart_msg']) && 'activated' === $_GET['purecart_msg'] ) {
    wc_add_notice( __('Domain activated successfully.', 'purecart'), 'success' );
}
if ( isset($_GET['purecart_error']) ) {
    $codes = [
        'limit_reached'  => __('Activation limit reached.', 'purecart'),
        'already_active' => __('This domain is already activated.', 'purecart'),
        'invalid_domain' => __('Please enter a valid URL.', 'purecart'),
    ];
    wc_add_notice( $codes[$_GET['purecart_error']] ?? __('Activation failed.', 'purecart'), 'error' );
}
```

### Deactivate a Domain

```html
<form method="POST" class="purecart-deactivate-form">
  <input type="hidden" name="purecart_action"     value="deactivate" />
  <input type="hidden" name="purecart_license_id" value="{license_id}" />
  <input type="hidden" name="purecart_domain"     value="{domain}" />
  <?php wp_nonce_field('purecart_deactivate_' . $license_id); ?>
  <button type="submit" class="btn btn--outlined btn--small btn--danger-outline">
    Deactivate
  </button>
</form>
```

Staging domains (matching exempt patterns) show "(exempt)" badge and no deactivate button.

### Expired License Card

```
┌─────────────────────────────────────────────────────────────┐
│  [Product icon]  Plugin Pro                     ⚠ Expired  │
│                  Single Site · 1 of 1 sites used            │
│                                                             │
│  License Key                                               │
│  ████-████-████-████-████  [Click to reveal]               │
│                                                             │
│  ✗ Expired: Dec 31, 2025    Order: #888                   │
│                                                             │
│  [Renew License]   [Contact Support]                       │
└─────────────────────────────────────────────────────────────┘
```

"Renew License" → links to the product page or a renewal product if `_purecart_renewal_behavior = 'new_key'`.

### Revoked License Card

```
┌─────────────────────────────────────────────────────────────┐
│  [Product icon]  Plugin Pro                    🚫 Revoked  │
│                  License has been revoked.                   │
│                                                             │
│  [Contact Support]                                          │
└─────────────────────────────────────────────────────────────┘
```

License key is not shown for revoked licenses.

### Empty State

```
┌──────────────────────────────────────────────────────────────┐
│  🔑                                                          │
│  No licenses yet                                             │
│  Purchase a product to receive your license key.            │
│                                                             │
│  [Shop →]                                                   │
└──────────────────────────────────────────────────────────────┘
```

---

## My Account — Downloads Tab

**URL:** `/my-account/purecart-downloads/`  
**File:** `templates/myaccount/purecart-downloads.php`

See `RND-frontend-secure-downloads.md` for full component spec. Complete page:

### Page Header
```
Your Downloads
```

### Order Group + Download Cards

Per-order grouping. Each download card has:
- Product name + file label + file type icon
- Download count used / max
- Expiry date (or "Never" / "Unlimited")
- [⬇ Download] button (disabled when expired/exhausted/license-invalid)

**Token status mapping → button state:**

| Token status | Download count | License gate | Button |
|---|---|---|---|
| active | < max or unlimited | n/a | `[⬇ Download]` |
| active | = max | n/a | `[⬇ Download]` disabled + tooltip "Limit reached" |
| expired | any | n/a | `[⬇ Download]` disabled + tooltip "Expired" |
| active | any | license inactive | `[⬇ Download]` disabled + notice below |
| revoked | any | n/a | `[⬇ Download]` disabled + notice below |

**"Limit reached" notice** — shown below the card:
```html
<p class="purecart-download-notice purecart-download-notice--warning">
  You've used all <?php echo esc_html($max); ?> downloads for this file.
  <a href="<?php echo esc_url(get_permalink(wc_get_page_id('myaccount'))); ?>/contact-us/">Contact support</a> if you need more.
</p>
```

**"Requires license" notice:**
```html
<p class="purecart-download-notice purecart-download-notice--warning">
  An active license is required to download this file.
  <a href="<?php echo esc_url(wc_get_account_endpoint_url('purecart-licenses')); ?>">Activate your license →</a>
</p>
```

### Re-Send Download Links Button

```html
<!-- At the bottom of each order group -->
<form method="POST">
  <input type="hidden" name="purecart_action"   value="resend_links" />
  <input type="hidden" name="purecart_order_id" value="{order_id}" />
  <?php wp_nonce_field('purecart_resend_' . $order_id); ?>
  <button type="submit" class="btn btn--text btn--small">
    📧 Re-send download links by email
  </button>
</form>
```

Handler re-dispatches the `PureCartDownloadEmail` for that order. Rate-limited: once per 10 minutes per order (transient `purecart_resend_{order_id}`).

### Empty State

```
[⬇]
No downloads yet
Purchase a product to get download links.
[Shop →]
```

---

## My Account — Updates Tab

**URL:** `/my-account/purecart-updates/`  
**File:** `templates/myaccount/purecart-updates.php`

See `RND-frontend-update-manager.md` for full component spec. Complete page:

### Page Header
```
Product Updates
```

### Update Status Cards (one per purchased product with update support)

```
┌─────────────────────────────────────────────────────────────┐
│  [Product icon]  Plugin Pro                                  │
│  License: XXXXXXXX-XXXX-…   ● Active                       │
│  Channel: Stable                                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🔔 Update available: v2.1.0                         │   │
│  │    Released Jul 29, 2026                            │   │
│  │    New components, bug fixes.                       │   │
│  │                                                     │   │
│  │    [Read Changelog]   [⬇ Download v2.1.0]          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ▶ Version history                                          │
└─────────────────────────────────────────────────────────────┘
```

**"Download vX.Y.Z" button** — POSTs to:
```php
// POST /my-account/purecart-product/{product_id}/download-update/
// Handler: PureCartAccountEndpoints::handle_update_download()
// 1. Validates license is active
// 2. Generates signed update token (15-min HMAC, single-use)
// 3. Redirects customer to: /purecart-update-download/{token}
//    which is handled by UpdateDelivery::serve_download()
```

**Changelog expand** — clicking "Read Changelog" expands an inline `<details>` section with the markdown-rendered changelog. No modal. PHP renders the changelog server-side on page load (not AJAX) — it is included in a hidden `<div>` toggled by JS:
```javascript
document.querySelectorAll('.purecart-changelog-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
        const target = document.getElementById(btn.dataset.target);
        target.hidden = !target.hidden;
        btn.textContent = target.hidden ? 'Read Changelog' : 'Hide Changelog';
    });
});
```

**WP Plugin notice** — for products with `_purecart_product_type = 'wp-plugin'`:
```html
<p class="purecart-notice purecart-notice--info">
  ℹ This is a WordPress plugin. Updates are also delivered automatically via your WordPress dashboard when an active license is present.
</p>
```

**No license / license inactive state:**
```html
<div class="purecart-notice purecart-notice--warning">
  ⚠ An active license is required to receive updates.
  <a href="{licenses_url}">Activate your license →</a>
</div>
```

### Empty State

```
[RefreshCw]
No updates available
All your products are up to date, or you haven't purchased any products with update support.
[Shop →]
```

---

## My Account — Product Detail Page

**URL:** `/my-account/purecart-product/{product_id}/`  
**File:** `templates/myaccount/purecart-product.php`  
**Purpose:** Unified view of everything for a single purchased product: license + downloads + update history.

```
← Back to Downloads

Plugin Pro
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Overview] [License] [Downloads] [Updates]  ← tab strip (JS-powered, no page reload)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Overview tab content]
  Product: Plugin Pro
  Version: v2.0.4 (latest: v2.1.0 available)
  License: ● Active — Multi Site — 2 of 5 sites
  Purchase Date: Jun 15, 2026
  Order: #1042
  Support: [Contact Support] [View Documentation]

[License tab content]
  — same as license card in /purecart-licenses/ but for this product only

[Downloads tab content]
  — same as download cards in /purecart-downloads/ but for this product only

[Updates tab content]
  — same as update card in /purecart-updates/ but for this product only
  — full version history table included
```

**Tab strip (vanilla JS):**
```javascript
// assets/js/purecart-product-tabs.js
const tabs = document.querySelectorAll('.purecart-product-tab');
const panels = document.querySelectorAll('.purecart-product-panel');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('is-active'));
        panels.forEach(p => p.hidden = true);
        tab.classList.add('is-active');
        document.getElementById(tab.dataset.panel).hidden = false;
    });
});
```

---

## Transactional Emails

All PureCart emails extend `WC_Email`. They use the WooCommerce email template wrapper (header/footer) so they inherit the store's brand colors and logo.

### Email 1 — License & Download Delivery (`PureCartDeliveryEmail`)

**Trigger:** `woocommerce_order_status_completed`  
**Template:** `templates/emails/purecart-delivery.php`  
**Subject:** `Your {product_name} is ready — {order_number}`

**Body:**
```
Hi {customer_name},

Your order {order_number} is confirmed. Here's everything you need:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Plugin Pro — Multi Site License
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

License Key:   XXXX-XXXX-XXXX-XXXX-XXXX

Downloads:
  → Plugin Pro v2.0.4 (ZIP)    https://your-store.com/purecart-download/{token}
  → Documentation (PDF)        https://your-store.com/purecart-download/{token}

Download links expire in 48 hours. You can always re-download from
your account: https://your-store.com/my-account/purecart-downloads/

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Need help? Reply to this email or visit our support center.

{store_name}
```

**Key rules:**
- License key is shown in plain text in the email (no blur — email is secure)
- Download links in the email are the real token URLs — they expire per `_purecart_email_link_expiry_days` (default 48h)
- If the order has multiple products, each product gets its own section block
- Email is queued via Action Scheduler: `purecart_send_delivery_email` — not sent inline in the `order_status_changed` hook

### Email 2 — License Expiry Warning (`PureCartExpiryWarningEmail`)

**Trigger:** `purecart_check_expired_licenses` Action Scheduler job (daily)  
**Fires when:** License expires in exactly 14 days and 3 days  
**Template:** `templates/emails/purecart-expiry-warning.php`  
**Subject:** `Your {product_name} license expires in {days} days`

**Body:**
```
Hi {customer_name},

Your license for {product_name} will expire on {expiry_date}.

  → Renew now: {renewal_url}

After expiry, you'll still be able to use the software, but you
won't receive updates or support.

{store_name}
```

**Settings:** Admin can configure expiry warning days in `SettingsLicensing` (default: 14 and 3).

### Email 3 — Update Available (`PureCartUpdateNotificationEmail`)

**Trigger:** Admin publishes a stable release and "Notify customers" is checked  
**Dispatched by:** `purecart_send_update_notification_batch` Action Scheduler job (chunked, 50 customers per batch)  
**Template:** `templates/emails/purecart-update-notification.php`  
**Subject:** `{product_name} {version} is now available`

**Body:**
```
Hi {customer_name},

{product_name} {version} is now available.

What's new in {version}:
{changelog_excerpt}   ← first 300 chars of changelog, plain text

Update now:
  → WP Plugin: Update via your WordPress dashboard
  → Or download: {download_url}   ← signed 15-min token generated at send time
                                     (replaced with My Account URL if TTL elapsed)

View full changelog: {changelog_url}

{store_name}
```

**Rate limiting:** One notification email per product per customer per release (tracked in `{prefix}purecart_notification_log` — order_id, product_id, version, sent_at).

### Email 4 — Re-Send Download Links (`PureCartResendLinksEmail`)

**Trigger:** Customer clicks "Re-send download links" in My Account  
**Template:** `templates/emails/purecart-resend-links.php`  
**Subject:** `Your download links for Order {order_number}`

Same body as `PureCartDeliveryEmail` but:
- Generates fresh tokens (existing tokens remain valid — resend does not revoke them)
- Includes note: "You requested a fresh copy of your download links."

### Email 5 — Activation Confirmation (`PureCartActivationEmail`) *(optional, admin toggle)*

**Trigger:** `purecart_license_activated` hook  
**Template:** `templates/emails/purecart-activation.php`  
**Subject:** `License activated on {domain}`

```
Hi {customer_name},

Your {product_name} license has been activated on:

  Domain:      {domain}
  Environment: {environment}
  Activated:   {date}
  Activations: {used} of {limit} used

If you didn't activate this license, contact support immediately.

{store_name}
```

**Admin control:** Enabled/disabled in `SettingsLicensing` → "Send activation confirmation email".

---

## WooCommerce My Account — Order Detail Augmentation

**Hook:** `woocommerce_order_details_after_order_table`  
**File:** `templates/myaccount/purecart-order-detail-section.php`

When a customer views a specific order at `/my-account/orders/{order_id}/`, PureCart appends a section below the standard order table:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Digital Delivery
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Plugin Pro — Multi Site License
  License Key: ████-████-████-████-████  [Reveal] [Copy]
  Status: ● Active  Sites: 2 of 5

  Downloads:
    → Plugin Pro v2.0.4 (ZIP)   [⬇ Download]  2 of 5 used
    → Documentation (PDF)       [⬇ Download]  Unlimited

[Re-send by email]
```

This ensures that even if the customer navigates to their order through the standard WC "Orders" tab, they can access their license and downloads without going to the PureCart-specific tabs.

---

## CSS / BEM — My Account Global Styles

```scss
// assets/css/purecart-myaccount.scss

// ─── Notices ──────────────────────────────────────────────────

.purecart-notice {
  display: flex; align-items: flex-start; gap: $space-3;
  padding: $space-3 $space-4; border-radius: $shape-small;
  @extend %type-body-medium; margin-bottom: $space-4;

  svg { flex-shrink: 0; margin-top: 2px; }

  &--info    { background: $md-status-info-container; color: $md-status-info; }
  &--warning { background: $md-status-warning-container; color: $md-status-warning; }
  &--error   { background: $md-error-container; color: $md-error; }
  &--success { background: $md-status-success-container; color: $md-status-success; }
}

// ─── Product tab strip (purecart-product page) ────────────────

.purecart-product-tabs {
  display: flex; gap: 0; border-bottom: 1px solid $md-outline-variant;
  margin-bottom: $space-6;
}

.purecart-product-tab {
  @extend %type-label-large; color: $md-on-surface-variant;
  padding: $space-3 $space-4; border-bottom: 2px solid transparent;
  cursor: pointer; transition: color $motion-duration-short-2;

  &.is-active {
    color: $md-primary; border-bottom-color: $md-primary;
  }
  &:hover:not(.is-active) { color: $md-on-surface; }
}

// ─── Thank-you page section ───────────────────────────────────

.purecart-thankyou {
  margin-top: $space-8;

  &__heading {
    @extend %type-headline-small; color: $md-on-surface; margin-bottom: $space-4;
  }

  &__product-block {
    border: 1px solid $md-outline-variant;
    border-radius: $shape-medium; padding: $space-5; margin-bottom: $space-4;
    background: $md-surface;
  }

  &__product-name { @extend %type-title-medium; color: $md-on-surface; margin-bottom: $space-4; }
  &__section-label { @extend %type-label-medium; color: $md-on-surface-variant; margin-bottom: $space-2; }

  &__actions { display: flex; gap: $space-3; flex-wrap: wrap; margin-top: $space-4; }

  &__footer {
    @extend %type-body-small; color: $md-on-surface-variant;
    margin-top: $space-2; display: flex; gap: $space-4;
    a { color: $md-primary; text-decoration: none; }
  }
}

// ─── Empty states ─────────────────────────────────────────────

.purecart-empty-state {
  text-align: center; padding: $space-12 $space-4;

  &__icon  { font-size: 48px; margin-bottom: $space-4; opacity: 0.4; }
  &__title { @extend %type-title-medium; color: $md-on-surface; margin-bottom: $space-2; }
  &__body  { @extend %type-body-medium; color: $md-on-surface-variant; margin-bottom: $space-6; }
}

// ─── Dashboard widget ─────────────────────────────────────────

.purecart-dashboard-widget {
  border: 1px solid $md-outline-variant; border-radius: $shape-medium;
  overflow: hidden; margin-top: $space-6;

  &__header {
    padding: $space-3 $space-4; background: $md-surface-container-low;
    @extend %type-label-large; color: $md-on-surface;
    border-bottom: 1px solid $md-outline-variant;
  }

  &__row {
    display: flex; align-items: center; gap: $space-3;
    padding: $space-3 $space-4; border-bottom: 1px solid $md-outline-variant;
    text-decoration: none; color: inherit;
    transition: background $motion-duration-short-1;

    &:last-child { border-bottom: none; }
    &:hover { background: $md-surface-container; }
    &--alert { background: $md-status-warning-container; }
  }

  &__icon  { color: $md-on-surface-variant; }
  &__label { @extend %type-body-medium; color: $md-on-surface; flex: 1; }
  &__count { @extend %type-label-medium; color: $md-on-surface-variant; }
  &__arrow { color: $md-outline; }
}
```

---

## JavaScript Assets

All My Account JS is loaded via `wp_enqueue_script` on the My Account page only:

```php
add_action( 'wp_enqueue_scripts', function() {
    if ( ! is_account_page() ) return;

    wp_enqueue_script(
        'purecart-myaccount',
        PURECART_URL . 'assets/js/purecart-myaccount.js',
        [],
        PURECART_VERSION,
        true
    );
} );
```

**`assets/js/purecart-myaccount.js`** — bundled ES6 module (compiled with esbuild):

Module exports:
- `initKeyReveal()` — blur/reveal all `.purecart-license-key--hidden` elements
- `initCopyButtons()` — copy-to-clipboard for `.purecart-copy-key` buttons
- `initActivateForms()` — toggle inline activation form visibility
- `initDomainList()` — expand/collapse `.purecart-domain-list`
- `initChangelogToggles()` — toggle changelog visibility
- `initProductTabs()` — tab strip on product detail page
- `initResendForms()` — confirm dialog before resend submit

```javascript
// assets/js/purecart-myaccount.js
import { initKeyReveal }       from './modules/key-reveal.js';
import { initCopyButtons }     from './modules/copy-buttons.js';
import { initActivateForms }   from './modules/activate-forms.js';
import { initDomainList }      from './modules/domain-list.js';
import { initChangelogToggles } from './modules/changelog-toggles.js';
import { initProductTabs }     from './modules/product-tabs.js';
import { initResendForms }     from './modules/resend-forms.js';

document.addEventListener('DOMContentLoaded', () => {
    initKeyReveal();
    initCopyButtons();
    initActivateForms();
    initDomainList();
    initChangelogToggles();
    initProductTabs();
    initResendForms();
});
```

---

## PHP Data Layer

### `PureCartAccountData` Class

```php
// includes/MyAccount/PureCartAccountData.php

class PureCartAccountData {

    public static function get_summary( int $user_id ): array {
        $cache_key = 'purecart_dashboard_' . $user_id;
        $cached    = get_transient( $cache_key );
        if ( $cached !== false ) return $cached;

        $summary = [
            'license_count'   => self::get_license_count( $user_id ),
            'active_licenses' => self::get_active_license_count( $user_id ),
            'download_count'  => self::get_available_download_count( $user_id ),
            'update_count'    => self::get_pending_update_count( $user_id ),
        ];

        set_transient( $cache_key, $summary, HOUR_IN_SECONDS );
        return $summary;
    }

    // Cache is busted on:
    // - purecart_license_activated   → delete_transient
    // - purecart_license_revoked     → delete_transient
    // - purecart_file_downloaded     → delete_transient
    // - purecart_update_package_published → delete all dashboard transients

    public static function get_order_delivery_data( int $order_id ): array {
        // Returns [ { product_id, product_name, license, files[] } ]
        // Used on thank-you page and order detail section
    }

    public static function get_customer_licenses( int $user_id ): array {
        // Returns array of License objects for this customer
    }

    public static function get_customer_downloads( int $user_id ): array {
        // Returns array grouped by order: [ order_id => [ DownloadToken[] ] ]
    }

    public static function get_customer_updates( int $user_id ): array {
        // Returns array of [ product_id => { current_version, latest_version, channel } ]
        // Current version is derived from license activation record
        // Latest version is from {prefix}purecart_product_versions WHERE status = 'active'
    }
}
```

---

## Template Override System

Store owners can override any PureCart template by copying to their theme:

| Original path | Override path |
|---|---|
| `plugins/woo-digital-downloads/templates/myaccount/purecart-licenses.php` | `theme/purecart/myaccount/purecart-licenses.php` |
| `plugins/woo-digital-downloads/templates/myaccount/purecart-downloads.php` | `theme/purecart/myaccount/purecart-downloads.php` |
| `plugins/woo-digital-downloads/templates/myaccount/purecart-updates.php` | `theme/purecart/myaccount/purecart-updates.php` |
| `plugins/woo-digital-downloads/templates/myaccount/purecart-product.php` | `theme/purecart/myaccount/purecart-product.php` |
| `plugins/woo-digital-downloads/templates/order/purecart-thankyou.php` | `theme/purecart/order/purecart-thankyou.php` |
| `plugins/woo-digital-downloads/templates/emails/purecart-delivery.php` | `theme/purecart/emails/purecart-delivery.php` |

Template loader:
```php
function purecart_get_template( string $template_name, array $args = [] ): void {
    $theme_path  = get_stylesheet_directory() . '/purecart/' . $template_name;
    $plugin_path = PURECART_TEMPLATES . $template_name;
    $template    = file_exists( $theme_path ) ? $theme_path : $plugin_path;
    extract( $args, EXTR_SKIP );  // phpcs:ignore WordPress.PHP.DontExtract.extract_extract
    include $template;
}
```

---

## Developer Hooks

### Actions

| Hook | When fired | Args |
|---|---|---|
| `purecart_before_myaccount_licenses` | Top of licenses tab | `$user_id` |
| `purecart_after_myaccount_licenses` | Bottom of licenses tab | `$user_id` |
| `purecart_before_myaccount_downloads` | Top of downloads tab | `$user_id` |
| `purecart_after_myaccount_downloads` | Bottom of downloads tab | `$user_id` |
| `purecart_before_myaccount_updates` | Top of updates tab | `$user_id` |
| `purecart_after_myaccount_updates` | Bottom of updates tab | `$user_id` |
| `purecart_thankyou_rendered` | After thank-you section rendered | `$order_id` |
| `purecart_delivery_email_sent` | After delivery email sent | `$order_id, $customer_email` |
| `purecart_resend_links_requested` | When customer clicks resend | `$order_id, $user_id` |

### Filters

| Filter | Purpose | Args |
|---|---|---|
| `purecart_myaccount_menu_items` | Modify My Account nav items | `$items` |
| `purecart_thankyou_show_license` | Control license visibility on TY page | `$show, $order_id` |
| `purecart_thankyou_show_downloads` | Control download visibility on TY page | `$show, $order_id` |
| `purecart_delivery_email_subject` | Modify delivery email subject | `$subject, $order_id` |
| `purecart_expiry_warning_days` | Days before expiry to send warnings | `$days (default: [14, 3])` |
| `purecart_resend_rate_limit` | Rate limit in seconds for resend | `$seconds (default: 600)` |
| `purecart_dashboard_cache_ttl` | Cache TTL for dashboard summary | `$seconds (default: 3600)` |
| `purecart_account_product_url` | Override product detail page URL | `$url, $product_id, $user_id` |

---

## Access Control

Every My Account endpoint and POST handler enforces:
1. `is_user_logged_in()` — redirect to login if not
2. Ownership check — the license/order/token must belong to `get_current_user_id()`
3. Nonce verification — `wp_verify_nonce()` on all POST actions
4. Capability check — `woocommerce_view_order` capability or `customer` role

```php
// Standard guard at top of every endpoint template:
if ( ! is_user_logged_in() ) {
    wc_add_notice( __( 'Please log in to view your account.', 'purecart' ), 'error' );
    wp_safe_redirect( wc_get_page_permalink( 'myaccount' ) );
    exit;
}
$user_id = get_current_user_id();
```

---

## Phase Roadmap

**Phase 1 — Core My Account:**
- My Account tabs (Licenses, Downloads, Updates)
- Thank-you page with license + download
- Order detail augmentation
- `PureCartDeliveryEmail`
- `PureCartExpiryWarningEmail`
- License reveal/copy, activation/deactivation forms
- Download buttons with token validation
- Re-send download links

**Phase 2 — Enhanced UX:**
- Product detail unified page (`/my-account/purecart-product/{id}/`)
- Dashboard widget
- `PureCartUpdateNotificationEmail`
- `PureCartActivationEmail` (admin-toggled)
- Video inline player on downloads tab
- API access key management (`/my-account/purecart-api/`)

**Phase 3 — Advanced:**
- License certificate download (PDF)
- Geo-aware download notices (if geo-blocked, show "Not available in your region")
- Customer self-service renewal checkout
- Multi-language My Account templates (WPML / Polylang integration)
