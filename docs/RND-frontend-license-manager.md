# RND — Frontend: License Manager
**Plugin:** purecart  
**Depends on:** `RND-licensing.md`, `RND-licensing-jwt.md`  
**Stack:** React 18 · TypeScript · Lucide React icons · Material Design 3 (inline styles via `M3` token object)  
**Scope:** Admin dashboard screens + Customer My Account tab  

---

## Overview

The License Manager frontend has two surfaces:

1. **Admin Dashboard** — Three linked screens: `LicensesPage` (list), `LicenseDetailPage` (single license drill-down), `LicenseSummaryPage` (aggregate analytics). Plus a Settings tab (`SettingsLicensing`) and JWT settings panel.
2. **Customer My Account** — `my-account/purecart-licenses/` — PHP-rendered tab inside WooCommerce's My Account area. Not React; uses Twig/PHP templates with progressive enhancement via vanilla JS.

---

## Admin Dashboard Screens

### Screen 1 — LicensesPage (already built)

**File:** `src/app/components/Licenses/LicensesPage.tsx`  
**Route:** `page === 'licenses'`  
**Nav icon:** `Key` (Lucide)

#### KPI Strip (4 stat cards)

```tsx
// 4 × <KpiCard> in a CSS grid (grid-cols-4 gap-4)
<KpiCard label="Total Licenses"   value="1,284"  trend="▲ +12 this week" trendUp   icon={Key} />
<KpiCard label="Active"           value="1,101"  trend="▲ 85.7%"         trendUp   icon={CheckCircle} />
<KpiCard label="Expiring (30d)"   value="47"     trend="⚠ Needs attention" trendUp={false} icon={Calendar} />
<KpiCard label="Revoked"          value="36"     trend="▼ -2 this month"  trendUp   icon={XCircle} />
```

#### Filter Bar

```tsx
// Search input + 3 × <FilterChip>
<input placeholder="Search licenses, keys, customers…" />
<FilterChip label="Status"     options={['Active','Expired','Suspended','Revoked']} />
<FilterChip label="Product"    options={productNames} />
<FilterChip label="Date Range" options={DATE_RANGE_OPTIONS} />
// "Clear all" pill button — shown when any filter is non-All
```

#### Licenses Table (inside `<Card>`)

| Column | Content | Notes |
|---|---|---|
| ☐ | Checkbox (select row) | Indeterminate state when partial selection |
| License Key | `XXXXXXXX-XXXX…` truncated to 16 chars + `…` | Roboto Mono, `Copy` icon inline |
| Customer | Name (primary link → CustomerDetailPage) + email (secondary) | Name uses `$md-primary` color, click → `onCustomer()` |
| Product | Product name | Plain text |
| Plan | `single` \| `multi` \| `unlimited` \| `lifetime` | Pill badge: `$md-secondaryContainer` bg |
| Sites | `used/max` + mini progress bar (48px wide) | Roboto Mono; bar color = `$md-primary` |
| Status | `<StatusBadge status={row.status} />` | active/expired/suspended/revoked |
| Expires | Date string or "Lifetime" | `$md-onSurfaceVariant` |
| Actions | `<RowActionMenu>` | See action list below |

**Row hover:** `$md-surfaceContainerHigh` background via `onMouseEnter/Leave`  
**Row selected:** `${M3.primary}14` (8% alpha) background  
**Zebra stripe:** alternating `$md-surface` / `$md-surfaceContainerLow`

#### Row Action Menu (`<RowActionMenu>`)

Actions (in order):
1. View License Detail → `onDetail()`
2. View Customer → `onCustomer()`
3. Copy License Key → `navigator.clipboard.writeText(key)` + snackbar
4. Duplicate License → snackbar feedback
5. Extend Expiry → `<ConfirmDialog>` (icon: `Calendar`, non-danger)
6. Reset Activations → `<ConfirmDialog>` (icon: `RotateCcw`, non-danger)
7. Send Reminder → snackbar feedback
8. Suspend → `<ConfirmDialog>` (icon: `PauseCircle`, non-danger)
9. Reinstate → `<ConfirmDialog>` (icon: `CheckCircle`, non-danger)
10. **Revoke** → `<ConfirmDialog>` (icon: `XCircle`, **danger=true**)

#### Bulk Action Bar

Shown when ≥ 1 row selected:
```tsx
<FilledButton danger small onClick={openBulkRevokeDialog}>
  <Trash2 size={14} /> Revoke {selected.length} Selected
</FilledButton>
```

#### Header Row (above filter bar)

```tsx
<TonalButton small onClick={onSummary}><BarChart2 size={14}/> Summary</TonalButton>
<OutlinedButton small><DownloadIcon size={14}/> Export CSV</OutlinedButton>
```

#### Pagination Footer (inside Card)

```
Showing {N} of {total} licenses    [Previous] [1] [2] [3] [Next]
```
Active page button: `$md-primary` bg, `$md-onPrimary` text.  
Inactive: transparent bg, `$md-outline` border, `$md-onSurfaceVariant` text.

---

### Screen 2 — LicenseDetailPage (already built)

**File:** `src/app/components/Licenses/LicenseDetailPage.tsx`  
**Route:** `page === 'license-detail'`  
**Breadcrumb:** Licenses → License Detail

Two-column layout (3fr / 2fr):

**Left panel — License Info card**
- License key in full monospace with copy button
- Status badge
- Plan type chip
- Product name + order link
- Sites used / limit with large progress bar
- Expiry date
- Created date

**Right panel — Activation Records card**
Table columns: Domain, Environment badge, IP Address, Activated At, Last Check  
Environment badges: `production` → `$md-statusSuccessContainer`, `staging` → `$md-statusWarningContainer`, `local` → `$md-surfaceContainerHigh`

**Actions panel (below):**
- `<FilledButton>` Extend Expiry
- `<TonalButton>` Reset Activations
- `<OutlinedButton>` Send Reminder
- `<FilledButton danger>` Revoke License

**JWT Token section (when JWT module active):**
- Current access token status (active / expired)
- Token expires in: countdown string ("Expires in 4 days 12h")
- "Revoke All Tokens" button → `POST /purecart/v1/license/token/revoke-all` → ConfirmDialog danger

---

### Screen 3 — LicenseSummaryPage (already built)

**File:** `src/app/components/Licenses/LicenseSummaryPage.tsx`  
**Route:** `page === 'license-summary'`  
**Breadcrumb:** Licenses → Summary

**Stats strip (4-up):** Total, Active, Expired this month, Revenue from licenses

**Charts (2-column grid, `<Card--elevated>`):**
- `<AreaChart>` — New licenses issued over time (last 30 days), `CHART_COLORS.primary`
- `<BarChart>` — Activations by plan type (single/multi/unlimited/lifetime), `CHART_COLORS.secondary`

**Bottom panels:**
- Top products by license count — `<BarChart horizontal>`
- License status distribution — `<PieChart>` using status colors from `StatusBadge` palette

---

### Screen 4 — SettingsLicensing (already built)

**File:** `src/app/components/Settings/SettingsLicensing.tsx`  
**Route:** `page === 'settings'` → Licensing tab

Sections:

**General**
- Delivery status: Select (`completed` / `processing` / `both`) — `<SettingsSelectField>`
- Default license duration (days): Number input — `<SettingsField>`
- Default activation limit: Number input

**JWT Tokens** *(new section — not yet built)*
- Enable JWT token layer: `<SettingsToggleField>`
- JWT secret key: masked text field + "Regenerate" button
- Access token TTL (days): number input (default: 7)
- Refresh token TTL (days): number input (default: 30)
- Algorithm: Select (HS256 / RS256)
- RS256 private key upload: file input (Phase 2)
- "View Public Key" button → opens dialog with PEM display + copy button (Phase 2)

**Staging Exemption**
- Exempt patterns: tag-input chip editor (add/remove patterns like `.local`, `.test`)
- Uses `<SettingsField>` with custom tag renderer

**Renewal Behavior**
- Default: Select (`extend` / `new_key`) — `<SettingsSelectField>`

---

## New Admin Components to Build

### `LicenseKeyReveal`

Displayed in LicenseDetailPage and My Account. Shows the full key blurred by default; click to reveal.

```tsx
// src/app/components/Licenses/LicenseKeyReveal.tsx
interface LicenseKeyRevealProps {
  licenseKey: string;
}

// State: revealed (bool)
// Blurred: CSS filter: blur(6px) on the <code> element
// Revealed: no blur
// Copy button appears on reveal; success state shows <Check> for 1.5s
```

**Behavior:**
- Default: key blurred (`filter: blur(6px)`), "Click to reveal" button
- Click reveal: remove blur, show full key in Roboto Mono, show Copy button
- Copy → `navigator.clipboard.writeText(licenseKey)` → snackbar "Copied to clipboard"
- Re-blur: "Hide" button returns to blurred state
- ARIA: `aria-label="License key, hidden. Click to reveal."` on the blurred container

### `ActivationMiniMap`

Shown in LicenseSummaryPage and potentially LicenseDetailPage. A small world map with dots for each activated domain's country.

```tsx
// src/app/components/Licenses/ActivationMiniMap.tsx
// Phase 2 — uses D3 geo or a simple SVG world outline
// Placeholder in Phase 1: bar chart of top 5 countries
```

### `JwtTokenStatusChip`

Shown in LicenseDetailPage JWT section and in the admin download log.

```tsx
// Displays: valid/expired/revoked pill
// valid:   $md-statusSuccessContainer bg, $md-statusSuccess text, <ShieldCheck> icon
// expired: $md-errorContainer bg, $md-error text, <ShieldOff> icon
// revoked: $md-surfaceContainerHigh bg, $md-onSurfaceVariant text, <ShieldX> icon
```

---

## Customer My Account — Licenses Tab

**URL:** `/my-account/purecart-licenses/`  
**Rendering:** PHP + Twig template  
**File:** `templates/myaccount/purecart-licenses.php`  
**Template override path:** `your-theme/purecart/myaccount/purecart-licenses.php`

### License List (default view)

Each license is a `<div class="purecart-license-card">` (card--outlined style):

```
┌─────────────────────────────────────────────────────────────┐
│  [Product icon]  Plugin Pro — Multi Site License             │
│                  ████-████-████-████-████   [Click to reveal]│
│  Status: ● Active    Plan: Multi    Expires: Jan 24, 2027    │
│  Sites: ██░░░ 2 of 5 used                                    │
│  [Activate a Domain]  [Deactivate]  [Download Certificate]   │
└─────────────────────────────────────────────────────────────┘
```

**License key reveal (JS):**
```javascript
// assets/js/purecart-myaccount-licenses.js
document.querySelectorAll('.purecart-reveal-key').forEach(btn => {
    btn.addEventListener('click', () => {
        const card = btn.closest('.purecart-license-card');
        const keyEl = card.querySelector('.purecart-license-key');
        keyEl.classList.toggle('purecart-license-key--hidden');
        btn.textContent = keyEl.classList.contains('purecart-license-key--hidden')
            ? 'Click to reveal' : 'Hide';
        card.querySelector('.purecart-copy-key').style.display =
            keyEl.classList.contains('purecart-license-key--hidden') ? 'none' : 'inline-flex';
    });
});
```

**Copy to clipboard:**
```javascript
document.querySelectorAll('.purecart-copy-key').forEach(btn => {
    btn.addEventListener('click', () => {
        const key = btn.dataset.key;
        navigator.clipboard.writeText(key).catch(() => {
            const ta = document.createElement('textarea');
            ta.value = key; document.body.appendChild(ta);
            ta.select(); document.execCommand('copy');
            document.body.removeChild(ta);
        });
        btn.textContent = '✓ Copied';
        setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
    });
});
```

### Manual Domain Activation Form (inline in card)

```html
<form class="purecart-activate-form" action="" method="POST">
  <input type="url" name="purecart_domain"
         placeholder="https://your-site.com" required />
  <button type="submit" class="btn btn--tonal btn--small">Activate</button>
  <?php wp_nonce_field('purecart_activate', 'purecart_nonce'); ?>
</form>
```

On submit: PHP handler calls `LicenseActivator::activate()` → redirects back with `?purecart_message=activated` query param → success notice rendered above the card.

### Active Domains List (inside card, collapsed by default)

```
▶ Sites (2 of 5 active)   [expand]
  example.com     Production  Activated Jan 5, 2026  [Deactivate]
  dev.example.com Staging     Activated Jan 3, 2026  (exempt)
```

"Deactivate" triggers a POST form → `LicenseActivator::deactivate()`.  
Staging rows show "(exempt)" badge and no deactivate button.

### JWT Token Status (visible when JWT module active)

```
🔐 Your license token is valid — refreshes automatically.
   Next refresh: 3 days from now
```

If token is expired:
```
⚠ Your license token has expired. Click below to reactivate your license.
  [Reactivate]
```

### License Certificate Download (Phase 3)

```html
<a href="?purecart_action=certificate&license_id=42&nonce=..."
   class="btn btn--outlined btn--small">
  📄 Download Certificate (PDF)
</a>
```

---

## CSS / BEM — My Account Components

```scss
// assets/css/purecart-myaccount.scss

.purecart-license-card {
  border: 1px solid $md-outline-variant;
  border-radius: $shape-medium;
  padding: $space-4;
  margin-bottom: $space-4;
  background: $md-surface;

  &__header    { display: flex; align-items: center; gap: $space-3; margin-bottom: $space-3; }
  &__icon      { width: 40px; height: 40px; border-radius: $shape-small; }
  &__title     { @extend %type-title-medium; color: $md-on-surface; }
  &__meta      { display: flex; gap: $space-4; flex-wrap: wrap; margin-bottom: $space-3; }
  &__meta-item { @extend %type-body-medium; color: $md-on-surface-variant; }

  &__key-wrap  { display: flex; align-items: center; gap: $space-2; margin-bottom: $space-3; }
  &__key       { font-family: $font-family-mono; @extend %type-body-medium;
                 letter-spacing: 2px; color: $md-on-surface; }
  &__key--hidden { filter: blur(6px); user-select: none; }

  &__sites     { margin-bottom: $space-3; }
  &__sites-bar { height: 4px; background: $md-outline-variant; border-radius: $shape-full;
                 overflow: hidden; width: 120px; margin-top: $space-1; }
  &__sites-fill { height: 100%; background: $md-primary; border-radius: $shape-full; }

  &__actions   { display: flex; gap: $space-2; flex-wrap: wrap; }
}

.purecart-activate-form {
  display: flex; gap: $space-2; align-items: center;
  margin-top: $space-3;
  padding-top: $space-3;
  border-top: 1px solid $md-outline-variant;

  input[type="url"] {
    flex: 1; @extend %type-body-large;
    padding: $space-2 $space-3;
    border: 1px solid $md-outline;
    border-radius: $shape-small;
    color: $md-on-surface; background: $md-surface;
    &:focus { outline: none; border-color: $md-primary; }
  }
}

.purecart-domain-list {
  margin-top: $space-3; overflow: hidden;
  &--collapsed { max-height: 0; }
  &--expanded  { max-height: 999px; }
  transition: max-height $motion-duration-medium-2 $motion-easing-emphasized;

  &__row { display: flex; align-items: center; gap: $space-3;
           padding: $space-2 0; border-top: 1px solid $md-outline-variant; }
  &__domain { @extend %type-body-medium; color: $md-on-surface; font-family: $font-family-mono; }
  &__env    { /* status-badge size=small */ }
  &__meta   { @extend %type-body-small; color: $md-on-surface-variant; flex: 1; }
}
```

---

## TypeScript Interfaces

```typescript
// src/app/types/license.ts

export interface License {
  id: number;
  orderID: number;
  userID: number;
  productID: number;
  productName: string;
  licenseKey: string;
  planType: 'single' | 'multi' | 'unlimited' | 'lifetime';
  status: 'active' | 'expired' | 'revoked' | 'suspended';
  activationLimit: number;
  activatedCount: number;
  expiresAt: string | null;   // ISO 8601 or null = lifetime
  createdAt: string;
  updatedAt: string;
}

export interface LicenseActivation {
  id: number;
  licenseID: number;
  domain: string;
  ipAddress: string;
  environment: 'production' | 'staging' | 'local';
  activatedAt: string;
  lastCheck: string | null;
}

export interface JwtTokenStatus {
  accessTokenActive: boolean;
  accessTokenExpiresAt: string | null;
  refreshTokenExpiresAt: string | null;
}
```

---

## API Integration

All REST calls use `window.purecartAdmin.apiBase` + `window.purecartAdmin.nonce`.

```typescript
// src/app/utils/api/licenses.ts

const BASE = window.purecartAdmin.apiBase;     // e.g. /wp-json/purecart/v1
const NONCE = window.purecartAdmin.nonce;

export async function fetchLicenses(params: LicenseQueryParams): Promise<PaginatedResponse<License>> {
  const qs = new URLSearchParams(params as Record<string, string>);
  const res = await fetch(`${BASE}/license?${qs}`, {
    headers: { 'X-WP-Nonce': NONCE },
  });
  return res.json();
}

export async function revokeLicense(licenseKey: string): Promise<{ success: boolean }> {
  return fetch(`${BASE}/license/revoke`, {
    method: 'POST',
    headers: { 'X-WP-Nonce': NONCE, 'Content-Type': 'application/json' },
    body: JSON.stringify({ license_key: licenseKey }),
  }).then(r => r.json());
}

export async function revokeAllTokens(licenseId: number): Promise<{ success: boolean }> {
  return fetch(`${BASE}/license/token/revoke-all`, {
    method: 'POST',
    headers: { 'X-WP-Nonce': NONCE, 'Content-Type': 'application/json' },
    body: JSON.stringify({ license_id: licenseId }),
  }).then(r => r.json());
}

export async function extendExpiry(licenseKey: string, days: number): Promise<{ success: boolean }> {
  return fetch(`${BASE}/license/extend`, {
    method: 'POST',
    headers: { 'X-WP-Nonce': NONCE, 'Content-Type': 'application/json' },
    body: JSON.stringify({ license_key: licenseKey, days }),
  }).then(r => r.json());
}

export async function resetActivations(licenseKey: string): Promise<{ success: boolean }> {
  return fetch(`${BASE}/license/reset-activations`, {
    method: 'POST',
    headers: { 'X-WP-Nonce': NONCE, 'Content-Type': 'application/json' },
    body: JSON.stringify({ license_key: licenseKey }),
  }).then(r => r.json());
}
```

---

## State Management

No global state library. Each page component owns its own state via `useState`. Parent `<App>` passes navigation callbacks (`onDetail`, `onSummary`, `onCustomer`) as props.

```typescript
// LicensesPage local state
const [licenses, setLicenses]           = useState<License[]>([]);
const [loading, setLoading]             = useState(true);
const [selected, setSelected]           = useState<number[]>([]);
const [search, setSearch]               = useState('');
const [filterStatus, setFilterStatus]   = useState('All');
const [filterProduct, setFilterProduct] = useState('All');
const [filterDate, setFilterDate]       = useState('All');
const [currentPage, setCurrentPage]     = useState(1);
const [openMenuId, setOpenMenuId]       = useState<number | null>(null);
const [copied, setCopied]               = useState<string | null>(null);
const [toast, setToast]                 = useState<ToastProps>({...});
const [dialog, setDialog]               = useState<DialogState>({...});
```

**Optimistic updates** — all mutations update local state immediately after the API call succeeds. No page reload.

**Skeleton loading** — while `loading === true`, render:
```tsx
<div className="grid grid-cols-4 gap-4">
  {[...Array(4)].map((_, i) => <div key={i} className="skeleton skeleton--stat" />)}
</div>
<div>{[...Array(10)].map((_, i) => <div key={i} className="skeleton skeleton--row" />)}</div>
```

---

## Navigation / Routing

```typescript
// App.tsx — SPA routing (page state machine)
type Page =
  | 'licenses'
  | 'license-detail'
  | 'license-summary'
  | 'customer-detail'
  // ...

// LicensesPage receives:
onDetail   = () => setPage('license-detail')
onSummary  = () => setPage('license-summary')
onCustomer = () => setPage('customer-detail')
```

Breadcrumb in `<TopBar>`:
- `licenses` → "PureCart → Licenses"
- `license-detail` → "PureCart → Licenses → License Detail"
- `license-summary` → "PureCart → Licenses → Summary"

---

## Design System Notes — License Module Specific

**License key always Roboto Mono.** Every rendering of a license key string — in tables, detail pages, dialogs, My Account — uses `fontFamily: 'Roboto Mono, monospace'`. Never Roboto.

**Blur-reveal pattern.** License key in My Account and LicenseDetailPage is blurred by default (CSS `filter: blur(6px)`). The blur is a CSS class toggle, not an opacity toggle. The key is present in the DOM at all times (no JavaScript re-fetching).

**Activation progress bar.** Mini 48px progress bar in the table uses `$md-primary` fill on `$md-outlineVariant` track. At 100% (all slots used): fill becomes `$md-error`.

**Status badge reuse.** `<StatusBadge>` in LicensesPage uses the same modifiers as throughout the dashboard: `--active`, `--expired`, `--revoked`, `--suspended`. No custom license-specific badge styles.

**Confirm before revoke.** Revocation dialog always: danger=true icon, `XCircle` icon, monospace key display inside body, "Revoke License" as confirmLabel. This pattern is frozen — never remove the confirmation for revoke.

**JWT section gated.** The JWT section in LicenseDetailPage and SettingsLicensing is hidden when `window.purecartAdmin.modules.jwt === false`. The PHP layer controls this via `wp_localize_script`.
