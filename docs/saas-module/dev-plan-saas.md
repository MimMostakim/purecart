# SaaS Provisioning Module — Backend Development Plan

**Plugin:** purecart
**Module:** SaaS Provisioning (Phase 2)
**Scope:** PHP backend only — settings, provisioning lifecycle, API keys, JWT issuance, emails, REST API, CLI
**Out of scope:** React admin UI (`src/app/components/SaasAccounts/`) — আলাদা frontend dev-plan এ, অন্য কেউ করবে
**Reference:** `docs/RND-saas-provisioning.md`, `docs/plugin-guideline.md`
**Branch:** `development` থেকে `saas-module` কাটা হবে

---

## নিয়ম

প্রতিটি Step শেষ করার পর:
1. Manual test checklist দেওয়া হবে
2. Test পাস করলে permission নিয়ে পরের Step শুরু হবে
3. এক Step = এক commit — mixed commit নয়
4. React/UI এর কোনো কাজ এই plan এ নেই। Step 7 এর REST contract-ই frontend dev এর handoff point (Appendix A দেখো)
5. কোনো module সরাসরি `get_option()` call করবে না — `Settings::get()` + `OptionKeys::` constant

---

## As-Built অবস্থা (কাজ শুরুর আগে যা আছে)

Downloads module এর মতোই — কোড কিছুটা আছে, কিন্তু **module টা অর্ধেক চলে, অর্ধেক ভাঙা**। অডিটে যা পেলাম:

| জিনিস | অবস্থা |
|---|---|
| `Store/SaasAccounts.php` | ✅ টেবিল তৈরি হয় (`Activator::create_tables()`) |
| `SaaS/AccountProvisioner.php` | ⚠️ আছে — `provision()` / `suspend()` / `activate()` / `get_by_user()` কাজ করে, কিন্তু raw `get_option( 'purecart_saas_webhook_url' )` / `get_option( 'purecart_webhook_secret' )` — কোনো `OptionKeys` constant নেই, secret auto-generate হয় না |
| `OrderHandler::on_order_complete()` | ⚠️ `purecart_saas` টাইপে `AccountProvisioner::provision()` কল করে, কিন্তু **idempotency guard নেই** — license path-এ `_purecart_license_id` meta চেক করে skip করে, SaaS path-এ তা নেই। `LICENSE_DELIVERY_STATUS = both` হলে ডাবল account + ডাবল API key তৈরি হবে |
| Order item meta link | ❌ লেখা হয় না — license flow `_purecart_license_id` লেখে, SaaS flow কিছুই লেখে না। এক order-এ একাধিক SaaS product থাকলে item-নির্দিষ্টভাবে account খুঁজে পাওয়ার উপায় নেই |
| `OrderHandler::suspend_by_order()` (refund/cancel) | ⚠️ সরাসরি `$wpdb->update` দিয়ে status suspended করে, `AccountProvisioner::suspend()` কল করে **না** → refund/cancel এ webhook fire হয় না (subscription cancel path ঠিক আছে, ওটা `DeliveryManager` দিয়ে `AccountProvisioner::suspend()` কল করে) |
| `Subscriptions\DeliveryManager.php` | ✅ subscription renewal/reactivation এ `AccountProvisioner::activate()`, cancel এ (setting সাপেক্ষে) `AccountProvisioner::suspend()` — এই অংশ ভালোভাবেই কাজ করে |
| `ApiKeyManager.php` | ❌ নেই — key generation `AccountProvisioner::provision()` এর ভেতরে inline, rotate করার কোনো method নেই |
| `JwtIssuer.php` | ❌ নেই — RND spec-এ বলা SaaS login JWT পুরোপুরি অনির্মিত |
| `PlanSyncer.php` | ❌ নেই — plan upgrade/downgrade sync webhook নেই |
| REST API | ⚠️ শুধু `GET /saas/usage/{api_key}` আছে (`API/RestApi.php`)। `provision` / `suspend` / `activate` / `token` — RND spec-এ থাকা এই ৪টা endpoint-ই নেই। Frontend-এর জন্য list/detail/stats/settings endpoint কিছুই নেই |
| `CustomerDashboard\Dashboard.php` | ✅ My Account → API Keys ট্যাব কাজ করে (`render_api_keys_tab()` → `AccountProvisioner::get_by_user()`) |
| Admin product tab | ✅ Product edit → SaaS Plan ফিল্ড (`_purecart_saas_plan`) কাজ করে |
| Access/credentials email | ❌ নেই — RND spec বলে "send login credentials email", কিন্তু কোনো Email class নেই |
| Frontend (`SaasAccountsPage.tsx`) | ❌ ১০০% `<ComingSoon />` placeholder |
| CLI retroactive tool | ❌ নেই — `LicenseCommands.php` শুধু license-এর জন্য, SaaS-এর জন্য সমতুল্য কিছু নেই |

**অর্থাৎ Step 1–3 ভাঙা/অসম্পূর্ণ জিনিস ঠিক করা, Step 4–9 নতুন feature।**

---

## Step 1 — OptionKeys + Webhook/JWT Settings Foundation

**কী করব:**

`includes/Settings/OptionKeys.php` — নতুন section:

```php
// ─── SaaS Provisioning module ──────────────────────────────────────────────
public const SAAS_WEBHOOK_URL          = 'purecart_saas_webhook_url';           // ''
public const SAAS_WEBHOOK_SECRET       = 'purecart_saas_webhook_secret';        // auto-generated
public const SAAS_JWT_SECRET           = 'purecart_saas_jwt_secret';            // auto-generated
public const SAAS_JWT_EXPIRY_SECONDS   = 'purecart_saas_jwt_expiry_seconds';    // 600
public const SAAS_JWT_REFRESH_SECONDS  = 'purecart_saas_jwt_refresh_seconds';   // 2592000 (30 দিন)
public const SAAS_ACCESS_EMAIL_ENABLED = 'purecart_saas_access_email_enabled';  // true
```

> **নোট:** provisioning trigger status-এর জন্য নতুন constant লাগবে না — `LICENSE_DELIVERY_STATUS`-এর docblock-ই বলছে এটা license/download/SaaS তিনটাই ট্রিগার করে। আলাদা `SAAS_TRIGGER_STATUS` বানালে তিনটা module-এর provisioning একসাথে থাকা উচিত এই ধরে নেওয়া RND assumption-টা ভাঙবে — Downloads module ইচ্ছাকৃতভাবে নিজের `DOWNLOAD_TRIGGER_STATUS` আলাদা রেখেছিল কারণ ফাইল আর লাইসেন্স আলাদা সময়ে দেওয়ার বাস্তব কারণ আছে; SaaS account আর license-এর মধ্যে তেমন কোনো কারণ নেই, তাই শেয়ার করাই ঠিক।

`AccountProvisioner::send_webhook()` — secret resolve:
```php
$secret = Settings::get( OptionKeys::SAAS_WEBHOOK_SECRET );
if ( empty( $secret ) ) {
    $secret = wp_generate_password( 32, false );
    Settings::set( OptionKeys::SAAS_WEBHOOK_SECRET, $secret );
}
```

**Files:**

```
includes/Settings/OptionKeys.php   ← ৬টা constant
includes/SaaS/AccountProvisioner.php   ← webhook_url/secret raw get_option() সরানো
```

### Manual Test — Step 1
- [ ] Plugin deactivate → activate — fatal error নেই
- [ ] প্রথমবার webhook fire হলে `purecart_saas_webhook_secret` option auto-generate হয়ে যায়, দ্বিতীয়বার একই secret ব্যবহার হয়
- [ ] `Settings::get( OptionKeys::SAAS_WEBHOOK_URL )` খালি স্ট্রিং দেয় যদি সেট না থাকে
- [ ] কোথাও raw `get_option( 'purecart_saas_...' )` আর নেই (`grep` দিয়ে যাচাই)

**Step 1 শেষে permission চাইব।**

---

## Step 2 — AccountProvisioner Hardening + Order Item Meta Link

**কী করব:**

`AccountProvisioner::provision()` এ নতুন signature — return type একই থাকবে, কিন্তু caller-কে idempotency-র দায়িত্ব থেকে মুক্ত করব:

```php
provision_for_order_item( \WC_Order_Item_Product $item, int $order_id, int $user_id, int $product_id ): ?object
```

- আগে `$item->get_meta( '_purecart_saas_account_id', true )` চেক করবে — থাকলে existing account row return করে দেবে, নতুন provision করবে না (license path-এর হুবহু প্যাটার্ন)
- account তৈরি হলে `wc_add_order_item_meta( $item_id, '_purecart_saas_account_id', $account->id )`
- পুরনো `provision( int $order_id, int $user_id, int $product_id )` → `@deprecated` shim হিসেবে থাকবে, ভেতরে সরাসরি DB insert করবে (item meta ছাড়া) — শুধু backward compatibility-র জন্য, নতুন কোড এটা কল করবে না

**Files:**

```
includes/SaaS/AccountProvisioner.php
```

### Manual Test — Step 2
- [ ] একটা `purecart_saas` product অর্ডার করে completed করলে ঠিক **১টা** row তৈরি হয়, order item meta-তে `_purecart_saas_account_id` সেট
- [ ] Order status processing → completed করলে (trigger = both হলে) দ্বিতীয়বার account তৈরি হয় **না**, একই account row রিটার্ন হয়
- [ ] এক order-এ ২টা আলাদা SaaS product থাকলে ২টা আলাদা account, প্রতিটা item এ নিজের `_purecart_saas_account_id`

**Step 2 শেষে permission চাইব।**

---

## Step 3 — OrderHandler Wiring Fix

**কী করব:**

`includes/Commerce/OrderHandler.php`:
- `on_order_complete()` এর SaaS ব্লক → `AccountProvisioner::provision_for_order_item( $item, $order_id, $user_id, $product_id )`
- `suspend_by_order()` — সরাসরি `$wpdb->update` করার বদলে, order-এর সব item থেকে `_purecart_saas_account_id` collect করে প্রতিটাতে `AccountProvisioner::suspend( $account_id )` কল করবে (webhook consistently fire হবে)
- নতুন: `reactivate_by_order( int $order_id )` — order আবার completed হলে (যেমন disputed refund reversed) সেই order-এর সব SaaS account-এ `AccountProvisioner::activate()` কল করবে

**Files:**

```
includes/Commerce/OrderHandler.php
```

### Manual Test — Step 3
- [ ] Order refund করলে SaaS account status = suspended **এবং** webhook log-এ suspend event দেখা যায় (temporary error_log দিয়ে যাচাই)
- [ ] একই order-এ ২টা SaaS account থাকলে refund-এ দুটোই suspend হয়
- [ ] Order cancel-এও একই আচরণ
- [ ] Subscription cancel flow (Step আগে থেকেই আছে) এখনো ঠিকমতো কাজ করে — regression নেই

**Step 3 শেষে permission চাইব।**

---

## Step 4 — ApiKeyManager Extraction + Rotate

**কী করব:**

`includes/SaaS/ApiKeyManager.php` (নতুন):

```php
generate(): string                          // 'purecart_' . bin2hex( random_bytes( 24 ) )
rotate( int $account_id ): ?string          // নতুন key, পুরনোটা সাথে সাথে অকেজো, do_action( 'purecart_api_key_rotated', ... )
revoke( int $account_id ): bool             // api_key কে খালি স্ট্রিং করে দেয় + status বদলায় না (শুধু key অকেজো)
```

`AccountProvisioner::provision_for_order_item()` এখন key generation-এর জন্য `ApiKeyManager::generate()` কল করবে — duplicate logic থাকবে না।

**Files:**

```
includes/SaaS/ApiKeyManager.php   ← new
includes/SaaS/AccountProvisioner.php   ← generate() delegate
```

### Manual Test — Step 4
- [ ] নতুন account-এ key ফরম্যাট ঠিক (`purecart_` + ৪৮ hex char)
- [ ] Rotate করলে পুরনো key দিয়ে `/saas/usage/{api_key}` আর কাজ করে না, নতুন key দিয়ে করে
- [ ] Revoke করলে key দিয়ে কোনো lookup কাজ করে না, কিন্তু account row/status অক্ষত থাকে

**Step 4 শেষে permission চাইব।**

---

## Step 5 — JwtIssuer + Token Endpoint

**কী করব:**

> **সংশোধন (বাস্তবায়নের সময়):** plan-এ লেখা ছিল `firebase/php-jwt` সরাসরি ব্যবহার করব, কারণ RND doc বলেছিল এটা "composer.json-এ আগে থেকেই আছে"। বাস্তবে `composer.json`-এর `require`-এ শুধু `php >=8.1` — কোনো runtime dependency নেই, আর `Autoloader.php`-এর docblock স্পষ্ট বলছে "Works without composer install — the plugin is fully self-contained"। Licensing module ঠিক এই কারণেই নিজস্ব dependency-free HS256 codec (`PureCart\Licensing\Jwt`) বানিয়েছে, firebase/php-jwt নয়। সেই একই generic, license-নির্দিষ্ট কোনো লজিক-বিহীন `Jwt` class SaaS module থেকেও reuse করছি — দুইটা আলাদা HS256 implementation রাখলে একদিন দুটো ড্রিফট করে বাগ হওয়ার ঝুঁকি থাকে।
>
> এর সাথে আরেকটা সংশোধন: refresh token `wp_options`-এ না রেখে, Licensing module-এর `wp_purecart_license_tokens` প্যাটার্ন অনুসরণ করে নতুন `wp_purecart_saas_tokens` টেবিল বানিয়েছি (jti, token_type, expires_at, revoked) — এতে revoke/audit/cleanup সবই সহজ হয়, আর দুই module-এর টোকেন ট্র্যাকিং একই ধরনের দেখতে হয়। Refresh token প্রতি ব্যবহারে rotate হয় না (Licensing-এর `LicenseTokenRefresher`-এর মতোই) — নিজের ৩০ দিনের মেয়াদ পর্যন্ত ভ্যালিড থাকে, শুধু নতুন access token ইস্যু হয়। Access token-এর payload-এ raw `api_key` embed করছি না (নিরাপত্তার কারণে — token নিজেই এখন credential, চাবি এমবেড করার দরকার নেই)।

`includes/Store/SaasTokens.php` (নতুন) — `wp_purecart_saas_tokens` টেবিল, `LicenseTokens`-এর হুবহু প্যাটার্ন (domain column ছাড়া)। `Activator.php`-এ wire করা + `DB_VERSION` বাম্প।

`includes/SaaS/JwtSecret.php` (নতুন) — `Licensing\JwtSecret`-এর প্যাটার্ন, কিন্তু নিজস্ব secret (`OptionKeys::SAAS_JWT_SECRET`) — লাইসেন্স আর SaaS login টোকেন আলাদা জিনিস প্রমাণ করে, একটা leak হলে অন্যটা ফোর্জ করা যাবে না।

`includes/SaaS/JwtIssuer.php` (নতুন):

```php
issue( string $api_key ): array|WP_Error       // ['access_token', 'refresh_token', 'expires_in', 'refresh_expires_in']
refresh( string $refresh_token ): array|WP_Error   // ['access_token', 'expires_in']
```

- Access token: HS256 (`PureCart\Licensing\Jwt::encode`), payload-এ `saas.account_id`, `saas.user_id`, `saas.plan`; expiry `OptionKeys::SAAS_JWT_EXPIRY_SECONDS`
- Secret: `JwtSecret::get()` (constant override + auto-generate)
- Refresh token: JWT (`jti` claim), `wp_purecart_saas_tokens`-এ row হিসেবে track হয়; refresh call rate-limited (transient, ঘণ্টায় ১০ বার ডিফল্ট)
- `AccountProvisioner`-এ নতুন public `get_by_api_key()` যোগ হলো (JwtIssuer-এর জন্য)

REST endpoint `POST /purecart/v1/saas/token` (`includes/API/` এ যোগ হবে Step 7-এ, class এখানেই তৈরি — Step 7 শুধু route registration)।

**Files:**

```
includes/Store/SaasTokens.php          ← new
includes/Activator.php                 ← wiring + DB_VERSION bump
includes/SaaS/JwtSecret.php            ← new
includes/SaaS/JwtIssuer.php            ← new
includes/SaaS/AccountProvisioner.php   ← get_by_api_key(), get_by_id() public করা
```

### Manual Test — Step 5
- [ ] Valid `api_key` দিয়ে `JwtIssuer::issue()` কল করলে decode-যোগ্য JWT পাওয়া যায়, payload-এ সঠিক `user_id`/`plan`
- [ ] Expired token দিয়ে verify করলে fail করে
- [ ] Refresh token দিয়ে নতুন access token পাওয়া যায়, পুরনো refresh token পুনরায় ব্যবহার করলে fail করে (rotation)
- [ ] Suspended account-এর api_key দিয়ে issue করলে `WP_Error` (`account_suspended`)

**Step 5 শেষে permission চাইব।**

---

## Step 6 — Access/Credentials Email

**কী করব:**

`includes/SaaS/Emails/AccountProvisionedEmail.php` (নতুন) — `Updates\Emails\UpdateAvailableEmail.php`-এর প্যাটার্ন অনুসরণ করে WooCommerce email class extend করবে।

- Trigger: `do_action( 'purecart_saas_provisioned', $account )` (already fires) → hook করে email পাঠাবে
- Content: plan name, product name, api_key (copy button নেই — plain email), My Account → API Keys লিংক
- `includes/SaaS/Module.php` (নতুন, bootstrap) — email register-এর owner

> **সংশোধন (বাস্তবায়নের সময়):** plan-এ লেখা ছিল `OptionKeys::SAAS_ACCESS_EMAIL_ENABLED` নামে একটা নতুন setting দিয়ে email on/off হবে। কিন্তু `UpdateAvailableEmail`-এ এমন কোনো কাস্টম constant নেই — WooCommerce-এর `WC_Email` নিজেই প্রতিটা email-এর জন্য WooCommerce → Settings → Emails-এ একটা "Enable this email notification" টগল দেয় (`is_enabled()`), যেটা `trigger()`-এ চেক করা হয়। দুটো আলাদা on/off রাখলে একটা on আর আরেকটা off থাকলে confusing অবস্থা হতো, আর merchant দুই জায়গায় খুঁজত। তাই `SAAS_ACCESS_EMAIL_ENABLED` constant বাদ দিয়ে শুধু WooCommerce-এর native email settings-ই ব্যবহার করছি — ঠিক `UpdateAvailableEmail`-এর মতোই।
>
> `AccountProvisioner`/`ApiKeyManager`/`JwtIssuer` — এদের কোনোটারই long-lived instance দরকার নেই (প্রতিটা call-site-এ `new` করে ব্যবহার হয়), তাই `Module`-এর কাজ আপাতত শুধু email register করা। REST controller (Step 7) এলে সেটাও এখানে register হবে।
>
> **দ্বিতীয় সংশোধন (Step 9-এ লাইভ টেস্ট করে ধরা পড়েছে):** email class WooCommerce → Settings → Emails-এ ঠিকই দেখা যাচ্ছিল, enabled-ও ছিল, কিন্তু order complete করলে mail **যাচ্ছিল না**। কারণ: `WC_Emails` (যেটা আমাদের email class-কে instantiate করে, `add_action('purecart_saas_provisioned', ...)` রেজিস্টার করে) **lazy-load** হয় — WooCommerce-এর `WC()->mailer()` প্রথমবার ডাকা না হওয়া পর্যন্ত আমাদের listener-ই বসে না। `AccountProvisioner::create_account()` থেকে `do_action('purecart_saas_provisioned', ...)` `OrderHandler::on_order_complete()`-এর ভেতর থেকে চলে, যেটা `woocommerce_order_status_completed`-এ hook করা — আর WooCommerce নিজের "New order"/"Processing" email-ও ঠিক এই একই hook দিয়ে trigger হয়। আমাদের handler যদি WooCommerce-এর নিজের email-trigger handler-এর **আগে** চলে (hook registration order-নির্ভর, request-ভেদে বদলাতে পারে), তাহলে আমাদের event fire হওয়ার সময় `WC()->mailer()` তখনো একবারও ডাকা হয়নি — listener নেই, event silently হারিয়ে যায়। মুহূর্ত পরে WooCommerce নিজের mail পাঠাতে গিয়ে `WC()->mailer()` প্রথমবার ডাকে (তখন listener বসে), কিন্তু ততক্ষণে দেরি হয়ে গেছে।
>
> এটা WooCommerce-এর নিজের documented gotcha — সমাধানও তাদেরই প্রস্তাবিত প্যাটার্ন: custom action fire করার ঠিক আগে একবার `WC()->mailer();` কল করে email system-টা জোর করে আগেভাগে initialize করিয়ে নেওয়া। `AccountProvisioner::create_account()`-এ `do_action('purecart_saas_provisioned', ...)`-এর ঠিক আগে `WC()->mailer();` যোগ করা হলো। Mailpit দিয়ে যাচাই করা হয়েছে — এখন mail যায়, placeholder সব সঠিক ভরে।
>
> **নোট:** `Updates\Emails\UpdateAvailableEmail`-এর trigger action (`purecart_update_available_email`)-এও তাত্ত্বিকভাবে একই ঝুঁকি থাকতে পারে যদি সেটাও কোনো WooCommerce order hook-এর ভেতর থেকে fire হয় — কিন্তু সেটা এই plan-এর scope-এর বাইরে, যাচাই করা হয়নি।

`includes/Plugin.php`:
- `new SaasModule();` যোগ (Downloads/Updates module প্যাটার্নে)

**Files:**

```
includes/SaaS/Emails/AccountProvisionedEmail.php   ← new
includes/SaaS/Module.php                            ← new
includes/Plugin.php                                 ← wiring
includes/Settings/OptionKeys.php                    ← SAAS_ACCESS_EMAIL_ENABLED যোগ হয়নি (উপরের নোট দেখো)
```

### Manual Test — Step 6
- [ ] SaaS product কিনলে customer email-এ API key সহ mail যায়
- [ ] WooCommerce → Settings → Emails-এ "SaaS Account Ready" নামে email দেখা যায়, disable করলে mail যায় না কিন্তু account ঠিকই provision হয়
- [ ] Email template-এ WooCommerce-এর standard header/footer আছে (অন্য PureCart email-এর মতোই দেখতে)

**Step 6 শেষে permission চাইব।**

---

## Step 7 — REST API (Frontend Handoff Point)

`includes/API/SaaS.php` (নতুন) — `PureCartApi` extend, `register_routes()` implement, namespace `PURECART_API_NAMESPACE` (`Downloads`/`Updates` controller-এর হুবহু প্যাটার্ন)।

| Method | Route | কাজ |
|---|---|---|
| GET | `/saas-accounts` | list — `search`, `status`, `plan`, `product_id`, `page`, `per_page`, `orderby` |
| GET | `/saas-accounts/(?P<id>\d+)` | single account |
| POST | `/saas-accounts/(?P<id>\d+)/suspend` | admin: suspend |
| POST | `/saas-accounts/(?P<id>\d+)/activate` | admin: re-activate |
| POST | `/saas-accounts/(?P<id>\d+)/rotate-key` | admin: rotate API key |
| GET | `/saas-accounts/stats` | admin card: total / active / suspended / cancelled, আজকের provision count, top 5 plan |
| GET, POST | `/saas-accounts/settings` | webhook URL + JWT expiry settings get/save (secret শুধু GET-এ দেখা যায়, POST দিয়ে বদলানো যায় না) |
| POST | `/saas/token` | **customer-facing**, API key auth (WP admin cap নয়) — `JwtIssuer::issue()` |
| POST | `/saas/token/refresh` | **customer-facing**, `JwtIssuer::refresh()` |
| GET | `/saas/usage/(?P<api_key>...)` | ইতিমধ্যে আছে (`RestApi.php`) — অপরিবর্তিত থাকছে |

> **সংশোধন (বাস্তবায়নের সময়):**
> - `/saas/token/refresh` টেবিলে ছিল না — Step 5-এ `JwtIssuer::refresh()` বানিয়েছিলাম অথচ প্ল্যানের রুট টেবিলে endpoint যোগ করতেই ভুলে গিয়েছিলাম। এখন যোগ করলাম (`API\RestApi`-তে `/license/token/refresh`-এর একই naming pattern)।
> - `/saas/usage/{api_key}` **migrate করিনি** — `RestApi.php`-তে যেমন আছে তেমনই থাকছে। একই route path দুই controller-এ আলাদা করে register করলে কোনটা আসলে request handle করবে সেটা load-order-নির্ভর হয়ে যায় (silent shadowing risk) — আর route-টা এমনিতেই ঠিকমতো কাজ করছিল, migrate করার দরকার ছিল না, শুধু ঝুঁকি ছিল।
> - Settings endpoint-এ webhook **secret** POST দিয়ে বদলানো যায় না ইচ্ছাকৃতভাবে — এটা auto-generate হয় (Step 1), আর এই ফর্ম থেকে ভুলবশত বদলে গেলে merchant-এর SaaS backend-এ signature verification নিঃশব্দে ভেঙে যাবে কোনো দৃশ্যমান কারণ ছাড়াই।
> - Postman collection বানানো হয়নি — টেস্টিং এখন পুরোটাই browser + Adminer দিয়ে হচ্ছে (ব্যবহারকারীর সাথে established workflow), তাই এটা এই মুহূর্তে অগ্রাধিকার নয়। দরকার হলে পরে যোগ করা যাবে।

- Admin route-এ `permission_callback` = `manage_woocommerce`
- `/saas/token` ও `/saas/token/refresh` route-এ কোনো WP capability লাগবে না — body-তে `api_key`/`refresh_token` verify করে, suspended/invalid হলে reject
- pagination: `X-WP-Total` + `X-WP-TotalPages` header (Subscriptions controller-এর প্যাটার্ন অনুসরণ — `find_all()` + headers)
- `AccountProvisioner`-এ নতুন `find_all()` (search/status/plan/product_id filter + pagination) আর `stats()` যোগ হলো
- `SaaS\Module`-এ `( new SaasApi() )->register();`

### Manual Test — Step 7
- [ ] `/wp-json/purecart/v1/saas-accounts` logged-in admin এ JSON দেয়, logged-out এ 401, Subscriber role এ 403
- [ ] `search`/`status`/`plan`/`product_id` filter আর pagination header (`X-WP-Total`, `X-WP-TotalPages`) ঠিক কাজ করে
- [ ] suspend/activate endpoint DB আপডেট করে **এবং** webhook fire করে; ইতিমধ্যে সেই state-এ থাকা account-এ 409 আসে
- [ ] rotate-key-এর পর পুরনো key দিয়ে `/saas/token` fail করে, নতুনটা দিয়ে সফল হয়
- [ ] `/saas/token` আর `/saas/token/refresh`-এ কোনো auth cookie/nonce ছাড়া, শুধু valid `api_key`/`refresh_token` দিয়েই সফল হয়
- [ ] `/saas-accounts/settings` GET-এ webhook URL/secret দেখা যায়; POST দিয়ে শুধু `webhook_url` ও JWT expiry বদলায়, secret অপরিবর্তিত থাকে
- [ ] stats-এর সংখ্যা DB-র সাথে মেলে

**Step 7 শেষে permission চাইব। এখান থেকে frontend dev সমান্তরালে কাজ শুরু করতে পারবে — Appendix A।**

---

## Step 8 — CLI: Retroactive Provisioning Tool

**কী করব:**

`includes/CLI/SaasCommands.php` (নতুন) — `LicenseCommands.php`-এর প্যাটার্ন হুবহু অনুসরণ করে বানানো:

```
wp purecart saas provision-past-orders [--product-id=<id>] [--date-from=<date>] [--date-to=<date>] [--status=<status>] [--dry-run]
```

> **সংশোধন (বাস্তবায়নের সময়):** প্ল্যানে লেখা ছিল `--product=<id>` — কিন্তু `LicenseCommands::generate_past_orders()` (যেটার প্যাটার্ন অনুসরণ করার কথা ছিল) আসলে `--product-id=<id>` ব্যবহার করে, সাথে `--date-from`/`--date-to`/`--status`ও আছে। দুটো CLI command-এর flag নাম আলাদা হলে ব্যবহারকারীর মনে রাখা কঠিন হতো, তাই `LicenseCommands`-এর সাথেই মিলিয়ে নিলাম।

- পুরনো order (plugin activation-এর আগের, যেখানে SaaS account provision হয়নি) scan করে retroactively `AccountProvisioner::provision_for_order_item()` কল করবে
- `--dry-run` এ শুধু কতগুলো order affected হবে তা report করবে, কিছু লিখবে না

**Files:**

```
includes/CLI/SaasCommands.php   ← new
includes/Plugin.php             ← CLI command register (WP_CLI::add_command)
```

### Manual Test — Step 8
- [ ] `--dry-run` এ কোনো DB write হয় না, শুধু count report
- [ ] আসল রান-এ পুরনো unprovisioned order-এ account তৈরি হয়, ইতিমধ্যে provisioned order skip হয় (idempotency guard কাজ করে)
- [ ] `--product-id=<id>` filter সঠিকভাবে কাজ করে

**Step 8 শেষে permission চাইব।**

---

## Step 9 — Final Integration Test

**কী করব:** কোড নয় — পুরো module এর end-to-end verification + `docs/saas-module/QA-CHECKLIST-BN.md` লেখা।

> **সংশোধন (বাস্তবায়নের সময়):** এই ধাপেই সবচেয়ে গুরুত্বপূর্ণ bug-টা লাইভ টেস্টিং-এ ধরা পড়ল — `Commerce\ProductTypes::product_class()` তিনটা PureCart টাইপকেই (`purecart_plugin`/`purecart_saas`/`purecart_bundle`) সরাসরি `WC_Product_Simple::class`-এ ম্যাপ করত। `WC_Product_Simple::get_type()` hardcoded সবসময় `'simple'` রিটার্ন করে, আর WooCommerce প্রতি save-এ `product_type` taxonomy term-কে `$product->get_type()` দিয়ে rewrite করে দেয় — ফলে dropdown-এ "PureCart – SaaS" সিলেক্ট করে Update করলেও DB-তে টাইপ চুপচাপ `simple`-এ ফিরে যেত, আর `OrderHandler`-এর `'purecart_saas' === $type` চেক কখনো true হতো না। এই একই বাগ Subscriptions module-এর জন্য আগে একবার ধরা পড়ে ঠিক করা হয়েছিল (`SubscriptionProductType.php`), কিন্তু Plugin/SaaS/Bundle-এ প্রয়োগ হয়নি। এখন তিনটা টাইপের জন্যই আলাদা subclass বানিয়ে (`PluginProductType`, `SaasProductType`, `BundleProductType` — সবগুলো `WC_Product_Simple extends` করে শুধু `get_type()` override করে) ঠিক করা হলো। এটা SaaS module-এর বাইরের ফাইল (`includes/Commerce/ProductTypes.php`), কিন্তু SaaS testing ব্লক করছিল বলে এখানেই fix করা হলো — Licensing/Downloads/Bundle module-এও এটা প্রভাব ফেলবে (ইতিবাচকভাবে)।

### Final Manual Test — Step 9
- [x] `purecart_saas` product কিনলে account তৈরি, webhook fire হয় — **লাইভ টেস্ট করে যাচাই করা হয়েছে** (webhook.site-এ `event: provision` request পাওয়া গেছে, `wp_purecart_saas_accounts`-এ row + order item meta `_purecart_saas_account_id` দুটোই ঠিক)
- [x] Key email যায় — **লাইভ টেস্ট করে যাচাই করা হয়েছে** (registered customer দিয়ে কিনে Mailpit-এ mail পাওয়া গেছে, placeholder সব সঠিক)। এই টেস্টেই `WC()->mailer()` timing bug ধরা পড়েছিল (উপরের Step 6-এর দ্বিতীয় সংশোধন দেখো), ঠিক করার পর কনফার্ম করা হয়েছে
- [ ] Order status `both` trigger-এ ডাবল account হয় না
- [x] Refund/cancel এ suspend + webhook — **লাইভ টেস্ট করে যাচাই করা হয়েছে** (refund → suspended + webhook `event: suspend`; order আবার Completed → active + webhook `event: activate`)
- [x] `/saas/token` দিয়ে JWT issue, refresh কাজ করে — **লাইভ টেস্ট করে যাচাই করা হয়েছে** (`wp_purecart_saas_tokens`-এ access+refresh row, refresh-এ নতুন access token কিন্তু refresh token অপরিবর্তিত)। Rate-limit আর suspended-account-block edge case এখনো টেস্ট করা হয়নি
- [x] Admin REST দিয়ে suspend/activate/rotate সব কাজ করে — **লাইভ টেস্ট করে যাচাই করা হয়েছে** (rotate-key কল করে DB-তে নতুন key কনফার্ম করা হয়েছে; suspend/activate refund/reactivate টেস্টের মাধ্যমে পরোক্ষভাবে verified)
- [x] `/saas-accounts/settings` GET/POST browser console থেকে যাচাই করা হয়েছে — webhook URL সেভ হয়, secret প্রথম webhook fire-এ auto-generate হয়েছে (`purecart_saas_webhook_secret` option তৈরি হয়েছে, নিশ্চিত করা হয়েছে)
- [x] `/saas-accounts` list আর `/saas-accounts/stats` — **লাইভ টেস্ট করে যাচাই করা হয়েছে**, DB-র সাথে হুবহু মিলেছে
- [ ] Subscriptions + Licensing + Downloads module একসাথে active রেখে কোনো conflict নেই
- [ ] `composer phpcs` clean — **এই environment-এ `vendor/` install করা নেই, তাই চালানো যায়নি।** সব ফাইল `php -l` দিয়ে syntax-check করা হয়েছে (কোনো error নেই), কিন্তু coding-standard লেভেলের চেক বাকি — `composer install` করে `composer phpcs` চালানো উচিত মার্জ করার আগে
- [x] এই সেশনের পুরো টেস্ট flow-এ debug log silent (কোনো নতুন PHP error/warning আসেনি — শুধু activation-time-এর পুরনো, অপ্রাসঙ্গিক `idx_channel` duplicate-key notice আছে)
- [ ] Fresh install (নতুন DB) তেও পুরো flow কাজ করে
- [ ] CLI retroactive tool (`wp purecart saas provision-past-orders`) বাস্তব WP-CLI দিয়ে চালিয়ে যাচাই করা হয়নি (এই session-এর bash-এ WP-CLI PATH-এ নেই) — Local-এর "Site Shell" থেকে করতে হবে

---

## Progress Tracker

| Step | কাজ | অবস্থা |
|---|---|---|
| 1 | OptionKeys + webhook/JWT settings | ✅ |
| 2 | AccountProvisioner hardening + item meta | ✅ |
| 3 | OrderHandler wiring fix | ✅ |
| 4 | ApiKeyManager + rotate | ✅ |
| 5 | JwtIssuer + token issuance | ✅ |
| 6 | Access email + SaaS\Module bootstrap | ✅ |
| 7 | REST API | ✅ |
| 8 | CLI retroactive tool | ✅ |
| 9 | Final integration test | ⚠️ কোড শেষ, কিন্তু নিচের কিছু চেকবক্স এখনো বাকি আছে — `docs/saas-module/QA-CHECKLIST-BN.md` দেখো |

---

## Appendix A — Frontend Handoff (এই plan এ নেই)

Step 7 merge হওয়ার পর React dev এই contract ধরে `src/app/components/SaasAccounts/` বানাতে পারবে (এখন শুধু `ComingSoon` placeholder)।

> **সংশোধন:** এখানে আগে লেখা ছিল "Downloads/Subscriptions module-এর `DataTable`/`Pagination` component reuse হবে" — ফ্রন্টএন্ড কোড সরাসরি ঘেঁটে দেখা গেছে এমন কোনো জেনেরিক shared component নেই (Subscriptions নিজের বেসপোক `SubscriptionsTable.tsx` বানিয়েছে, Licenses/Downloads এখনো placeholder)। পূর্ণাঙ্গ, বাস্তবসম্মত ফ্রন্টএন্ড dev-plan এখন আলাদা ফাইলে আছে — **`docs/saas-module/dev-plan-saas-frontend.md`** — সেটাই অনুসরণ করা হবে, এই Appendix শুধু ঐতিহাসিক রেফারেন্স হিসেবে থাকছে।

**SaaS account row shape:**

```ts
type SaasAccount = {
  id: number;
  order_id: number;
  order_number: string;
  user_id: number;
  customer_name: string;
  customer_email: string;
  product_id: number;
  product_name: string;
  plan: string;
  api_key: string;            // masked — শুধু শেষ ৮ character
  status: 'active' | 'suspended' | 'cancelled';
  provisioned_at: string;
};
```

**পেজ লাগবে ৩টা:** SaaS Accounts list (filter + row action: suspend / activate / rotate key) · Account detail (webhook event history দরকার হলে Step 6-এর পরে log টেবিল যোগ করা যেতে পারে, Appendix B দেখো) · Settings (webhook URL/secret, JWT expiry)।

---

## Appendix B — Phase 2 / 3 (এই plan এ নেই)

- `PlanSyncer.php` — plan upgrade/downgrade webhook event (`plan_change`), WooCommerce Subscriptions switch hook-এর সাথে integrate
- Webhook delivery log টেবিল (`wp_purecart_saas_webhook_logs`) — retry queue সহ, এখন fire-and-forget (fail হলে silently drop হয়)
- Webhook retry with exponential backoff (Action Scheduler)
- Usage-based billing metering endpoint (`POST /saas/usage/record`)
- Multi-seat / team account support
