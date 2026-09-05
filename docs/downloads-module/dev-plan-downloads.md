# Secure Downloads Module — Backend Development Plan

**Plugin:** purecart
**Module:** Secure Downloads (Phase 1 — MVP)
**Scope:** PHP backend only — DB schema, token lifecycle, delivery, WooCommerce integration, REST API, Action Scheduler
**Out of scope:** React admin UI (`src/app/components/Downloads/`) — আলাদা frontend dev-plan এ, অন্য কেউ করবে
**Reference:** `docs/RND-secure-downloads.md`, `docs/RND-frontend-secure-downloads.md`, `docs/plugin-guideline.md`
**Branch:** `development` থেকে `downloads-module` কাটা হবে

---

## নিয়ম

প্রতিটি Step শেষ করার পর:
1. Manual test checklist দেওয়া হবে
2. Test পাস করলে permission নিয়ে পরের Step শুরু হবে
3. এক Step = এক commit — mixed commit নয়
4. React/UI এর কোনো কাজ এই plan এ নেই। Step 9 এর REST contract-ই frontend dev এর handoff point (Appendix A দেখো)
5. কোনো module সরাসরি `get_option()` call করবে না — `Settings::get()` + `OptionKeys::` constant

---

## As-Built অবস্থা (কাজ শুরুর আগে যা আছে)

কোড কিছুটা আছে, কিন্তু **module টা আসলে চলছে না**। অডিটে যা পেলাম:

| জিনিস | অবস্থা |
|---|---|
| `Store/Downloads.php`, `Store/DownloadLogs.php` | ✅ টেবিল তৈরি হয় (`Activator::create_tables()`) |
| `Downloads/TokenManager.php` | ⚠️ আছে, কিন্তু single-file only + raw `get_option()` |
| `Downloads/DownloadDispatcher.php` | ❌ **কোথাও instantiate হয় না** → `Plugin.php` এ নেই → কোনো download URL কাজ করে না |
| `Downloads/AccountDownloadsMerger.php` | ✅ My Account এ merge হয় (কিন্তু dead URL এ পয়েন্ট করে) |
| `_purecart_primary_file_id` / `_purecart_file_path` meta | ❌ কোথাও লেখা হয় না → `create_token()` সবসময় `null` return করে |
| `purecart_cleanup_expired_tokens` job | ⚠️ schedule হয়, কিন্তু কোনো download handler নেই (শুধু `JwtHooks` শোনে) |
| REST API | ❌ নেই |
| License gate | ❌ নেই (`license_id` column-ও নেই) |
| Refund/cancel এ token revoke | ❌ নেই |

**অর্থাৎ Step 1–4 মূলত ভাঙা জিনিস ঠিক করা, Step 5–11 নতুন feature।**

---

## Step 1 — Schema Upgrade + OptionKeys

**কী করব:**

`includes/Store/Downloads.php` — schema পাল্টাবে:
- `file_id` : `BIGINT UNSIGNED` → `VARCHAR(64)` — WooCommerce এর native file key (MD5 hash), numeric ID নয়
- `order_item_id BIGINT UNSIGNED NOT NULL DEFAULT 0` — নতুন (per order-item token, idempotency এর জন্য)
- `license_id BIGINT UNSIGNED NOT NULL DEFAULT 0` — নতুন (license gate)
- `status VARCHAR(20) NOT NULL DEFAULT 'active'` — নতুন (`active` | `revoked`)
- `expires_at DATETIME NULL DEFAULT NULL` — nullable করব (`NULL` = কখনো expire হয় না)
- `max_downloads` default `3` → `0` (0 = unlimited)
- নতুন index: `KEY idx_status_expiry (status, expires_at)`, `KEY idx_product (product_id)`

`includes/Store/DownloadLogs.php`:
- `event VARCHAR(32) NOT NULL DEFAULT 'served'` — `served` | `rejected_expired` | `rejected_limit` | `rejected_license` | `rejected_revoked` | `rejected_invalid`
- `KEY idx_event (event)`

`includes/Activator.php`:
- `DB_VERSION` `1.3.1` → `1.4.0` (`maybe_upgrade()` নিজে থেকেই dbDelta চালাবে)

`includes/Settings/OptionKeys.php` — নতুন section:

```php
// ─── Secure Downloads module ───────────────────────────────────────────────
public const DOWNLOAD_DELIVERY          = 'purecart_download_delivery';           // 'streaming'
public const DOWNLOAD_MAX_COUNT         = 'purecart_download_max_count';          // 0 = unlimited
public const DOWNLOAD_EXPIRY_DAYS       = 'purecart_download_expiry_days';        // 0 = never
public const DOWNLOAD_TRIGGER_STATUS    = 'purecart_download_trigger_status';     // 'completed'
public const DOWNLOAD_LICENSE_GATE      = 'purecart_download_license_gate';       // true
public const DOWNLOAD_LOG_RETENTION     = 'purecart_download_log_retention_months'; // 12
public const DOWNLOAD_ALLOW_LINK_REGEN  = 'purecart_download_allow_link_regen';   // false
```

> **Migration note:** `file_id` BIGINT → VARCHAR এ dbDelta type change চালাবে। পুরনো numeric row থাকলে সেগুলো এমনিতেই কাজ করত না (meta কখনো লেখা হয়নি), তাই data loss risk নেই। দরকার হলে `DELETE FROM wp_purecart_downloads` দিয়ে clean start।

**Files:**

```
includes/Store/Downloads.php       ← schema পরিবর্তন
includes/Store/DownloadLogs.php    ← event column
includes/Activator.php             ← DB_VERSION bump
includes/Settings/OptionKeys.php   ← 8টি constant
```

### Manual Test — Step 1
- [ ] Plugin deactivate → activate — fatal error নেই
- [ ] phpMyAdmin: `wp_purecart_downloads` এ `order_item_id`, `license_id`, `status` column আছে; `file_id` VARCHAR(64); `expires_at` NULL allow করে
- [ ] `wp_purecart_download_logs` এ `event` column আছে
- [ ] `purecart_db_version` option = `1.4.0`
- [ ] দ্বিতীয়বার activate করলেও error নেই (dbDelta idempotent)

**Step 1 শেষে permission চাইব।**

---

## Step 2 — Downloads\Module Bootstrap + Plugin.php Wiring

**কী করব:**

`includes/Downloads/Module.php` (নতুন) — হুবহু `Updates\Module` প্যাটার্ন:
- constructor এ **একটাই** `DownloadDispatcher` instance (দুটো হলে download handler double-register হবে)
- `new AccountDownloadsMerger()` — module এর মালিকানায় নেওয়া হবে
- `( new DownloadsApi( $dispatcher ) )->register();` — Step 9 এ ভরবে, এখন placeholder
- `REWRITE_VERSION = '1.0.0'` + `REWRITE_OPTION = 'purecart_downloads_rewrite_version'` + `maybe_flush_rewrites()` on `init` priority 20

`includes/Downloads/DownloadDispatcher.php`:
- rewrite `^purecart/([a-zA-Z0-9_\-]+)/?$` → `^purecart-download/([a-f0-9]{64})/?$` (RND spec)
- পুরনো `^purecart/...` rule legacy হিসেবে রেখে দেব (আগে ইস্যু হওয়া email link ভাঙবে না)
- `handle_download()` কে Step 5/6 এর জন্য পাতলা রাখব — validate + delegate

`includes/Plugin.php`:
- `use PureCart\Downloads\Module as DownloadsModule;`
- `new AccountDownloadsMerger();` সরিয়ে `new DownloadsModule();`

**Files:**

```
includes/Downloads/Module.php               ← new
includes/Downloads/DownloadDispatcher.php   ← rewrite rule
includes/Plugin.php                         ← module wiring
```

### Manual Test — Step 2
- [ ] Settings → Permalinks না ছুঁয়েও `/purecart-download/<64 hex>` hit করলে "invalid or expired" 403 আসে (404 নয় — মানে rewrite live)
- [ ] `purecart_downloads_rewrite_version` option = `1.0.0`
- [ ] My Account → Downloads পেজ আগের মতোই লোড হয় (merger এখনো কাজ করছে)
- [ ] Debug log এ কোনো notice/warning নেই

**Step 2 শেষে permission চাইব।**

---

## Step 3 — TokenManager Rewrite (Multi-File + WooCommerce Native Files)

এই Step-টাই module এর আসল fix। এখন `_purecart_primary_file_id` নামের একটা meta পড়ে যেটা কেউ কখনো লেখে না — তাই আজ পর্যন্ত কোনো token তৈরিই হয়নি।

**কী করব:**

`TokenManager` এ নতুন API:

```php
create_for_order_item( \WC_Order_Item_Product $item ): array   // প্রতি file এ একটা token row
validate( string $token ): object|\WP_Error                    // reason সহ (Step 6)
revoke( int $download_id ): bool
revoke_by_order( int $order_id ): int
regenerate( int $download_id ): ?object                        // নতুন token + count reset
get_by_user( int $user_id ): array                             // file name সহ (আপডেট)
```

- ফাইল আসবে **WooCommerce এর নিজের** `$product->get_downloads()` থেকে — key = MD5 file key, value = `WC_Product_Download`
- প্রতি file এ আলাদা row (RND "Multiple Files Per Product")
- **Idempotency:** order item meta `_purecart_download_tokens` (JSON: `file_key => download_id`) — থাকলে skip, যাতে `trigger_status = both` এ double token না হয়
- limit/expiry resolution order: per-product meta → global option → filter
  - `_purecart_download_limit` → `OptionKeys::DOWNLOAD_MAX_COUNT` → `apply_filters( 'purecart_download_max_count', ... )` — `0` = unlimited
  - `_purecart_download_expiry_days` → `OptionKeys::DOWNLOAD_EXPIRY_DAYS` → `apply_filters( 'purecart_download_expiry_seconds', ... )` — `0` হলে `expires_at` NULL
- `license_id` — order item এর `_purecart_license_id` meta থেকে নেওয়া হবে (Step 6 এর gate এর জন্য)
- সব `get_option()` → `Settings::get( OptionKeys::... )`
- `do_action( 'purecart_download_token_created', $download_id, $order_id, $product_id )`
- পুরনো `create_token()` → `@deprecated` shim, ভেতরে নতুন path এ delegate করবে
- log লেখা `TokenManager` থেকে সরে যাবে (Step 5 এর `DownloadLogger`)

**Files:**

```
includes/Downloads/TokenManager.php   ← বড় rewrite
```

### Manual Test — Step 3
- [ ] একটা product এ WooCommerce এর Downloadable files এ ২টা ফাইল দাও → order complete → `wp_purecart_downloads` এ **২টা** row, ভিন্ন `token`, সঠিক `file_id` (MD5), `order_item_id` সেট
- [ ] Order status আবার processing → completed করলে নতুন row **তৈরি হয় না** (idempotent)
- [ ] Product এ `_purecart_download_limit = 5` দিলে row এ `max_downloads = 5`; না দিলে global default
- [ ] expiry `0` রাখলে `expires_at` = NULL
- [ ] Non-downloadable product এ কোনো row তৈরি হয় না

**Step 3 শেষে permission চাইব।**

---

## Step 4 — OrderHandler Integration + Revocation

**কী করব:**

`includes/Commerce/OrderHandler.php`:
- `on_order_complete()` এ download token তৈরি এখন **product type-এর উপর নির্ভর করবে না**। এখন শুধু `purecart_plugin` / `purecart_bundle` এ হয় — যেকোনো downloadable product (`$product->get_downloads()` non-empty) এ হওয়া উচিত
- `( new TokenManager() )->create_token(...)` → `create_for_order_item( $item )`
- trigger status: `OptionKeys::DOWNLOAD_TRIGGER_STATUS` (`completed` | `processing` | `both`) — license এর `LICENSE_DELIVERY_STATUS` থেকে আলাদা, কারণ অনেক স্টোর payment হলেই file দেয় কিন্তু license পরে issue করে
- `on_order_refunded()` + `on_order_cancelled()` → `TokenManager::revoke_by_order( $order_id )` (row delete নয়, `status = 'revoked'` — audit trail থাকবে)

**Files:**

```
includes/Commerce/OrderHandler.php
```

### Manual Test — Step 4
- [ ] সাধারণ WooCommerce downloadable product (purecart type নয়) order করলে token তৈরি হয়
- [ ] Order refund করলে সব row `status = 'revoked'`, row মুছে যায় না
- [ ] Revoked token এর URL hit করলে 403
- [ ] `DOWNLOAD_TRIGGER_STATUS = processing` করলে processing এ token আসে, completed এ ডুপ্লিকেট হয় না
- [ ] Order cancel এও একই আচরণ

**Step 4 শেষে permission চাইব।**

---

## Step 5 — DownloadLogger + DownloadDelivery Extract

**কী করব:**

`includes/Downloads/DownloadLogger.php` (নতুন):

```php
record( int $download_id, string $event = 'served' ): void
prune( int $months ): int
get_logs( array $args ): array    // REST list এর জন্য: download_id, event, date range, paged
```

IP + user agent + country_code এখানেই resolve হবে (এখন `TokenManager::increment_count()` এর ভেতরে inline আছে)।

`includes/Downloads/DownloadDelivery.php` (নতুন):
- `serve( string $path, string $filename, string $mime ): void`
- **Chunked streaming** (`fopen` + 8KB `fread` loop) — এখনকার `readfile()` বড় ফাইলে timeout/memory খায়
- `Accept-Ranges: bytes` + HTTP Range request support (resume-able download — বড় zip/ভিডিওতে লাগবেই)
- `set_time_limit(0)` + `ignore_user_abort` guard
- Phase 1 এ শুধু `streaming` method; `xsendfile` / `xaccel` / `s3` / `r2` এর জন্য `switch` skeleton থাকবে কিন্তু implement Phase 2

`DownloadDispatcher` এখন শুধু: query var → validate → log → increment → `DownloadDelivery::serve()`

**Files:**

```
includes/Downloads/DownloadLogger.php     ← new
includes/Downloads/DownloadDelivery.php   ← new
includes/Downloads/DownloadDispatcher.php ← পাতলা করা
includes/Downloads/TokenManager.php       ← log code সরানো
```

### Manual Test — Step 5
- [ ] ফাইল download হয়, byte size ঠিক, zip corrupt নয়
- [ ] ~200MB ফাইল download হয় memory exhaustion ছাড়াই
- [ ] Download pause → resume কাজ করে (Range header)
- [ ] প্রতি download এ `wp_purecart_download_logs` এ `event = 'served'` row আসে, IP + UA সঠিক
- [ ] Invalid token এ `event = 'rejected_invalid'` row আসে

**Step 5 শেষে permission চাইব।**

---

## Step 6 — Validation Result + License Gate

**কী করব:**

`TokenManager::validate()` এখন `null` return করে — কেন fail করল বোঝা যায় না। নতুন: `WP_Error` (code = reject reason) অথবা row return করবে।

Reject reasons: `invalid` · `revoked` · `expired` · `limit_reached` · `license_inactive`

License gate:
- `_purecart_download_license_gate` (per product) → `OptionKeys::DOWNLOAD_LICENSE_GATE` (global, default `true`)
- gate on + `license_id > 0` হলে `Licensing` store থেকে license status দেখবে; `active` না হলে `license_inactive`
- Licensing module না থাকলে gate নিঃশব্দে skip

`DownloadDispatcher` প্রতিটা reason অনুযায়ী আলাদা user-facing message + সঠিক HTTP status (403/410) দেবে, আর `DownloadLogger` এ `rejected_*` event লিখবে।

**Files:**

```
includes/Downloads/TokenManager.php
includes/Downloads/DownloadDispatcher.php
```

### Manual Test — Step 6
- [ ] `max_downloads = 1` এ দ্বিতীয় download এ "limit reached" message + `rejected_limit` log
- [ ] `expires_at` অতীতে সেট করলে "expired" message + `rejected_expired` log
- [ ] License revoke করে download দিলে "license no longer active" + `rejected_license` log
- [ ] `_purecart_download_license_gate = false` করলে revoked license এও download হয়
- [ ] `expires_at = NULL` token কখনো expire হয় না

**Step 6 শেষে permission চাইব।**

---

## Step 7 — WooCommerce URL Filter + Email Links

এখন My Account এর link `home_url('purecart/' . $token)` — hardcoded, আর WooCommerce এর নিজের downloadable product গুলো এখনো `?download_file=` দিয়ে unprotected যায়।

**কী করব:**
> **সংশোধন (বাস্তবায়নের সময়):** `woocommerce_downloadable_file_download_url` নামে WooCommerce এ কোনো filter নেই। আসল হুক দুটো — `woocommerce_customer_available_downloads` (My Account) আর `woocommerce_order_get_downloadable_items` (order email + order-received পেজ)।

- দুটো ফিল্টারেই `AccountDownloadsMerger` — **যোগ নয়, প্রতিস্থাপন**। WooCommerce একই ফাইলের জন্য নিজের permission row বানায়, তাই আগের "append" আচরণে কাস্টমার প্রতিটা ফাইল দুবার দেখত: একবার আমাদের টোকেনে, একবার WooCommerce এর অরক্ষিত `?download_file=` লিংকে — refund এর পরেও
  - native row এর URL → `/purecart-download/{token}`
  - token revoked হলে native row **বাদ**, নাহলে revocation অকেজো থেকে যায়
  - যেসব টোকেনের native জোড়া নেই, কেবল সেগুলো append
  - `downloads_remaining` = unlimited হলে `''` (WooCommerce এর নিজস্ব ভাষা, টেমপ্লেট ∞ দেখায়); আগে `0` যেত, যার মানে "শেষ হয়ে গেছে"
  - `file.name` = আসল file name
- **Email link expiry বাদ।** ইমেইল আর My Account একই টোকেন; আলাদা expiry মানে প্রতি ফাইলে দ্বিতীয় টোকেন, নিজস্ব counter সহ — কাস্টমার কেনা limit এর দ্বিগুণ পেত। স্বল্পায়ু ইমেইল লিংকে নিরাপত্তাও বাড়ত না, কারণ দীর্ঘায়ু টোকেন My Account এ এক ক্লিক দূরে

**Files:**

```
includes/Downloads/DownloadDispatcher.php
includes/Downloads/AccountDownloadsMerger.php
```

### Manual Test — Step 7
- [ ] Order completed email এর download link `/purecart-download/{token}` — কোনো direct file path বা `?download_file=` নেই
- [ ] Email এর link এ click করলে সঠিক নামে ফাইল download হয়
- [ ] My Account → Downloads এ প্রতিটা ফাইল আলাদা row, নাম সঠিক
- [ ] Unlimited token এ "Unlimited" লেখা আসে, `0` নয়
- [ ] Revoked token এর row এ download button নেই

**Step 7 শেষে permission চাইব।**

---

## Step 8 — Action Scheduler Cleanup Jobs

**কী করব:**
> **সংশোধন (বাস্তবায়নের সময়):** "expired + revoked row delete" করা **যাবে না**। Step 7 এর পর token row-ই সেই জিনিস যার সাথে মিলিয়ে `AccountDownloadsMerger` WooCommerce এর native row এর অরক্ষিত URL বদলায়, আর revoked হলে ওই row লুকায়। Token মুছে দিলে মিল ভেঙে যায় → WooCommerce এর নিজের row নিজের লিংক নিয়ে ফিরে আসে, অর্থাৎ expired/refunded ফাইল আবার ডাউনলোডযোগ্য হয়ে যায়। row রাখতে খরচ কয়েক বাইট, মুছলে ফাইল খুলে যায়।

- `Downloads\Module` এ `add_action( 'purecart_cleanup_expired_tokens', ... )` — শুধু **orphan** token delete (যে order টাই আর নেই), ব্যাচে ২০০, ৩০ দিনের grace। expired/revoked row থেকে যাবে
- নতুন job `purecart_cleanup_download_logs` (monthly) → `DownloadLogger::prune( DOWNLOAD_LOG_RETENTION )`
- `Activator::schedule_jobs()` এ register, `Activator::deactivate()` এ `as_unschedule_all_actions()`

**Files:**

```
includes/Downloads/Module.php
includes/Downloads/DownloadLogger.php
includes/Activator.php
```

### Manual Test — Step 8
- [ ] WooCommerce → Status → Scheduled Actions এ `purecart_cleanup_download_logs` আছে (group `purecart`)
- [ ] Manually run করলে retention এর বাইরের log row মুছে যায়, ভেতরের গুলো থাকে
- [ ] `purecart_cleanup_expired_tokens` run করলে expired row মুছে যায়, active গুলো অক্ষত
- [ ] Deactivate করলে দুটো job-ই unschedule হয়

**Step 8 শেষে permission চাইব।**

---

## Step 9 — REST API (Frontend Handoff Point)

`includes/API/Downloads.php` (নতুন) — `PureCartApi` extend, `register_routes()` implement, namespace `PURECART_API_NAMESPACE`।

| Method | Route | কাজ |
|---|---|---|
| GET | `/downloads` | list — `search`, `status`, `product_id`, `user_id`, `page`, `per_page`, `orderby` |
| GET | `/downloads/(?P<id>\d+)` | single + সেই token এর log |
| POST | `/downloads/(?P<id>\d+)/revoke` | status → revoked |
| POST | `/downloads/(?P<id>\d+)/regenerate` | নতুন token, count reset, নতুন expiry |
| PATCH | `/downloads/(?P<id>\d+)` | `max_downloads`, `expires_at` edit |
| GET | `/downloads/logs` | audit log — `download_id`, `event`, `date_from`, `date_to`, paged |
| GET | `/downloads/stats` | admin card: total / active / expired / revoked, আজকের download, top 5 product |
| GET, POST | `/downloads/settings` | global option get/save |

- সব route এ `permission_callback` = `manage_woocommerce` (`API\Updates` এর `permission_admin` প্যাটার্ন)
- সব route এ `args` schema + `sanitize_callback` + `validate_callback`
- pagination: `X-WP-Total` + `X-WP-TotalPages` header
- `Downloads\Module` এ `( new DownloadsApi() )->register();`
- Postman collection: `docs/downloads-module/purecart-downloads.postman_collection.json`

### Manual Test — Step 9
- [ ] `/wp-json/purecart/v1/downloads` logged-in admin এ JSON দেয়, logged-out এ 401
- [ ] Subscriber role এ 403
- [ ] pagination header ঠিক, `per_page=5` মানে
- [ ] revoke endpoint এর পর DB তে status revoked, আর সেই link 403
- [ ] regenerate এর পর পুরনো token dead, নতুন token কাজ করে
- [ ] stats এর সংখ্যা DB এর সাথে মেলে
- [ ] Postman collection এ সব endpoint saved (subscription module এর মতো)

**Step 9 শেষে permission চাইব। এখান থেকে frontend dev সমান্তরালে কাজ শুরু করতে পারবে — Appendix A।**

---

## Step 10 — Product Data Tab (WooCommerce Admin Metabox)

`includes/Downloads/ProductDownloadsTab.php` — `Updates/ProductUpdatesTab.php` এর হুবহু প্যাটার্ন (WooCommerce native metabox, React নয়)।

Fields:

| Meta | Type | Default |
|---|---|---|
| `_purecart_download_limit` | number | `0` (unlimited) |
| `_purecart_download_expiry_days` | number | `0` (never) |
| `_purecart_download_license_gate` | checkbox | `true` |
| `_purecart_allow_link_regen` | checkbox | `false` |

**Files:**

```
includes/Downloads/ProductDownloadsTab.php   ← new
includes/Downloads/Module.php                ← is_admin() এ instantiate
```

### Manual Test — Step 10
- [ ] Product edit → "Secure Downloads" tab দেখা যায়
- [ ] Save করলে meta DB তে ঠিকমতো যায় (phpMyAdmin)
- [ ] খালি রাখলে global default fallback হয়
- [ ] Checkbox uncheck সঠিকভাবে save হয় (WooCommerce classic checkbox behaviour)

**Step 10 শেষে permission চাইব।**

---

## Step 11 — Final Integration Test

**কী করব:** কোড নয় — পুরো module এর end-to-end verification + `docs/downloads-module/QA-CHECKLIST-BN.md` লেখা।

### Final Manual Test — Step 11
- [ ] ৩ ফাইলের একটা product কিনে ৩টা আলাদা download link পাওয়া যায়
- [ ] Limit শেষ হলে block হয়, log এ reason থাকে
- [ ] Expiry পার হলে block হয়
- [ ] License revoke → download block
- [ ] Refund → সব token revoke
- [ ] Admin REST দিয়ে regenerate করলে customer আবার download করতে পারে
- [ ] বড় ফাইল (200MB+) সফল download + resume
- [ ] Subscription + Licensing + Updates module একসাথে active রেখে কোনো conflict নেই
- [ ] `composer phpcs` clean
- [ ] পুরো flow এ debug log silent
- [ ] Fresh install (নতুন DB) তেও পুরো flow কাজ করে

---

## Progress Tracker

| Step | কাজ | অবস্থা |
|---|---|---|
| 1 | Schema upgrade + OptionKeys | ⬜ |
| 2 | Module bootstrap + Plugin wiring | ⬜ |
| 3 | TokenManager rewrite (multi-file) | ⬜ |
| 4 | OrderHandler + revocation | ⬜ |
| 5 | DownloadLogger + DownloadDelivery | ⬜ |
| 6 | Validation result + license gate | ⬜ |
| 7 | WooCommerce URL filter + emails | ⬜ |
| 8 | Cleanup jobs | ⬜ |
| 9 | REST API | ⬜ |
| 10 | Product data tab | ⬜ |
| 11 | Final integration test | ⬜ |

---

## Appendix A — Frontend Handoff (এই plan এ নেই)

Step 9 merge হওয়ার পর React dev এই contract ধরে `src/app/components/Downloads/` বানাতে পারবে। Subscriptions module এর component গুলোই reuse হবে (`DataTable`, `FilterChip`, `ActionDropdown`, `StatusBadge`, `Pagination`)।

**Download row shape:**

```ts
type Download = {
  id: number;
  order_id: number;
  order_number: string;
  user_id: number;
  customer_name: string;
  customer_email: string;
  product_id: number;
  product_name: string;
  file_name: string;
  token: string;             // masked — শুধু শেষ ৮ character
  download_url: string;
  download_count: number;
  max_downloads: number;     // 0 = unlimited
  status: 'active' | 'expired' | 'revoked' | 'exhausted';
  expires_at: string | null; // null = never
  created_at: string;
};
```

**Log row shape:**

```ts
type DownloadLog = {
  id: number;
  download_id: number;
  event: 'served' | 'rejected_expired' | 'rejected_limit'
       | 'rejected_license' | 'rejected_revoked' | 'rejected_invalid';
  ip_address: string;
  user_agent: string;
  country_code: string;
  downloaded_at: string;
};
```

**পেজ লাগবে ৩টা:** Downloads list (filter + row action: revoke / regenerate / edit limit) · Download detail + log timeline · Settings (global options)।

---

## Appendix B — Phase 2 / 3 (এই plan এ নেই)

- `FileStorageManager` + S3 / Cloudflare R2 presigned URL
- X-Sendfile / X-Accel-Redirect delivery
- `MediaLibraryGuard` — protected uploads dir + `.htaccess` / nginx rule
- `VideoProtector` — JS player + stream token
- Customer-side "Get New Link" regeneration
- `GeoBlocker`, IP binding, throttling, WP-CLI commands
