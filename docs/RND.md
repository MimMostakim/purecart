# R&D Document — PureCart for WooCommerce
**Project:** `purecart`
**Path:** `D:\wampserver\www\wp-plugin\digital-downloads\wp-content\plugins\woo-digital-downloads`
**Date:** 2026-06-24
**Goal:** A WooCommerce extension that sells and manages WordPress Plugins and SaaS Products from a single platform — with licensing, auto-updates, secure downloads, subscription billing, SaaS provisioning, and anti-piracy built in.

> **Modular Architecture:** Every feature in this plugin is independently operable. A store selling only downloadable files can enable just the Downloads module. A store needing only license keys enables only Licensing. A SaaS company can run only SaaS Provisioning. Features integrate with each other when both are enabled but never require one another unless explicitly noted.

---

## Feature Modules

| Module | Phase | Standalone? | Key Classes |
|---|---|---|---|
| Secure Downloads | 1 | Yes | TokenManager, DownloadDispatcher |
| Licensing | 1 | Yes | LicenseGenerator, LicenseActivator |
| Plugin Updates | 1 | Yes (or with Licensing) | UpdateServer, VersionManager |
| SaaS Provisioning | 2 | Yes | AccountProvisioner, JwtIssuer |
| Subscriptions | 2 | Yes — full built-in engine | SubscriptionManager, RenewalEngine, DunningManager |
| Security & Anti-Piracy | 3 | Partial | RateLimiter, GeoBlocker, AbuseDetector |
| Git Integration | 4 | Requires Updates | GitHubSync |
| Abandoned Cart | 5 | Yes — fully built-in | CartWatcher, RecoveryEmailer, CartRestorer |
| Affiliates | 5 | Yes — fully built-in | AffiliateManager, CommissionEngine, PayoutManager |
| Analytics | 6 | Yes | RevenueReport, LicenseReport |

See individual feature RND files in this docs/ folder for detailed specifications per module.

---

## 1. Competitive Landscape

### 1.1 Easy Digital Downloads (EDD)
**URL:** https://easydigitaldownloads.com
**Model:** Self-hosted WordPress plugin. Free core + paid extensions.
**Trusted by:** 50,000+ businesses, 187 countries, 30M+ orders processed, 13+ years.

**What's free in EDD core:**
- Unlimited products and orders
- Cart & checkout
- Secure download links with expiry & download limits (built-in)
- Basic PayPal/Stripe integration
- Basic discount codes
- Customer account page
- Basic sales reports
- Email notifications

**What costs extra in EDD (paid extensions):**
| Feature | Annual Cost |
|---|---|
| Software Licensing | ~$199/yr |
| Subscriptions / Recurring Billing | ~$209/yr |
| Affiliate Management | ~$199/yr |
| Abandoned Cart Recovery | paid add-on |
| EU VAT Compliance | $40–$80/mo (3rd party) |
| Invoices & Receipts | ~$29/yr |
| Instalment Payments | paid extension |
| Physical Products | paid extension |
| Advanced Reporting | higher plan |
| AWS S3 File Storage | extra cost |

**EDD Pricing (2026):**
- Free core: 3% transaction fee
- $99/yr – 1 site
- $199/yr – 1 site, more features
- $299/yr – 2 sites
- $499/yr – 3 sites
- No lifetime plans

**EDD Strengths:**
- Most mature digital-download solution for WordPress (13 years)
- Purpose-built: expiring download links, download attempt limits, IP tracking included free
- Huge ecosystem and documentation
- REST API included

**EDD Weaknesses:**
- Add-on cost stacks up fast ($499–$999/yr for full features on 3 sites)
- No lifetime license option
- No built-in order bumps, cart abandonment, or affiliate system
- UI uses shortcodes, no visual checkout builder

---

### 1.2 SureCart
**URL:** https://surecart.com
**Model:** Managed eCommerce platform (SaaS backend + WordPress frontend plugin).
**Ratings:** 4.8/5 WordPress, 4.7/5 G2, 4.3/5 Trustpilot

**Pricing:**
| Plan | 1 Store | 5 Stores | Unlimited |
|---|---|---|---|
| Free (Launch) | $0 + 2.9% fee | $0 + 2.9% fee | $0 + 2.9% fee |
| Pro Yearly | $179/yr | $249/yr | $399/yr |
| Pro Lifetime | $599 one-time | $999 one-time | $1,699 one-time |

**SureCart Weaknesses:**
- Backend is SaaS — data lives on SureCart servers
- No dedicated WordPress plugin software licensing extension
- Relatively newer, smaller ecosystem

---

### 1.3 FluentCart
**URL:** https://fluentcart.com
**By:** WPManageNinja (FluentCRM, FluentForms, FluentSupport team)
**Model:** Self-hosted WordPress plugin. Free core + Pro license.

**FluentCart Strengths:**
- Self-hosted, full control
- Licensing and subscriptions built-in from day one
- Headless REST API support
- Deep Fluent ecosystem integration
- Earlybird lifetime deal from $249

**FluentCart Weaknesses:**
- Newer, smaller ecosystem
- No managed infrastructure

---

### 1.4 SUMO Subscriptions for WooCommerce
**URL:** https://codecanyon.net/item/sumo-subscriptions-woocommerce-subscription-system/16486054
**By:** FantasticPlugins | **Price:** $49 | **Sales:** 5,063 | **Rating:** 4.38/5 | **Version:** 17.5.0 (Feb 2026)

#### Core Capabilities
Simple, Variable, and Grouped product subscriptions. Order Subscriptions (attach recurring billing to any product). Mixed cart (subscription + non-subscription in one checkout). Multiple subscriptions per checkout. Free trial + paid trial. Sign-up fee. Switching between identical variations. Upgrade/Downgrade with prorate or full price. Payment synchronization. Customer-selectable renewal frequency and instalment count.

#### Renewal Methods
Auto-renewal via Stripe (requires WooCommerce Stripe Plugin), PayPal (requires WooCommerce PayPal Payments), PayPal Subscriptions (billing agreements), SUMO Reward Points (requires their separate plugin). Manual renewal via any WC gateway. Falls back to manual renewal if auto-renewal is cancelled.

#### Subscriber Controls
Pause, Cancel, Resubscribe. Update subscription quantity.

#### Digital Product Features
Drip downloadable content, additional digital downloads, manually create subscription orders for any user, include/exclude shipping in renewal.

#### Admin Features
Include/exclude tax in renewal. Overdue and suspend period settings. Multiple payment reminder emails. Multiple overdue and suspend reminder emails. Bulk update subscription product settings.

#### Discount & Coupon Types
Sign-up fee coupon type. Recurring fee coupon type.

#### Admin Panel Structure

**Main subscription list table columns:** Subscription ID, Customer, Status, Recurring Amount, Next Payment Date, Actions (Edit / View / Cancel).

**Settings tabs:**

| Tab | Purpose | Key Options |
|---|---|---|
| General Settings | Global behavior | Enable/disable, cart behavior, trial settings |
| Order Subscription | Link subs to orders | Auto-renewal orders, order status sync |
| Synchronization | Gateway/CRM sync | Stripe/PayPal webhook URLs |
| Upgrade/Downgrade | Plan change rules | Proration, immediate vs. next-cycle |
| My Account | Customer portal | Shortcodes, allow pause/cancel |
| Advanced | Technical config | Cron intervals, debug mode |
| Bulk Actions | Scale management | Bulk status changes, retry payments |
| Messages | Communications | Email/SMS templates |

**Role-Based Access:**

| Area | Admin | Shop Manager | Customer |
|---|---|---|---|
| General Settings | ✅ | ✅ | ❌ |
| Bulk Actions | ✅ | ❌ | ❌ |
| My Account portal | ✅ | ✅ | ✅ (own only) |

#### Workflow & Automation
- Renewals: configured in "Order Subscription" tab; cron jobs process them automatically
- Plan Changes: rules in "Upgrade/Downgrade" tab; customer requests via My Account; proration applied
- Payment Failures: configurable 3 retry attempts; admin retries via Bulk Actions; customer notified by email/SMS

#### Add-On Dependencies (weaknesses)
- Membership subscriptions require separate SUMO Memberships plugin
- Recurring donations require separate SUMO Donations plugin
- SUMO Reward Points as renewal method requires their separate plugin
- Single-site CodeCanyon license — no multi-site option at $49

#### Key Gaps vs PureCart
- No software license key generation or activation tracking
- No plugin update server
- No SaaS account provisioning
- No signed download tokens
- No API key management
- No geo-blocking or abuse detection
- No affiliate module
- No abandoned cart recovery
- Automatic renewal limited to Stripe/PayPal (no PayFast, Authorize.net, etc. natively)
- No CSV export of subscription data

---

### 1.5 Abandoned Cart Recovery — Ecosystem Research

| Plugin | Price | Installs | Rating | Notable |
|---|---|---|---|---|
| Cart Abandonment Recovery (Brainstorm Force) | Free | 300,000+ | 4.8/5 | Market leader, free coupons, 1-click recovery |
| WC Recover Abandoned Cart (FantasticPlugins) | $49 | 4,984 sales | 4.70/5 | Segmentation, manual mailing, multi-currency |
| Abandoned Cart Lite (Tychesoftwares) | Free | 20,000+ | 4.1/5 | Webhooks in free tier, Action Scheduler |
| CartBounty | Free | 10,000+ | 4.8/5 | Exit Intent free, anonymous cart capture, best hooks |

**PureCart Strategy:** Fire `purecart_cart_abandoned` / `purecart_cart_recovered` action hooks — any of these plugins can integrate.

---

### 1.6 Affiliate Management — Ecosystem Research

| Plugin | Price | Sales | Rating | Scope |
|---|---|---|---|---|
| SUMO Affiliates for WooCommerce | $39 | 620 | 4.25/5 | WooCommerce-only |
| SUMO Affiliates Pro | $49 | 954 | 4.53/5 | Any WordPress site, form/email commissions |

**PureCart Strategy:** Webhook bridge — fire events on `license_activated`, `order_completed`, `subscription_renewed` so affiliate plugins can consume commission data.

---

### 1.7 Free Subscription Billing Alternatives

| Plugin | Price | Installs | Rating | Notable |
|---|---|---|---|---|
| Subscriptions for WooCommerce (WP Swings) | Free | 10,000+ | 4.4/5 | Subscription Box, AI widget, LearnPress |
| Subscription & Recurring Payment (Convers Lab) | Free | 700+ | 4.9/5 | iDEAL/SEPA free, highest rated |
| Subscriptions by Sublium (FunnelKit) | Free + 2.9% fee | 300+ | 5.0/5 | Variable products + installments free, FunnelKit ecosystem |

**PureCart Position:** PureCart builds its own full subscription engine (see `docs/RND-subscriptions.md`). It handles recurring billing via Stripe and PayPal through WooCommerce's gateway layer, plus links subscription state to license expiry and SaaS account status. PureCart does not depend on any of the free plugins above.

---

### 1.8 License Key / Serial Number Managers — Direct Competitor

**WC Serial Numbers (PluginEver):** https://wordpress.org/plugins/wc-serial-numbers/
Free + Pro | 1,000+ installs | 4.7/5 | Updated May 2026

Pre-generated key delivery: import keys via CSV/TXT, auto-deliver on order complete, HTTP API + REST API for validate/activate/deactivate, DB encryption, customer portal, HPOS + Blocks + WPML. Pro adds: key generator, variable products, bulk export, Twilio SMS.

**PureCart vs WC Serial Numbers:**
| | WC Serial Numbers | purecart |
|---|---|---|
| Key generation | Import or Pro generator | Dynamic random_bytes() — no import needed |
| Activation tracking | Basic API | Full domain+environment with staging exemption |
| Update delivery | Not included | /purecart/v1/plugin/update-check |
| ZIP versioning | Not included | Multi-channel, checksum, changelog |
| SaaS provisioning | Not included | Full webhook-based |
| Download tokens | Not included | Signed expiring tokens per order |
| Geo-blocking | Not included | Country-level block list |

---

### 1.9 Download Manager (WPDM) + Premium Packages

**Download Manager:** https://wordpress.org/plugins/download-manager/
Free + Pro | 100,000+ installs | 4.1/5 | Updated June 2026 (v3.3.58)

**Premium Packages (WPDM add-on):** https://wordpress.org/plugins/wpdm-premium-packages/
Free | 3,000+ installs | 3.8/5 | Updated Jan 2026 (v6.2.0)

WPDM is a standalone file management and digital store system — it is NOT a WooCommerce extension. It runs its own cart, checkout, and PayPal integration. Premium Packages is a free add-on that adds ecommerce to WPDM.

**What WPDM does well (features to study):**
- Ad blocker detection with custom message and download link disable
- Video file protection: allow play but block download
- Media library file protection
- Integrated document viewer (DOC, PDF, PowerPoint) — Microsoft Office preview API
- Server file browser + asset manager with version management (Pro)
- Color scheme (System/Light/Dark) with dark mode support
- Chunk upload to override HTTP max upload limit
- Category-level access control
- Download speed control
- IP block list for bot prevention
- CBC bit-flipping attack protection on Crypt class (fixed v3.3.41)
- Free Google Drive, Dropbox, Box.com, OneDrive adapters (15–10 GB free)

**What Premium Packages does well (features to study):**
- Mini cart widget in 3 styles: dropdown, slide panel, floating button — with nav menu integration
- `[wpdmpp_pay_link]` shortcode: accept payment without creating a product (dynamic product)
- "Pay What You Want" pricing with minimum floor
- License-based price tiers: Personal / Extended / Unlimited per product
- Order expiration (e.g., 1-year support access, then renewal prompt)
- Abandoned cart recovery: up to 5 follow-up emails with dynamic coupon codes
- Email cart to someone else / save cart for later
- Sell extra services (gigs) as add-ons at checkout
- 2-click checkout — simplest possible checkout for digital goods
- Manual order creation from admin

**WPDM Weaknesses / PureCart Opportunity:**
- Not WooCommerce native — merchants must maintain a second commerce system
- Critical review: "People end up downloading content for FREE" — delivery security gap
- No staging/local environment exemption for licenses
- PayPal only (Stripe requires paid add-on)
- No SaaS provisioning, no JWT, no GitHub sync
- No WooCommerce HPOS compatibility by definition

**PureCart Decisions from WPDM Research:**
- Adopt ad blocker detection feature for Downloads module
- Adopt "play but don't download" for video files
- Adopt dark/light/system color scheme toggle in admin UI
- Adopt dynamic payment link concept as a WooCommerce quick-buy mechanism
- Adopt 2-click checkout concept via Digital Goods Checkout integration (§1.11)
- Adopt order expiration as a PureCart entitlement feature (already planned)

---

### 1.10 Digital License Manager (DLM)

**URL:** https://wordpress.org/plugins/digital-license-manager/
Free + Pro | 700+ installs | 4.7/5 | Updated Feb 2026 (v1.8.4) | By CodeVerve

DLM is a WooCommerce extension for selling and managing license keys. It is the closest free direct competitor to PureCart's Licensing module.

**DLM Free — what it covers:**
- Licenses table with search, filter, edit
- Activations table — each activation as a DB row (not a counter): stores IP, user-agent, label, environment
- License Generators — configure key format/length/character sets
- Deliver from stock (pre-generated) OR from Generator (dynamic) per product
- Stock sync: product stock count = available license count in DB
- Simple and Variable product support
- Configurable delivery order status
- My Account: licenses list + single license page with activation log
- Manual activation from My Account (customer can activate without API call)
- PDF License Certificate download
- License key in order confirmation email + re-send from admin
- REST API: Licenses, Generators, Software CRUD + auth by API Key
- CSV import/export with duplicate check
- HPOS compatible
- Gutenberg blocks: Licenses Table + License Check Form
- Shortcodes for the above
- Refund handling with configurable behavior (added v1.7.1)
- Per-item `_dlm_license_id` order meta for developer access
- Migration tool from "License Manager for WooCommerce"
- Client libraries: PHP, C++, C#, Python
- Uses `defuse/PHP-Encryption` — stores key files in `wp-content/uploads/dlm-files`
- Removed jQuery entirely — uses Tom-Select + Flatpickr

**DLM Pro — what requires paid upgrade:**
- WooCommerce Subscriptions integration (sync license expiry to sub status)
- Software Releases (publish releases per software, gallery, changelog)
- Software Download page in My Account
- Software Download REST API endpoint
- WordPress plugin/theme auto-updater
- WPML support
- License Revealing (blur key until customer clicks)

**PureCart vs DLM:**
| Feature | DLM | purecart |
|---|---|---|
| Key generation | Generator (configurable format) | `random_bytes()` — cryptographically secure |
| Activation tracking | DB row per activation with IP/UA/label | Same + environment (staging/local) + geo |
| Staging exemption | No | Yes — auto-exempt staging/local from limits |
| Remote kill-switch | Suspend via admin | Instant REST revocation |
| Plugin update API | Pro only | Built-in (Phase 1) |
| GitHub sync | No | Yes (Phase 4) |
| SaaS provisioning | No | Yes (Phase 2) |
| Subscription sync | Pro (needs WC Subscriptions extension) | Built-in subscription engine |
| PDF certificate | Yes (free) | Not planned initially |
| Client libraries | PHP, C++, C#, Python | PHP only (v1), expand later |
| Encryption | defuse/PHP-Encryption | Encrypt in DB + rotating keys |
| Works without WooCommerce | Yes | No — WooCommerce extension only |

**PureCart Decisions from DLM Research:**
- **PDF License Certificate** is a meaningful feature — add to roadmap (Phase 3 or later, use `spipu/html2pdf`)
- **Manual activation from My Account** — let customers activate without API. Add to My Account license tab.
- **License Revealing** (blur key, click to reveal) — good UX. Adopt in My Account.
- **Copy to clipboard** button on license key display — adopt everywhere
- **Per-item `_purecart_license_id` order meta** — already planned; confirm it matches DLM pattern
- **Migration tool** — build a DLM → PureCart migration tool for v1.1
- **Tom-Select instead of Select2** — confirm PureCart admin also avoids jQuery for dropdowns
- Encryption: store encrypted in DB, key file in `wp-content/uploads/purecart-keys/` — document backup requirement

---

### 1.11 Digital Goods Checkout for WooCommerce

**URL:** https://wordpress.org/plugins/woo-checkout-for-digital-goods/
Free + Pro | 3,000+ installs | 4.5/5 | Updated May 2026 (v3.8.4) | By Dotstore

A focused WooCommerce plugin that removes unnecessary billing/shipping fields from checkout when the cart contains only virtual/downloadable products.

**What it does:**
- Removes: company, last name, address lines, city, state, postcode, phone, country
- Optional: remove order notes field
- Quick checkout button on shop page and product page
- Mixed cart aware: only activates when ALL products are digital
- HPOS compatible, Blocks compatible
- 41 reviews, 4.5/5 stars — "works exactly as needed"

**Pro features:**
- Apply to specific categories/tags only
- Delayed account creation (after payment)
- Post-payment additional fields
- User role restrictions

**Known issue:** Conflict with FluentCRM SMTP driver (one user report).

**PureCart Decision:**
PureCart should build this behavior directly into its checkout module rather than requiring a separate plugin. The existing §6.6 Checkout Optimization covers this. Specifically:
- `woocommerce_checkout_fields` filter to remove address fields when cart is digital-only
- Quick checkout button: a `[purecart_quick_checkout]` shortcode option
- The Pro's "delayed account creation" pattern is useful for PureCart's "optional account creation" UX goal
- Document the FluentCRM SMTP incompatibility pattern — avoid hooking `wp_mail` filters

---

### 1.12 ArraySubs — Subscriptions + Membership

**URL:** https://wordpress.org/plugins/arraysubs/
Free | 80+ installs | No reviews yet (launched March 2026) | By Emran

ArraySubs is a comprehensive free WooCommerce subscription + membership plugin. It is the most feature-complete free alternative to WooCommerce Subscriptions discovered in PureCart research.

**What's free (complete list of notable features):**
- Subscription products: simple + variable, per-variation configuration
- Billing: daily, weekly, monthly, yearly, custom day intervals, lifetime
- Free trials with one-trial-per-customer enforcement
- Sign-up fees + different renewal pricing after N cycles (stepped)
- Renewal sync: align all renewals to a shared calendar date
- 2-phase grace periods: Active grace (default 3 days) → On-Hold grace (7 days) → Cancellation
- Skip next renewal (configurable max skips + cutoff)
- Pause/vacation mode (configurable duration + cooldown + auto-resume)
- Plan switching: upgrades, downgrades, crossgrades — 3 proration methods
- **Retention flow builder**: cancellation reasons → 4 offer types (discount, pause, downgrade, contact support) → confirm
- **Retention analytics**: 8 KPI cards, churn reasons chart, offer distribution, trend chart, activity logs
- Customer portal: full self-service in WooCommerce My Account
- Member access control: 6 rule types, 9 condition types, 12 operators, nested AND/OR
- Role mapping: assign WP roles based on subscription status (7 status behaviors)
- Member-only discounts (percentage/fixed, per-product or per-cart)
- Members-only commerce: hide/block products for non-members
- Content restriction + URL restriction + download restriction (signed URLs)
- 16 email notifications (13 customer + 3 admin) with 50+ placeholders
- Refund management: 3 policies, prorated refunds with preview
- 9-step setup wizard with 7 business type profiles
- Settings export/import (JSON, section-level)
- Custom profile fields + avatar upload
- My Account editor (drag-drop menu reorder, custom endpoints)
- Login as User (admin impersonation, 6 entry points, nested sessions)
- HPOS compatible, Block checkout compatible
- CSV/JSON subscription export

**PureCart vs ArraySubs:**
| Feature | ArraySubs | purecart |
|---|---|---|
| Subscription engine | Full built-in | Full built-in (planned) |
| Retention flow | 4 offer types + analytics | Not planned (Phase 5+) |
| Member access control | 6 rule types | Not in scope |
| Content restriction | Yes (posts, pages, CPT) | Not in scope |
| URL restriction | Yes | Not in scope |
| Download restriction | Signed URLs | Full token + IP + geo |
| License keys | No | Yes (Phase 1) |
| Plugin update API | No | Yes (Phase 1) |
| SaaS provisioning | No | Yes (Phase 2) |
| GitHub sync | No | Yes (Phase 4) |
| Geo-blocking | No | Yes (Phase 3) |
| JWT for SaaS auth | No | Yes (Phase 2) |
| Focuses on WooCommerce | Yes | Yes |

**PureCart Decisions from ArraySubs Research:**
- **Retention flow** (cancellation reason → offer → confirm) is a high-value subscription feature. Add to Subscriptions module roadmap (Phase 2 extension).
- **2-phase grace period** (active grace → on-hold → cancel) is the right pattern. Adopt for PureCart dunning: `_purecart_sub_active_grace_days` + `_purecart_sub_onhold_grace_days` settings.
- **Skip next renewal** — add to customer My Account portal for PureCart subscriptions.
- **Pause/vacation mode** — add with configurable max duration and cooldown.
- **Plan switching with 3 proration methods** — adopt: Prorate Immediately / Apply at Renewal / No Proration.
- **Renewal sync** (align all renewals to a fixed calendar date) — useful for subscription box scenario. Add to PureCart Subscriptions.
- **Login as User** — add to PureCart admin tools (helps support staff debug customer issues).
- **One-trial-per-customer enforcement** — prevent trial abuse. Add `_purecart_trial_used` user meta check.
- **Stepped renewal pricing** (different price after N cycles) — store as `_purecart_sub_step_price` + `_purecart_sub_step_after` product meta.
- ArraySubs' download restriction uses signed URLs — confirms PureCart's token approach is correct.
- ArraySubs' role mapping (assign WP roles on subscription status) — add as optional PureCart feature.

---

### 1.13 Payment Gateways — Reference

**WooCommerce Stripe:** 700,000+ installs, free, 23 payment methods, Stripe Radar, Apple/Google Pay, BNPL. PureCart hooks into Stripe-fired renewal events.

**WooCommerce PayPal Payments:** 800,000+ installs, free, PayPal + Venmo + Pay Later + Fastlane + Apple/Google Pay + Crypto. PureCart hooks into PayPal-fired order status events.

---

### 1.14 JWT Authentication — Library Research

**jwt-auth (usefulteam):** 6,000 installs, 5.0/5, has refresh tokens + rotation. NOT updated in 2+ years — WP 7.x untested. Single-developer risk.

**JWT Authentication for WP REST API (tmeister):** 60,000+ installs, 4.4/5, React admin dashboard, actively maintained. No refresh token in free tier — Pro required.

**PureCart Decision:** Use `firebase/php-jwt` directly in `includes/SaaS/JwtIssuer.php` — avoids namespace collisions, plugin conflicts, and external dependency risks. HS256, 10-min access tokens, 30-day refresh tokens stored server-side.

---

### 1.15 License Manager for WooCommerce (LMFWC)

**URL:** https://wordpress.org/plugins/license-manager-for-woocommerce/
**By:** Saad Iqbal / WPExperts.io | **Price:** Free + Pro | **Installs:** 6,000+ | **Rating:** 4.6/5 (148 reviews) | **Version:** 3.0.15 (Dec 2025)

LMFWC is a WooCommerce license key management plugin forked from / inspired by the original Digital License Manager codebase. It is one of the most actively maintained free WooCommerce licensing plugins on WordPress.org, and DLM's migration tool explicitly supports migrating from it.

**LMFWC Free — what it covers:**
- Automated license key generation and delivery on order complete or processing
- Encrypted storage — keys stored using two cryptographic secret files (`defuse.txt`, `secret.txt`) in `wp-content/uploads/lmfwc-files/`
- License key generators with configurable format, character set, and length
- Import license keys from CSV or TXT file
- Export license keys as CSV or PDF
- Variable product support (per-variation generator assignment)
- Automatic stock management — stock count auto-syncs with key inventory
- REST API — activate, deactivate, validate, create, update, delete licenses and generators
- Customer My Account — single license page with activation log
- Manual activation/deactivation from My Account
- License PDF Certificate download (with optional company logo)
- Copy-to-clipboard button on license key display
- Key reveal (show/hide) in My Account
- Re-send license key email from admin
- Bulk import and "Mark as sold / Mark as delivered" actions
- Migration tool from Digital License Manager (DLM)
- Past-order license generator (retroactively issue keys for old orders)
- HPOS compatible
- Configurable delivery trigger: order status "Completed" or "Processing"
- Duplicate key prevention (configurable — allow or block)
- Multiple keys per purchase (quantity-aware delivery)

**LMFWC Pro — what requires paid upgrade:**
- **Download Expires** — re-generate expired product downloads
- **Product Download Detail** — changelog and version per product tied to license
- **Validate by Customer ID** — verify license via customer ID or serial key (not just license key string)
- **Ping Request** — lightweight client-server connection check endpoint
- **New License Key Upon Subscription Renewal** — issue a brand-new key on each renewal
- **Extend License Key Upon Subscription** — extend expiry on the existing key instead of issuing a new one
- **Webhooks Integration** — event-based license and key triggers to external endpoints
- **QR Code Activation** — scannable QR code linked to each license for instant access

**Critical Risk — Crypto Key File Loss:**
LMFWC stores its encryption secrets as two files on disk. If these files are lost (server migration, accidental deletion, backup failure), **all encrypted license keys in the database become permanently unrecoverable**. This is a significant production risk that multiple users have hit.

**LMFWC Weaknesses / ADD Opportunity:**

| Weakness | ADD Opportunity |
|---|---|
| Crypto key files can be lost → permanent data loss | ADD uses `random_bytes()` dynamic generation — no static crypto files to lose |
| No staging/localhost environment exemption | ADD auto-exempts staging/local from activation limits |
| Activation records accumulate on deactivate/reactivate | ADD has `UNIQUE KEY idx_license_domain` — prevents duplicates |
| Plugin update API = Pro only (via product download detail) | ADD includes plugin update API in Phase 1 free |
| No subscription engine | ADD has built-in subscription module |
| No SaaS provisioning | ADD includes SaaS provisioning |
| No signed download tokens | ADD uses token-gated secure delivery |
| No geo-blocking | ADD supports country-level block lists |
| No GitHub sync | ADD plans GitHub webhook integration (Phase 4) |
| No JWT for SaaS | ADD issues JWTs for SaaS login flows |
| Migration only from DLM | ADD's migration tool targets DLM, WC Serial Numbers, AND LMFWC |

**ADD Decisions from LMFWC Research:**
- **QR Code Activation** — useful for physical product bundles, conference passes, printed licenses. Add to roadmap (Phase 3 or 4). Render QR via `endroid/qr-code` Composer package on the license certificate PDF.
- **Ping endpoint** — lightweight `GET /add/v1/license/ping` that returns `{ status: 'ok', timestamp }` without consuming an activation. Useful for remote plugin health checks. Add to Phase 1 REST API.
- **Two subscription renewal behaviors** — ADD should support both LMFWC Pro modes: (a) issue a brand-new key on renewal, or (b) extend existing key expiry. Controlled by `_add_renewal_behavior` product meta with values `new_key` | `extend`.
- **Multiple keys per purchase quantity** — when an order line item has qty > 1, ADD's `OrderHandler` must generate `qty` license keys, one per unit, and deliver all in the confirmation email. Store as multiple `add_licenses` rows with the same `order_id`.
- **Delivery order status** — add a setting `add_license_delivery_status` with options `completed` | `processing` | `both`. Default: `completed`.
- **Migration from LMFWC** — the `LicenseMigrator` WP-CLI command should support `--from=lmfwc` as a third source alongside `dlm` and `wc-serial-numbers`.
- **Past-order key generation** — add an admin tool to retroactively generate license keys for historical orders that predate the plugin. Useful for merchants migrating from manual key delivery.
- **Validate by Customer ID** — add a `GET /add/v1/license/check?user_id={id}` variant so merchants can look up all licenses for a customer in one API call.

---

## 2. Competitor Feature Gap Analysis

**Features none of the researched competitors handle for WooCommerce natively:**
- Automatic plugin update delivery tied to WooCommerce order (DLM Pro only; LMFWC Pro only)
- GitHub/Bitbucket private repo → auto ZIP build → update API (no competitor)
- JWT-based SaaS account provisioning from WooCommerce checkout (no competitor)
- Geo-blocking on file downloads (no competitor)
- Remote license kill-switch (no competitor)
- Staging/localhost exemption for site-limit licenses (no competitor — LMFWC/DLM do not have this)
- WooCommerce order → SaaS account creation webhook flow (no competitor)
- Dynamic `random_bytes()` key generation without static crypto files (no competitor — LMFWC/DLM use disk-stored secrets)

**Features competitors do have that PureCart should match or exceed:**
- PDF license certificate (DLM free, LMFWC free) → PureCart roadmap Phase 3
- Manual license activation from My Account (DLM free, LMFWC free) → PureCart My Account tab
- License key "copy to clipboard" (DLM free, LMFWC free) → PureCart My Account + order page
- License key reveal/blur (DLM free, LMFWC free) → PureCart My Account
- QR Code on license certificate (LMFWC Pro) → PureCart roadmap Phase 3/4
- Multiple keys per purchase quantity (LMFWC free) → PureCart OrderHandler quantity loop
- Delivery on "processing" status option (LMFWC free) → PureCart settings `purecart_license_delivery_status`
- Past-order retroactive key generation (LMFWC free) → PureCart admin tool
- 2-click / quick checkout for digital-only carts (Digital Goods Checkout) → PureCart checkout module
- Ad blocker detection on download page (WPDM) → PureCart Downloads module
- Video play-but-no-download protection (WPDM) → PureCart Downloads module
- Retention flow builder on subscription cancellation (ArraySubs free) → PureCart Subscriptions Phase 2
- 2-phase grace period on subscription payment failure (ArraySubs) → PureCart dunning engine
- Skip next renewal + pause/vacation mode (ArraySubs free) → PureCart customer portal
- Stepped renewal pricing after N cycles (ArraySubs free) → PureCart subscription product config
- Dark/light/system color scheme toggle in admin (WPDM) → PureCart admin panel
- New key vs. extend key on subscription renewal (LMFWC Pro) → PureCart `_purecart_renewal_behavior` product meta

---

## 3. Project Architecture

### 3.1 Core Philosophy
**WooCommerce handles:** Checkout, cart, orders, coupons, payment gateways, customer accounts.
**PureCart handles:** Everything else — licensing, downloads, updates, SaaS, subscriptions, security, and analytics.

### 3.2 Module Structure

```
woo-digital-downloads/
├── purecart.php                     # Main plugin file
├── includes/
│   ├── Commerce/                    # WooCommerce integration layer
│   │   ├── OrderHandler.php         # woocommerce_order_status_completed
│   │   ├── ProductTypes.php         # Custom product type registration
│   │   └── WebhookHandler.php       # Outgoing webhooks
│   │
│   ├── Licensing/                   # License system
│   │   ├── LicenseGenerator.php     # Key generation (UUID-based)
│   │   ├── LicenseActivator.php     # Domain activation / deactivation
│   │   ├── LicenseValidator.php     # API endpoint for plugin check
│   │   ├── LicenseExpiry.php        # Cron-based expiry enforcement
│   │   └── LicenseRevoke.php        # Kill-switch / instant revocation
│   │
│   ├── Downloads/                   # Secure file delivery
│   │   ├── TokenManager.php         # Signed, expiring download tokens
│   │   ├── DownloadDispatcher.php   # Serve file via PHP (no direct URL)
│   │   ├── DownloadLogger.php       # IP, user-agent, geo, count log
│   │   └── GeoBlocker.php           # Country-level block list
│   │
│   ├── Updates/                     # WordPress plugin auto-update API
│   │   ├── UpdateServer.php         # /wp-json/purecart/v1/plugin/update
│   │   ├── VersionManager.php       # Upload/manage plugin ZIP versions
│   │   ├── ChangelogManager.php     # Version notes storage
│   │   └── GitHubSync.php           # GitHub webhook → auto ZIP import
│   │
│   ├── Subscriptions/               # Recurring billing
│   │   ├── SubscriptionManager.php  # Create/renew/cancel
│   │   ├── DunningManager.php       # Failed payment retry + emails
│   │   └── PlanUpgrade.php          # Proration + upgrade/downgrade
│   │
│   ├── SaaS/                        # SaaS product provisioning
│   │   ├── AccountProvisioner.php   # Create SaaS user on order complete
│   │   ├── PlanSyncer.php           # Sync WooCommerce plan to SaaS
│   │   ├── ApiKeyManager.php        # Generate/revoke API keys
│   │   └── JwtIssuer.php            # Issue JWT for SaaS login
│   │
│   ├── CustomerDashboard/           # My Account portal
│   │   ├── DashboardController.php  # WooCommerce My Account tabs
│   │   ├── LicenseTab.php           # View, activate, deactivate sites
│   │   ├── DownloadTab.php          # Version history + re-download
│   │   ├── ApiKeyTab.php            # Manage API keys
│   │   └── UsageTab.php             # Usage stats, plan status
│   │
│   ├── Marketing/                   # Emails and growth
│   │   ├── EmailAutomation.php      # Transactional email triggers
│   │   ├── AbandonedCart.php        # Abandoned cart capture + follow-up
│   │   └── AffiliateConnector.php   # Webhook bridge to affiliate tools
│   │
│   ├── Analytics/                   # Reporting
│   │   ├── RevenueReport.php        # MRR, ARR, LTV
│   │   ├── LicenseReport.php        # Active/expired/abused
│   │   └── DownloadReport.php       # Downloads per product/version
│   │
│   ├── Security/                    # Anti-piracy and fraud
│   │   ├── RateLimiter.php          # Throttle activation/download attempts
│   │   ├── AbuseDetector.php        # Shared license / multi-country detection
│   │   └── ChecksumVerifier.php     # SHA-256 file integrity
│   │
│   └── API/                         # REST API endpoints
│       ├── LicenseEndpoints.php
│       ├── UpdateEndpoints.php
│       ├── DownloadEndpoints.php
│       └── SaaSEndpoints.php
│
├── admin/                           # WordPress admin UI
│   ├── views/
│   └── assets/
├── src/                           # WordPress admin UI
│   ├── app/
│   ├── others/
│   └── blocks/
│
├── assets/                          # Frontend JS/CSS
└── templates/                       # Email templates, dashboard templates
```

---

## 4. Database Schema

### wp_purecart_licenses
```sql
CREATE TABLE wp_purecart_licenses (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_id        BIGINT UNSIGNED NOT NULL,
    user_id         BIGINT UNSIGNED NOT NULL,
    product_id      BIGINT UNSIGNED NOT NULL,
    license_key     VARCHAR(64) NOT NULL UNIQUE,
    plan_type       ENUM('single','multi','unlimited','lifetime') DEFAULT 'single',
    status          ENUM('active','expired','revoked','suspended') DEFAULT 'active',
    activation_limit INT UNSIGNED DEFAULT 1,
    activated_count  INT UNSIGNED DEFAULT 0,
    expires_at      DATETIME NULL,
    created_at      DATETIME NOT NULL,
    updated_at      DATETIME NOT NULL,
    PRIMARY KEY (id),
    KEY idx_license_key (license_key),
    KEY idx_user_id (user_id)
);
```

### wp_purecart_license_activations
```sql
CREATE TABLE wp_purecart_license_activations (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    license_id      BIGINT UNSIGNED NOT NULL,
    domain          VARCHAR(255) NOT NULL,
    ip_address      VARCHAR(45),
    environment     ENUM('production','staging','local') DEFAULT 'production',
    activated_at    DATETIME NOT NULL,
    last_check      DATETIME,
    PRIMARY KEY (id),
    KEY idx_license_id (license_id),
    KEY idx_domain (domain)
);
```

### wp_purecart_downloads
```sql
CREATE TABLE wp_purecart_downloads (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_id        BIGINT UNSIGNED NOT NULL,
    user_id         BIGINT UNSIGNED NOT NULL,
    product_id      BIGINT UNSIGNED NOT NULL,
    file_id         BIGINT UNSIGNED NOT NULL,
    token           VARCHAR(128) NOT NULL UNIQUE,
    download_count  INT UNSIGNED DEFAULT 0,
    max_downloads   INT UNSIGNED DEFAULT 3,
    expires_at      DATETIME NOT NULL,
    ip_address      VARCHAR(45),
    country_code    VARCHAR(2),
    created_at      DATETIME NOT NULL,
    PRIMARY KEY (id),
    KEY idx_token (token)
);
```

### wp_purecart_download_logs
```sql
CREATE TABLE wp_purecart_download_logs (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    download_id     BIGINT UNSIGNED NOT NULL,
    ip_address      VARCHAR(45),
    user_agent      TEXT,
    country_code    VARCHAR(2),
    downloaded_at   DATETIME NOT NULL,
    PRIMARY KEY (id)
);
```

### wp_purecart_product_versions
```sql
CREATE TABLE wp_purecart_product_versions (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    product_id      BIGINT UNSIGNED NOT NULL,
    version         VARCHAR(20) NOT NULL,
    file_path       TEXT NOT NULL,
    checksum_sha256 VARCHAR(64),
    requires_wp     VARCHAR(10),
    tested_wp       VARCHAR(10),
    requires_php    VARCHAR(10),
    channel         ENUM('stable','beta') DEFAULT 'stable',
    changelog       LONGTEXT,
    released_at     DATETIME NOT NULL,
    PRIMARY KEY (id),
    KEY idx_product_version (product_id, version)
);
```

### wp_purecart_subscriptions
```sql
CREATE TABLE wp_purecart_subscriptions (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id         BIGINT UNSIGNED NOT NULL,
    product_id      BIGINT UNSIGNED NOT NULL,
    order_id        BIGINT UNSIGNED NOT NULL,
    license_id      BIGINT UNSIGNED,
    status          ENUM('active','cancelled','paused','expired','past_due') DEFAULT 'active',
    billing_cycle   ENUM('monthly','yearly') DEFAULT 'yearly',
    starts_at       DATETIME NOT NULL,
    expires_at      DATETIME,
    renewal_at      DATETIME,
    cancelled_at    DATETIME NULL,
    PRIMARY KEY (id),
    KEY idx_user_id (user_id),
    KEY idx_renewal (renewal_at)
);
```

### wp_purecart_saas_accounts
```sql
CREATE TABLE wp_purecart_saas_accounts (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id         BIGINT UNSIGNED NOT NULL,
    order_id        BIGINT UNSIGNED NOT NULL,
    product_id      BIGINT UNSIGNED NOT NULL,
    plan            VARCHAR(50),
    api_key         VARCHAR(128) UNIQUE,
    status          ENUM('active','suspended','cancelled') DEFAULT 'active',
    provisioned_at  DATETIME NOT NULL,
    PRIMARY KEY (id),
    KEY idx_user_product (user_id, product_id)
);
```

---

## 5. All endpoints registered under `/wp-json/purecart/v1/`

### License API
```
POST   /license/activate         # Activate license on a domain
POST   /license/deactivate       # Remove a domain activation
GET    /license/check            # Validate license + return plan features
POST   /license/revoke           # Admin: instantly revoke a license
```

### Plugin Update API
```
GET    /plugin/update-check      # Check if update available for version + license
GET    /plugin/download/{token}  # Serve update ZIP (token-gated)
GET    /plugin/changelog/{slug}  # Return changelog for product
```

### Secure Download API
```
GET    /download/{token}         # Serve file if token valid, not expired, count ok
POST   /download/generate        # Generate a new download token (internal)
```

### SaaS API
```
POST   /saas/provision           # Triggered by order webhook: create SaaS account
POST   /saas/suspend             # Suspend on subscription failure
POST   /saas/activate            # Re-activate after payment recovery
GET    /saas/usage/{api_key}     # Usage stats for a customer
```

---

## 6. WooCommerce Integration Points

```php
add_action('woocommerce_order_status_completed',    [$this, 'on_order_complete']);
add_action('woocommerce_order_status_refunded',     [$this, 'on_order_refunded']);
add_action('woocommerce_subscription_status_active', [$this, 'on_subscription_active']);
add_action('woocommerce_subscription_status_cancelled', [$this, 'on_subscription_cancelled']);
add_action('woocommerce_subscription_renewal_payment_complete', [$this, 'on_renewal']);
// Download access
add_filter('woocommerce_customer_get_downloadable_products', [$this, 'get_downloads']);
add_filter('woocommerce_downloadable_file_download_url',     [$this, 'secure_download_url']);
```

### Order → License → SaaS Flow
```
WooCommerce Order Completed
        │
        ├─ Is product type "purecart_plugin"?
        │       ├─ Generate license key
        │       ├─ Store in wp_purecart_licenses
        │       ├─ Send email with license + download link
        │       └─ Log to wp_purecart_downloads
        │
        └─ Is product type "purecart_saas"?
                ├─ Call SaaS provisioner
                ├─ Create account (via API or internal)
                ├─ Generate API key
                ├─ Store in wp_purecart_saas_accounts
                └─ Send login credentials email
```

---

## 7. Feature Roadmap & Build Priority

### Phase 1 — MVP (Must Ship First)
- [ ] WooCommerce product type: `purecart_plugin` and `purecart_saas`
- [ ] License generation on order complete
- [ ] License activation / deactivation REST API
- [ ] Secure download token system (expiry + count limit)
- [ ] Download log (IP, country, timestamp)
- [ ] Plugin update API (`/purecart/v1/plugin/update-check`)
- [ ] ZIP version upload and management (Admin UI)
- [ ] Customer My Account: License tab + Download tab
- [ ] Email notifications: purchase, license key, download link

### Phase 2 — Subscription & SaaS
- [ ] Subscription tracking (link to license expiry)
- [ ] Failed payment dunning emails
- [ ] Grace period on expired license
- [ ] SaaS account provisioning on order complete
- [ ] API key generation and management
- [ ] JWT issuer for SaaS login
- [ ] Customer dashboard: API Keys tab, Usage tab

### Phase 3 — Security & Anti-Piracy
- [ ] Geo-blocking (country-level block list)
- [ ] IP rate limiting on activation endpoint
- [ ] Shared license / multi-country abuse detection
- [ ] Concurrent download detection
- [ ] SHA-256 checksum on update ZIPs
- [ ] VPN detection (optional, 3rd party API)
- [ ] Remote kill-switch (instant license revocation)
- [ ] Staging/localhost environment auto-exemption

### Phase 4 — Git Integration & Auto-Updates
- [ ] GitHub webhook receiver (on tag push → import ZIP)
- [ ] Bitbucket webhook receiver
- [ ] Auto-version bump on new release
- [ ] Auto-changelog generation from commit messages
- [ ] Release channel management (stable / beta)
- [ ] Rollback to previous version (admin + customer)

### Phase 5 — Marketing & Growth
- [ ] Abandoned cart recovery (email capture + follow-up)
- [ ] Post-purchase upsell funnel hooks
- [ ] Affiliate program connector (webhook bridge)
- [ ] Bulk discount / coupon generation
- [ ] Customer loyalty points system
- [ ] Referral system

### Phase 6 — Analytics & Reporting
- [ ] Revenue dashboard (MRR, ARR, churn, LTV)
- [ ] License statistics (active, expired, abused)
- [ ] Download statistics (per product, per version)
- [ ] Subscription statistics
- [ ] Export to CSV/Excel

### Phase 7 — Enterprise & Advanced
- [ ] White-label licensing
- [ ] Agency license (multi-site, team-managed)
- [ ] SSO / SAML connector
- [ ] Audit logs
- [ ] REST API for all data (full developer access)
- [ ] Webhooks (license events, subscription events)
- [ ] CLI commands (WP-CLI integration)

---

## 8. Tech Stack

| Layer | Technology |
|---|---|
| Core platform | WordPress + WooCommerce |
| Plugin language | PHP 8.1+ |
| Admin UI | React + WordPress Scripts |
| REST API | WordPress REST API framework |
| Database | WordPress $wpdb + custom tables |
| Background jobs | Action Scheduler |
| Email | wp_mail() + HTML templates |
| File serving | PHP stream (no direct URL) |
| Token generation | random_bytes() + SHA-256 |
| JWT | firebase/php-jwt (HS256) |
| GitHub integration | GitHub Webhooks |
| Geo-detection | MaxMind GeoLite2 or ip-api.com |
| Cron | WP-Cron + Action Scheduler |

---

## 9. Differentiation Table

| Capability | EDD | SureCart | FluentCart | SUMO Subs | WC Serial Numbers | WPDM+PP | DLM | LMFWC | ArraySubs | purecart |
|---|---|---|---|---|---|---|---|---|---|---|
| WooCommerce native | No | No | No | Yes | Yes | No | Yes | Yes | Yes | **Yes** |
| Self-hosted | Yes | No | Yes | Yes | Yes | Yes | Yes | Yes | Yes | **Yes** |
| Licensing built-in | $199/yr | Yes | Yes | No | Yes (import) | Basic | Yes (free) | Yes (free) | No | **Yes (generated)** |
| Dynamic key generation | Yes | No | Yes | No | Pro only | No | Yes | Yes (generator) | No | **Yes (random_bytes)** |
| Safe crypto (no file loss risk) | Yes | Yes | Yes | — | — | — | Partial | **No** | — | **Yes** |
| Plugin auto-update API | Yes (ext) | No | Partial | No | No | No | Pro only | Pro only | No | **Yes** |
| GitHub update sync | No | No | No | No | No | No | No | No | No | **Yes** |
| SaaS provisioning | No | Partial | Partial | No | No | No | No | No | No | **Yes** |
| Geo-blocking | No | No | No | No | No | No | No | No | No | **Yes** |
| JWT for SaaS auth | No | No | No | No | No | No | No | No | No | **Yes** |
| Staging exemption | Basic | No | No | No | No | No | No | **No** | No | **Yes** |
| Remote kill-switch | Partial | No | No | No | No | No | No | No | No | **Yes** |
| QR code on certificate | No | No | No | No | No | No | No | Pro | No | **Roadmap P3** |
| Ping endpoint | No | No | No | No | No | No | No | Pro | No | **Yes (P1)** |
| Subscription billing | $209/yr | Yes | Yes | Yes ($49) | No | PayPal only | Pro sync | WC Subs | Yes (free) | **Yes** |
| New key vs extend on renewal | No | No | No | No | No | No | No | Pro | No | **Yes (`_add_renewal_behavior`)** |
| Retention flow | No | No | No | No | No | No | No | No | Yes (free) | **Roadmap P2** |
| 2-phase grace period | No | No | No | Yes | No | No | No | No | Yes (free) | **Yes** |
| Skip/pause subscription | No | No | No | Pause only | No | No | No | No | Yes (free) | **Yes** |
| PDF license certificate | No | No | No | No | No | No | Yes (free) | Yes (free) | No | **Roadmap P3** |
| Manual My Account activation | No | No | No | No | No | No | Yes (free) | Yes (free) | No | **Yes** |
| Multi-qty key delivery | No | No | No | No | No | No | No | Yes (free) | No | **Yes** |
| Past-order key generation | No | No | No | No | No | No | No | Yes (free) | No | **Yes (admin tool)** |
| Migrate from LMFWC | — | — | — | — | — | — | Yes (free) | — | — | **Yes (P3 CLI)** |
| Ad blocker detection | No | No | No | No | No | Yes | No | No | No | **Yes** |
| Video play-protect | No | No | No | No | No | Yes | No | No | No | **Yes** |
| Quick digital checkout | No | No | No | No | No | 2-click | No | No | No | **Yes (built-in)** |
| Multi-site license | Yes | Yes | Yes | No | No | No | No | No | No | **Yes** |
| Extends WooCommerce | No | No | No | Yes | Yes | No | Yes | Yes | Yes | **Yes** |

---

## 10. References

- Easy Digital Downloads: https://easydigitaldownloads.com
- SureCart: https://surecart.com/pricing
- FluentCart: https://fluentcart.com
- SUMO Subscriptions: https://codecanyon.net/item/sumo-subscriptions-woocommerce-subscription-system/16486054
- WC Recover Abandoned Cart: https://codecanyon.net/item/woocommerce-recover-abandoned-cart/7715167
- Cart Abandonment Recovery (Brainstorm Force): https://wordpress.org/plugins/woo-cart-abandonment-recovery/
- Abandoned Cart Lite: https://wordpress.org/plugins/woocommerce-abandoned-cart/
- CartBounty: https://wordpress.org/plugins/woo-save-abandoned-carts/
- SUMO Affiliates: https://codecanyon.net/item/sumo-affiliates-woocommerce-affiliate-system/18273930
- SUMO Affiliates Pro: https://codecanyon.net/item/sumo-affiliates-pro-wordpress-affiliate-plugin/22795996
- MWB HubSpot for WooCommerce: https://wordpress.org/plugins/makewebbetter-hubspot-for-woocommerce/
- Subscriptions for WooCommerce (WP Swings): https://wordpress.org/plugins/subscriptions-for-woocommerce/
- Subscription & Recurring Payment (Convers Lab): https://wordpress.org/plugins/subscription/
- Subscriptions by Sublium: https://wordpress.org/plugins/sublium-subscriptions-for-woocommerce/
- WC Serial Numbers: https://wordpress.org/plugins/wc-serial-numbers/
- License Manager for WooCommerce (LMFWC): https://wordpress.org/plugins/license-manager-for-woocommerce/
- WooCommerce PayPal Payments: https://wordpress.org/plugins/woocommerce-paypal-payments/
- WooCommerce Stripe Gateway: https://wordpress.org/plugins/woocommerce-gateway-stripe/
- JWT Auth (usefulteam): https://wordpress.org/plugins/jwt-auth/
- JWT Authentication for WP REST API: https://wordpress.org/plugins/jwt-authentication-for-wp-rest-api/
- firebase/php-jwt: https://github.com/firebase/php-jwt
- Action Scheduler: https://actionscheduler.org
- MaxMind GeoLite2: https://dev.maxmind.com/geoip/geolite2-free-geolocation-data
- Plugin Update Checker: https://github.com/YahnisElsts/plugin-update-checker
