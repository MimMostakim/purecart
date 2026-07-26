## Figma Design Prompt — PureCart Admin Dashboard

### Project Overview

Design a **WordPress plugin admin dashboard** for *PureCart* — a WooCommerce extension that manages plugin licenses, digital downloads, subscriptions, SaaS provisioning, and affiliate programs. The React SPA renders inside the WordPress admin area (the WP sidebar and top bar are already provided by WordPress; only design the content area and the plugin's own sidebar/topbar).

---

### Design System

**Follow Material Design 3 (M3) exactly.**

- Reference: https://m3.material.io
- Implement from scratch — do **not** use MUI or any pre-built component library
- Typography: Roboto (all 15 M3 type roles — Display, Headline, Title, Label, Body scales)
- Base grid: 8px (all spacing multiples of 4px)
- Elevation: tonal surface overlays + shadows (Level 0–5)

**Color Palette (M3 Role-Based)**

| Role | Hex |
|---|---|
| Primary | `#6750A4` |
| On Primary | `#FFFFFF` |
| Primary Container | `#EADDFF` |
| On Primary Container | `#21005D` |
| Secondary | `#625B71` |
| Secondary Container | `#E8DEF8` |
| Surface | `#FFFBFE` |
| Surface Container Low | `#F7F2FA` |
| Surface Container | `#F3EDF7` |
| Surface Container High | `#ECE6F0` |
| On Surface | `#1C1B1F` |
| On Surface Variant | `#49454F` |
| Outline | `#79747E` |
| Outline Variant | `#CAC4D0` |
| Error | `#B3261E` |
| Success | `#386A20` |
| Warning | `#7A5900` |
| Info | `#00629D` |

**Shape Scale**

| Token | Value | Used On |
|---|---|---|
| Extra Small | 4px | Snackbars, text fields |
| Small | 8px | Chips |
| Medium | 12px | Cards, data tables |
| Large | 16px | Navigation drawer |
| Extra Large | 28px | Dialogs |
| Full | 9999px | Buttons, FABs, nav active indicator |

---

### Layout Structure

The plugin owns two layout regions inside WordPress admin:

```
┌─────────────────────────────────────────────────────┐
│  [WP Top Admin Bar — do not design]                 │
├──────────────┬──────────────────────────────────────┤
│              │  Plugin Top Bar (64px)               │
│  Plugin      ├──────────────────────────────────────┤
│  Sidebar     │                                      │
│  (256px)     │  Page Content Area                   │
│              │  (padding 24px all sides)            │
│              │                                      │
└──────────────┴──────────────────────────────────────┘
```

**Sidebar (Navigation Drawer — M3 Standard)**
- Width: 256px (collapsed: 80px icon-only at <1200px)
- Background: Surface Container Low (`#F7F2FA`)
- Elevation: Level 1
- Border radius: right side only — 0 16px 16px 0
- Nav items: 56px tall, pill-shaped active indicator using Secondary Container
- Sections in order:

| Icon | Label | Note |
|---|---|---|
| LayoutDashboard | Overview | Always visible |
| Key | Licenses | Module required |
| Download | Downloads | Module required |
| RefreshCw | Updates | Module required |
| Repeat | Subscriptions | Module required |
| Cloud | SaaS Accounts | Module required |
| Users | Affiliates | Module required |
| ShoppingCart | Abandoned Cart | Module required |
| Shield | Security | Module required |
| BarChart2 | Analytics | Module required |
| Settings | Settings | Always visible |

Disabled module items show a lock icon overlay and 38% opacity.

**Top Bar (Top App Bar — M3)**
- Height: 64px
- Background: Surface (`#FFFBFE`), elevated to Level 2 on scroll
- Left: Page title (Title Large) + breadcrumb trail
- Right: quick action buttons (icon buttons)

---

### Pages to Design

#### 1. Dashboard Overview

Layout: 4-column stat cards → 2-column chart row → 3-column activity panels

**Stat Cards (×4):**
- Active Licenses / MRR / Downloads This Month / Expiring Soon (30d)
- Each card: icon top-left, large numeric value (Display Small), label (Body Medium), trend chip below value (▲ +124 in green / ▼ -3% in red)
- Fourth card uses warning color treatment when action is needed
- Card style: Elevated (Level 1, hover to Level 2), 12px border radius

**Chart Row:**
- Left 60%: MRR Trend — Line chart, 12-month view, two lines (MRR + ARR), primary color palette
- Right 40%: License Status — Donut/Pie chart, four slices (Active / Expired / Suspended / Revoked)

**Activity Panels (×3, equal width):**
- Recent Licenses issued (list, status badge + product name)
- Recent Downloads (list, country flag + IP + product)
- Expiring Licenses (list, date + "Send Reminder" text button)

---

#### 2. Licenses Page

**Top:** Page title + "Export CSV" outlined button + "Revoke Selected" danger button (shown only when rows checked)

**Filters Bar:** Search field (filled text field) + Status dropdown chip + Product dropdown chip + Date range picker chip — horizontally arranged, 8px gap

**Data Table:**

| ☐ | License Key | Customer | Product | Plan | Sites | Status | Expires | Actions |
|---|---|---|---|---|---|---|---|---|

- License key: monospace, truncated, click-to-copy icon
- Status: colored badge chip (green=Active, red=Expired, orange=Suspended, gray=Revoked)
- Sites used: "1/1" with mini progress bar
- Row hover: Surface state layer (8% opacity overlay)
- Selected rows: Primary 8% tint background
- Pagination bar below table: Previous / page numbers / Next

---

#### 3. License Detail Page

Two-column layout:

**Left card (40%):**
- License key in large monospace with copy button
- Status badge (large)
- Customer avatar (initial circle, Primary Container), name, email
- Product name + type pill (plugin/saas/bundle)
- Sites used: horizontal progress bar
- Expiry date or "Lifetime" badge
- Action buttons: Revoke (danger outlined), Extend Expiry (tonal), Reset Activations (text)

**Right panel (60%) — Tabbed:**
- *Activations tab:* table — domain, environment badge (production/staging/local), IP, activated at, Deactivate button
- *Event Log tab:* vertical timeline — event type icon, description, timestamp

---

#### 4. Subscriptions Page

Stat cards row: Active / Paused / Past Due / Cancelled this month

**Table:**

| ID | Customer | Product | Amount | Cycle | Status | Next Payment | Actions |
|---|---|---|---|---|---|---|---|

Status badges: Active (green), Paused (blue), Past Due (yellow/warning), Suspended (orange), Cancelled (red), Expired (gray)

Bulk action floating bar at screen bottom when rows selected.

---

#### 5. Analytics Page

**Date range selector (top right):** 7d · 30d · 90d · 12m · Custom — pill toggle group

**Row 1 — Stat cards:** MRR / ARR / Churn Rate / LTV

**Row 2 — Full-width line chart:** MRR Trend — three lines (MRR / New MRR / Churned MRR), with legend

**Row 3 — Split:**
- Left: Stacked bar chart — License health by month (active/expired/suspended/revoked)
- Right: Top 10 countries table — flag icon, country name, download count, bar indicator

**Row 4 — Split:**
- Left: Donut chart — Version adoption (% of customers per plugin version)
- Right: Product downloads table — name, version, count, trend arrow

---

#### 6. Settings Page

Left tab nav (vertical) + right form panel.

Tabs: Modules · Licensing · Downloads · Updates · Subscriptions · SaaS · Affiliates · Abandoned Cart · Security · Emails · Advanced

**Modules tab (special):**

Each module as a row:
```
● Secure Downloads    [Toggle ON ]   Phase 1 badge   Active badge
○ Subscriptions       [Toggle OFF]   Phase 2 badge   Disabled badge
```

Row contains: status dot, module name (Title Small), toggle switch (M3 style — pill track + thumb), phase badge (outlined chip), status badge.

---

### Component Library to Build in Figma

Create as Auto Layout components with variants:

| Component | Variants |
|---|---|
| **Button** | Filled / Tonal / Outlined / Text / Elevated · Small/Medium/Large · Icon+Label / Label only · Default/Hover/Focus/Disabled |
| **Card** | Elevated / Filled / Outlined · Default/Hover |
| **Status Badge** | Active / Expired / Suspended / Cancelled / Paused / Pending / Revoked / Trialing / Past Due |
| **Stats Card** | Default / Warning · With trend up / With trend down |
| **Nav Item** | Default / Active / Disabled / Collapsed (icon only) |
| **Data Table Row** | Default / Hover / Selected / Loading (skeleton) |
| **Chip (Filter)** | Unselected / Selected · With icon / Without icon |
| **Text Field** | Filled / Outlined · Empty / Filled / Error / Focused · With/without icon |
| **Toggle Switch** | On / Off · Enabled / Disabled |
| **Dialog** | Default / With icon · Small/Medium/Large |
| **Snackbar** | Default / With action button · Success/Error/Warning |
| **Skeleton** | Text / Title / Card / Row / Avatar |
| **Empty State** | No data / Error / Module Disabled |
| **Tab Nav** | Horizontal (primary) / Vertical (settings sidebar) |
| **Pagination** | With various page counts |

---

### Interaction Notes for Prototyping

- All buttons: hover state layer (8% overlay), focus ring (3px primary color)
- Table rows: hover state layer; click shows selection state
- Sidebar items: hover state layer, active = Secondary Container pill
- Destructive actions (Revoke, Cancel, Delete): always trigger a confirmation dialog before proceeding
- Disabled states: 38% opacity, no interactions
- Loading states: skeleton screens only — no spinners

---

### Responsive Breakpoints

| Breakpoint | Sidebar | Content |
|---|---|---|
| ≥1200px | 256px full sidebar | Full table layout |
| 768–1199px | 80px icon-only collapsed | Tables with horizontal scroll |
| <768px | Hidden (overlay drawer) | Card-stack layout instead of tables |

---

### Deliverables Expected

1. **Figma Design System page** — color styles, text styles, effect styles (elevation), all components
2. **Desktop frames (1440px)** for all 13 pages
3. **Mobile frame (375px)** for Dashboard and Licenses pages
4. **Component States** — all interactive states documented
5. **Prototype** — click-through flow: Dashboard → Licenses → License Detail → Revoke (confirm dialog)