# PureCart সাবস্ক্রিপশন মডিউল — ব্যাকএন্ড আর্কিটেকচার (v1.0)
*বিল্ড-লেভেল ইমপ্লিমেন্টেশন ডিটেইল। ফিচার স্পেসিফিকেশনের জন্য দেখুন: [RND-subscription-nym.md](RND-subscription-nym.md)*

---

## বিষয়সূচি

1. [রিনিউয়াল ইঞ্জিন আর্কিটেকচার](#রিনিউয়াল-ইঞ্জিন-আর্কিটেকচার)
2. [ডেটাবেস স্কিমা ডিজাইন](#ডেটাবেস-স্কিমা-ডিজাইন)
3. [কাস্টমার সেলফ-সার্ভিস পোর্টাল](#কাস্টমার-সেলফ-সার্ভিস-পোর্টাল)
4. [ফেইলড পেমেন্ট রিকভারি ইঞ্জিন](#ফেইলড-পেমেন্ট-রিকভারি-ইঞ্জিন)
5. [এক্সটেনসিবিলিটি আর্কিটেকচার](#এক্সটেনসিবিলিটি-আর্কিটেকচার)

---

## রিনিউয়াল ইঞ্জিন আর্কিটেকচার

- **Action Scheduler কোর:** নির্ভরযোগ্য ব্যাকগ্রাউন্ড টাস্ক প্রসেসিংয়ের জন্য Action Scheduler ব্যবহার।
- **টাস্ক আইসোলেশন:** প্রতিটি সাবস্ক্রিপশন তার নিজস্ব ডিস্টিংক্ট অ্যাকশন শিডিউল করে: `purecart_subscription_renewal_cron`, পেলোড হিসেবে `subscription_id` পাঠানো হয়।
- **এক্সিকিউশন ফ্লো:**

```
① সাবস্ক্রিপশন রেকর্ড ও কাস্টমার গেটওয়ে টোকেন রিট্রিভ
② ডায়নামিক ট্যাক্স ক্যালকুলেট ও রিকারিং কুপন বৈধতা যাচাই
③ গেটওয়ে API-র মাধ্যমে অফ-সেশন চার্জ এক্সিকিউট
   উদাহরণ: Stripe Charge $29 + $5.51 VAT = $34.51

④ সফল হলে:
   → next_renewal_date আপডেট (১ আগস্ট → ১ সেপ্টেম্বর)
   → ইভেন্ট লগ: "charge_success | $34.51 | txn_StripeXYZ"
   → রিনিউয়াল রিসিপ্ট ইমেইল পাঠানো
   → ডেলিভারি হুক ট্রিগার (license extend / LMS renew)

⑤ ব্যর্থ হলে:
   → স্ট্যাটাস: payment_failed
   → purecart_dunning_started অ্যাকশন ট্রিগার
   → পরের ডানিং রিট্রাই কিউ (৩ দিন পর)
```

---

## ডেটাবেস স্কিমা ডিজাইন

মোট ৭টি টেবিল। `pct_subscriptions` কোর/প্যারেন্ট টেবিল — বাকি সব টেবিল এর `id`-কে `subscription_id` হিসেবে রেফারেন্স করে। নিচে পুরো সেটটির রিলেশনশিপ ডায়াগ্রাম, তারপর প্রতিটি টেবিল একটি বাস্তব উদাহরণ (Sofia-র সাবস্ক্রিপশন) দিয়ে ব্যাখ্যা করা হলো, যাতে ডেটা আসলে কেমন দেখতে হবে এবং টেবিলগুলো কীভাবে একসাথে কাজ করে তা স্পষ্ট বোঝা যায়।

### রিলেশনশিপ ডায়াগ্রাম

```
                         ┌───────────────────────────────┐
                         │        pct_subscriptions        │
                         │  PK  id                          │
                         │      customer_id                 │
                         │      status, billing_period...    │
                         │      previous_subscription_id ────┼──┐
                         └────────────────┬──────────────────┘  │  সেলফ-রেফারেন্স:
                                          │ id                   │  রিসাবস্ক্রাইব করলে
              (নিচের প্রতিটি টেবিল subscription_id     │  পুরনো রেকর্ডের সাথে
               দিয়ে উপরের id-কে রেফারেন্স করে)          │  চেইন লিংক
                                          │                      │
        ┌───────────────┬─────────────────┼──────────────────┬───┘
        │ 1 : N          │ 1 : N            │ 1 : N             │ 1 : 1
        ▼                ▼                  ▼                   ▼
┌───────────────┐ ┌───────────────┐ ┌────────────────────┐ ┌────────────────────────┐
│ subscription_  │ │ subscription_  │ │ subscription_       │ │ subscription_            │
│ items          │ │ events         │ │ payments             │ │ linked_entities           │
│ FK subscription_id│ FK subscription_id│ FK subscription_id  │ │ FK subscription_id (UQ) │
└───────────────┘ └───────────────┘ └──────────┬──────────┘ └────────────────────────┘
                                                 │ transaction_id
                                                 │ (একই মান, দুই টেবিলে থাকে)
                                                 ▼
                                     ┌─────────────────────────┐
                                     │  subscription_revenue     │  1 : N (subscription_id)
                                     │  FK subscription_id         │
                                     │  UQ  transaction_id          │
                                     └────────────┬────────────┘
                                                  │ SUM(mrr_contribution)
                                                  ▼
                                     ┌─────────────────────────┐
                                     │     pct_revenue_goals      │  ← সরাসরি FK নেই,
                                     │  (স্বাধীন টেবিল)             │    শুধু অ্যাগ্রিগেট বনাম টার্গেট
                                     └─────────────────────────┘
```

| টেবিল | সম্পর্ক | কী রেফারেন্স করে |
| :--- | :--- | :--- |
| `pct_subscription_items` | ১ সাবস্ক্রিপশনে N আইটেম (ভবিষ্যতে বান্ডল/মাল্টি-প্রোডাক্ট সাবস্ক্রিপশনের জন্য) | `subscription_id` → `pct_subscriptions.id` |
| `pct_subscription_events` | ১ সাবস্ক্রিপশনে N ইভেন্ট (অডিট লগ, ইতিহাস কখনো মুছে না) | `subscription_id` → `pct_subscriptions.id` |
| `pct_subscription_payments` | ১ সাবস্ক্রিপশনে N পেমেন্ট (প্রতি সফল/ব্যর্থ চার্জে ১টি রো) | `subscription_id` → `pct_subscriptions.id` |
| `pct_subscription_revenue` | ১ সাবস্ক্রিপশনে N এন্ট্রি; প্রতিটি `payments`-এর একটি নির্দিষ্ট রো-র সাথে `transaction_id` দিয়ে ১:১ যুক্ত | `subscription_id` → `pct_subscriptions.id`; `transaction_id` ↔ `pct_subscription_payments.transaction_id` |
| `pct_subscription_linked_entities` | ১ সাবস্ক্রিপশনে ঠিক ১টি রো (`UNIQUE` কী দিয়ে বাধ্যতামূলক) | `subscription_id` → `pct_subscriptions.id` |
| `pct_subscriptions.previous_subscription_id` | সেলফ-রেফারেন্স — রিসাবস্ক্রাইব চেইন ট্র্যাক করে | `previous_subscription_id` → `pct_subscriptions.id` |
| `pct_revenue_goals` | ডিরেক্ট FK নেই — `pct_subscription_revenue`-এর `SUM(mrr_contribution)` এর সাথে তুলনা করে `current_amount` আপডেট হয় | (অ্যাগ্রিগেট রিলেশন, ফরেন কী নয়) |

---

### টেবিল ১: `pct_subscriptions`

**কী এটা:** কোর/প্যারেন্ট টেবিল — প্রতিটি সাবস্ক্রিপশনের ঠিক ১টি রো। কে সাবস্ক্রাইবার, কী স্ট্যাটাসে আছে, পরের চার্জ কবে ও কত টাকা — সবকিছুর সোর্স অফ ট্রুথ। বাকি ৬টি টেবিল এই টেবিলের `id`-কে রেফারেন্স করে।

```sql
CREATE TABLE pct_subscriptions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT UNSIGNED NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    billing_period VARCHAR(16) NOT NULL,            -- day, week, month, year
    billing_interval INT UNSIGNED NOT NULL DEFAULT 1,
    trial_end_date DATETIME NULL,
    next_renewal_date DATETIME NULL,
    last_payment_at DATETIME NULL,                  -- শেষ সফল পেমেন্টের তারিখ
    end_of_period_date DATETIME NULL,
    pause_until_date DATETIME NULL,
    cancelled_at DATETIME NULL,                     -- বাতিলের সঠিক তারিখ
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    recurring_amount DECIMAL(18,4) NOT NULL DEFAULT '0.0000',
    signup_fee DECIMAL(18,4) NOT NULL DEFAULT '0.0000',
    -- ইনস্টলমেন্ট / স্প্লিট পেমেন্ট
    payment_type ENUM('recurring','split') NOT NULL DEFAULT 'recurring',
    max_payments INT UNSIGNED NULL,                 -- ইনস্টলমেন্ট সংখ্যা (split-এর জন্য)
    renewal_count INT UNSIGNED NOT NULL DEFAULT 0,  -- মোট সফল রিনিউয়াল কাউন্ট
    max_renewals INT UNSIGNED NULL,                 -- সীমিত মেয়াদের সাবস্ক্রিপশনের জন্য, NULL = সীমাহীন
    retry_count TINYINT UNSIGNED NOT NULL DEFAULT 0, -- বর্তমান ডানিং সাইকেলে রিট্রাই সংখ্যা
    -- স্টেপড প্রাইসিং
    step_price DECIMAL(18,4) NULL,                  -- N সাইকেল পরে নতুন মূল্য
    step_after INT UNSIGNED NULL,                   -- কত সাইকেল পর মূল্য পরিবর্তন হবে
    -- শিডিউলড প্ল্যান সুইচ (ডাউনগ্রেড রিটেনশন অফার)
    pending_switch_product BIGINT UNSIGNED NULL,    -- পরের রিনিউয়ালে সুইচ হবে এই প্রোডাক্টে
    pending_switch_type ENUM('upgrade','downgrade') NULL,
    -- অ্যানালিটিক্স
    customer_ltv DECIMAL(18,4) NOT NULL DEFAULT '0.0000', -- প্রেডিক্টিভ LTV
    churn_risk_score INT UNSIGNED NOT NULL DEFAULT 0,      -- 0–100
    -- রিসাবস্ক্রাইব ট্র্যাকিং
    previous_subscription_id BIGINT UNSIGNED NULL,  -- পূর্ববর্তী রেকর্ডের লিংক
    -- পেমেন্ট গেটওয়ে
    payment_gateway VARCHAR(64) NOT NULL,
    payment_token VARCHAR(255) NOT NULL,
    -- শিপিং ঠিকানা স্ন্যাপশট
    shipping_address_data TEXT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    KEY idx_customer_id (customer_id),
    KEY idx_status (status),
    KEY idx_next_renewal_date (next_renewal_date),
    KEY idx_churn_risk (churn_risk_score),
    KEY idx_trial_end (trial_end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**উদাহরণ রেকর্ড:**

```sql
INSERT INTO pct_subscriptions VALUES (
    1,                          -- id
    42,                         -- customer_id (Sofia)
    'active',                   -- status
    'month',                    -- billing_period
    1,                          -- billing_interval
    NULL,                       -- trial_end_date
    '2026-09-01 00:00:00',      -- next_renewal_date
    NULL,                       -- end_of_period_date
    NULL,                       -- pause_until_date
    'USD',                      -- currency
    29.0000,                    -- recurring_amount
    0.0000,                     -- signup_fee
    'stripe',                   -- payment_gateway
    'cus_StripeABC123',         -- payment_token
    10,                         -- churn_risk_score (LOW)
    '{"city":"Dhaka"}',         -- shipping_address_data
    '2026-01-01 10:00:00',      -- created_at
    '2026-08-01 10:00:00'       -- updated_at
);
```

**এই রো-টা আসলে কী বলছে:** Sofia (`customer_id=42`) একটি সাবস্ক্রিপশন কিনেছেন, প্রতি মাসে (`billing_period='month'`, `billing_interval=1`) $29 (`recurring_amount`), Stripe দিয়ে চার্জ হয় (`payment_gateway`, `payment_token`), স্ট্যাটাস `active`, পরের চার্জ ১ সেপ্টেম্বর ২০২৬-এ (`next_renewal_date`), এখনো পর্যন্ত চার্ন ঝুঁকি কম (`churn_risk_score=10`)।

**দ্বিতীয় উদাহরণ — বার্ষিক + কম্প্যানিয়ন প্লাগইন টাইপ:** পরের কিছু টেবিলে normalization ও extensibility বোঝাতে করিমের সাবস্ক্রিপশনও ব্যবহার করা হবে — বার্ষিক বিলিং, SaaS ডেলিভারি টাইপ (যার নিজস্ব কম্প্যানিয়ন প্লাগইন আছে, তাই `pct_subscription_linked_entities`-এ কোনো রো লাগবে না)।

```sql
INSERT INTO pct_subscriptions VALUES (
    2,                          -- id
    77,                         -- customer_id (করিম)
    'active',                   -- status
    'year',                     -- billing_period
    1,                          -- billing_interval
    NULL,                       -- trial_end_date
    '2027-01-15 00:00:00',      -- next_renewal_date
    NULL,                       -- end_of_period_date
    NULL,                       -- pause_until_date
    'USD',                      -- currency
    1200.0000,                  -- recurring_amount ($1200/বছর Enterprise SaaS প্ল্যান)
    0.0000,                     -- signup_fee
    'stripe',                   -- payment_gateway
    'cus_StripeXYZ777',         -- payment_token
    5,                          -- churn_risk_score (LOW)
    NULL,                       -- shipping_address_data (SaaS-এ শিপিং নেই)
    '2026-01-15 09:00:00',      -- created_at
    '2026-01-15 09:00:00'       -- updated_at
);
```

### টেবিল ২: `pct_subscription_items`

**কী এটা:** সাবস্ক্রিপশনের কার্ট লাইন আইটেম — কোন প্রোডাক্ট/ভ্যারিয়েশন কেনা হয়েছে, কী পরিমাণে, কী ডেলিভারি টাইপে। এখন প্রতি সাবস্ক্রিপশনে সাধারণত ১টি রো, কিন্তু ভবিষ্যতে বান্ডল/মাল্টি-প্রোডাক্ট সাবস্ক্রিপশনের জন্য ১:N সাপোর্ট করে।

```sql
CREATE TABLE pct_subscription_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    subscription_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    variation_id BIGINT UNSIGNED DEFAULT 0,
    qty INT UNSIGNED NOT NULL DEFAULT 1,
    line_subtotal DECIMAL(18,4) NOT NULL,
    line_total DECIMAL(18,4) NOT NULL,
    delivery_type VARCHAR(32) NOT NULL DEFAULT 'membership',
    KEY subscription_id (subscription_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**উদাহরণ রেকর্ড (Sofia-র সাবস্ক্রিপশন):**

```sql
INSERT INTO pct_subscription_items VALUES (
    1,                          -- id
    1,                          -- subscription_id → pct_subscriptions.id (Sofia)
    101,                        -- product_id ("PureCart Pro" মেম্বারশিপ প্রোডাক্ট)
    0,                          -- variation_id (সিম্পল প্রোডাক্ট, ভ্যারিয়েশন নেই)
    1,                          -- qty
    29.0000,                    -- line_subtotal
    29.0000,                    -- line_total
    'membership'                -- delivery_type
);
```

> **এক্সটেনসিবিলিটি নোট:** এখানে `delivery_type` ইচ্ছাকৃতভাবে `VARCHAR(32)` — `ENUM` নয় — যাতে নতুন ডেলিভারি টাইপ মডিউল স্কিমা মাইগ্রেশন ছাড়াই রেজিস্টার করতে পারে। বৈধতা যাচাই হয় অ্যাপ-লেভেলে, রেজিস্ট্রি ফিল্টার দিয়ে (দেখুন [এক্সটেনসিবিলিটি আর্কিটেকচার](#এক্সটেনসিবিলিটি-আর্কিটেকচার))।

### টেবিল ৩: `pct_subscription_events`

**কী এটা:** পুরো সাবস্ক্রিপশনের অডিট ট্রেইল/হিস্ট্রি লগ — কে (system/customer/admin/webhook), কী ঘটিয়েছে, কখন। এই টেবিলের রো কখনো আপডেট বা ডিলিট হয় না, শুধু নতুন রো যোগ হয় — তাই এটাই হলো "কী ঘটেছিল" প্রশ্নের একমাত্র নির্ভরযোগ্য উৎস (সাপোর্ট/ডিসপিউট রেজোলিউশনে জরুরি)।

```sql
CREATE TABLE pct_subscription_events (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    subscription_id BIGINT UNSIGNED NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    -- উদাহরণ: status_change, charge_success, charge_failed, dunning_email
    event_description TEXT NULL,
    actor_type VARCHAR(16) NOT NULL DEFAULT 'system',
    -- system, customer, admin, webhook
    actor_id BIGINT UNSIGNED DEFAULT 0,
    created_at DATETIME NOT NULL,
    KEY subscription_id (subscription_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**উদাহরণ ইভেন্ট লগ:**

```
SUB-001 ইভেন্ট হিস্ট্রি:
─────────────────────────────────────────────────────
তারিখ           | ইভেন্ট           | বিবরণ
─────────────────────────────────────────────────────
2026-01-01      | status_change    | pending → active
2026-02-01      | charge_success   | $29.00 | txn_ABC
2026-03-01      | charge_failed    | কার্ড ডিক্লাইন
2026-03-01      | dunning_email    | ইমেইল ১ পাঠানো হয়েছে
2026-03-04      | charge_success   | রিট্রাই সফল $29.00
2026-04-01      | charge_success   | $29.00 | txn_DEF
```

### টেবিল ৪: `pct_subscription_payments`

**কী এটা:** প্রতিটি চার্জ অ্যাটেম্পটের রেকর্ড (raw transaction ledger) — সফল, ব্যর্থ বা রিফান্ডেড, প্রতিটির জন্য ১টি রো। `uniq_transaction` কী ওয়েবহুক আইডেমপোটেন্সি নিশ্চিত করে (একই Stripe ইভেন্ট দুইবার এলে দ্বিতীয়বার ইনসার্ট ব্যর্থ হবে, ডুপ্লিকেট প্রসেসিং আটকাবে)।

```sql
CREATE TABLE pct_subscription_payments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    subscription_id BIGINT UNSIGNED NOT NULL,
    order_id BIGINT UNSIGNED NOT NULL,
    transaction_id VARCHAR(255) NOT NULL,
    amount DECIMAL(18,4) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status VARCHAR(32) NOT NULL,                   -- succeeded, failed, refunded
    is_partial_refund TINYINT(1) NOT NULL DEFAULT 0,
    refunded_amount DECIMAL(18,4) NULL,            -- আংশিক রিফান্ডের পরিমাণ
    refund_reason TEXT NULL,
    created_at DATETIME NOT NULL,
    KEY idx_subscription_id (subscription_id),
    UNIQUE KEY uniq_transaction (transaction_id)   -- ওয়েবহুক আইডেমপোটেন্সির জন্য
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**উদাহরণ রেকর্ড (Sofia-র ৩ মাসের হিস্ট্রি — ফেব্রুয়ারি সফল, মার্চ সফল, এপ্রিলে আংশিক রিফান্ড):**

```sql
INSERT INTO pct_subscription_payments VALUES
(1, 1, 501, 'txn_ABC', 29.0000, 'USD', 'succeeded', 0, NULL, NULL,                         '2026-02-01 10:00:05'),
(2, 1, 515, 'txn_DEF', 29.0000, 'USD', 'succeeded', 0, NULL, NULL,                         '2026-03-01 10:00:03'),
(3, 1, 530, 'txn_GHI', 29.0000, 'USD', 'refunded',  1, 10.0000, 'কাস্টমার আংশিক অসন্তুষ্ট', '2026-04-01 10:00:07');
```

এখানে `id=3` রো-টি দেখাচ্ছে — পুরো $29 চার্জ হয়েছিল (`amount`), কিন্তু অ্যাডমিন $10 আংশিক রিফান্ড দিয়েছেন (`is_partial_refund=1`, `refunded_amount=10.0000`); সাবস্ক্রিপশন `active`-ই থেকে যায়, শুধু এই একটি পেমেন্ট রো আংশিক রিফান্ড হিসেবে চিহ্নিত হয়।

---

### টেবিল ৫: `pct_subscription_revenue`

MRR/ARR ক্যালকুলেশন ও রেভিনিউ গোলস ট্র্যাকিংয়ের জন্য আলাদা লেজার টেবিল। শুধু `pct_subscription_payments` দিয়ে নরমালাইজড MRR গণনা করা ধীর ও জটিল — এই টেবিল সেই কাজ সহজ করে।

```sql
CREATE TABLE pct_subscription_revenue (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    subscription_id BIGINT UNSIGNED NOT NULL,
    transaction_id VARCHAR(255) NOT NULL,
    amount DECIMAL(18,4) NOT NULL,                 -- আসল চার্জ পরিমাণ
    mrr_contribution DECIMAL(18,4) NOT NULL,       -- এই পেমেন্টের নরমালাইজড মাসিক মূল্য
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    billing_period VARCHAR(16) NOT NULL,
    billing_interval INT UNSIGNED NOT NULL,
    period_start DATE NOT NULL,                    -- এই রিনিউয়াল পিরিয়ডের শুরু
    period_end DATE NOT NULL,                      -- এই রিনিউয়াল পিরিয়ডের শেষ
    gateway VARCHAR(64) NOT NULL,
    created_at DATETIME NOT NULL,
    KEY idx_subscription_id (subscription_id),
    KEY idx_period_start (period_start),
    UNIQUE KEY uniq_transaction (transaction_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**উদাহরণ রেকর্ড — Sofia (মাসিক) বনাম করিম (বার্ষিক) কীভাবে একই স্কেলে তুলনা হয়:**

```sql
INSERT INTO pct_subscription_revenue VALUES
-- Sofia: subscription_id=1, মাসিক $29 — normalization লাগে না
(1, 1, 'txn_ABC', 29.0000, 29.0000, 'USD', 'month', 1, '2026-02-01', '2026-03-01', 'stripe', '2026-02-01 10:00:05'),
(2, 1, 'txn_DEF', 29.0000, 29.0000, 'USD', 'month', 1, '2026-03-01', '2026-04-01', 'stripe', '2026-03-01 10:00:03'),

-- করিম: subscription_id=2, বার্ষিক $1200 → normalized মাসিক mrr_contribution = 1200/12 = $100
(3, 2, 'txn_KAR1', 1200.0000, 100.0000, 'USD', 'year', 1, '2026-01-15', '2027-01-15', 'stripe', '2026-01-15 09:00:00');
```

**কেন এই normalization দরকার:** সরাসরি `amount` যোগ করলে $29 + $1200 = $1229 দেখাবে, যা বিভ্রান্তিকর — বার্ষিক পেমেন্ট এক মাসের আয় নয়, ১২ মাসের। `mrr_contribution` কলাম প্রতিটি পেমেন্টকে "প্রতি মাসে সমতুল্য কত" আকারে নরমালাইজ করে, তাই MRR কোয়েরি নির্ভরযোগ্য থাকে:

```
→ MRR Query: SELECT SUM(mrr_contribution) FROM pct_subscription_revenue
             WHERE period_start <= CURDATE() AND period_end >= CURDATE()
→ ফলাফল: $29 (Sofia) + $100 (করিম, normalized) = $129 MRR
```

---

### টেবিল ৬: `pct_revenue_goals`

অ্যাডমিন-সেট রেভিনিউ টার্গেট সংরক্ষণের জন্য। প্রতিটি সফল পেমেন্টে `current_amount` আপডেট হয়।

```sql
CREATE TABLE pct_revenue_goals (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,                    -- যেমন: "জুলাই ২০২৬ MRR লক্ষ্য"
    target_amount DECIMAL(18,4) NOT NULL,          -- যেমন: 5000.00
    current_amount DECIMAL(18,4) NOT NULL DEFAULT '0.0000',
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status ENUM('active','achieved','missed') NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    KEY idx_status_dates (status, start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**উদাহরণ রেকর্ড:**

```sql
INSERT INTO pct_revenue_goals VALUES (
    1,                          -- id
    'জুলাই ২০২৬ MRR লক্ষ্য',    -- name
    5000.0000,                  -- target_amount
    3850.0000,                  -- current_amount (৭৭% অর্জিত)
    'USD',                      -- currency
    '2026-07-01',               -- start_date
    '2026-07-31',               -- end_date
    'active',                   -- status
    '2026-07-01 00:00:00',      -- created_at
    '2026-07-30 18:00:00'       -- updated_at
);
```

`current_amount` সরাসরি এই টেবিলে বসানো নয় — প্রতিটি সফল রিনিউয়ালে `pct_subscription_revenue`-এ নতুন রো যোগ হওয়ার পর একটি রিক্যালকুলেশন জব `start_date`–`end_date` রেঞ্জের `SUM(mrr_contribution)` বের করে এখানে আপডেট করে।

---

### টেবিল ৭: `pct_subscription_linked_entities`

ডেলিভারি টাইপ-স্পেসিফিক ডেটা আলাদা টেবিলে রাখা হয়। `software` ও `saas` টাইপ — যাদের নিজস্ব কম্প্যানিয়ন প্লাগইন আছে (PureCart Licensing, PureCart SaaS Engine) — নিজের টেবিলে ডেটা রাখে, তাই এখানে দরকার হয় না (এই কারণেই করিমের `subscription_id=2`-এর জন্য এই টেবিলে কোনো রো থাকবে না)। বাকি নেটিভ টাইপগুলোর (membership, download, course, service) জন্য এই টেবিল দরকার — না হলে মূল টেবিল অনেক বড় ও অগোছালো হবে। বিস্তারিত প্যাটার্নের জন্য দেখুন [এক্সটেনসিবিলিটি আর্কিটেকচার](#এক্সটেনসিবিলিটি-আর্কিটেকচার)।

```sql
CREATE TABLE pct_subscription_linked_entities (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    subscription_id BIGINT UNSIGNED NOT NULL,
    delivery_type VARCHAR(32) NOT NULL,
    -- মেম্বারশিপ
    membership_tier VARCHAR(100) NULL,             -- যেমন: Gold, Silver, Bronze
    assigned_role VARCHAR(100) NULL,               -- যেমন: gold_member
    content_access_label VARCHAR(255) NULL,
    grace_ends_at DATETIME NULL,                   -- বাতিলের পর রোল সরানোর তারিখ
    -- ডিজিটাল ডাউনলোড
    downloads_this_cycle INT UNSIGNED NOT NULL DEFAULT 0,
    download_limit INT UNSIGNED NULL,              -- NULL = সীমাহীন
    next_drip_date DATETIME NULL,                  -- পরের ড্রিপ ডেলিভারির তারিখ
    -- কোর্স / LMS
    lms_enrollment_id VARCHAR(255) NULL,
    enrolled_course_ids TEXT NULL,                 -- JSON array: [42, 55, 61]
    course_access_until DATETIME NULL,
    -- সার্ভিস / রিটেইনার
    deliverable_notes TEXT NULL,                   -- এই সাইকেলে কী ডেলিভার হবে
    next_deliverable_due DATETIME NULL,
    last_deliverable_at DATETIME NULL,
    -- এক্সটেনশন পয়েন্ট: নতুন ডেলিভারি টাইপ নিজস্ব ডেটা এখানে JSON আকারে রাখতে পারে
    extra_data LONGTEXT NULL,                      -- JSON: টাইপ-স্পেসিফিক অতিরিক্ত ফিল্ড, কোর স্কিমা পরিবর্তন ছাড়াই
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uniq_subscription (subscription_id),
    KEY idx_delivery_type (delivery_type),
    KEY idx_next_drip (next_drip_date),
    KEY idx_course_access (course_access_until),
    KEY idx_grace_ends (grace_ends_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**কোন টাইপে কোন কলাম ব্যবহার হয়:**

| ডেলিভারি টাইপ | ব্যবহৃত কলাম |
| :--- | :--- |
| `membership` | `membership_tier`, `assigned_role`, `content_access_label`, `grace_ends_at` |
| `download` | `downloads_this_cycle`, `download_limit`, `next_drip_date` |
| `course` | `lms_enrollment_id`, `enrolled_course_ids`, `course_access_until` |
| `service` | `deliverable_notes`, `next_deliverable_due`, `last_deliverable_at` |
| *(নতুন যেকোনো টাইপ)* | `extra_data` (JSON) — নতুন কলাম যোগ না করেই টাইপ-স্পেসিফিক ডেটা রাখা যায় |

**উদাহরণ রেকর্ড (Sofia-র membership, শুধু প্রাসঙ্গিক কলাম দেখানো হলো):**

```sql
INSERT INTO pct_subscription_linked_entities
    (id, subscription_id, delivery_type, membership_tier, assigned_role, content_access_label, grace_ends_at, created_at, updated_at)
VALUES
    (1, 1, 'membership', 'Pro', 'pro_member', 'Premium Dashboard Access', NULL, '2026-01-01 10:00:00', '2026-01-01 10:00:00');
```

সাবস্ক্রিপশন বাতিল হলে এই রো ডিলিট হয় না — `grace_ends_at` সেট হয় (যেমন ৩ দিন পর), এবং সেই তারিখে একটি ব্যাকগ্রাউন্ড জব `assigned_role` সরিয়ে দেয়। করিমের `subscription_id=2`-এর জন্য এখানে কোনো রো নেই, কারণ SaaS টাইপ কম্প্যানিয়ন প্লাগইন প্যাটার্ন ব্যবহার করে।

---

## কাস্টমার সেলফ-সার্ভিস পোর্টাল

- WooCommerce My Account ট্যাবে এন্ডপয়েন্ট যোগ: `/my-account/subscriptions/`
- ক্লিন JS/Alpine.js ও স্ট্যান্ডার্ড WP REST API এন্ডপয়েন্ট ব্যবহার করে লাইটওয়েট ফ্রন্টএন্ড।
- অ্যাডমিন সেটিংসে কনফিগারযোগ্য সেলফ-সার্ভিস টগল:
  - পজ অনুমতি (হ্যাঁ/না) → সর্বোচ্চ পজ দৈর্ঘ্য।
  - স্কিপ অনুমতি (হ্যাঁ/না) → বার্ষিক সর্বোচ্চ স্কিপ।
  - প্ল্যান সুইচিং অনুমতি (হ্যাঁ/না)।
  - সেলফ-ক্যান্সেলেশন অনুমতি (হ্যাঁ/না)।

---

## ফেইলড পেমেন্ট রিকভারি ইঞ্জিন

- প্রত্যাশিত রিকভারি রেট টার্গেট: সফট ডিক্লাইনের **১৫% – ২৫%**।
- ম্যাজিক লিংক টোকেন সিকিউরিটি: SHA-256 হ্যাশ যেখানে `subscription_id`, `user_id` এবং `expiration_timestamp` (১৪ দিনের জন্য বৈধ) থাকে।
- পেমেন্ট মেথড পরিবর্তনে স্বয়ংক্রিয় রিকনসিলিয়েশন: ব্যালেন্স ক্লিয়ার ও স্ট্যাটাস `active`-এ ফিরিয়ে আনতে তাৎক্ষণিক API চার্জ রিকোয়েস্ট।

---

## এক্সটেনসিবিলিটি আর্কিটেকচার

সাবস্ক্রিপশন মডিউল কোর প্লাগইন হিসেবে ডিজাইন করা, কিন্তু বাস্তবে বেশিরভাগ ডেলিভারি (লাইসেন্সিং, SaaS, LMS, শিপিং) অন্য মডিউল/প্লাগইন হ্যান্ডেল করে। তাই এই মডিউলকে **এক্সটেন্ডেবল কোর + প্লাগেবল ডেলিভারি হ্যান্ডলার** হিসেবে ডিজাইন করা হয়েছে, যাতে ভবিষ্যতের যেকোনো মডিউল স্কিমা পরিবর্তন ছাড়াই কানেক্ট করতে পারে।

### দুটি এক্সটেনশন প্যাটার্ন

| প্যাটার্ন | কখন ব্যবহার হয় | ডেটা কোথায় থাকে | উদাহরণ |
| :--- | :--- | :--- | :--- |
| **কম্প্যানিয়ন প্লাগইন প্যাটার্ন** | মডিউলের নিজস্ব জটিল ডোমেইন লজিক ও টেবিল আছে | নিজস্ব প্লাগইনের টেবিলে; সাবস্ক্রিপশন শুধু হুক দিয়ে নোটিফাই করে | PureCart Licensing, PureCart SaaS Engine |
| **নেটিভ ডেলিভারি টাইপ প্যাটার্ন** | সাধারণ, হালকা স্টেট (রোল, কোটা, এনরোলমেন্ট) | `pct_subscription_linked_entities` টেবিলে | membership, download, course, service |

উভয় প্যাটার্নই একই রেজিস্ট্রেশন ফিল্টার ও হ্যান্ডলার কন্ট্র্যাক্ট ব্যবহার করে — পার্থক্য শুধু ডেটা কোথায় সংরক্ষিত হয়।

### ডেলিভারি টাইপ রেজিস্ট্রেশন

কোনো মডিউল নতুন ডেলিভারি টাইপ রেজিস্টার করে এই ফিল্টারে:

```php
add_filter( 'purecart_subscription_delivery_handlers', function ( $handlers ) {
    $handlers['gift_card'] = new My_Module_Gift_Card_Handler();
    return $handlers;
} );
```

- `delivery_type` কলাম (`pct_subscription_items` ও `pct_subscription_linked_entities`) ইচ্ছাকৃতভাবে `VARCHAR(32)` — `ENUM` নয় — যাতে নতুন টাইপ যোগ করতে স্কিমা মাইগ্রেশনের দরকার না হয়।
- বৈধতা রানটাইমে হয়: `checkout`/`admin save`-এ সিস্টেম যাচাই করে `delivery_type` মান রেজিস্ট্রি ফিল্টারে বিদ্যমান কিনা।

### হ্যান্ডলার ইন্টারফেস কন্ট্র্যাক্ট

প্রতিটি ডেলিভারি টাইপ হ্যান্ডলার `PureCart_Subscription_Delivery_Handler` ইন্টারফেস ইমপ্লিমেন্ট করে:

```php
interface PureCart_Subscription_Delivery_Handler {
    public function activate( $subscription );          // প্রথম চার্জ সফল বা ট্রায়াল শুরু
    public function renew( $subscription );              // প্রতিটি সফল রিনিউয়ালে
    public function deactivate( $subscription );         // suspended/cancelled/expired-এ
    public function get_linked_data( $subscription );     // অ্যাডমিন প্যানেলে দেখানোর জন্য ডেটা রিটার্ন
    public function validate_linked_data( array $data );  // সেভের আগে ইনপুট যাচাই
}
```

- **কম্প্যানিয়ন প্লাগইন প্যাটার্নে:** `get_linked_data()`/`validate_linked_data()` নিজস্ব টেবিল থেকে পড়ে/লেখে।
- **নেটিভ প্যাটার্নে:** এই মেথডগুলো `pct_subscription_linked_entities`-এর নির্দিষ্ট কলাম বা `extra_data` JSON ব্যবহার করে।

### ইভেন্ট / হুক ডিসপ্যাচ প্যাটার্ন

কোর ইঞ্জিন প্রতিটি স্ট্যাটাস ট্রানজিশনে একটি সাধারণ অ্যাকশন ফায়ার করে, সাথে টাইপ-স্পেসিফিক কনভিনিয়েন্স অ্যাকশনও:

```php
do_action( 'purecart_subscription_status_changed', $subscription_id, $old_status, $new_status, $context );

// কনভিনিয়েন্স অ্যাকশন — যেকোনো মডিউল সরাসরি হুক করতে পারে
do_action( 'purecart_subscription_activated', $subscription_id );
do_action( 'purecart_subscription_renewed', $subscription_id, $payment_amount );
do_action( 'purecart_subscription_payment_failed', $subscription_id, $retry_count );
do_action( 'purecart_subscription_cancelled', $subscription_id, $reason );
do_action( 'purecart_subscription_paused', $subscription_id, $resume_date );
do_action( 'purecart_subscription_resumed', $subscription_id );
```

- **কনসিস্টেন্ট পেলোড:** সব অ্যাকশনে প্রথম আর্গুমেন্ট সবসময় `subscription_id` (পুরো অবজেক্ট নয়) — যাতে অন্য মডিউল শুধু প্রয়োজনীয় ডেটা নিজে লোড করে, স্টেল অবজেক্ট রেফারেন্সের ঝুঁকি এড়ায়।
- অন্য মডিউল ডেটা পড়তে চাইলে পাবলিক হেল্পার ফাংশন ব্যবহার করবে (`purecart_get_subscription( $id )`), সরাসরি টেবিল কোয়েরি নয় — এতে ভবিষ্যতে স্কিমা পরিবর্তন হলেও এক্সটার্নাল মডিউল ভাঙবে না।

### REST API এক্সটেনশন পয়েন্ট

- বেস namespace: `purecart/v1`, রিসোর্স: `/subscriptions/{id}`।
- অন্য মডিউল নিজস্ব ফিল্ড যোগ করতে পারে:

```php
register_rest_field( 'purecart_subscription', 'license_key', [
    'get_callback' => function ( $sub ) {
        return My_Licensing_Module::get_key( $sub['id'] );
    },
] );
```

- বড় সাব-রিসোর্সের জন্য (যেমন লাইসেন্সিং-এর নিজস্ব ডোমেইন অ্যাক্টিভেশন তালিকা) মডিউল নিজের namespace-এ আলাদা এন্ডপয়েন্ট রাখবে, শুধু `subscription_id` রেফারেন্স হিসেবে ব্যবহার করে — মূল `purecart/v1/subscriptions` রিসোর্স হালকা থাকে।

### নতুন ডেলিভারি টাইপ যোগ করার ধাপ (উদাহরণ)

ধরা যাক একটি নতুন "Physical Subscription Box" মডিউল কানেক্ট করতে চায়:

```
① Handler ক্লাস তৈরি: Box_Delivery_Handler implements PureCart_Subscription_Delivery_Handler
② purecart_subscription_delivery_handlers ফিল্টারে রেজিস্টার:
     'physical_box' => new Box_Delivery_Handler()
③ activate()/renew()-এ শিপিং অর্ডার তৈরির লজিক লেখা
④ deactivate()-এ পরবর্তী শিপমেন্ট বাতিলের লজিক
⑤ টাইপ-স্পেসিফিক ডেটা (বক্স কন্টেন্ট, শিপিং শিডিউল) — হয় নিজস্ব টেবিলে
   (কম্প্যানিয়ন প্যাটার্ন), অথবা linked_entities.extra_data-তে JSON হিসেবে (নেটিভ প্যাটার্ন)
⑥ কোনো কোর স্কিমা মাইগ্রেশন লাগে না — delivery_type = 'physical_box' যেকোনো
   সময় checkout/admin থেকে সিলেক্ট করা যাবে
```

### ভার্শনিং ও ব্যাকওয়ার্ড কম্প্যাটিবিলিটি

- সব হুক/ফিল্টার নাম স্থিতিশীল কন্ট্র্যাক্ট হিসেবে বিবেচিত — পরিবর্তন হলে ডেপ্রিকেশন নোটিশ ও এক মেজর ভার্শন গ্রেস পিরিয়ড।
- `purecart_get_subscription()` এর মতো হেল্পার ফাংশনের মাধ্যমে অ্যাক্সেস করা মডিউল সরাসরি টেবিল কোয়েরি করা মডিউলের চেয়ে বেশি সুরক্ষিত থাকে ভবিষ্যৎ স্কিমা রিফ্যাক্টরিং থেকে।

---

*PureCart সাবস্ক্রিপশন মডিউল — ব্যাকএন্ড আর্কিটেকচার (v1.0) — জুলাই ২০২৬*
