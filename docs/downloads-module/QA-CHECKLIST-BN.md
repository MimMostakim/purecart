# Secure Downloads — QA Checklist

**Module:** Secure Downloads (Phase 1)
**Scope:** ব্যাকএন্ড — token issue, delivery, revoke, REST, admin ফিল্ড
**পূর্বশর্ত:** WooCommerce active, permalink structure "Post name" (plain হলে rewrite কাজ করবে না)

---

## 0. সেটআপ

- [ ] একটা product এ type **PureCart – Plugin** (বা Bundle) সিলেক্ট করা যায়, আর ডানে **Virtual** + **Downloadable** checkbox দেখা যায়
- [ ] Downloadable টিক দিলে **General** ট্যাব আসে, সেখানে **Downloadable files** সেকশন
- [ ] অন্তত **২টা ফাইল** যোগ করা আছে (media library থেকে আপলোড করা — uploads ফোল্ডারে থাকা ফাইলই path resolve হয়)
- [ ] General ট্যাবে **Regular price** বসানো যায়

> Downloadable checkbox বা General ট্যাব না দেখালে: product edit পেজ hard-refresh (Ctrl+F5) করুন। ওই ক্লাসগুলো PHP থেকে render হয়।

---

## 1. Token issue

- [ ] অর্ডার **Completed** করলে `wp_purecart_downloads` এ **প্রতি ফাইলে একটা করে row** (২ ফাইল → ২ row)
- [ ] প্রতিটা `token` আলাদা, ৬৪ hex character
- [ ] `file_id` এ WooCommerce এর file key, `order_item_id` সেট
- [ ] `woocommerce_order_itemmeta` এ ওই item এ `_purecart_download_tokens` meta আছে
- [ ] **Idempotency:** Processing → Completed → Processing → Completed ঘোরালে **নতুন row আসে না**
- [ ] সাধারণ (non-PureCart) downloadable product এও token তৈরি হয়
- [ ] ফাইলবিহীন product এ কোনো row তৈরি হয় না
- [ ] Settings এ `trigger_status = processing` করলে processing এ token আসে, completed এ ডুপ্লিকেট হয় না

---

## 2. ডাউনলোড

- [ ] My Account → Downloads এ প্রতিটা ফাইল **একবারই** দেখায় (দুবার দেখালে merger ভাঙা)
- [ ] লিংক `/purecart-download/{token}` — কোথাও `?download_file=` নেই
- [ ] ক্লিক করলে **সঠিক ফাইল নামে** ডাউনলোড হয়, ফাইল corrupt নয়
- [ ] `download_count` বাড়ে, `wp_purecart_download_logs` এ `served` row (IP + user agent সহ)
- [ ] unlimited টোকেনে "downloads remaining" **∞** দেখায়, `0` নয়
- [ ] **বড় ফাইল** (১০০MB+) সম্পূর্ণ ডাউনলোড হয়, memory error নেই
- [ ] ব্রাউজারে **pause → resume** কাজ করে
- [ ] resume করলে `download_count` **বাড়ে না** (Range request = একই ডাউনলোড চালিয়ে যাওয়া)
- [ ] বাংলা/non-ASCII নামের ফাইল সঠিক নামে নামে
- [ ] URL এ ৩০১ redirect হয় না (সরাসরি ২০০)

---

## 3. প্রত্যাখ্যান (প্রতিটার আলাদা কারণ + log)

| অবস্থা | HTTP | log event |
|---|---|---|
| ভুল/অস্তিত্বহীন token | 403 | `rejected_invalid` |
| Refund/cancel করা অর্ডারের token | 410 | `rejected_revoked` |
| Expiry পার | 410 | `rejected_expired` |
| Limit শেষ | 410 | `rejected_limit` |
| লাইসেন্স আর active নয় (gate on) | 403 | `rejected_license` |
| ফাইল ডিস্ক থেকে উধাও | 404 | `rejected_missing` |

- [ ] প্রতিটা ক্ষেত্রে **আলাদা বার্তা** দেখায় ("invalid or expired" নয়)
- [ ] প্রতিটার জন্য সঠিক event log এ বসে

---

## 4. Revoke

- [ ] অর্ডার **Refunded** করলে ওই অর্ডারের সব row `status = revoked`
- [ ] **Cancelled** করলেও একই
- [ ] row মুছে যায় না, `download_count` অক্ষত থাকে
- [ ] revoke এর পর My Account এ ওই সারি **নেই** — WooCommerce এর নিজের সারিসহ
- [ ] অর্ডার ইমেইলেও ওই লিংক নেই

---

## 5. Per-product ফিল্ড (Secure Downloads ট্যাব)

- [ ] Downloadable টিক দিলে **Secure Downloads** ট্যাব দেখা যায়
- [ ] তিনটা ফিল্ড: Download limit, Link expiry (days), Require an active licence
- [ ] ফাঁকা ঘরে placeholder এ **বর্তমান store setting** লেখা থাকে
- [ ] মান বসিয়ে Update করলে নতুন অর্ডারের token এ সেটাই বসে
- [ ] ঘর **ফাঁকা করে** Update করলে override মুছে যায়, store setting এ ফিরে যায়
- [ ] licence gate = **Not required** করলে লাইসেন্স revoked থাকলেও ডাউনলোড হয়
- [ ] licence gate = **Required** করলে revoked লাইসেন্সে ডাউনলোড আটকায়

---

## 6. REST API

Postman collection: `docs/downloads-module/purecart-downloads.postman_collection.json`

- [ ] `GET /downloads` — `X-WP-Total`, `X-WP-TotalPages` হেডার আসে
- [ ] `status` ফিল্টার চারটাতেই কাজ করে: active / expired / exhausted / revoked
- [ ] `search` product name, customer name/email, order ID তে কাজ করে
- [ ] `GET /downloads/{id}` এ `logs` অ্যারে থাকে
- [ ] `GET /downloads/stats` এর সংখ্যা DB এর সাথে মেলে
- [ ] `PATCH /downloads/{id}` limit/expiry বদলায়; `expires_at: ""` দিলে NULL হয়
- [ ] `POST .../revoke` এর পর সেই লিংক 410
- [ ] `POST .../regenerate` এর পর **পুরনো token মরে**, নতুনটা কাজ করে, counter শূন্য
- [ ] `GET/POST /downloads/settings` — শুধু পাঠানো key লেখে, বাকিগুলো অক্ষত
- [ ] Response এ token এর **শুধু শেষ ৮ character** আসে
- [ ] ভুল enum (`status=bogus`, `orderby=xxx`) → **400** `rest_invalid_param`
- [ ] লগআউট → 401; subscriber → 403

---

## 7. Cleanup jobs

WooCommerce → Status → **Scheduled Actions**, group `purecart`

- [ ] `purecart_cleanup_expired_tokens` (দৈনিক) আছে
- [ ] `purecart_cleanup_download_logs` (মাসিক) আছে
- [ ] Log job চালালে retention এর বাইরের log row মুছে যায়, ভেতরেরগুলো থাকে
- [ ] Token job চালালে **মুছে ফেলা order** এর token যায়
- [ ] জীবিত order এর token **থেকে যায়** — expired বা revoked হলেও

> Expired/revoked token ইচ্ছে করে রাখা হয়। ওই row-ই WooCommerce এর নিজের অরক্ষিত সারিকে চাপা দেয়; মুছে দিলে refund করা ফাইল আবার ডাউনলোডযোগ্য হয়ে যায়।

---

## 8. সামগ্রিক

- [ ] Plugin deactivate → activate: কোনো fatal নেই, দুটো job unschedule ও reschedule হয়
- [ ] Subscriptions + Licensing + Updates module একসাথে active রেখে কোনো conflict নেই
- [ ] HPOS চালু অবস্থায় পুরো flow কাজ করে
- [ ] পুরো flow এ `WP_DEBUG_LOG` নীরব
- [ ] `composer phpcs` clean
- [ ] Fresh install (নতুন DB) তেও পুরো flow কাজ করে

---

## Phase 1 এ **নেই** (আশা করবেন না)

- S3 / Cloudflare R2, X-Sendfile, X-Accel-Redirect delivery
- Protected uploads directory + `.htaccess` guard
- Video play-protect, geo-blocking, IP binding, throttling
- কাস্টমারের নিজের "Get New Link" (`allow_link_regen` option আছে, কিন্তু consumer নেই)
- React অ্যাডমিন স্ক্রিন — REST তৈরি, UI আলাদা কাজ
- ইমেইল লিংকের আলাদা expiry — [দেখুন dev plan Step 7](dev-plan-downloads.md), ইচ্ছাকৃতভাবে বাদ
