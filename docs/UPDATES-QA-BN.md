# Updates মডিউল — QA চেকলিস্ট

> ধাপগুলো ক্রমানুসারে করুন। প্রতিটায় **কী করবেন → কী হওয়ার কথা** দেওয়া আছে।
> Subscriptions-এর মতো এখানে সময় এগিয়ে নেওয়ার দরকার নেই — সব তাৎক্ষণিক।

---

## ✅ যা আগেই তৈরি করে দেওয়া হয়েছে

**নমুনা ZIP তিনটা** — `Desktop/purecart-update-test/` ফোল্ডারে:

| ফাইল | ভেতরে `Stable tag` |
|---|---|
| `acme-demo-1.0.0.zip` | 1.0.0 |
| `acme-demo-1.1.0.zip` | 1.1.0 |
| `acme-demo-1.10.0.zip` | 1.10.0 |

**আপনার সাইটে বিদ্যমান license** (license gate টেস্টের জন্য):

| license | প্রোডাক্ট | key |
|---|---|---|
| #1 | 54 | `F8638D-92BC57-3A41AA-41B7EB` |
| #2 | 56 | `0349CA-19D41A-A68939-887442` |

---

## ধাপ ০ — প্রস্তুতি

- [ ] `wp-content/debug.log` মুছে ফেলুন (পরিষ্কার শুরু)
- [ ] Postman খুলুন, `base_url` = `http://localhost:10004`

---

## ধাপ ১ — Updates ট্যাব দেখা যাচ্ছে কি

**করুন:** Products → **T-Shirt** (বা যেকোনো প্রোডাক্ট) → Edit → Product data বক্স

- [ ] বাঁ পাশে **"Updates"** ট্যাব আছে
- [ ] ক্লিক করলে ৩টা অংশ: সেটিংস, নতুন version আপলোড, Version history
- [ ] Version history-তে লেখা: *"No versions have been uploaded yet."*

---

## ধাপ ২ — প্রথম প্যাকেজ আপলোড

**করুন:** ওই একই ট্যাবে —

1. **Update slug** → `acme-demo`
2. **Software type** → WordPress plugin
3. **Require a licence** → **টিক তুলে দিন** (প্রথমে license ছাড়া টেস্ট)
4. **Package file** → `acme-demo-1.0.0.zip`
5. **Version** → **ফাঁকা রাখুন** (readme.txt থেকে পড়ার কথা)
6. **Update** বাটন চাপুন

**দেখুন:**

- [ ] উপরে সবুজ নোটিশ: *"Version 1.0.0 uploaded and published."*
- [ ] Version history টেবিলে একটা সারি এসেছে
- [ ] **Version = `1.0.0`** ← readme.txt থেকে অটো-পড়া হয়েছে
- [ ] Channel = stable, Platform = all, Status = **● Serving**
- [ ] Size দেখাচ্ছে, Downloads = 0

> ⚠️ **কিছুই না হলে** — নোটিশ নেই, সারিও নেই — তাহলে ফর্মে `enctype` যোগ হয়নি। জানাবেন।

---

## ধাপ ৩ — update-check কাজ করছে কি

ব্রাউজারে সরাসরি খুলুন (এই endpoint public, nonce লাগে না):

```
http://localhost:10004/?rest_route=/purecart/v1/plugin/update-check&slug=acme-demo&version=0.9.0
```

- [ ] `"update": true`
- [ ] `"version": "1.0.0"`
- [ ] `"download_url"` আছে, `/purecart-update/` পথে
- [ ] `"checksum"` `sha256:` দিয়ে শুরু
- [ ] `"requires": "6.0"`, `"tested": "6.8"`, `"requires_php": "8.0"` ← readme.txt-এ ছিল না, তাই ফাঁকা থাকতে পারে (আপনি ফর্মে দিলে আসবে)

**একই version দিয়ে আবার:**
```
...&slug=acme-demo&version=1.0.0
```
- [ ] `"update": false`

---

## ধাপ ৪ — 🔴 সবচেয়ে জরুরি টেস্ট: version ক্রম

এটাই সেই বাগ যা বেশিরভাগ update সার্ভারে থাকে।

**করুন:** একই প্রোডাক্টে **`acme-demo-1.10.0.zip`** আপলোড করুন (version ফাঁকা রাখুন)।

- [ ] Version history-তে `1.10.0` এসেছে

**তারপর:**
```
...&slug=acme-demo&version=1.9.0
```

- [ ] **`"update": true` এবং `"version": "1.10.0"`**

> **কেন জরুরি:** SQL-এ string তুলনায় `'1.9.0' > '1.10.0'` হয়। ভুল হলে স্টোর `1.10.0` রিলিজ করার দিন থেকে **সব গ্রাহকের update চিরতরে বন্ধ** হয়ে যেত, কোনো error ছাড়াই। এখানে `1.10.0` আসা মানে `version_compare` ঠিকমতো কাজ করছে।

---

## ধাপ ৫ — ডাউনলোড ও signed token

ধাপ ৩-এর `download_url`-টা কপি করে ব্রাউজারে খুলুন।

- [ ] ZIP ফাইল **নামছে**
- [ ] ফাইলের নাম `acme-demo.1.10.0.zip` ধরনের (এলোমেলো hex নয়)
- [ ] Version history-তে **Downloads = 1** হয়েছে

**একই লিংক আবার খুলুন:**

- [ ] **"already been used"** — একবারই ব্যবহারযোগ্য ✓

**ভুয়া লিংক:**
```
http://localhost:10004/purecart-update/notarealtoken
```
- [ ] "Malformed download token"

---

## ধাপ ৬ — খারাপ রিলিজ তুলে নেওয়া

**করুন:** Version history-তে `1.10.0`-র পাশে **Withdraw** ক্লিক করুন।

- [ ] Status = **○ Withdrawn**
- [ ] সারিটা **মোছেনি**, শুধু লুকিয়েছে

**তারপর:**
```
...&slug=acme-demo&version=1.0.0
```
- [ ] আর `1.10.0` অফার করে না (হয় `update:false`, নয়তো আগের version)

**Restore** চেপে আবার ফিরিয়ে আনুন।

---

## ধাপ ৭ — 🔒 License gate

**করুন:** Updates ট্যাবে **"Require a licence"** টিক দিন → Update।

```
...&slug=acme-demo&version=1.0.0
```
- [ ] **৪০১** — *"A license key is required"*

**ভুয়া key দিয়ে:**
```
...&slug=acme-demo&version=1.0.0&license_key=ভুয়া
```
- [ ] **৪০৩** — *"Invalid license key"*

**অন্য প্রোডাক্টের আসল license দিয়ে** (এটাই মূল নিরাপত্তা টেস্ট):
```
...&slug=acme-demo&version=1.0.0&license_key=F8638D-92BC57-3A41AA-41B7EB
```
- [ ] **৪০৩** — *"This license is not valid for this product"*

> এই license প্রোডাক্ট ৫৪-এর, আর `acme-demo` অন্য প্রোডাক্ট। কাজ করে ফেললে **যেকোনো সস্তা license দিয়ে সব প্রোডাক্টের update** নেওয়া যেত।

**সঠিক license দিয়ে:** Update slug-টা প্রোডাক্ট **৫৪**-এ বসান (T-Shirt থেকে সরিয়ে), তারপর:
```
...&slug=acme-demo&version=1.0.0&license_key=F8638D-92BC57-3A41AA-41B7EB
```
- [ ] **২০০** — update পাওয়া যায় ✓

---

## ধাপ ৮ — Channel

**করুন:** `acme-demo-1.1.0.zip` আপলোড করুন, **Release channel = Beta**।

```
...&slug=acme-demo&version=1.0.0&license_key=...
```
- [ ] beta version **আসে না** (stable-ই আসে)

**`&channel=beta` জুড়ে দিন:**
- [ ] তাও beta আসে না ← client যা চায় তা বিশ্বাস করা হয় না

**করুন:** ট্যাবে **"Allow pre-release channels"** টিক + **Default channel = Beta** → Update।
- [ ] এখন beta version আসে ✓

---

## ধাপ ৯ — "View details" মোডালের ডেটা

```
http://localhost:10004/?rest_route=/purecart/v1/plugin/info&slug=acme-demo
```

- [ ] `name`, `version`, `author`, `sections.changelog` আছে
- [ ] 🔒 **`download_url` নেই**
- [ ] 🔒 **`checksum` নেই**

> এই endpoint public — এখানে download লিংক থাকলে license gate পুরো অর্থহীন হয়ে যেত।

**Changelog:**
```
http://localhost:10004/?rest_route=/purecart/v1/plugin/changelog/acme-demo
```
- [ ] `entries` array + `html`
- [ ] 🔒 beta version **তালিকায় নেই** (অপ্রকাশিত version নম্বর ফাঁস হয় না)

---

## ধাপ ১০ — ইমেইল

**করুন:** Mailpit খুলুন → `http://localhost:10000`

নতুন একটা **stable** version আপলোড করুন (প্রোডাক্ট ৫৪-এ, যেখানে license আছে), **"Email customers on release"** টিক দেওয়া অবস্থায়।

- [ ] **WooCommerce → Status → Scheduled Actions** → `purecart_send_update_notification_batch` জমা হয়েছে
- [ ] সেটা **Run** করুন
- [ ] Mailpit-এ ইমেইল এসেছে
- [ ] Subject-এ প্রোডাক্টের নাম ও version আছে
- [ ] বডিতে changelog-এর লেখা আছে, কিন্তু `<li>` ট্যাগ নেই

**beta আপলোড করুন:**
- [ ] কোনো ইমেইল **যায় না** ✓

---

## ধাপ ১১ — 🔒 অনুমোদন

**করুন:** লগআউট করুন (বা incognito)।

- [ ] `admin-post.php?action=purecart_update_version_action&...` → **permission denied**

**Postman-এ Bob-এর (customer) auth দিয়ে:**
- [ ] `/plugin/update-check` → **কাজ করে** (এটা public, license-ই credential)

---

## ধাপ ১২ — শেষ যাচাই

- [ ] `debug.log`-এ কোনো PHP error/warning নেই
- [ ] Scheduled Actions-এ **failed** action নেই

---

## 🔴 প্রোডাকশনের আগে অবশ্যই

আপনার সাইট **nginx**-এ চলে, আর nginx `.htaccess` পড়ে না। প্যাকেজ ফোল্ডারে deny রুল যোগ করুন:

```nginx
location ~* /wp-content/uploads/purecart-packages/ { deny all; }
```

ফাইলের নামে ১৬-অক্ষরের random prefix থাকে (দ্বিতীয় স্তরের সুরক্ষা, সার্ভার কনফিগের উপর নির্ভর করে না), কিন্তু দুটোই থাকা উচিত।

**যাচাই করতে:** phpMyAdmin-এ `wp_purecart_product_versions`-এর `file_path` দেখুন, সেই পাথটা সরাসরি ব্রাউজারে খুলুন — deny রুল থাকলে ৪০৩ আসবে।

---

## যা এখনো নেই (Phase 2/3, ইচ্ছাকৃত)

rollback · theme update flow · GPG signing · Electron feed · S3/R2 delivery · WP-CLI · GitHub webhook auto-import

---

## বাগ পেলে যা লিখে রাখবেন

1. কোন ধাপ, কোন চেকবক্স
2. কী হওয়ার কথা ছিল / কী হলো
3. `wp_purecart_product_versions`-এর সংশ্লিষ্ট row
4. `debug.log`-এর প্রাসঙ্গিক অংশ
