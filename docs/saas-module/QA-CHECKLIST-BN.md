# PureCart SaaS Provisioning — ব্যাকএন্ড QA চেকলিস্ট

> প্রতিটা ধাপ ক্রমানুসারে করুন — পরেরটা আগেরটার উপর নির্ভরশীল।
> প্রতিটায় **কী করবেন** → **কী হওয়ার কথা** → **কোথায় মিলিয়ে দেখবেন** দেওয়া আছে।

---

## ⚠️ শুরুর আগে ৩টা কথা

### ১. একটা critical bug ইতিমধ্যে ঠিক করা হয়েছে — কিন্তু পুরনো প্রোডাক্ট থাকলে সাবধান

`Commerce\ProductTypes::product_class()`-এ একটা বাগ ছিল যেটার কারণে `purecart_saas`/`purecart_plugin`/`purecart_bundle` — এই তিনটা প্রোডাক্ট টাইপের কোনোটাই আসলে সেভ হতো না (dropdown-এ সিলেক্ট করলেও প্রতি save-এ চুপচাপ "Simple product"-এ ফিরে যেত)। এটা Step 9-এ ধরা পড়ে ঠিক করা হয়েছে (`PluginProductType`/`SaasProductType`/`BundleProductType` নতুন ক্লাস)।

**যদি এই fix-এর আগে কোনো PureCart প্রোডাক্ট বানানো হয়ে থাকে:**
- [ ] সেই প্রোডাক্ট এডিট করুন, Product data ড্রপডাউনে কী দেখাচ্ছে চেক করুন
- [ ] সঠিক PureCart টাইপ আবার সিলেক্ট করে Update করুন
- [ ] phpMyAdmin-এ `wp_term_relationships` + `wp_term_taxonomy` (taxonomy = `product_type`) জয়েন করে ওই প্রোডাক্টের আসল টাইপ যাচাই করুন — dropdown-এ যা দেখাচ্ছে তার উপর ভরসা করবেন না, শুধু DB-ই সত্যি কথা বলে

### ২. React ড্যাশবোর্ড দিয়ে টেস্ট করা যাবে না

"SaaS Accounts" পেজ এখনো `<ComingSoon />` placeholder — কোনো API কল নেই। যাচাই করতে হবে:
- **phpMyAdmin/Adminer** (Local → Database)
- **debug.log** (`wp-content/debug.log`)
- **Browser DevTools Console** — `purecartAdmin.apiUrl` + `purecartAdmin.restNonce` দিয়ে `fetch()` কল (নিচে §১০)
- **webhook.site** — outbound webhook চোখে দেখার জন্য

### ৩. Guest checkout-এ email/My Account টেস্ট হয় না

Guest দিয়ে কেনা অর্ডারে `user_id = 0` থাকে — SaaS account তৈরি হয় ঠিকই, কিন্তু email পাঠানো (§৯) আর My Account → API Keys ট্যাব (§১১) টেস্ট করতে হলে **লগইন করা registered customer** দিয়ে কিনতে হবে।

---

## ধাপ ০ — প্রস্তুতি

- [ ] `wp-config.php`-এ ডিবাগ চালু আছে কিনা:
  ```php
  define( 'WP_DEBUG', true );
  define( 'WP_DEBUG_LOG', true );
  define( 'WP_DEBUG_DISPLAY', false );
  ```
- [ ] WooCommerce active, PureCart active, `saas-module` branch checked out
- [ ] একটা লগইন করা টেস্ট customer অ্যাকাউন্ট বানান (email/My Account টেস্টের জন্য)
- [ ] [webhook.site](https://webhook.site) থেকে একটা ইউনিক URL নিন, ট্যাবটা খোলা রাখুন

---

## ধাপ ১ — ডাটাবেস টেবিল

**করুন:** PureCart deactivate → activate করুন। Adminer খুলুন।

- [ ] `wp_purecart_saas_accounts` টেবিল আছে
- [ ] `wp_purecart_saas_tokens` টেবিল আছে (Structure দেখুন — `account_id`, `jti`, `token_type`, `expires_at`, `revoked` কলাম আছে)
- [ ] `purecart_db_version` option = `1.4.0`
- [ ] দ্বিতীয়বার activate করলেও error নেই
- [ ] debug.log-এ কোনো নতুন error নেই

---

## ধাপ ২ — SaaS প্রোডাক্ট তৈরি

**করুন:** Products → Add New → Product data ড্রপডাউনে **"PureCart – SaaS"** বাছুন।

- [ ] ড্রপডাউনে অপশনটা দেখা যাচ্ছে
- [ ] **General** ট্যাব দেখা যাচ্ছে (আগে একটা বাগে এটা হারিয়ে যেত — WooCommerce-এর "empty tab hide" লজিকের কারণে; ঠিক করা হয়েছে), Regular Price ফিল্ড ভরা যাচ্ছে
- [ ] Product data-এর নিচে আলাদা **"PureCart Settings"** বক্স আছে (আগে এই বক্সটাই কোথাও render হতো না — `add_meta_boxes` hook মিসিং ছিল; ঠিক করা হয়েছে)
- [ ] সেই বক্সে **"SaaS Plan"** ফিল্ড আছে — `pro` লিখে দিন
- [ ] দাম দিন (যেমন ১০০), **Publish**
- [ ] Publish/Update করার পর পেজ রিফ্রেশ করে দেখুন dropdown এখনো "PureCart – SaaS"-ই দেখাচ্ছে (§শুরুর কথা ১ নম্বর অনুযায়ী — এবার আর "Simple"-এ ফিরে যাওয়ার কথা না)
- [ ] Adminer-এ `wp_term_relationships`/`wp_term_taxonomy` জয়েন করে taxonomy term সত্যিই `purecart_saas` কিনা নিশ্চিত করুন

---

## ধাপ ৩ — Webhook URL সেট করা

**করুন:** wp-admin-এ PureCart-এর যেকোনো পেজে গিয়ে DevTools Console-এ (`allow pasting` লেখার পর):

```js
fetch(purecartAdmin.apiUrl + 'saas-accounts/settings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': purecartAdmin.restNonce },
  body: JSON.stringify({ webhook_url: 'তোমার webhook.site URL' })
}).then(r => r.json()).then(console.log);
```

- [ ] Response-এ সেভ করা URL ফেরত আসে
- [ ] Adminer-এ `wp_options` → `purecart_saas_webhook_url` row-এ সঠিক URL আছে
- [ ] এই মুহূর্তে `purecart_saas_webhook_secret` **খালি** (এখনো কোনো webhook fire হয়নি — এটাই ঠিক)

---

## ধাপ ৪ — কেনা (Provisioning)

**করুন:** WooCommerce → Orders → Add new → ধাপ ২-এর SaaS প্রোডাক্ট যোগ করুন → Customer-এ registered টেস্ট ইউজার সিলেক্ট করুন → Status **Completed** → Create.

- [ ] `wp_purecart_saas_accounts`-এ নতুন row — `user_id`, `order_id`, `product_id` ঠিক আছে
- [ ] `plan` = `pro` (ধাপ ২-এর SaaS Plan ফিল্ড থেকে)
- [ ] `api_key` ফরম্যাট: `purecart_` + ৪৮ hex ক্যারেক্টার
- [ ] `status` = `active`
- [ ] Order item-এর মেটাতে (`wp_woocommerce_order_itemmeta`, বা HPOS হলে `wp_wc_orders_meta`/item meta টেবিল) `_purecart_saas_account_id` আছে, ঠিক ID-টা দেখাচ্ছে
- [ ] **webhook.site**-এ নতুন request — body-তে `"event": "provision"`, সঠিক `api_key`/`plan`/`user_id`
- [ ] এবার `purecart_saas_webhook_secret` option **auto-generate** হয়ে গেছে (ধাপ ৩-এর সাথে তুলনা করুন)
- [ ] debug.log-এ নতুন error নেই

**Idempotency:**
- [ ] Order status Processing → আবার Completed করুন → **দ্বিতীয় row তৈরি হয়নি**, একই `_purecart_saas_account_id` বহাল

---

## ধাপ ৫ — Refund / Cancel (Suspend)

**করুন:** ধাপ ৪-এর order refund করুন (পুরো টাকা)।

- [ ] `wp_purecart_saas_accounts`-এ সেই account-এর `status` = `suspended`
- [ ] webhook.site-এ `"event": "suspend"` সহ নতুন request
- [ ] একই order-এ ২টা SaaS প্রোডাক্ট থাকলে refund-এ **দুটো account-ই** suspend হয় (আলাদা order বানিয়ে টেস্ট করুন)
- [ ] Order **Cancel** করলেও একই আচরণ (নতুন test order দিয়ে)

**Reactivate:**
- [ ] Suspended অবস্থার order-টা আবার status **Completed**-এ আনুন
- [ ] account `status` আবার `active`, webhook-এ `"event": "activate"`

---

## ধাপ ৬ — API Key Rotate/Revoke

Console থেকে (admin nonce দিয়ে):

```js
fetch(purecartAdmin.apiUrl + 'saas-accounts/' + ACCOUNT_ID + '/rotate-key', {
  method: 'POST', headers: { 'X-WP-Nonce': purecartAdmin.restNonce }
}).then(r => r.json()).then(console.log);
```

- [ ] Response-এ নতুন `api_key_masked` আসে (আগেরটার থেকে আলাদা)
- [ ] Adminer-এ DB-তে `api_key` কলাম বদলে গেছে
- [ ] `purecart_api_key_rotated` action fire হয় (`add_action` দিয়ে সাময়িক `error_log` বসিয়ে যাচাই করা যায়)

---

## ধাপ ৭ — JWT Issue / Refresh

আগের ধাপের **আসল (masked নয়)** API key phpMyAdmin থেকে কপি করুন।

```js
fetch(purecartAdmin.apiUrl + 'saas/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ api_key: 'purecart_xxxxx...' })
}).then(r => r.json()).then(console.log);
```

- [ ] কোনো `X-WP-Nonce` **ছাড়াই** সফল হয় (customer-facing, WP capability লাগে না)
- [ ] Response-এ `access_token`, `refresh_token`, `expires_in` (=600), `refresh_expires_in` (=2592000)
- [ ] `wp_purecart_saas_tokens`-এ ২টা নতুন row (`access` + `refresh` টাইপ), `account_id` মিলছে

**Refresh:**
```js
fetch(purecartAdmin.apiUrl + 'saas/token/refresh', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refresh_token: 'আগের রেসপন্স থেকে refresh_token' })
}).then(r => r.json()).then(console.log);
```
- [ ] নতুন `access_token` পাওয়া যায়, `refresh_token` response-এ **নেই** (rotate হয় না, ইচ্ছাকৃতভাবে)
- [ ] ১০ বারের বেশি refresh কল করলে rate limit (`429`, কোড `rate_limited`) আসে

**Suspended account:**
- [ ] ধাপ ৫-এ suspend করা account-এর `api_key` দিয়ে `/saas/token` কল করলে `403` + `account_suspended`

---

## ধাপ ৮ — Admin List / Stats

```js
fetch(purecartAdmin.apiUrl + 'saas-accounts', { headers: { 'X-WP-Nonce': purecartAdmin.restNonce } })
  .then(r => r.json()).then(console.table);

fetch(purecartAdmin.apiUrl + 'saas-accounts/stats', { headers: { 'X-WP-Nonce': purecartAdmin.restNonce } })
  .then(r => r.json()).then(console.log);
```

- [ ] List-এ সব account দেখা যায়, `customer_name`/`customer_email`/`product_name`/`order_number` ভরা
- [ ] `?search=pro` দিলে শুধু matching plan/customer/product-এর row আসে
- [ ] `?status=suspended` filter কাজ করে
- [ ] `?per_page=1&page=2` দিলে ঠিক ১টা row + সঠিক পেজ
- [ ] Response header-এ `X-WP-Total`, `X-WP-TotalPages` আছে (DevTools → Network ট্যাবে দেখুন)
- [ ] Stats-এর `total`/`active`/`suspended`/`cancelled` DB-র প্রকৃত count-এর সাথে মেলে
- [ ] `top_plans`-এ `pro` সবার উপরে (যদি সবচেয়ে বেশি হয়)

---

## ধাপ ৯ — Email

**করুন:** WooCommerce → Settings → Emails।

> এই ধাপেই একটা real bug ধরা পড়েছিল (এখন ঠিক করা আছে): email class ঠিকই list-এ দেখা যেত, enabled-ও থাকত, কিন্তু mail **যেত না** — `WC()->mailer()` lazy-load হওয়ার কারণে timing সমস্যা (দেখো `docs/saas-module/dev-plan-saas.md`-এর Step 6-এর দ্বিতীয় সংশোধন)। এখন `AccountProvisioner::create_account()`-এ fix করা আছে, নিচের চেকগুলো পাস করা উচিত।

- [ ] **"SaaS Account Ready"** নামে email এন্ট্রি দেখা যায়
- [ ] Disable করে রেখে একটা registered customer দিয়ে কিনুন → account তৈরি হয়, কিন্তু mail **যায় না**
- [ ] আবার enable করে কিনুন → mail যায় (Local-এ mail catcher/Mailpit থাকলে সেখানে দেখুন — এই সাইটে **Mailpit পোর্ট 10000**-এ চালু আছে)
- [ ] Mail-এ `{first_name}`, `{plan}`, `{product_name}`, API key, My Account লিংক — সব **আসল মান**, placeholder টেক্সট নয়
- [ ] Guest checkout-এ (§শুরুর কথা ৩) mail **যায় না** (silently skip, কোনো error না)

---

## ধাপ ১০ — CLI Retroactive Tool

Local-এর সাইট শেল খুলুন (Local অ্যাপ → সাইট → "Open Site Shell") অথবা WP-CLI থাকা যেকোনো টার্মিনাল থেকে:

```bash
wp purecart saas provision-past-orders --dry-run
wp purecart saas provision-past-orders --product-id=<id> --dry-run
wp purecart saas provision-past-orders --product-id=<id>
```

- [ ] `--dry-run`-এ কোনো DB write হয় না — চালানোর আগে-পরে `wp_purecart_saas_accounts`-এর row সংখ্যা এক
- [ ] `--dry-run` ছাড়া চালালে unprovisioned পুরনো order-এ account তৈরি হয়
- [ ] ইতিমধ্যে provision হওয়া order-item skip হয় ("already had one" কাউন্টে যোগ হয়)
- [ ] `--product-id=<id>` filter শুধু সেই প্রোডাক্টের order-ই ধরে
- [ ] শেষে সারাংশ মেসেজ দেখায় (`Provisioned N ... (M already had one and were skipped)`)

---

## ধাপ ১১ — নিরাপত্তা / Permission

- [ ] লগআউট অবস্থায় `/saas-accounts` কল করলে **401**
- [ ] Subscriber role দিয়ে লগইন করে `/saas-accounts` কল করলে **403**
- [ ] Subscriber দিয়ে `/saas-accounts/{id}/suspend` কল করলে **403**
- [ ] `/saas/token` আর `/saas/token/refresh` — কোনো nonce/cookie auth ছাড়াই কাজ করে (customer-facing বলে ইচ্ছাকৃত), কিন্তু ভুল `api_key`/`refresh_token`-এ যথাক্রমে `401 invalid_api_key` / `401 invalid_refresh_token`
- [ ] `/saas-accounts/999999` (না-থাকা ID) → **404**, 403 নয়

---

## ধাপ ১২ — মডিউল সহাবস্থান ও শেষ যাচাই

- [ ] Licensing + Downloads + Updates + Subscriptions মডিউল একসাথে active রেখে SaaS টেস্ট আবার চালান — কোনো conflict/fatal নেই
- [ ] ধাপ ২-এর সময় ঠিক করা `ProductTypes` fix-এর প্রভাবে Licensing/Downloads/Bundle প্রোডাক্টও এখন ঠিকমতো সেভ হচ্ছে কিনা — একটা `purecart_plugin` প্রোডাক্ট বানিয়ে quick sanity check করুন
- [ ] পুরো QA শেষে debug.log-এ নতুন কোনো PHP error/warning/notice নেই
- [ ] `composer install` করে থাকলে `composer phpcs` clean (এই সেশনে vendor/ install করা ছিল না বলে চালানো যায়নি — merge-এর আগে করে নেওয়া উচিত)

---

## 🔴 যা টেস্ট করা যাবে না (জানা সীমাবদ্ধতা)

| বিষয় | কেন |
|---|---|
| React "SaaS Accounts" পেজ | এখনো `ComingSoon` placeholder, এই plan-এর বাইরে |
| আসল SaaS backend-এ webhook signature verify | নিজের কোনো SaaS backend নেই — শুধু webhook.site দিয়ে payload/header দেখা যায়, HMAC verify করে দেখানো যায় না |
| Plan upgrade/downgrade webhook (`plan_change`) | `PlanSyncer` অনির্মিত — Appendix B, future phase |
| Webhook retry/backoff | fire-and-forget, fail হলে silently drop — future phase |
| Fresh install (একদম নতুন DB) থেকে টেস্ট | এই সেশনে বিদ্যমান DB-তে টেস্ট করা হয়েছে |

---

## বাগ পেলে যা লিখে রাখবেন

1. কোন ধাপ ও কোন চেকবক্স
2. কী হওয়ার কথা ছিল / আসলে কী হলো
3. `wp_purecart_saas_accounts` / `wp_purecart_saas_tokens`-এর প্রাসঙ্গিক row
4. debug.log-এর প্রাসঙ্গিক অংশ
5. Product-টার taxonomy term (§শুরুর কথা ১ — dropdown না, DB) কী দেখাচ্ছে

এই ৫টা থাকলে সমস্যা ধরা অনেক সহজ হবে।
