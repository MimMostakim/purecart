# Subscriptions Module — Frontend Development Plan
**Plugin:** woo-digital-downloads
**Module:** Subscriptions
**Scope:** Admin UI, Customer templates, React components, Email HTML templates
**Backend plan:** `docs/dev-plan-subscriptions.md`
**Design reference:** `docs/design-guideline.md`

---

## নিয়ম

প্রতিটি Step শেষ করার পর:
1. Manual test checklist দেওয়া হবে
2. Test পাস করলে permission নিয়ে পরের Step শুরু হবে
3. Backend REST API ready থাকলেই কাজ করা সহজ হবে — backend Step পয়েন্ট উল্লেখ আছে প্রতিটি Step এ

**Tech Stack:**
- Admin UI: React (`@wordpress/components`, `@wordpress/data`) — compiled via `@wordpress/scripts`
- Customer-facing: PHP templates (`templates/`)
- Email: HTML PHP templates (`templates/emails/`)
- CSS: WordPress admin color scheme follow করা, `@wordpress/base-styles`

---

## Step 1 — Product Meta Box UI (Admin)

**Backend prerequisite:** Backend Step 3 (SubscriptionProduct — meta save logic)

**কী করব:**
- WooCommerce product edit page এ "Subscription" product data tab add করব
- Tab click এ subscription fields দেখাবে (PHP admin template বা React component)
- Fields:

**Pricing section:**
```
Recurring price:  [_____] / [interval dropdown: 1/2/3] [period: day/week/month/year]
Sign-up fee:      [_____] (0 = none)
Free trial:       [_____] [period: day/week/month] (0 = no trial)
Subscription length: [_____] [month/year] (0 = indefinite)
```

**Billing section:**
```
Max subscriptions per customer: [_____] (0 = unlimited)
Include tax in renewals:        [checkbox]
Include shipping in renewals:   [checkbox]
```

**Stepped pricing section:**
```
Introductory price for [N] cycles, then switch to [_____]
```
*Only visible when step price > 0*

**Proration:**
```
Upgrade/Downgrade proration: [Prorate immediately | Apply at renewal | No proration]
```

**Roles section:**
```
Role during trial:     [WP role dropdown]
Role when active:      [WP role dropdown]
Role when cancelled:   [WP role dropdown]
```

**Retention section:**
```
Enable cancellation retention flow: [checkbox]
Cancellation reasons:  [tag input — add/remove reasons]
Retention offer type:  [Discount | Pause | Skip cycle | Downgrade]
```

**Files:**
```
assets/js/admin/subscription-product.js   ← (compiled from src/)
src/admin/subscription-product/
├── index.js                              ← entry point
├── PricingFields.jsx
├── BillingOptions.jsx
├── SteppedPricing.jsx
├── RoleSettings.jsx
└── RetentionSettings.jsx
assets/css/admin-subscription.css         ← product tab styles
```

### Manual Test — Step 1
- [ ] WooCommerce → New Product → Type = "Subscription" → "Subscription" tab দেখা যায়
- [ ] সব field গুলো correctly rendered হয়েছে (interval dropdown, period dropdown ইত্যাদি)
- [ ] Field values save করলে re-open এ সঠিক values দেখায়
- [ ] Stepped pricing section: step price = 0 হলে hidden, > 0 হলে visible
- [ ] Retention reasons: add/remove করা যাচ্ছে
- [ ] Mobile responsive (tablet view এ ঠিকঠাক দেখায়)
- [ ] RTL layout এ field alignment সঠিক

**Step 1 শেষে permission চাইব।**

---

## Step 2 — Admin Subscription List Table UI

**Backend prerequisite:** Backend Step 8 (REST API) + Backend Step 9 (emails optional)

**কী করব:**
- Admin → Digital Downloads → Subscriptions page এর full UI
- React component দিয়ে অথবা WordPress `WP_List_Table` PHP rendering এর উপর CSS/JS layer

**List Table columns:**
| Column | UI Detail |
|--------|-----------|
| Subscription ID | `SUB-00001` format, link to detail page |
| Customer | Avatar + Name + email (2 lines) |
| Product | Product name + variation info |
| Status | Colored badge: active=green, paused=yellow, past_due=orange, suspended=red, cancelled=grey, expired=grey, trialing=blue |
| Recurring Amount | `৳X / month` format |
| Next Payment | Relative date + absolute date on hover (`tooltip`) |
| Started | Date |
| Actions | View icon, Cancel icon, Renew icon |

**Filters bar (top):**
```
[Status dropdown] [Product dropdown] [Date range picker] [Customer search input] [Filter button]
```

**Bulk actions:**
```
[Checkbox all] → [Select action: Cancel | Retry Payment | Export CSV] [Apply]
```

**Pagination:** WP-style pagination (Prev | 1 2 3 ... | Next) + "X items" count

**Empty state:** Illustration + "No subscriptions found" text + clear filters button

**Loading state:** Skeleton rows (shimmer effect)

**Files:**
```
src/admin/subscription-list/
├── index.js                   ← entry point, mounts React app
├── SubscriptionList.jsx        ← main component
├── SubscriptionFilters.jsx     ← filter bar
├── SubscriptionTableRow.jsx    ← single row
├── StatusBadge.jsx             ← colored badge component
├── BulkActions.jsx             ← bulk action bar
└── Pagination.jsx              ← pagination component
assets/css/admin-subscription-list.css
```

**API calls (uses Backend Step 8):**
- `GET /wdd/v1/subscriptions?status=&product_id=&date_from=&date_to=&search=&page=&per_page=20`
- `POST /wdd/v1/subscriptions/{id}/cancel` (bulk/single)
- `POST /wdd/v1/subscriptions/{id}/renew`

### Manual Test — Step 2
- [ ] Admin → Digital Downloads → Subscriptions → subscription list দেখাচ্ছে
- [ ] Status badge সঠিক রঙে দেখাচ্ছে (active=green, cancelled=grey ইত্যাদি)
- [ ] Status filter: "Active" select → শুধু active subscriptions
- [ ] Customer search: email type করলে filter হচ্ছে
- [ ] Date range filter কাজ করছে
- [ ] "Renew Now" icon click → confirmation modal → renewal trigger হয়
- [ ] "Cancel" icon click → confirmation modal → cancel হয়
- [ ] Bulk select করে Cancel → সব select করা cancel হয়
- [ ] Pagination: 2nd page তে correct data দেখাচ্ছে
- [ ] Empty state: filter এ result না থাকলে empty state message দেখায়
- [ ] Loading skeleton: data load হওয়ার আগে shimmer দেখায়

**Step 2 শেষে permission চাইব।**

---

## Step 3 — Admin Subscription Detail Page UI

**Backend prerequisite:** Backend Step 8 (REST API), Backend Step 13 (logs)

**কী করব:**
- Subscription ID click করলে detail page খোলে
- 4টি Tab এর UI:

**Tab 1: Overview**
```
┌─────────────────────────────────────────────────────────┐
│  SUB-00001  [Status Badge: Active]          [Actions ▼] │
├──────────────────────┬──────────────────────────────────┤
│ Customer             │ Product                          │
│ John Doe             │ Pro Plugin License               │
│ john@example.com     │ Monthly — ৳49.00/month           │
├──────────────────────┼──────────────────────────────────┤
│ Started              │ Next Payment                     │
│ Jan 1, 2026          │ Jul 1, 2026 (4 days)             │
├──────────────────────┼──────────────────────────────────┤
│ Trial ends           │ Max length                       │
│ —                    │ Indefinite                       │
├──────────────────────┼──────────────────────────────────┤
│ Gateway              │ Gateway Subscription ID          │
│ Stripe               │ sub_xxxxxxxxxxxxx                │
├──────────────────────┼──────────────────────────────────┤
│ Renewals completed   │ Retry count                      │
│ 6                    │ 0                                │
└──────────────────────┴──────────────────────────────────┘

[Actions dropdown: Change Status | Manual Renewal | Cancel | Export]
```

**Tab 2: Payment Log**
```
Date          | Order ID    | Amount  | Status   | Gateway response
Jan 1, 2026   | #1234       | ৳49.00  | Success  | Stripe charge_xxx
Feb 1, 2026   | #1289       | ৳49.00  | Success  | Stripe charge_yyy
Mar 1, 2026   | —           | ৳49.00  | Failed   | Card declined
Mar 2, 2026   | #1356       | ৳49.00  | Success  | Retry — Stripe charge_zzz
```

**Tab 3: Status History**
```
Date & Time          | From        | To          | By        | Reason
Jan 1, 2026 10:00    | —           | Active      | System    | Order completed
Mar 1, 2026 02:00    | Active      | Past Due    | System    | Payment failed
Mar 2, 2026 02:00    | Past Due    | Active      | System    | Retry payment success
```

**Tab 4: Emails Sent**
```
Date & Time          | Email Type              | Recipient
Jan 1, 2026 10:01    | Subscription Created    | john@example.com
Mar 1, 2026 02:01    | Payment Failed          | john@example.com
Mar 2, 2026 02:01    | Renewal Successful      | john@example.com
```
*Resend button per row*

**Admin Actions (dropdown):**
- **Change Status** → modal: status dropdown + reason text input + [Save] button
- **Manual Renewal** → confirmation modal → trigger
- **Cancel Subscription** → confirmation modal with optional grace period input

**Files:**
```
src/admin/subscription-detail/
├── index.js
├── SubscriptionDetail.jsx     ← main wrapper with tabs
├── OverviewTab.jsx
├── PaymentLogTab.jsx
├── StatusHistoryTab.jsx
├── EmailsTab.jsx
├── ActionDropdown.jsx         ← change status, manual renew, cancel
├── StatusChangeModal.jsx
└── ConfirmationModal.jsx      ← reusable confirm dialog
```

### Manual Test — Step 3
- [ ] List থেকে subscription click → detail page খোলে
- [ ] Overview tab: সব field সঠিক data দেখাচ্ছে
- [ ] "Change Status" → modal opens, status select করে save → status update হয় + badge change হয়
- [ ] "Manual Renewal" → confirmation → renewal trigger হয় → success notice
- [ ] Payment Log tab: সব renewal orders দেখাচ্ছে (amount, status, date)
- [ ] Status History tab: সব status changes chronologically দেখাচ্ছে
- [ ] Emails Sent tab: sent emails list দেখাচ্ছে
- [ ] Emails Sent tab: "Resend" button → email resend হয়
- [ ] Cancel modal: reason input দিয়ে cancel confirm করলে cancel হয়
- [ ] Browser back button এ list page এ ফিরে যাওয়া যায়

**Step 3 শেষে permission চাইব।**

---

## Step 4 — Admin Settings Page UI (Subscriptions Tab)

**Backend prerequisite:** Backend Step 2 (module bootstrap, settings REST route)

**কী করব:**
- WDD Settings → Subscriptions page এ 7টি tab

**Tab: General**
```
☑ Enable Subscriptions module
☑ Allow automatic renewal
☑ Allow mixed cart (subscription + regular products)
☑ Allow multiple subscriptions in one checkout
```

**Tab: Billing**
```
Payment retry attempts:    [3] (number input)
Retry intervals (days):   [1] [3] [5] (tag/chip input, add/remove)
Active grace period:       [7] days  (after failure, access remains)
Suspended grace period:    [7] days  (after suspension, before hard cancel)
```

**Tab: Renewals**
```
Send renewal reminders:    [7] [3] [1] days before renewal (chip input)
Include tax in renewals:   [Yes / No radio]
Include shipping in renewals: [Yes / No radio]
One trial per customer:    ☑ Prevent trial abuse (cancel + resubscribe)
```

**Tab: Upgrade/Downgrade**
```
Default proration mode:
  ○ Prorate immediately (charge/refund difference now)
  ○ Apply at renewal (new price at next cycle) ← default
  ○ No proration (switch now, full price at renewal)
```

**Tab: Customer Portal**
```
☑ Allow customers to pause subscriptions
☑ Allow customers to cancel subscriptions
☑ Allow customers to upgrade/downgrade
Skip next renewal limit: [1] per year (0 = unlimited)
```

**Tab: Renewal Sync**
```
☐ Align all renewals to a fixed date
Sync date: [1] (day of month, 1–28)
```

**Tab: Advanced**
```
Action Scheduler check interval: [15] minutes
☐ Enable debug logging
```

**Save behavior:** Each tab has its own [Save Changes] button, REST PUT to settings endpoint, toast notification on success/error

**Files:**
```
src/admin/subscription-settings/
├── index.js
├── SubscriptionSettings.jsx    ← tabbed settings container
├── tabs/
│   ├── GeneralTab.jsx
│   ├── BillingTab.jsx
│   ├── RenewalsTab.jsx
│   ├── UpgradeTab.jsx
│   ├── CustomerPortalTab.jsx
│   ├── RenewalSyncTab.jsx
│   └── AdvancedTab.jsx
└── components/
    ├── ChipInput.jsx           ← tag/chip input for arrays (retry intervals, reminder days)
    ├── SaveButton.jsx          ← with loading state
    └── SettingsNotice.jsx      ← success/error toast
```

### Manual Test — Step 4
- [ ] WDD Settings → Subscriptions → 7টি tab দেখা যাচ্ছে
- [ ] General tab: module toggle save করা যায়
- [ ] Billing tab: retry intervals chip input — add/remove days কাজ করছে
- [ ] Billing tab: [Save] → settings saved, toast "Settings saved" দেখায়
- [ ] Invalid input: retry attempts = -1 → validation error দেখায়
- [ ] Customer Portal tab: "Allow pause" toggle off → My Account এ pause button হাইড হয়
- [ ] Renewal Sync tab: sync enable করলে sync date input appear করে
- [ ] সব tabs এ save করলে page refresh করলেও সঠিক values দেখায়

**Step 4 শেষে permission চাইব।**

---

## Step 5 — Email HTML Templates (সব 16টি)

**Backend prerequisite:** Backend Step 9 (Email PHP classes)

**কী করব:**
- সব 16টি email এর HTML template design করব
- WooCommerce email header/footer এর সাথে consistent
- Responsive email design (mobile + desktop)
- Template location: `templates/emails/subscription-*.php`
- Plain text version: `templates/emails/plain/subscription-*.php`

**Design rules:**
- WooCommerce এর `woocommerce_email_header()` এবং `woocommerce_email_footer()` wrap করবে
- Brand colors: WooCommerce default (override করা যাবে theme থেকে)
- Font: system font stack
- CTA button: `wc-email-button` class
- Maximum width: 600px (standard email width)

**Key email layouts:**

**Subscription Created** — সবচেয়ে important:
```
Hello {first_name},

Thank you for subscribing to {product_name}!

┌─────────────────────────────────┐
│ Subscription Details            │
│ Subscription ID: SUB-00001      │
│ Plan: {product_name}            │
│ Amount: {amount} / {period}     │
│ Next billing: {next_payment_date}│
│ Status: Active                  │
└─────────────────────────────────┘

[Manage Subscription →]

{license_key_section_if_applicable}
```

**Payment Failed** — urgent:
```
Hello {first_name},

We were unable to process your payment for {product_name}.

Amount due: {amount}
Retry date: {retry_date}

Your access remains active for {grace_days} more days.

[Update Payment Method →]

If you have questions, contact us at {support_email}.
```

**Renewal Reminder:**
```
Hello {first_name},

Your {product_name} subscription renews in {days_until_renewal} days.

Next charge: {amount} on {next_payment_date}

[Manage Subscription →]
```

**Files:**
```
templates/emails/
├── subscription-created.php
├── trial-started.php
├── trial-ending-soon.php
├── trial-converted.php
├── renewal-reminder.php
├── renewal-successful.php
├── payment-failed.php
├── payment-retry-scheduled.php
├── overdue-notice.php
├── suspend-notice.php
├── suspended-grace-ending.php
├── cancellation-notice.php
├── expiration-notice.php
├── resubscription-confirmed.php
├── plan-changed.php
├── skip-renewal-confirmed.php
└── plain/
    └── (same 16 files — plain text version)
```

### Manual Test — Step 5
- [ ] WooCommerce email preview (WooCommerce → Settings → Emails → Preview) এ সব 16টি email দেখা যায়
- [ ] Mobile view এ (320px) email correctly displayed (no horizontal scroll)
- [ ] Placeholder `{first_name}`, `{subscription_id}`, `{amount}`, `{next_payment_date}` সঠিক values দিয়ে replace হচ্ছে
- [ ] "Subscription Created" email এ "Manage Subscription" CTA button link সঠিক (My Account URL)
- [ ] "Payment Failed" email এ "Update Payment Method" link সঠিক
- [ ] Plain text version পড়া যাচ্ছে (no HTML tags)
- [ ] Gmail, Outlook এ email correctly render হচ্ছে (test via Mailhog বা WP Mail SMTP)
- [ ] RTL mode এ email text direction সঠিক

**Step 5 শেষে permission চাইব।**

---

## Step 6 — Customer Portal: My Account Subscriptions List

**Backend prerequisite:** Backend Step 5 (SubscriptionManager), Backend Step 8 (REST API)

**কী করব:**
- WooCommerce My Account → "Subscriptions" tab এর template
- PHP template file: `templates/account/subscriptions.php`

**Layout:**
```
My Subscriptions
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Filter: All | Active | Paused | Cancelled]

┌─────────────────────────────────────────────┐
│ Pro Plugin License            [Active ●]    │
│ ৳49.00 / month                              │
│ Next payment: July 1, 2026 (4 days)         │
│                    [Manage →]               │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Basic Theme                   [Paused ⏸]   │
│ ৳19.00 / month                              │
│ Paused on June 15, 2026                     │
│                    [Resume] [Manage →]      │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Old Plugin                  [Cancelled ✕]  │
│ Cancelled on March 1, 2026                  │
│                    [Resubscribe →]          │
└─────────────────────────────────────────────┘
```

**Status colors:**
- Active: green dot
- Trialing: blue dot
- Paused: yellow dot
- Past due: orange dot
- Suspended: red dot
- Cancelled/Expired: grey

**Empty state:** "You have no subscriptions yet. [Browse Products →]"

**Files:**
```
templates/account/subscriptions.php      ← list template
templates/account/partials/
└── subscription-card.php                ← single card partial
assets/css/account-subscriptions.css
```

### Manual Test — Step 6
- [ ] My Account → "Subscriptions" tab exist করে (logged-in user)
- [ ] Active subscription card সঠিক info দেখাচ্ছে (name, amount, next payment)
- [ ] Paused subscription এ "Resume" button দেখাচ্ছে
- [ ] Cancelled subscription এ "Resubscribe" button দেখাচ্ছে
- [ ] "Filter: Active" click করলে শুধু active cards দেখায়
- [ ] 0 subscription থাকলে empty state message দেখায়
- [ ] Logged-out user: My Account login page এ redirect হয়
- [ ] Mobile (375px): cards single column, buttons full-width

**Step 6 শেষে permission চাইব।**

---

## Step 7 — Customer Portal: Single Subscription Detail

**Backend prerequisite:** Backend Step 8, Backend Step 11 (RetentionFlow)

**কী করব:**
- "Manage →" click করলে single subscription detail page খোলে
- WooCommerce My Account endpoint: `/my-account/subscriptions/{sub-id}/`

**Layout:**
```
← Back to Subscriptions

Pro Plugin License
Subscription #SUB-00001                    [Active ●]

━━━━ Subscription Details ━━━━
Amount:       ৳49.00 / month
Started:      January 1, 2026
Next payment: July 1, 2026
Trial ended:  —

━━━━ Actions ━━━━
[⏸ Pause]  [⏭ Skip Next Renewal]  [↑ Change Plan]  [✕ Cancel]

━━━━ Payment History ━━━━
Date          Amount    Status
Jun 1, 2026   ৳49.00    ✓ Paid  (#1456)
May 1, 2026   ৳49.00    ✓ Paid  (#1389)
Apr 1, 2026   ৳49.00    ✗ Failed → ✓ Retried (#1312)

[Change Payment Method]
```

**Action behaviors:**
- **Pause** → confirmation → AJAX call → success message → button change to "Resume"
- **Skip Next Renewal** → confirmation showing new next date → AJAX → success
- **Change Plan** → plan selection modal (Step 8)
- **Cancel** → cancellation/retention flow (Step 9)
- **Change Payment Method** → WooCommerce gateway's update method (Stripe/PayPal)

**Files:**
```
templates/account/subscription-detail.php
templates/account/partials/
├── payment-history-table.php
└── action-buttons.php
assets/js/account-subscription-detail.js   ← AJAX calls for actions
assets/css/account-subscription-detail.css
```

### Manual Test — Step 7
- [ ] Subscription card "Manage" click → detail page খোলে
- [ ] সব subscription info সঠিক (amount, dates, status)
- [ ] "Pause" click → confirmation modal → confirm → success notice, status badge = Paused
- [ ] "Pause" করার পর "Resume" button দেখায়, Pause button হাইড
- [ ] "Skip Next Renewal" click → modal shows new next date → confirm → next_payment_at advance হয়
- [ ] Payment History: সব renewals chronologically দেখাচ্ছে (order link কাজ করছে)
- [ ] `allow_pause = false` setting এ Pause button নেই
- [ ] `allow_cancel = false` setting এ Cancel button নেই
- [ ] Browser back → subscriptions list এ ফিরে যায়

**Step 7 শেষে permission চাইব।**

---

## Step 8 — Customer Portal: Change Plan UI

**Backend prerequisite:** Backend Step 10 (PlanUpgrade)

**কী করব:**
- Subscription detail page এ "Change Plan" button → plan selection modal/page

**Modal Layout:**
```
Change Your Plan
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Current plan: Pro Plugin License — ৳49.00/month

Available plans:
┌─────────────────────────────────┐
│ ● Basic — ৳19.00/month          │
│   1 site, basic support         │
│   DOWNGRADE — Credit: ৳15.23   │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ ○ Business — ৳99.00/month       │
│   5 sites, priority support     │
│   UPGRADE — Charge today: ৳30.45│
└─────────────────────────────────┘

Proration: Prorate immediately
(You will be charged ৳30.45 today for the remaining days)

[Confirm Change Plan]  [Cancel]
```

**Proration calculation shown live** (via REST call as user selects plan)

**Files:**
```
templates/account/partials/change-plan-modal.php   ← or React component
assets/js/account-change-plan.js                   ← plan selection + proration display
```

### Manual Test — Step 8
- [ ] "Change Plan" click → modal opens with available plans
- [ ] Current plan marked/disabled
- [ ] Plan select করলে proration amount live calculate হয় (correct amount দেখায়)
- [ ] Downgrade select → credit amount দেখায়
- [ ] "Confirm" → upgrade/downgrade apply হয়, success notice
- [ ] `proration_mode = apply_at_renewal` → "No charge today, new price at next renewal" message
- [ ] `allow_upgrade = false` setting এ "Change Plan" button নেই

**Step 8 শেষে permission চাইব।**

---

## Step 9 — Customer Portal: Cancellation + Retention Flow UI

**Backend prerequisite:** Backend Step 11 (RetentionFlow)

**কী করব:**
- "Cancel" button → 2-step flow

**Step 1 — Reason Selection:**
```
Why are you cancelling?
━━━━━━━━━━━━━━━━━━━━━━━

○ It's too expensive
○ I'm not using it enough
○ Missing features I need
○ Switching to another provider
○ Other: [________________]

[Continue →]
```

**Step 2 — Retention Offer:**
```
Before you go...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

We'd hate to see you go! How about this:

┌──────────────────────────────────────┐
│  🎁 Get 30% off for the next 3 months│
│                                      │
│  Your price: ৳34.30/month           │
│  (instead of ৳49.00/month)          │
│                                      │
│  [Yes, apply the discount!]          │
└──────────────────────────────────────┘

[No thanks, cancel my subscription]
```

**Offer types — different UI per type:**
- **Discount**: show discounted price + savings
- **Pause**: "Take a break! Pause for [X] months instead of cancelling"
- **Skip**: "Skip your next payment (next charge: {new_date})"
- **Downgrade**: "Switch to our Basic plan — ৳19.00/month"

**After accept:** Success message "We've applied your discount! Your subscription continues."
**After decline:** Final cancel confirmation → "Your subscription has been cancelled. Access continues until {date}."

**Files:**
```
templates/account/partials/
├── cancel-step1-reasons.php     ← reason selection
└── cancel-step2-offer.php       ← retention offer

assets/js/account-cancellation.js   ← multi-step flow JS
```

### Manual Test — Step 9
- [ ] "Cancel" click → Step 1 reason selection dials দেখায়
- [ ] Reason select না করে Continue → validation error
- [ ] Reason select → Continue → Step 2 retention offer দেখায়
- [ ] Offer type "discount" → discounted price সঠিক দেখায়
- [ ] Offer type "pause" → pause offer message দেখায়
- [ ] "Yes, apply the discount" → coupon apply, subscription active, success message
- [ ] "No thanks, cancel" → final confirmation modal → confirm → subscription cancelled
- [ ] `_wdd_sub_retention_enabled = false` → directly final cancel confirmation
- [ ] Retention log: `wp_wdd_subscription_logs` এ retention event আছে

**Step 9 শেষে permission চাইব।**

---

## Step 10 — Admin Reports Page UI

**Backend prerequisite:** Backend Step 13 (SubscriptionReport data)

**কী করব:**
- Admin → Digital Downloads → Reports → Subscriptions tab এর UI

**Layout:**
```
Subscription Reports
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Period: Last 30 days ▼]  [Export CSV]

┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Active   │ │   MRR    │ │   ARR    │ │ Churn    │
│   142    │ │ ৳6,958   │ │ ৳83,496  │ │  2.4%    │
│ ▲ 5 this │ │ ▲ ৳320   │ │          │ │          │
│   month  │ │ vs last  │ │          │ │          │
└──────────┘ └──────────┘ └──────────┘ └──────────┘

━━ Revenue Over Time (line chart) ━━━━━━━━━━━━━

     ৳8k ┤                          ╭──
     ৳6k ┤               ╭──────────╯
     ৳4k ┤          ╭────╯
     ৳2k ┤     ╭────╯
       0 ┤─────╯
           Jan  Feb  Mar  Apr  May  Jun

━━ Subscriptions by Status (donut chart) ━━━━

  Active 68%  ████████████████████████
  Trialing 5% ████
  Paused 8%   ██████
  Cancelled 15%████████████
  Expired 4%  ████

━━ Cancellation Reasons ━━━━━━━━━━━━━━━━━━━━━

  Too expensive:      42 (38%)  ████████████████████
  Not using it:       28 (25%)  █████████████
  Missing features:   18 (16%)  ████████
  Switching:          12 (11%)  ██████
  Other:              11 (10%)  █████

  Retention offer acceptance rate: 34%

━━ Trial Conversion ━━━━━━━━━━━━━━━━━━━━━━━━

  Trial started this month:   45
  Converted to paid:          31
  Conversion rate:            68.9%
```

**Charts:** Use `@wordpress/components` chart primitives বা lightweight chart library (Chart.js)

**Files:**
```
src/admin/subscription-reports/
├── index.js
├── SubscriptionReports.jsx      ← main page
├── SummaryCards.jsx             ← 4 stat cards
├── RevenueChart.jsx             ← line chart
├── StatusDonutChart.jsx         ← donut chart
├── CancellationReasons.jsx      ← bar chart + table
└── TrialConversionCard.jsx
assets/css/admin-reports.css
```

### Manual Test — Step 10
- [ ] Admin → Digital Downloads → Reports → Subscriptions tab exist করে
- [ ] Summary cards: active count, MRR, ARR সঠিক (manually created subscriptions এর সাথে match)
- [ ] Period filter: "Last 7 days" → চার্ট ও stat cards update হয়
- [ ] Revenue line chart: monthly data points সঠিক
- [ ] Status donut chart: percentages সঠিক
- [ ] Cancellation reasons: manually cancel করা subscriptions এর reasons দেখায়
- [ ] Export CSV click → CSV download হয়, সঠিক data আছে
- [ ] Data নেই (0 subscriptions) → empty state / zero charts, no error

**Step 10 শেষে permission চাইব।**

---

## Progress Tracker

| Step | Description | Backend Prerequisite | Status |
|------|-------------|---------------------|--------|
| Step 1 | Product Meta Box UI | Backend Step 3 | ⬜ Not Started |
| Step 2 | Admin Subscription List Table UI | Backend Step 8 | ⬜ Not Started |
| Step 3 | Admin Subscription Detail Page UI | Backend Step 8, 13 | ⬜ Not Started |
| Step 4 | Admin Settings Page UI (7 tabs) | Backend Step 2 | ⬜ Not Started |
| Step 5 | Email HTML Templates (16 emails) | Backend Step 9 | ⬜ Not Started |
| Step 6 | Customer Portal: Subscriptions List | Backend Step 5, 8 | ⬜ Not Started |
| Step 7 | Customer Portal: Subscription Detail | Backend Step 8, 11 | ⬜ Not Started |
| Step 8 | Customer Portal: Change Plan UI | Backend Step 10 | ⬜ Not Started |
| Step 9 | Customer Portal: Cancellation + Retention | Backend Step 11 | ⬜ Not Started |
| Step 10 | Admin Reports Page UI | Backend Step 13 | ⬜ Not Started |

**Icons:** ⬜ Not Started | 🔄 In Progress | ✅ Complete | ❌ Blocked

---

## File Structure Summary

```
src/                                      ← React source (compiled to assets/)
├── admin/
│   ├── subscription-product/             ← Step 1
│   ├── subscription-list/                ← Step 2
│   ├── subscription-detail/              ← Step 3
│   ├── subscription-settings/            ← Step 4
│   └── subscription-reports/             ← Step 10

templates/
├── account/
│   ├── subscriptions.php                 ← Step 6
│   ├── subscription-detail.php           ← Step 7
│   └── partials/
│       ├── subscription-card.php         ← Step 6
│       ├── payment-history-table.php     ← Step 7
│       ├── action-buttons.php            ← Step 7
│       ├── change-plan-modal.php         ← Step 8
│       ├── cancel-step1-reasons.php      ← Step 9
│       └── cancel-step2-offer.php        ← Step 9
└── emails/
    ├── subscription-created.php          ← Step 5
    ├── (15 more email templates)
    └── plain/
        └── (16 plain text versions)

assets/
├── js/
│   ├── admin/subscription-product.js     ← compiled
│   ├── admin/subscription-list.js        ← compiled
│   ├── admin/subscription-detail.js      ← compiled
│   ├── admin/subscription-settings.js    ← compiled
│   ├── admin/subscription-reports.js     ← compiled
│   ├── account-subscriptions.js          ← compiled
│   ├── account-subscription-detail.js    ← compiled
│   ├── account-change-plan.js            ← compiled
│   └── account-cancellation.js           ← compiled
└── css/
    ├── admin-subscription-list.css
    ├── admin-subscription-detail.css
    ├── admin-reports.css
    ├── account-subscriptions.css
    └── account-subscription-detail.css
```
