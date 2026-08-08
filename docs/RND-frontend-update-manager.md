# RND — Frontend: Update Manager
**Plugin:** purecart  
**Depends on:** `RND-auto-updates.md`  
**Stack:** React 18 · TypeScript · Lucide React icons · Material Design 3 (inline styles via `M3` token object)  
**Scope:** Admin dashboard screens + Customer My Account tab  

---

## Overview

The Update Manager frontend has two surfaces:

1. **Admin Dashboard** — `UpdatesPage` (already substantially built — version list + release form + changelog viewer) + `UpdateAnalyticsPage` (new, Phase 2) + `SettingsUpdates` (new settings tab).
2. **Customer My Account** — `my-account/purecart-updates/` — PHP-rendered tab showing update history per product, current version, and pending update notification.

---

## Admin Dashboard Screens

### Screen 1 — UpdatesPage (already built)

**File:** `src/app/components/Updates/UpdatesPage.tsx`  
**Route:** `page === 'updates'`  
**Nav icon:** `RefreshCw` (Lucide)

Already implemented (from RND review):
- KPI strip (4 cards): total packages, latest releases, pending drafts, download count
- New Release inline form panel with drag-and-drop ZIP upload, channel/type selectors
- Edit Package panel (inline, same location as New Release form)
- Packages table with channel/status-aware row actions (draft → beta → stable, rollback, unpublish, delete)
- Release History table per product
- Changelog viewer modal (`<ChangelogModal>`)

#### Additions to build onto UpdatesPage

**Platform column + chip** (was missing — needed for non-WP software):

```tsx
// Add to packages table
| Platform | <PlatformChip platform={row.platform} /> |
```

**`<PlatformChip>`:**
```tsx
const PLATFORM_CONFIG = {
  'universal':    { label: 'Universal',    icon: Globe },
  'darwin-arm64': { label: 'macOS (ARM)',  icon: Apple },    // use generic icon
  'darwin-x64':   { label: 'macOS (Intel)',icon: Apple },
  'win-x64':      { label: 'Win x64',     icon: Monitor },
  'win-arm64':    { label: 'Win ARM',     icon: Monitor },
  'linux-x86_64': { label: 'Linux x64',   icon: Terminal },
  'linux-arm64':  { label: 'Linux ARM',   icon: Terminal },
};
// Renders: [Icon] Label — monospace text, $md-surfaceContainerHigh bg
```

**Product type filter** (needed to separate WP plugin/theme from desktop software):
```tsx
<FilterChip label="Product Type"
  options={['All','WP Plugin','WP Theme','Desktop App','CLI Tool','Mobile App','Electron']} />
```

**"Notify Customers" toggle in New Release form:**
```tsx
<Toggle
  label="Notify customers via email"
  checked={notifyCustomers}
  onChange={setNotifyCustomers}
/>
// Only shown when channel = 'stable' and _purecart_update_notify_customers is true
```

**Checksum display in package row expansion:**
```
SHA-256: abc123...def456  [Copy]
```
Shown in an expandable row detail (clicking chevron on the row) — monospace, truncated to 24 chars + `…`, Copy button copies full hash.

---

### Screen 2 — UpdateAnalyticsPage (new, Phase 2)

**File:** `src/app/components/Updates/UpdateAnalyticsPage.tsx`  
**Route:** `page === 'update-analytics'`  
**Breadcrumb:** Updates → Analytics

**KPI Strip:**
```tsx
<KpiCard label="Total Downloads"  value="3,241"  trend="▲ +88 this week"    trendUp  icon={Download} />
<KpiCard label="Adoption Rate"    value="72%"    trend="On latest version"   trendUp  icon={TrendingUp} />
<KpiCard label="Pending Rollback" value="2"      trend="Packages flagged"    trendUp={false} icon={RotateCcw} />
<KpiCard label="Unique Updaters"  value="1,140"  trend="Customers who pulled" trendUp icon={Users} />
```

**Chart grid (2-column):**

```
┌──────────────────────────┬──────────────────────────┐
│ Update downloads/day     │ Version adoption          │
│ <AreaChart>              │ <BarChart stacked>        │
├──────────────────────────┼──────────────────────────┤
│ Downloads by channel     │ Downloads by platform     │
│ <PieChart>               │ <BarChart horizontal>    │
└──────────────────────────┴──────────────────────────┘
```

**Version adoption chart** — stacked bar where each color is a version string. Shows what % of active customers are on each version. `CHART_COLORS` array cycles through colors.

**Downloads by channel:**
- `stable` → `CHART_COLORS.primary`
- `beta` → `CHART_COLORS.secondary`
- `nightly` → `CHART_COLORS.tertiary`

**Rollback log table** (below charts):

| Column | Content |
|---|---|
| Package | Version (from → to) with `→` separator |
| Product | Product name |
| Reason | Free text entered by admin at rollback time |
| Rolled Back At | Datetime |
| Rolled Back By | Admin user display name |

---

### Screen 3 — SettingsUpdates (new)

**File:** `src/app/components/Settings/SettingsUpdates.tsx`  
**Route:** `page === 'settings'` → Updates tab

**General**
- Default update channel: Select (`stable` / `beta` / `nightly`)
- Require active license for updates: `<SettingsToggleField>` (global default)
- Allow customers to rollback: `<SettingsToggleField>`

**Update Token**
- Token secret key: masked field labeled `PURECART_UPDATE_SECRET`
- "Regenerate Secret" button → `<ConfirmDialog>` danger (warning: existing update tokens become invalid)
- Token TTL (minutes): number input (default: 15)

**Notification Emails** *(Phase 2)*
- Enable customer update notifications: `<SettingsToggleField>`
- Notification email template: text area (basic HTML allowed)
- "Preview Email" button → opens modal with rendered preview

**GitHub Sync** *(Phase 3 — gated)*
- GitHub Personal Access Token: masked field
- Default branch filter: text input (default: `v*.*.*`)
- "Test GitHub Connection" button

**Delivery Method**
- Same delivery method select as SettingsDownloads (shared component `<DeliveryMethodSelect>`)

---

## New Admin Components to Build

### `VersionBadge`

```tsx
// src/app/components/Updates/VersionBadge.tsx
// Renders a version string with channel color coding
interface VersionBadgeProps {
  version: string;   // e.g. "2.1.0"
  channel: 'stable' | 'beta' | 'nightly';
  size?: 'small' | 'medium';
}

const CHANNEL_COLORS = {
  stable:  { bg: M3.statusSuccessContainer, text: M3.statusSuccess },
  beta:    { bg: M3.statusWarningContainer, text: M3.statusWarning },
  nightly: { bg: M3.surfaceContainerHigh,  text: M3.onSurfaceVariant },
};

// Renders: [v2.1.0] with channel-colored bg
// Roboto Mono font
```

### `PlatformChip`

```tsx
// src/app/components/Updates/PlatformChip.tsx
// See PLATFORM_CONFIG above
// Renders: [Icon 14px] [Label] in $md-surfaceContainerHigh pill
// Icon from Lucide React only — Globe/Monitor/Terminal as fallback for all OS types
```

### `ChangelogModal` (enhance existing)

Already built. Add:
- Markdown rendering: convert `**text**` → `<strong>`, `- item` → `<ul><li>`, `## heading` → `<h2>`
- Diff view toggle: "View Diff" button shows `--- v1.x.x` / `+++ v2.0.0` style text area (Phase 2)
- "Copy Changelog" button
- "Email to customers" button (Phase 2) → triggers `purecart_send_update_notification_batch` Action Scheduler job

### `RollbackConfirmDialog`

```tsx
// ConfirmDialog with extra form field
// Title: "Roll Back to v{version}?"
// Body: reason textarea (required)
// confirmLabel: "Roll Back"
// danger: true
// On confirm: POST /purecart/v1/updates/rollback with { product_id, version, reason }
```

### `UpdateTokenDisplay`

```tsx
// Shown in package row expansion or package detail drawer
// HMAC-signed token — never displayed in full, only for debugging
// Shows: "Token expires in 15 min" countdown when a token was recently generated
// "Generate Test URL" button — generates a one-time download URL for admin testing
//   → opens in new tab, triggers download directly
```

---

## Customer My Account — Updates Tab

**URL:** `/my-account/purecart-updates/`  
**Rendering:** PHP + template  
**File:** `templates/myaccount/purecart-updates.php`  
**Template override:** `your-theme/purecart/myaccount/purecart-updates.php`

### Default View — Product Version Cards

```
─────────────────────────────────────────────────────
Plugin Pro
Current: v2.0.4   Channel: Stable
License: XXXXXXXX-XXXX-…  ● Active

  ┌──────────────────────────────────────────────────┐
  │ ✅ You're on the latest version (v2.0.4)         │
  │ Released: Jul 20, 2026                           │
  │                                                  │
  │ [View Changelog]                                 │
  └──────────────────────────────────────────────────┘
─────────────────────────────────────────────────────
Design Kit Pro
Current: v1.8.0   Channel: Stable
License: XXXXXXXX-XXXX-…  ● Active

  ┌──────────────────────────────────────────────────┐
  │ 🔔 Update available: v1.9.0                      │
  │ Released: Jul 29, 2026                           │
  │ This release: security fix, new components.      │
  │                                                  │
  │ [Read Changelog]  [Download v1.9.0]              │
  └──────────────────────────────────────────────────┘
```

**"Download vX.Y.Z"** — generates a signed update token via `POST /purecart/v1/updates/token` and redirects to the package URL. The customer's current version is known from the license activation record.

**"View Changelog"** / **"Read Changelog"** — AJAX request to `GET /purecart/v1/updates/changelog?product_id=N&version=2.0.4`. Opens in an inline `<details>` expand panel (no modal in My Account — keep it simple).

### Version History (expandable per product)

```html
<details class="purecart-update-history">
  <summary>Version history</summary>
  <ul class="purecart-update-history__list">
    <li>
      <span class="version">v2.0.4</span>
      <span class="date">Jul 20, 2026</span>
      <span class="channel">● Stable</span>
      <a href="#" class="btn btn--text btn--small">Changelog</a>
    </li>
    <li>
      <span class="version">v2.0.3</span>
      ...
    </li>
  </ul>
</details>
```

### Per-License Channel Override

When the license has a `channel` override (e.g. beta for a specific customer):

```
Channel: Beta (overriding product default: Stable)
```

Shown as an inline notice below the product name, `$md-statusWarningContainer` bg.

### WP Plugin Update Notice (for WP plugin products)

A note shown below the product card only when the product is a WP plugin:

```
ℹ WP Plugin: Updates are delivered automatically via your WordPress dashboard.
  You can also download the latest package below.
```

This avoids customer confusion — they see the "Update available" badge in wp-admin and also here.

---

## CSS / BEM — My Account Components

```scss
// assets/css/purecart-myaccount-updates.scss

.purecart-product-update-card {
  border: 1px solid $md-outline-variant;
  border-radius: $shape-medium;
  padding: $space-4;
  margin-bottom: $space-6;
  background: $md-surface;

  &__header  { display: flex; align-items: center; gap: $space-3; margin-bottom: $space-3; }
  &__icon    { width: 48px; height: 48px; border-radius: $shape-small;
               object-fit: contain; border: 1px solid $md-outline-variant; }
  &__name    { @extend %type-title-medium; color: $md-on-surface; }
  &__meta    { @extend %type-body-small; color: $md-on-surface-variant; margin-top: $space-1; }

  &__status  {
    border-radius: $shape-small; padding: $space-3 $space-4; margin-bottom: $space-3;
    display: flex; align-items: flex-start; gap: $space-3;

    &--up-to-date { background: $md-status-success-container; color: $md-status-success; }
    &--outdated   { background: $md-status-warning-container; color: $md-status-warning; }
  }

  &__status-icon { flex-shrink: 0; margin-top: 2px; }
  &__status-body { flex: 1; }
  &__status-title { @extend %type-label-large; display: block; margin-bottom: $space-1; }
  &__status-desc  { @extend %type-body-small; }

  &__actions { display: flex; gap: $space-2; flex-wrap: wrap; }
}

.purecart-update-history {
  margin-top: $space-4;
  padding-top: $space-4;
  border-top: 1px solid $md-outline-variant;

  summary {
    @extend %type-label-medium; color: $md-primary; cursor: pointer;
    list-style: none; user-select: none;
    &::-webkit-details-marker { display: none; }
    &::before { content: '▶'; margin-right: $space-2; font-size: 10px;
                transition: transform $motion-duration-short-2; }
  }

  &[open] summary::before { transform: rotate(90deg); }

  &__list {
    margin: $space-3 0 0 0; padding: 0; list-style: none;
  }

  &__item {
    display: flex; align-items: center; gap: $space-3;
    padding: $space-2 0;
    border-top: 1px solid $md-outline-variant;
    @extend %type-body-small;
  }

  &__version { font-family: $font-family-mono; color: $md-on-surface; min-width: 48px; }
  &__date    { color: $md-on-surface-variant; flex: 1; }
  &__channel { /* version badge pill small */ }
}
```

---

## TypeScript Interfaces

```typescript
// src/app/types/updates.ts

export type UpdateChannel = 'stable' | 'beta' | 'nightly';
export type ProductType = 'wp-plugin' | 'wp-theme' | 'desktop-app' | 'cli-tool'
                        | 'mobile-app' | 'electron-app' | 'other';
export type PackageStatus = 'draft' | 'active' | 'archived';
export type Platform = 'universal' | 'darwin-arm64' | 'darwin-x64'
                     | 'win-x64' | 'win-arm64' | 'linux-x86_64' | 'linux-arm64';

export interface ProductVersion {
  id: number;
  productId: number;
  productName: string;
  productType: ProductType;
  version: string;
  channel: UpdateChannel;
  platform: Platform;
  fileSize: number;       // bytes
  checksumSha256: string;
  requiresVersion: string | null;   // min WP version or OS version
  testedVersion: string | null;     // max WP version or OS version
  changelog: string;      // markdown
  status: PackageStatus;
  isRollback: boolean;
  downloadCount: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateStats {
  totalPackages: number;
  latestReleases: number;
  pendingDrafts: number;
  totalDownloads: number;
}

export interface RollbackRecord {
  id: number;
  productId: number;
  fromVersion: string;
  toVersion: string;
  reason: string;
  rolledBackAt: string;
  rolledBackBy: string;
}
```

---

## API Integration

```typescript
// src/app/utils/api/updates.ts

export async function fetchVersions(params: VersionQueryParams): Promise<PaginatedResponse<ProductVersion>> {
  const qs = new URLSearchParams(params as Record<string, string>);
  return fetch(`${BASE}/updates/versions?${qs}`, {
    headers: { 'X-WP-Nonce': NONCE },
  }).then(r => r.json());
}

export async function publishVersion(versionId: number): Promise<{ success: boolean }> {
  return fetch(`${BASE}/updates/versions/${versionId}/publish`, {
    method: 'POST',
    headers: { 'X-WP-Nonce': NONCE, 'Content-Type': 'application/json' },
  }).then(r => r.json());
}

export async function rollbackVersion(payload: {
  product_id: number;
  version: string;
  reason: string;
}): Promise<{ success: boolean }> {
  return fetch(`${BASE}/updates/rollback`, {
    method: 'POST',
    headers: { 'X-WP-Nonce': NONCE, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then(r => r.json());
}

export async function generateTestUrl(versionId: number): Promise<{ url: string }> {
  return fetch(`${BASE}/updates/versions/${versionId}/test-url`, {
    method: 'POST',
    headers: { 'X-WP-Nonce': NONCE, 'Content-Type': 'application/json' },
  }).then(r => r.json());
}

export async function uploadPackage(formData: FormData): Promise<{ success: boolean; version: ProductVersion }> {
  return fetch(`${BASE}/updates/upload`, {
    method: 'POST',
    headers: { 'X-WP-Nonce': NONCE },
    body: formData,
  }).then(r => r.json());
}

export async function fetchChangelog(productId: number, version: string): Promise<{ changelog: string }> {
  return fetch(`${BASE}/updates/changelog?product_id=${productId}&version=${encodeURIComponent(version)}`, {
    headers: { 'X-WP-Nonce': NONCE },
  }).then(r => r.json());
}
```

---

## State Management

```typescript
// UpdatesPage existing local state (already implemented — do not modify):
// versions, stats, loading, filters, new release form state, edit state, selected, etc.

// Additions needed for platform support:
const [filterPlatform, setFilterPlatform] = useState<Platform | 'All'>('All');
const [filterProductType, setFilterProductType] = useState<ProductType | 'All'>('All');
```

---

## Per-Product Settings in Product Edit Page

**File:** `templates/admin/product-settings-updates.php`

```php
// Product type
woocommerce_wp_select(['id' => '_purecart_product_type',
  'label' => 'Product type',
  'options' => [
    'wp-plugin'    => 'WP Plugin',
    'wp-theme'     => 'WP Theme',
    'desktop-app'  => 'Desktop App',
    'cli-tool'     => 'CLI Tool',
    'mobile-app'   => 'Mobile App',
    'electron-app' => 'Electron App',
    'other'        => 'Other',
  ]
]);

// Plugin slug (used in update check endpoint)
woocommerce_wp_text_input(['id' => '_purecart_plugin_slug',
  'label' => 'Plugin/theme slug',
  'desc_tip' => true,
  'description' => 'Used to match wp_update_plugins transient. Example: my-plugin/my-plugin.php',
]);

// Default update channel
woocommerce_wp_select(['id' => '_purecart_update_channel',
  'label' => 'Default update channel',
  'options' => ['stable' => 'Stable', 'beta' => 'Beta', 'nightly' => 'Nightly'],
]);

// Require license for updates
woocommerce_wp_checkbox(['id' => '_purecart_update_requires_license',
  'label' => 'Require active license for updates',
]);

// Allow rollback
woocommerce_wp_checkbox(['id' => '_purecart_update_allow_rollback',
  'label' => 'Allow customers to roll back',
]);

// Notify customers on new release
woocommerce_wp_checkbox(['id' => '_purecart_update_notify_customers',
  'label' => 'Email customers when a new stable release is published',
]);

// GitHub repo (Phase 3)
woocommerce_wp_text_input(['id' => '_purecart_github_repo',
  'label' => 'GitHub repository',
  'placeholder' => 'owner/repo',
  'desc_tip' => true,
  'description' => 'Auto-import releases from GitHub on tag push. Phase 3 feature.',
]);
```

---

## Design System Notes — Update Manager Module Specific

**Version strings are always Roboto Mono.** Every version string — in badges, table cells, rollback dialogs, changelog headers, My Account — uses monospace. Consistent with license key display rule.

**Channel indicates risk level, not just a label.** `stable` is green (success), `beta` is amber (warning), `nightly` has no color (neutral). This is intentional — nightly is not "bad" enough for red, but also not endorsed enough for any positive color. Do not colorize nightly.

**"Publish" is the only irreversible action without a rollback path.** Draft → beta, draft → stable, beta → stable are all one-way promotions. Once published, a version can only be `archived` or rolled back by publishing an older version. The "Publish" button must therefore show a `<ConfirmDialog>` for the first stable publish of any version; subsequent publishes do not require confirmation (e.g. re-publishing after un-archiving).

**Drag-and-drop upload is not a replacement for the file input.** The drop zone in the New Release form includes a visible `<input type="file">` as a fallback. Both must work. The drop zone highlights with `$md-primaryContainer` bg and `$md-primary` border on dragover.

**Platform chip is optional for WP plugins and themes.** WP plugin/theme packages have `platform = 'universal'` by default, and the platform chip is hidden for these rows to reduce visual noise. Only non-WP software rows show the platform chip.

**Notification email preview is not live-rendered.** The "Preview Email" button in SettingsUpdates opens a `<ConfirmDialog>` with a scrollable pre-rendered HTML preview fetched from `GET /purecart/v1/updates/email-preview`. It is never rendered via `dangerouslySetInnerHTML` in the React tree — it is loaded in a sandboxed `<iframe srcDoc>`.

**Test URL opens in new tab and auto-expires.** `generateTestUrl()` creates a 15-minute single-use download link. The admin sees a toast: "Test URL generated — opens in new tab. Expires in 15 min." The test download does NOT count against the customer's download limit because it uses an admin-scoped token that bypasses `purecart_downloads` table counting.
