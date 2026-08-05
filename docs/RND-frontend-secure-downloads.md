# RND — Frontend: Secure Downloads
**Plugin:** purecart  
**Depends on:** `RND-secure-downloads.md`  
**Stack:** React 18 · TypeScript · Lucide React icons · Material Design 3 (inline styles via `M3` token object)  
**Scope:** Admin dashboard screens + Customer My Account tab  

---

## Overview

The Secure Downloads frontend has two surfaces:

1. **Admin Dashboard** — `DownloadsPage` (download log + token management) + `SettingsDownloads` (already built). Future: `DownloadAnalyticsPage`.
2. **Customer My Account** — `my-account/purecart-downloads/` — PHP-rendered tab with per-order download cards, token status, and re-download links.

---

## Admin Dashboard Screens

### Screen 1 — DownloadsPage (partially built)

**File:** `src/app/components/Downloads/DownloadsPage.tsx`  
**Route:** `page === 'downloads'`  
**Nav icon:** `Download` (Lucide)

#### KPI Strip (4 stat cards)

```tsx
<KpiCard label="Total Downloads"   value="8,429"  trend="▲ +318 today"     trendUp  icon={Download} />
<KpiCard label="Unique Files"      value="142"    trend="Across all orders"          icon={FileBox} />
<KpiCard label="Failed Attempts"   value="23"     trend="▼ -5 vs yesterday" trendUp  icon={AlertTriangle} />
<KpiCard label="Tokens Expiring"   value="37"     trend="In next 24h"       trendUp={false} icon={Clock} />
```

#### Filter Bar

```tsx
<input placeholder="Search order, customer, file, product…" />
<FilterChip label="Status"  options={['All','Success','Rejected — Expired','Rejected — Exhausted','Rejected — License','Rejected — Geo']} />
<FilterChip label="Product" options={productNames} />
<FilterChip label="Date"    options={DATE_RANGE_OPTIONS} />
<FilterChip label="Country" options={countryOptions} />   {/* Phase 3, Geo */}
```

#### Downloads Log Table (inside `<Card>`)

| Column | Content |
|---|---|
| ☐ | Checkbox |
| Time | `2026-07-31 14:22` — `$md-onSurfaceVariant`, `type-body-small` |
| Customer | Name (link) + email |
| Product + File | Product name (primary) + file label (secondary) |
| File Type | `<FileTypeChip type="zip" />` — See component spec below |
| IP | IP address, monospace |
| Status | `<DownloadStatusBadge status={row.status} />` |
| Actions | `<ActionDropdown>` |

**Row color coding:**
- `success` — no highlight
- Any `rejected_*` — left border `3px solid $md-error`, row bg `${M3.error}08`

#### Row Actions (`<ActionDropdown>`)

For `success` rows:
1. View Order → opens Order Detail in new tab
2. View Customer
3. Regenerate Token → `<ConfirmDialog>` non-danger
4. Revoke Token → `<ConfirmDialog>` danger

For `rejected_*` rows:
1. View Order
2. View Customer
3. Regenerate Token

#### Bulk Actions

```tsx
<OutlinedButton small onClick={exportCSV}><FileDown size={14}/> Export Log CSV</OutlinedButton>
// When rows selected:
<FilledButton small danger onClick={bulkRevoke}><Trash2 size={14}/> Revoke {n} Tokens</FilledButton>
```

---

### Screen 2 — DownloadAnalyticsPage (new, Phase 2)

**File:** `src/app/components/Downloads/DownloadAnalyticsPage.tsx`  
**Route:** `page === 'download-analytics'`  
**Breadcrumb:** Downloads → Analytics

Two-column grid of `<Card--elevated>` charts:

```
┌─────────────────────────┬─────────────────────────┐
│ Downloads over time     │ Top files by downloads   │
│ <AreaChart>             │ <BarChart horizontal>    │
├─────────────────────────┼─────────────────────────┤
│ Rejection reasons       │ Downloads by file type   │
│ <PieChart>              │ <BarChart>               │
└─────────────────────────┴─────────────────────────┘
```

**Downloads over time** — `<AreaChart>` Recharts, last 30 days, two series: `success` (`CHART_COLORS.primary`) and `rejected` (`CHART_COLORS.error`).

**Rejection reasons** — `<PieChart>` with legend. Segment colors:
- `rejected_expired` → `$md-statusWarning`
- `rejected_exhausted` → `$md-statusWarning`
- `rejected_license` → `$md-error`
- `rejected_geo` → `$md-statusInfo` (Phase 3)

**Top files** — horizontal bar chart; each bar labeled with file label + product name.

**Downloads by file type** — stacked bar or grouped bar; file type labels: `ZIP`, `PDF`, `EXE`, `DMG`, `Font`, `3D`, `Video`, etc.

---

### Screen 3 — SettingsDownloads (already built)

**File:** `src/app/components/Settings/SettingsDownloads.tsx`  
**Route:** `page === 'settings'` → Downloads tab

Existing sections expanded to cover all product types:

**Token Settings**
- Default download limit (per order): number input (default: 0 = unlimited)
- Default expiry (days after purchase): number input (default: 0 = no expiry)
- Email link expiry (hours): number input (default: 48)

**Delivery Method**
- Select: `php_stream` / `x_sendfile` / `x_accel_redirect` / `s3_presigned` / `r2_presigned`
- "Test Delivery" button — triggers a self-test download and shows ✓ or ✗ feedback

**Storage Backend** *(Phase 2 — gated)*
- Radio group: Local / Amazon S3 / Cloudflare R2
- S3/R2 fields (conditional on selection):
  - Bucket name
  - Region
  - Access Key (masked)
  - Secret Key (masked + show/hide toggle)
  - "Test Connection" button

**Video Protection** *(Phase 2 — gated)*
- Enable video protection: `<SettingsToggleField>`
- Stream token TTL (minutes): number input (default: 10)
- Enable HTTP Range support: `<SettingsToggleField>`

**License Gate**
- Require active license for download: `<SettingsToggleField>` (global default; per-product overrides it)

**Protected Upload Path**
- Shows: `wp-content/uploads/purecart-protected/`
- Copy path button
- Read-only `.htaccess` snippet in a `<code>` block

---

## New Admin Components to Build

### `DownloadStatusBadge`

```tsx
// src/app/components/Downloads/DownloadStatusBadge.tsx
type DownloadStatus =
  | 'success'
  | 'rejected_expired'
  | 'rejected_exhausted'
  | 'rejected_license'
  | 'rejected_geo';

const STATUS_CONFIG: Record<DownloadStatus, { label: string; color: string; bg: string; icon: LucideIcon }> = {
  success:             { label: 'Success',          color: M3.statusSuccess,   bg: M3.statusSuccessContainer, icon: CheckCircle2 },
  rejected_expired:    { label: 'Expired',          color: M3.statusWarning,   bg: M3.statusWarningContainer, icon: Clock },
  rejected_exhausted:  { label: 'Limit Reached',    color: M3.statusWarning,   bg: M3.statusWarningContainer, icon: Ban },
  rejected_license:    { label: 'No Valid License', color: M3.error,           bg: M3.errorContainer,         icon: ShieldOff },
  rejected_geo:        { label: 'Geo Blocked',      color: M3.statusInfo,      bg: M3.statusInfoContainer,    icon: Globe },
};
```

Renders as a pill: `[Icon] Label` with 4px border-radius, 6px/10px padding.

### `FileTypeChip`

```tsx
// src/app/components/Downloads/FileTypeChip.tsx
// Input: mime_type or file extension string
// Maps to a short label + icon color

const FILE_TYPE_MAP: Record<string, { label: string; color: string }> = {
  'zip':  { label: 'ZIP',   color: '#FF9800' },
  'pdf':  { label: 'PDF',   color: '#F44336' },
  'exe':  { label: 'EXE',   color: '#9E9E9E' },
  'dmg':  { label: 'DMG',   color: '#607D8B' },
  'pkg':  { label: 'PKG',   color: '#607D8B' },
  'deb':  { label: 'DEB',   color: '#E91E63' },
  'rpm':  { label: 'RPM',   color: '#9C27B0' },
  'tar':  { label: 'TAR',   color: '#FF9800' },
  'mp4':  { label: 'Video', color: '#3F51B5' },
  'mp3':  { label: 'Audio', color: '#009688' },
  'ttf':  { label: 'Font',  color: '#795548' },
  'otf':  { label: 'Font',  color: '#795548' },
  'fbx':  { label: '3D',    color: '#4CAF50' },
  'epub': { label: 'eBook', color: '#FF5722' },
  'xlsx': { label: 'Sheet', color: '#4CAF50' },
};
```

Renders as a monospace pill with a colored dot: `● ZIP`.

### `TokenStatusCard`

```tsx
// src/app/components/Downloads/TokenStatusCard.tsx
// Shows in DownloadsPage row expansion or in a drawer
interface TokenStatusCardProps {
  token: string;               // last 8 chars only
  status: 'active' | 'expired' | 'revoked';
  expiresAt: string | null;
  usedCount: number;
  maxCount: number | null;     // null = unlimited
  orderId: number;
  onRegenerate: () => void;
  onRevoke: () => void;
}
```

Layout (inside a `<Card--outlined>` at 360px max-width):
```
Token: ████████ (last 8 chars, monospace)
Status: ● Active
Expires: Aug 15, 2026 at 23:59
Downloads: 2 / 5 used  [░░░░░░░░░░] bar
Order: #1042  Customer: Aminul Islam
[Regenerate Token]  [Revoke]
```

### `TokenRegenerateDialog`

```tsx
// ConfirmDialog with extra content field
// Title: "Regenerate Download Token?"
// Body: "This invalidates the current token. The customer will receive..."
// Non-danger, confirmLabel: "Regenerate"
// After confirm: optimistic update — replace token in table row
```

### `DownloadDeliveryTestButton`

Used in SettingsDownloads. Calls `GET /purecart/v1/downloads/delivery-test` and shows a badge:

```tsx
const [testResult, setTestResult] = useState<null | 'ok' | 'fail'>(null);

// Button → spinner → result badge
// ok:   <CheckCircle size={16} color={M3.statusSuccess}/> "Delivery OK"
// fail: <XCircle size={16} color={M3.error}/> "Delivery failed — check server config"
```

---

## Customer My Account — Downloads Tab

**URL:** `/my-account/purecart-downloads/`  
**Rendering:** PHP + template  
**File:** `templates/myaccount/purecart-downloads.php`  
**Template override:** `your-theme/purecart/myaccount/purecart-downloads.php`

### Grouped by Order

```
─────────────────────────────────────────────────────
Order #1042 — Jul 28, 2026  Status: ✅ Completed
─────────────────────────────────────────────────────
  ┌──────────────────────────────────────────────────┐
  │ 📦 Plugin Pro — ZIP file                         │
  │    Downloads: 2 of 5 used   Expires: Aug 15, 2026│
  │    [⬇ Download]                                  │
  └──────────────────────────────────────────────────┘
  ┌──────────────────────────────────────────────────┐
  │ 📄 Documentation PDF                             │
  │    Downloads: Unlimited     Expires: Never       │
  │    [⬇ Download]                                  │
  └──────────────────────────────────────────────────┘
─────────────────────────────────────────────────────
Order #998 — Jun 14, 2026   Status: ✅ Completed
─────────────────────────────────────────────────────
  ...
```

**"Download" button** resolves to the secure URL:
```php
$url = home_url('/purecart-download/' . $token);
// Output: <a href="<?php echo esc_url($url); ?>" class="btn btn--filled btn--small">
//           <span class="icon icon--download"></span> Download
//         </a>
```

**Expired token** — when `expires_at < now()` or `download_count >= max_downloads`:
```
[⬇ Download]  →  disabled + tooltip: "Token expired. Contact support."
```

**License gate failure** — when licensing module active and license is not active:
```
⚠ A valid license is required to download this file.
  [Activate License]  (links to /my-account/purecart-licenses/)
```

**Refunded order** — when order status is `refunded` or `cancelled`:
```
🚫 This order has been refunded. Downloads are no longer available.
```

---

### Video Files — Inline Player (Phase 2)

When `_purecart_video_protect` is active and file MIME type is `video/*`:

```html
<video controls
       src="<?php echo esc_url( purecart_stream_url($file_id, $stream_token) ); ?>"
       style="width:100%; border-radius:8px; max-width:720px;">
  Your browser does not support video playback.
</video>
```

Stream token is a 10-min single-use token separate from the download token.  
HTTP Range header support allows scrubbing without re-requesting from the beginning.  
"Download" button is hidden for video-protected files unless `_purecart_allow_video_download` is set.

---

## CSS / BEM — My Account Components

```scss
// assets/css/purecart-myaccount-downloads.scss

.purecart-order-group {
  margin-bottom: $space-8;

  &__header {
    display: flex; align-items: center; gap: $space-3;
    padding-bottom: $space-3;
    border-bottom: 1px solid $md-outline-variant;
    margin-bottom: $space-4;
  }
  &__order-id  { @extend %type-title-medium; color: $md-on-surface; }
  &__date      { @extend %type-body-medium;  color: $md-on-surface-variant; }
  &__status    { /* WC status badge */ }
}

.purecart-download-card {
  border: 1px solid $md-outline-variant;
  border-radius: $shape-medium;
  padding: $space-4;
  margin-bottom: $space-3;
  background: $md-surface;
  display: flex; align-items: center; gap: $space-4;

  &__icon   { width: 40px; height: 40px; flex-shrink: 0;
              border-radius: $shape-small; background: $md-secondary-container;
              display: flex; align-items: center; justify-content: center; }
  &__body   { flex: 1; min-width: 0; }
  &__name   { @extend %type-title-small; color: $md-on-surface;
              white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  &__meta   { @extend %type-body-small; color: $md-on-surface-variant;
              display: flex; gap: $space-4; flex-wrap: wrap; margin-top: $space-1; }
  &__actions { flex-shrink: 0; }

  &--expired  { opacity: 0.6; }
  &--revoked  { border-left: 3px solid $md-error; }
}

.purecart-download-progress {
  display: flex; align-items: center; gap: $space-2;
  &__bar {
    width: 80px; height: 4px; background: $md-outline-variant;
    border-radius: $shape-full; overflow: hidden;
  }
  &__fill {
    height: 100%; background: $md-primary; border-radius: $shape-full;
    &--full { background: $md-error; }   // 100% exhausted
  }
  &__label { @extend %type-label-small; color: $md-on-surface-variant; }
}

.purecart-download-notice {
  display: flex; align-items: flex-start; gap: $space-3;
  padding: $space-3 $space-4; border-radius: $shape-small;
  margin-bottom: $space-3;
  @extend %type-body-medium;

  &--warning { background: $md-status-warning-container; color: $md-status-warning; }
  &--error   { background: $md-error-container; color: $md-error; }

  svg { flex-shrink: 0; margin-top: 2px; }
}
```

---

## TypeScript Interfaces

```typescript
// src/app/types/downloads.ts

export type DownloadStatus =
  | 'success'
  | 'rejected_expired'
  | 'rejected_exhausted'
  | 'rejected_license'
  | 'rejected_geo';

export interface DownloadLogEntry {
  id: number;
  orderId: number;
  orderItemId: number;
  fileId: number;
  fileLabel: string;
  fileExtension: string;
  licenseId: number | null;
  token: string;           // last 8 chars only in API response
  status: DownloadStatus;
  ipAddress: string;
  country: string | null;  // Phase 3
  downloadedAt: string;    // ISO 8601
  customerName: string;
  customerEmail: string;
  productName: string;
}

export interface DownloadToken {
  id: number;
  orderId: number;
  orderItemId: number;
  fileId: number;
  fileLabel: string;
  token: string;           // last 8 chars
  downloadCount: number;
  maxDownloads: number | null;
  expiresAt: string | null;
  status: 'active' | 'expired' | 'revoked';
}

export interface DownloadStats {
  totalDownloads: number;
  uniqueFiles: number;
  failedAttempts: number;
  tokensExpiringIn24h: number;
}
```

---

## API Integration

```typescript
// src/app/utils/api/downloads.ts

export async function fetchDownloadLogs(params: DownloadLogQueryParams): Promise<PaginatedResponse<DownloadLogEntry>> {
  const qs = new URLSearchParams(params as Record<string, string>);
  const res = await fetch(`${BASE}/downloads/log?${qs}`, {
    headers: { 'X-WP-Nonce': NONCE },
  });
  return res.json();
}

export async function revokeToken(tokenId: number): Promise<{ success: boolean }> {
  return fetch(`${BASE}/downloads/token/${tokenId}/revoke`, {
    method: 'POST',
    headers: { 'X-WP-Nonce': NONCE, 'Content-Type': 'application/json' },
  }).then(r => r.json());
}

export async function regenerateToken(tokenId: number): Promise<{ success: boolean; token: Partial<DownloadToken> }> {
  return fetch(`${BASE}/downloads/token/${tokenId}/regenerate`, {
    method: 'POST',
    headers: { 'X-WP-Nonce': NONCE, 'Content-Type': 'application/json' },
  }).then(r => r.json());
}

export async function fetchDownloadStats(): Promise<DownloadStats> {
  return fetch(`${BASE}/downloads/stats`, {
    headers: { 'X-WP-Nonce': NONCE },
  }).then(r => r.json());
}

export async function exportDownloadLog(params: DownloadLogQueryParams): Promise<Blob> {
  const qs = new URLSearchParams({ ...params, format: 'csv' } as Record<string, string>);
  return fetch(`${BASE}/downloads/log/export?${qs}`, {
    headers: { 'X-WP-Nonce': NONCE },
  }).then(r => r.blob());
}
```

---

## State Management

```typescript
// DownloadsPage local state
const [logs, setLogs]               = useState<DownloadLogEntry[]>([]);
const [tokens, setTokens]           = useState<DownloadToken[]>([]);
const [stats, setStats]             = useState<DownloadStats | null>(null);
const [loading, setLoading]         = useState(true);
const [selected, setSelected]       = useState<number[]>([]);
const [search, setSearch]           = useState('');
const [filterStatus, setFilterStatus] = useState('All');
const [filterProduct, setFilterProduct] = useState('All');
const [filterDate, setFilterDate]   = useState('All');
const [currentPage, setCurrentPage] = useState(1);
const [dialog, setDialog]           = useState<DialogState>({...});
const [toast, setToast]             = useState<ToastProps>({...});
```

**Optimistic revoke:** immediately mark the token as `revoked` in local state, then confirm with API. On API failure: revert and show error toast.

**Optimistic regenerate:** replace the `token` (last 8 chars) and reset `downloadCount` to 0 in local state after API confirms.

---

## Per-Product Settings in Product Edit Page

**File:** `src/app/components/ProductSettings/DownloadSettings.tsx`  
**Renders inside WooCommerce product data meta box** (PHP-rendered; not in React SPA)  
**File:** `templates/admin/product-settings-downloads.php`

Fields (PHP-rendered with standard WC metabox wrappers):

```php
// Download Limit (override global)
woocommerce_wp_text_input(['id' => '_purecart_download_limit', 'label' => 'Download limit', 'type' => 'number', 'desc_tip' => true, 'description' => '0 = unlimited. Leave blank to use global default.']);

// Expiry Days (override global)
woocommerce_wp_text_input(['id' => '_purecart_download_expiry_days', 'label' => 'Download expiry (days)', 'type' => 'number', 'desc_tip' => true, 'description' => '0 = no expiry.']);

// Email Link Expiry
woocommerce_wp_text_input(['id' => '_purecart_email_link_expiry_days', 'label' => 'Email link expiry (hours)', 'type' => 'number', 'desc_tip' => true]);

// Require active license for download
woocommerce_wp_checkbox(['id' => '_purecart_download_license_gate', 'label' => 'Require active license for download']);

// Delivery method (per-product override)
woocommerce_wp_select(['id' => '_purecart_download_delivery', 'label' => 'Delivery method', 'options' => ['global' => 'Use global setting', 'php_stream' => 'PHP Stream', 'x_sendfile' => 'X-Sendfile', 'x_accel_redirect' => 'X-Accel-Redirect', 's3_presigned' => 'S3 Presigned URL', 'r2_presigned' => 'R2 Presigned URL']]);

// Video protection
woocommerce_wp_checkbox(['id' => '_purecart_video_protect', 'label' => 'Enable video protection (Phase 2)']);
```

---

## Design System Notes — Downloads Module Specific

**Rejection rows are red-accented, not fully red.** A `3px solid $md-error` left border + 5% alpha red row background distinguishes rejected entries at a glance without overwhelming the table. Never set the entire row to `$md-errorContainer`.

**Token strings are always abbreviated.** The DB stores a 64-char hex token. The admin UI and My Account **never** display the full token — only the last 8 characters with a preceding `████████` mask. This prevents inadvertent exposure in screenshots or screen sharing.

**Download progress bar exhaustion state.** When `downloadCount === maxDownloads`, fill color shifts from `$md-primary` to `$md-error`. This is implemented via a conditional class on the fill element: `purecart-download-progress__fill--full`.

**CSV export is client-triggered, not a new tab.** `exportDownloadLog()` returns a `Blob`; the button handler calls `URL.createObjectURL(blob)` and programmatically clicks a hidden `<a>` element with `download="purecart-download-log.csv"`. No `window.open`.

**File type chips never use external icon sets.** The monospace colored dot + label approach (`● ZIP`) requires no extra assets and renders correctly in all browsers. Do not substitute with file-type icon images.

**Video player is native `<video>` only.** No third-party player library (no Video.js, no Plyr). The `controls` attribute is mandatory. Style with CSS only — no JS player skin.

**Delivery test button is non-blocking.** It fires `GET /purecart/v1/downloads/delivery-test` async and shows a spinner on the button while pending. The button is disabled during the request. On completion it shows a 3-second inline badge, then resets. It does not use a `<Toast>` — feedback is inline to maintain focus on the settings form.
