# PureCart Updates — ব্যাকএন্ড ডকুমেন্টেশন

> **কার জন্য:** যিনি এই মডিউলের ফ্রন্টএন্ড (Update Manager পেজ) বানাবেন।
> **অবস্থা:** Phase 1 (MVP) সম্পূর্ণ ও লাইভ যাচাই করা। ফ্রন্টএন্ডে কোনো কাজ করা হয়নি।
> **কোড:** `wp-content/plugins/purecart/includes/Updates/`

---

## ১. এই মডিউল কী করে

আপনার WooCommerce স্টোরকে একটা **self-hosted update সার্ভারে** বদলে দেয়। গ্রাহক প্লাগইন কিনলে তাঁর WP admin-এ ঠিক WordPress.org-এর মতোই "Update available" দেখাবে — কিন্তু প্যাকেজটা আসবে আপনার স্টোর থেকে, license যাচাই করে।

দুই ধরনের সফটওয়্যার:

| ধরন | কীভাবে |
|---|---|
| **WP প্লাগইন/থিম** | গ্রাহক `PureCartUpdater.php` ফাইলটা নিজের প্লাগইনে রাখেন; সেটা WP-র update transient-এ ঢুকে পড়ে |
| **অন্য সফটওয়্যার** (desktop app, CLI, SDK) | নিজেই JSON endpoint-এ জিজ্ঞেস করে, signed download URL পায় |

### ফাইল সংগঠন

```
includes/Updates/
├── Module.php                 ← বুট হওয়ার জায়গা
├── PackageRepository.php      ← সব DB query
├── UpdatePackageManager.php   ← আপলোড, SHA-256, readme পড়া
├── UpdateDelivery.php         ← signed URL + ফাইল সার্ভ
├── UpdateChannelRouter.php    ← stable/beta/nightly
├── LicenseGate.php            ← প্রবেশাধিকার
├── ProductLocator.php         ← slug → প্রোডাক্ট
├── UpdateServer.php           ← update-check লজিক
├── UpdateInfo.php             ← WP "View details" মোডাল
├── ChangelogManager.php       ← version-ভিত্তিক changelog
├── UpdateNotifier.php         ← ব্যাচড ইমেইল
├── AdoptionRepository.php     ← কোন সাইট কোন version চালায়
├── UpdateReport.php           ← admin ড্যাশবোর্ডের ডেটা
├── ProductUpdatesTab.php      ← প্রোডাক্টের Updates ট্যাব
├── Emails/UpdateAvailableEmail.php
└── client/PureCartUpdater.php ← গ্রাহকের প্লাগইনে যায় (স্টোরে চলে না)

includes/API/Updates.php       ← সব REST route
```

---

## ২. ডাটাবেস

### `wp_purecart_product_versions` — প্রতিটা রিলিজ

```
id, product_id
version           ← '1.10.0'
platform          ← 'all' | 'darwin-arm64' | 'win-x64' | ...
channel           ← stable | beta | nightly
file_path         ← সার্ভারের পাথ (কখনো API-তে যায় না)
file_size, checksum_sha256
requires_wp, tested_wp, requires_php
changelog         ← HTML (WP মোডালের জন্য)
release_notes     ← প্লেইন টেক্সট (non-WP সফটওয়্যারের জন্য)
is_active         ← 0 করলে সার্ভ হয় না, কিন্তু row থাকে
download_count
released_at, created_by
```

### `wp_purecart_license_activations` — একটা কলাম যোগ করা হয়েছে

```
reported_version  ← update check-এ সাইট কোন version জানিয়েছে
```

adoption rate গণনার জন্য। প্রতি চেকে একটামাত্র `UPDATE` — আলাদা লগ টেবিল বানানো হয়নি, কারণ প্রতিটা সাইট দিনে দুবার চেক করে; per-check লগ **সপ্তাহে হাজার হাজার row** জমাত অথচ শেষ row-র বাইরে কিছুই বলত না।

---

## ৩. REST API

namespace: **`purecart/v1`**

### গ্রাহকমুখী (public — license-ই credential)

| Method | Path | কী দেয় |
|---|---|---|
| GET | `/plugin/update-check` | update আছে কিনা + signed download URL |
| GET | `/plugin/info` | WP "View details" মোডালের ডেটা |
| GET | `/plugin/changelog/{slug}` | version-ভিত্তিক changelog |

### Admin (`manage_woocommerce`)

| Method | Path | কী দেয় |
|---|---|---|
| GET | `/updates/products` | সব update-সক্ষম প্রোডাক্টের সারাংশ |
| GET | `/updates/products/{id}` | এক প্রোডাক্টের version history + adoption |

### ডাউনলোড (REST নয়, rewrite rule)

```
GET /purecart-update/{payload}.{signature}
```

---

## ৪. `update-check` — মূল endpoint

```
GET /wp-json/purecart/v1/plugin/update-check
    ?slug=acme-demo
    &version=1.0.0
    &license_key=XXXX-XXXX
    &domain=customer.test
    &platform=darwin-arm64   (ঐচ্ছিক)
    &channel=beta            (ঐচ্ছিক — শুধু নিচে নামাতে পারে)
```

**update আছে:**

```json
{
  "update": true,
  "version": "1.10.0",
  "download_url": "https://store.com/purecart-update/{token}",
  "checksum": "sha256:7d95f2bd...",
  "channel": "stable",
  "last_updated": "2026-08-26 14:58:38",
  "published_at": "2026-08-26T14:58:38+00:00",
  "requires": "6.0",
  "requires_php": "8.0",
  "tested": "6.8",
  "changelog": "<ul><li>...</li></ul>"
}
```

**update নেই:** `{"update": false, "version": "1.10.0"}`

> non-WP প্রোডাক্টে `requires`/`tested`/`requires_php`/`changelog`-এর বদলে `release_notes` ও `platform` আসে।

### সম্ভাব্য error

| কোড | HTTP | কখন |
|---|---|---|
| `purecart_missing_slug` | 400 | slug দেওয়া হয়নি |
| `purecart_unknown_product` | 404 | slug কোনো প্রোডাক্টে নেই |
| `purecart_license_missing` | 401 | license লাগে, দেওয়া হয়নি |
| `purecart_license_invalid` | 403 | key ভুল |
| **`purecart_license_wrong_product`** | 403 | **license অন্য প্রোডাক্টের** |
| `purecart_license_inactive` | 403 | revoked/suspended |
| `purecart_license_expired` | 403 | মেয়াদ শেষ |
| `purecart_license_domain` | 403 | activation limit শেষ, এই ডোমেইন নিবন্ধিত নয় |

---

## ৫. নিরাপত্তার ৫টা নিয়ম (ফ্রন্টএন্ড ভাঙবেন না)

**১. license যে প্রোডাক্টের, update-ও সেই প্রোডাক্টের।**
ডকে এটা লেখা ছিল না, কিন্তু এটা ছাড়া $৯ license দিয়ে $২০০ প্রোডাক্টের update নামানো যেত।

**২. Download URL একবার-ব্যবহার্য, ১৫ মিনিটের।**
HMAC-SHA256 signed। payload বদলালে (অন্য প্যাকেজ, license সরানো, মেয়াদ বাড়ানো) signature মেলে না।

**৩. ডাউনলোডের সময় আবার যাচাই হয়** — লিংক ইস্যুর সময়ের যাচাই যথেষ্ট নয়:
- version withdraw হলে → **410**
- license revoke হলে → **403**

**৪. `?channel=` শুধু নিচে নামাতে পারে।**
stable গ্রাহক `&channel=nightly` জুড়ে দিলে stable-ই পাবেন। নাহলে যে কেউ অপ্রকাশিত বিল্ড নামাত।

**৫. Public endpoint-এ download লিংক/checksum/ফাইল পাথ নেই।**
`/plugin/info` license ছাড়াই খোলে — সেখানে download লিংক থাকলে পুরো gate অর্থহীন হতো। public changelog-এ beta version নম্বরও দেখানো হয় না।

---

## ৬. Hooks

### Action

| Hook | কখন | প্যারামিটার |
|---|---|---|
| `purecart_update_package_published` | নতুন প্যাকেজ প্রকাশ | `$package_id, $product_id, $version` |
| `purecart_update_available_email` | প্রতি গ্রাহকের ইমেইলের আগে | `$user_id, $package_id` |

### Filter

| Hook | কাজ |
|---|---|
| `purecart_update_check_response` | রেসপন্স বদলানো |
| `purecart_update_channel` | channel সিদ্ধান্তে শেষ কথা |
| `purecart_update_token_ttl` | signed URL-এর মেয়াদ (ডিফল্ট ৯০০ সে.) |
| `purecart_update_license_validated` | license যাচাইয়ের ফল বদলানো |
| `purecart_update_info` | মোডালের ডেটা বদলানো |
| `purecart_update_changelog_html` | changelog HTML বদলানো |
| `purecart_update_should_notify` | ইমেইল পাঠানো আটকানো |

---

## ৭. Product meta ও Options

| Meta | ডিফল্ট | কাজ |
|---|---|---|
| `_purecart_plugin_slug` | `''` | **এটা ছাড়া update বন্ধ**; প্লাগইন ফোল্ডারের নামের সমান |
| `_purecart_product_type` | `wp-plugin` | wp-plugin, wp-theme, software, font, template, other |
| `_purecart_update_requires_license` | `yes` | license লাগবে কিনা |
| `_purecart_update_channel` | `stable` | ডিফল্ট channel |
| `_purecart_beta_channel_enabled` | `no` | beta/nightly আদৌ দেওয়া হবে কিনা |
| `_purecart_update_notify_customers` | `yes` | রিলিজে ইমেইল |
| `_purecart_update_author` | সাইটের নাম | মোডালে লেখক |
| `_purecart_update_homepage` | `''` | মোডালে হোমপেজ |
| `_purecart_update_banner_id` | `''` | মোডালের ব্যানার (attachment ID) |

| Option | কাজ |
|---|---|
| `purecart_update_secret` | HMAC signing key (প্রথম ব্যবহারে তৈরি) |
| `purecart_license_channel_{id}` | নির্দিষ্ট license-কে beta/nightly দেওয়া |
| `purecart_updates_rewrite_version` | rewrite flush ট্র্যাকিং |

Action Scheduler hook: `purecart_send_update_notification_batch` (গ্রুপ `purecart`)

---

## ৮. `PureCartUpdater` — গ্রাহকের ফাইল

📄 `includes/Updates/client/PureCartUpdater.php`

গ্রাহককে এই ফাইলটা দিতে হবে। তিনি নিজের প্লাগইনে রেখে বুট করবেন:

```php
if ( is_admin() ) {
    require_once __DIR__ . '/includes/PureCartUpdater.php';

    new \PureCart\Updater\v1\PureCartUpdater( array(
        'api_url'      => 'https://yourstore.com',
        'plugin_file'  => __FILE__,
        'product_slug' => 'acme-demo',
        'license_key'  => get_option( 'my_plugin_license_key' ),
        'version'      => MY_PLUGIN_VERSION,
    ) );
}
```

থিমের জন্য `plugin_file`-এর বদলে `'theme_slug' => 'my-theme'`।

**যা নিজে সামলায়:**
- WP-র update transient-এ ঢোকা (Plugins স্ক্রিনে ব্যাজ)
- "View details" মোডাল
- ১২ ঘণ্টা cache
- **ডাউনলোডের ঠিক আগে নতুন token নেওয়া** — cache করা URL ততক্ষণে মেয়াদোত্তীর্ণ
- **ইনস্টলের আগে SHA-256 মেলানো** — না মিললে ফাইল বাতিল
- license না থাকলে auto-update বন্ধ

> **সংঘাত এড়াতে** version-pinned namespace (`PureCart\Updater\v1`) + `class_exists` গার্ড। দুটো প্লাগইন একই ফাইল পাঠালেও fatal হবে না।

---

## ৯. ফ্রন্টএন্ডের জন্য — Update Manager পেজ

এখন `src/app/components/Updates/UpdatesPage.tsx` মাত্র ১৯ লাইনের `<ComingSoon />` স্টাব।

### `GET /updates/products` যা দেয়

```json
[{
  "product_id": 54,
  "product_name": "T-Shirt with Logo",
  "slug": "acme-demo",
  "type": "wp-plugin",
  "requires_license": true,
  "latest_version": "1.10.0",
  "latest_released": "2026-08-26 14:58:38",
  "channels": { "stable": "1.10.0", "beta": "1.11.0-beta", "nightly": null },
  "version_count": 2,
  "active_count": 2,
  "total_downloads": 1,
  "reporting_sites": 0,
  "adoption_rate": 0
}]
```

### `GET /updates/products/{id}` যা দেয়

```json
{
  "summary":  { "...উপরের মতো..." },
  "versions": [ { "id": 1, "version": "1.10.0", "channel": "stable",
                  "platform": "all", "file_size": 512,
                  "checksum": "sha256:...", "requires_wp": "6.0",
                  "tested_wp": "6.8", "requires_php": "8.0",
                  "is_active": true, "download_count": 1,
                  "released_at": "2026-08-26 14:58:38" } ],
  "adoption": [ { "version": "1.10.0", "sites": 12, "share": 80.0 } ]
}
```

### Auth

```js
fetch( '/wp-json/purecart/v1/updates/products', {
    headers: { 'X-WP-Nonce': wpApiSettings.nonce },
} )
```

nonce ছাড়া **৪০১**। ব্রাউজারে সরাসরি URL দিলে কাজ করবে না।

### যা ব্যাকএন্ডে **নেই** (UI বানানোর আগে জানুন)

| দরকার হলে | অবস্থা |
|---|---|
| React থেকে প্যাকেজ আপলোড | ❌ endpoint নেই (এখন শুধু প্রোডাক্ট ট্যাব) |
| React থেকে withdraw/delete | ❌ নেই (admin-post.php আছে) |
| rollback | ❌ Phase 2 |
| থিম update flow | ❌ Phase 2 |
| GPG signing · Electron feed · S3/R2 · WP-CLI · GitHub sync | ❌ Phase 2/3 |

---

## ১০. জানা সীমাবদ্ধতা ও সতর্কতা

**🔴 nginx-এ deny রুল দরকার।** `.htaccess` nginx পড়ে না:

```nginx
location ~* /wp-content/uploads/purecart-packages/ { deny all; }
```

ফাইলনামে ১৬-অক্ষরের random prefix দ্বিতীয় স্তরের সুরক্ষা দেয়, কিন্তু দুটোই থাকা উচিত।

**adoption rate `0` দেখাতে পারে।** সংখ্যাটা তখনই বাড়ে যখন কোনো সাইট **license + domain সহ** update check করে, **এবং** সেই ডোমেইনের একটা activation row আগে থেকেই আছে। update check ইচ্ছাকৃতভাবে নতুন activation তৈরি করে না — নাহলে গ্রাহকের activation slot চুপচাপ খরচ হয়ে যেত।

**changelog readme.txt থেকে পড়া হয় না** — ইচ্ছাকৃত। DB-তে আলাদা রাখা হয় যাতে **ZIP আবার আপলোড না করেই** সংশোধন করা যায়। `requires`/`tested`/`requires_php` অবশ্য readme থেকে পড়া হয়।

---

## ১১. টেস্টিং

স্বতন্ত্র টেস্ট (WordPress ছাড়া, SQLite দিয়ে):

```bash
bash run-tests.sh
```

> ⚠️ CLI-র PHP 8.0 দিয়ে চালাবেন না — কোডে PHP 8.2 ফিচার আছে। `run-tests.sh` সাইটের নিজের PHP 8.2 ব্যবহার করে।

লাইভ WordPress-এ চালাতে `wp-load.php`-র **আগে** `DB_HOST` = `127.0.0.1:10005` define করতে হয় (MySQL ওই পোর্টে, wp-config-এ `localhost` লেখা)।

QA চেকলিস্ট: `docs/UPDATES-QA-BN.md`

---

## ১২. QA-তে যে বাগগুলো ধরা পড়েছিল (ঠিক করা)

| বাগ | ফল হতো |
|---|---|
| **ইমেইল নিঃশব্দে হারাত** | `WC()->mailer()` না ডাকায় Action Scheduler জবে কোনো listener থাকত না। **Subscriptions-এর ১৯টা ইমেইলেও একই বাগ ছিল** |
| `requires_php` ফাঁকা যেত | PHP ৭.৪-এর সাইটে PHP ৮.০-দরকারি update বসে **সাইট ভাঙত** |
| `is_inside_storage()` Windows-এ ফেল | `delete()` ফাইল মুছত না, orphan জমত |
| ফর্মে `enctype` ছিল না | আপলোড নিঃশব্দে ব্যর্থ হতো |
| SQL-এ version sort | `1.10.0` রিলিজের দিন থেকে **সব update চিরতরে বন্ধ** হয়ে যেত |

---

*Phase 1 সম্পূর্ণ। Phase 2/3 বাকি — ডক: `docs/RND-auto-updates.md`*
