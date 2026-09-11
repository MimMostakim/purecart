# SaaS Accounts Module — Frontend Development Plan

**Plugin:** purecart
**Module:** SaaS Provisioning (Phase 2) — React admin UI
**Scope:** `src/app/components/SaasAccounts/` — replaces the current `<ComingSoon />` placeholder
**Out of scope:** Backend/REST API — already done, see `docs/saas-module/dev-plan-saas.md` (Steps 1–9, all ✅)
**Reference:** `docs/saas-module/dev-plan-saas.md` Appendix A (REST contract, row shape), `includes/API/SaaS.php` (live endpoints)
**Branch:** `saas-module` (same branch as the backend work — the route is already wired, just pointed at a placeholder)

---

## নিয়ম

প্রতিটা Step শেষ করার পর:
1. Manual test checklist দেওয়া হবে (ব্রাউজারে করে দেখতে হবে — এটা UI কাজ, `php -l` দিয়ে ধরা পড়ে না)
2. Test পাস করলে permission নিয়ে পরের Step শুরু হবে
3. এক Step = এক commit
4. Backend-এর কোনো কাজ এই plan-এ নেই — REST API সম্পূর্ণ প্রস্তুত ও লাইভ টেস্ট করা (dev-plan-saas.md দেখো)

---

## As-Built অবস্থা (কাজ শুরুর আগে যা আছে)

কোডবেস ঘেঁটে যা পাওয়া গেছে — Appendix A লেখার সময়ের কিছু ধারণা বাস্তবে ভুল প্রমাণিত হয়েছে, নিচে ঠিক করা হলো:

| জিনিস | অবস্থা |
|---|---|
| Route (`/saas-accounts`) | ✅ আগে থেকেই আছে — `paths.ts`, `AppRoutes.tsx`, `menu-router` সব wire করা, sidebar-এ "SaaS Accounts" লিংকও আছে |
| `SaasAccountsPage.tsx` | ⚠️ শুধু `<ComingSoon />` — এই plan-এ এটাই বদলাবে |
| Redux slice (`saasSlice.ts`) | ❌ নেই — শুধু `subscriptionsSlice.ts` আছে |
| API module (`api/modules/saas.api.ts`) | ❌ নেই |
| **শেয়ার করা `DataTable`/`Pagination` component** | ❌ **নেই।** Appendix A-তে ধরে নেওয়া হয়েছিল এগুলো "Downloads/Subscriptions module থেকে reuse হবে" — বাস্তবে Subscriptions নিজের বেসপোক `SubscriptionsTable.tsx` বানিয়েছে (কোনো জেনেরিক টেবিল/পেজিনেশন কম্পোনেন্ট নেই), আর Licenses/Downloads module এখনো Subscriptions-এর মতোই শুধু placeholder (`LicensesPage.tsx`, `DownloadsPage.tsx` — এক লাইনের ComingSoon)। অর্থাৎ **Subscriptions-ই একমাত্র বাস্তবে বানানো frontend**, আর সেটাই সবচেয়ে কাছের রেফারেন্স প্যাটার্ন |
| **API layer লাইভ কিনা** | ✅ লাইভ — `src/app/api/client.ts`-এ `USE_DUMMY_DATA = false`। প্রতিটা API module dummy আর real দুই পথই রাখে (`if (USE_DUMMY_DATA) { ...dummy... } else { ...apiFetch... }`), পুরনো ধারণা "SPA পুরোটাই mockup" এখন আর সত্যি না — অন্তত Subscriptions module-এর জন্য |
| Filter/pagination প্যাটার্ন | Subscriptions পুরো লিস্ট একবারে লোড করে (`loadSubscriptions()` কোনো query param ছাড়া), তারপর filter/sort/paginate **ক্লায়েন্ট-সাইডে** (component-এর ভেতরে) করে — যদিও backend-এর REST endpoint-এ `search`/`status`/`page`/`per_page` সাপোর্ট আছে। এই plan একই কনভেনশন অনুসরণ করবে (consistency), যেহেতু SaaS account সংখ্যা সাধারণত ছোট থাকবে |
| Shared UI (`components/ui/`) | ActionDropdown, ConfirmDialog, FilterChip, StatusBadge, StatCard, KpiCard, TrendChip, Toast, SectionTitle, Toggle — এগুলো সত্যিই জেনেরিক ও reuse-যোগ্য |
| Field/settings component (`Subscriptions/shared/`) | `SettingsField`, `SettingsToggleField`, `SettingsSelectField`, `SettingsSectionHeader` — Subscriptions module-এর ভেতরে আছে কিন্তু generic presentational component (props-only, subscription-নির্দিষ্ট কিছু ভেতরে নেই) — reuse করা যাবে |

**অর্থাৎ:** এই module-ই দ্বিতীয় "আসল" frontend build হবে এই প্লাগইনে (Subscriptions-এর পরে)। Subscriptions-এর ফাইল কাঠামো/কনভেনশন সবচেয়ে নির্ভরযোগ্য রেফারেন্স।

---

## Step 1 — Types + API Module

**কী করব:**

`src/app/components/SaasAccounts/types.ts` (নতুন):

```ts
export interface SaasAccountRecord {
  id: number;
  orderId: number;
  orderNumber: string;
  userId: number;
  customerName: string;
  customerEmail: string;
  productId: number;
  productName: string;
  plan: string;
  apiKeyMasked: string;
  status: 'active' | 'suspended' | 'cancelled';
  provisionedAt: string;
}

export interface SaasStats {
  total: number;
  active: number;
  suspended: number;
  cancelled: number;
  provisionedToday: number;
  topPlans: { plan: string; count: number }[];
}

export interface SaasSettings {
  webhookUrl: string;
  webhookSecret: string;
  jwtExpirySeconds: number;
  jwtRefreshSeconds: number;
}
```

`src/app/api/modules/saas.api.ts` (নতুন) — `subscriptions.api.ts`-এর প্যাটার্নে (`USE_DUMMY_DATA` toggle, `apiFetch`/`apiFetchWithMeta`):

```ts
fetchSaasAccounts(): Promise<SaasAccountRecord[]>
fetchSaasStats(): Promise<SaasStats>
suspendSaasAccount(id: number): Promise<SaasAccountRecord>
activateSaasAccount(id: number): Promise<SaasAccountRecord>
rotateSaasApiKey(id: number): Promise<SaasAccountRecord>
fetchSaasSettings(): Promise<SaasSettings>
saveSaasSettings(patch: Partial<Pick<SaasSettings,'webhookUrl'|'jwtExpirySeconds'|'jwtRefreshSeconds'>>): Promise<SaasSettings>
```

- REST response-এর snake_case কী (`order_id`, `api_key_masked`, `provisioned_at`, ...) camelCase-এ ম্যাপ করার জন্য `mapBackendAccountToRecord()` হেল্পার (Subscriptions-এর `mapBackendSubscriptionToRecord()`-এর প্যাটার্নে)
- Dummy path-এ ৪-৫টা fake account (বিভিন্ন status/plan) — `USE_DUMMY_DATA` `true` করলেও পেজ ভেঙে না পড়ে, ডিজাইন রিভিউ করা যায়

**Files:**
```
src/app/components/SaasAccounts/types.ts   ← new
src/app/api/modules/saas.api.ts            ← new
src/app/api/index.ts                       ← saas.api.ts এক্সপোর্ট যোগ
```

### Manual Test — Step 1
- [ ] `USE_DUMMY_DATA = true` করে dummy account গুলো console-এ log করে চেহারা যাচাই করা (এখনো কোনো UI নেই, শুধু browser console থেকে function কল করে)
- [ ] `USE_DUMMY_DATA = false`-এ ফিরিয়ে, `fetchSaasAccounts()` কল করলে real `/saas-accounts` REST থেকে ডেটা আসে (আগে backend টেস্টে যে account গুলো তৈরি করেছিলাম সেগুলো এখন মুছে ফেলা হয়েছে, তাই খালি array আসার কথা — সেটাও ঠিক আচরণ)
- [ ] TypeScript build এ কোনো type error নেই (`npm run build` বা যেই build script আছে)

**Step 1 শেষে permission চাইব।**

---

## Step 2 — Redux Slice

**কী করব:**

`src/app/store/slices/saasSlice.ts` (নতুন) — `subscriptionsSlice.ts`-এর হুবহু প্যাটার্ন:

```ts
interface SaasFilters {
  search: string;
  status: string;   // 'All' | 'active' | 'suspended' | 'cancelled'
  plan: string;      // 'All' | <plan name>
}

interface SaasState {
  items: SaasAccountRecord[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  stats: SaasStats | null;
  filters: SaasFilters;
  page: number;
  perPage: number;
}
```

Thunks: `loadSaasAccounts`, `loadSaasStats`, `suspendAccount`, `activateAccount`, `rotateApiKey` — প্রতিটা mutation thunk সফল হলে `items` array-এর সেই row-টা API-র রিটার্ন করা আপডেটেড রেকর্ড দিয়ে merge করবে (Subscriptions-এর `updateSubscription` thunk যেভাবে করে)।

`src/app/store/index.ts` (বা যেখানে rootReducer কম্বাইন হয়) — `saas` reducer যোগ।

**Files:**
```
src/app/store/slices/saasSlice.ts   ← new
src/app/store/index.ts (বা rootReducer ফাইল)   ← reducer register
```

### Manual Test — Step 2
- [ ] Redux DevTools (browser extension) দিয়ে দেখা যায় `saas` slice স্টোরে যোগ হয়েছে, initial state ঠিক
- [ ] TypeScript build ক্লিন

**Step 2 শেষে permission চাইব।**

---

## Step 3 — List Page (Table + Filters + KPI Strip)

**কী করব:**

`src/app/components/SaasAccounts/SaasAccountsKpiStrip.tsx` — `StatCard`/`KpiCard` দিয়ে ৪টা কার্ড: Total, Active, Suspended, Provisioned Today (stats slice থেকে)।

`src/app/components/SaasAccounts/SaasAccountsFilterBar.tsx` — search input + `FilterChip` দিয়ে status/plan filter (Subscriptions-এর `SubscriptionsFilterBar.tsx` কাঠামো, কিন্তু ফিল্ড কম — শুধু search/status/plan)।

`src/app/components/SaasAccounts/SaasAccountsTable.tsx` — কলাম: Customer (name+email), Product, Plan, API Key (masked), Status (`StatusBadge`), Provisioned At, ⋮ actions (`ActionDropdown`)। ক্লায়েন্ট-সাইড pagination (Subscriptions-এর প্যাটার্ন — As-Built নোট দেখো)।

`src/app/components/SaasAccounts/SaasAccountsPage.tsx` — orchestrator, `SubscriptionsPage.tsx`-এর কাঠামো কপি করে:
- `useEffect` দিয়ে `loadSaasAccounts()` + `loadSaasStats()` মাউন্টে ডিসপ্যাচ
- filter state Redux থেকে, client-side filter+paginate এখানে
- loading/empty state (কোনো account না থাকলে "No SaaS accounts yet — they'll appear here after a purecart_saas order completes")

**Files:**
```
src/app/components/SaasAccounts/SaasAccountsKpiStrip.tsx    ← new
src/app/components/SaasAccounts/SaasAccountsFilterBar.tsx   ← new
src/app/components/SaasAccounts/SaasAccountsTable.tsx       ← new
src/app/components/SaasAccounts/SaasAccountsPage.tsx        ← ComingSoon প্রতিস্থাপন
```

### Manual Test — Step 3
- [ ] wp-admin → PureCart → SaaS Accounts পেজে গেলে এখন real table দেখা যায় (আগে ComingSoon ছিল)
- [ ] backend QA থেকে একটা টেস্ট order আবার বসিয়ে (dev-plan-saas.md ধাপ ৪) দেখো নতুন account পেজে আসে কিনা (রিফ্রেশ দিয়ে)
- [ ] Search বক্সে plan/customer name লিখলে filter হয়
- [ ] Status chip ক্লিক করলে filter হয়
- [ ] খালি অবস্থায় (কোনো account নেই) সুন্দর empty state দেখায়, ভাঙা টেবিল না
- [ ] KPI strip-এর সংখ্যা backend stats endpoint-এর সাথে মেলে

**Step 3 শেষে permission চাইব।**

---

## Step 4 — Row Actions (Suspend / Activate / Rotate Key)

**কী করব:**

`ActionDropdown` (⋮ মেনু) প্রতি row-এ — status অনুযায়ী কনটেক্সচুয়াল অপশন:
- `active` হলে: "Suspend", "Rotate API Key"
- `suspended` হলে: "Activate", "Rotate API Key"

Rotate/Suspend দুটোতেই `ConfirmDialog` (বিশেষ করে rotate — পুরনো key সাথে সাথে অকেজো হয়ে যায়, এটা destructive)। Confirm করলে thunk ডিসপ্যাচ, সফল/ব্যর্থ হলে `Toast`।

Rotate-এর response-এ শুধু **masked** key আসে (backend ইচ্ছাকৃতভাবে পুরো key আর ফেরত দেয় না — দেখো `dev-plan-saas.md` Step 4) — তাই rotate-এর পরে UI-তে "নতুন key কাস্টমারকে email-এ পাঠানো হয়েছে" জাতীয় মেসেজ দেখানো উচিত, পুরো key admin UI-তে কখনো দেখানো যাবে না (এটা design constraint, বাগ না)।

**Files:**
```
src/app/components/SaasAccounts/useSaasAccountActions.tsx   ← new (Subscriptions-এর useSubscriptionActions.tsx প্যাটার্নে)
src/app/components/SaasAccounts/SaasAccountsTable.tsx       ← ActionDropdown wiring
```

### Manual Test — Step 4
- [ ] Active account-এ Suspend করলে confirm dialog আসে, confirm করলে status বদলে যায়, toast দেখায়
- [ ] Suspended account-এ Activate কাজ করে
- [ ] Rotate API Key করলে confirm dialog (destructive স্টাইল), confirm করলে টেবিলে masked key বদলে যায়
- [ ] Backend-এ (Adminer/webhook.site) গিয়ে নিশ্চিত করো আসল webhook/DB আপডেট হয়েছে — শুধু UI স্টেট বদলায়নি
- [ ] API call fail হলে (যেমন নেটওয়ার্ক বন্ধ করে টেস্ট) error toast দেখায়, UI স্টেট রোলব্যাক হয়

**Step 4 শেষে permission চাইব।**

---

## Step 5 — Account Detail (Side Panel)

**কী করব:** পূর্ণাঙ্গ আলাদা route/page না — Subscriptions-এর মতো ভারী detail page এই ছোট module-এ অতিরিক্ত। row-এ ক্লিক করলে একটা slide-over panel (ডানপাশ থেকে) খুলবে:

- Customer info, product, plan, full status, provisioned date, order নম্বরে লিংক (WooCommerce order edit পেজে)
- একই row actions (suspend/activate/rotate) এখানেও থাকবে, panel-এর ভেতর থেকেই কাজ করবে

`src/app/components/SaasAccounts/SaasAccountDetailPanel.tsx` (নতুন)।

**Files:**
```
src/app/components/SaasAccounts/SaasAccountDetailPanel.tsx   ← new
src/app/components/SaasAccounts/SaasAccountsPage.tsx         ← panel state (selected id) wiring
```

### Manual Test — Step 5
- [ ] Row-এ ক্লিক করলে panel খোলে, সঠিক ডেটা দেখায়
- [ ] Panel থেকে suspend/activate/rotate করলে টেবিলও (পেছনে) সিঙ্কে আপডেট হয়
- [ ] Order নম্বরে ক্লিক করলে সঠিক WooCommerce order edit পেজে যায় (নতুন ট্যাবে)
- [ ] Panel বন্ধ করলে (X বা বাইরে ক্লিক) ঠিকমতো বন্ধ হয়, URL/route নোংরা হয় না

**Step 5 শেষে permission চাইব।**

---

## Step 6 — Settings Tab

**কী করব:** List page-এর উপরে দুটো ট্যাব: **"Accounts"** (Step 3-5-এর টেবিল) আর **"Settings"** (নতুন)।

Settings ট্যাবে (`Subscriptions/shared`-এর `SettingsField`/`SettingsToggleField`/`SettingsSectionHeader` reuse করে):
- Webhook URL (text input)
- Webhook Secret (read-only, copy বাটন — বদলানো যাবে না, দেখো Step 7 backend doc-এর নোট)
- JWT Access Token Expiry (সেকেন্ড, সংখ্যা ইনপুট)
- JWT Refresh Token Expiry (সেকেন্ড)
- Save বাটন → `saveSaasSettings()` thunk

**Files:**
```
src/app/components/SaasAccounts/SaasSettingsTab.tsx   ← new
src/app/components/SaasAccounts/SaasAccountsPage.tsx  ← tab switcher
```

### Manual Test — Step 6
- [ ] Settings ট্যাবে গিয়ে বর্তমান webhook URL দেখা যায় (আগে browser console দিয়ে যেটা সেট করেছিলাম সেটাই থাকার কথা, অথবা খালি যদি backend QA cleanup-এ মুছে থাকে)
- [ ] URL বদলে Save করলে সেভ হয়, রিফ্রেশ দিলেও থাকে
- [ ] Webhook Secret ফিল্ড read-only (এডিট করা যায় না), কপি বাটন কাজ করে
- [ ] JWT expiry ফিল্ড বদলে Save করলে backend-এ (Adminer, `wp_options`) সেভ হয়

**Step 6 শেষে permission চাইব।**

---

## Step 7 — Navigation Polish + Final Test

**কী করব:** কোড নয় — পুরো module-এর UI verification।

- Sidebar-এ "SaaS Accounts" লিংক আইকন/লেবেল ঠিক আছে কিনা (আগে থেকেই আছে, শুধু confirm)
- Loading skeleton/spinner সব জায়গায় consistent (Subscriptions-এর loading স্টাইলের সাথে মিলিয়ে)
- Dark mode-এ (যদি প্লাগইন সাপোর্ট করে) রং ঠিকঠাক
- Mobile/narrow viewport-এ টেবিল horizontally scroll করে, ভেঙে যায় না

### Final Manual Test — Step 7
- [ ] Provision → suspend → activate → rotate — পুরো flow UI দিয়ে করে backend-এর (Adminer/webhook.site) সাথে মিলিয়ে দেখা
- [ ] Settings সেভ করার পর একটা নতুন test order দিয়ে webhook নতুন URL-এ যাচ্ছে কিনা (end-to-end)
- [ ] Console-এ কোনো React warning/error নেই
- [ ] `USE_DUMMY_DATA = true` করে দেখানো যায় ডিজাইন রিভিউর জন্য (demo/screenshot নেওয়ার কাজে লাগবে), তারপর আবার `false`-এ ফেরানো — ভুলে `true` রেখে merge না হয়

---

## Progress Tracker

| Step | কাজ | অবস্থা |
|---|---|---|
| 1 | Types + API module | ⬜ |
| 2 | Redux slice | ⬜ |
| 3 | List page (table+filter+KPI) | ⬜ |
| 4 | Row actions | ⬜ |
| 5 | Account detail panel | ⬜ |
| 6 | Settings tab | ⬜ |
| 7 | Navigation polish + final test | ⬜ |

---

## Appendix — এই plan-এ যা নেই (future)

- Server-side pagination (এখন client-side, account সংখ্যা বড় হলে backend-এর `page`/`per_page`/`search` param-এ সুইচ করা লাগতে পারে — REST endpoint আগে থেকেই সাপোর্ট করে, দেখো `dev-plan-saas.md` Step 7)
- Bulk actions (একসাথে একাধিক account suspend) — Subscriptions-এর `SubscriptionsBulkBar` প্যাটার্নে যোগ করা যায়, কিন্তু এখন scope-এ নেই
- CSV export
- Webhook delivery log UI (backend-এও এখনো নেই — `dev-plan-saas.md` Appendix B)
