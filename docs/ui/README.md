# UI Components

Presentational, prop-driven building blocks used across the admin dashboard pages (`src/app/components/*Page.tsx`). All components live in [`src/app/components/ui`](../../src/app/components/ui) and are re-exported from [`ui/index.ts`](../../src/app/components/ui/index.ts), so consumers should import from `"../ui"` rather than deep-importing individual files.

They follow Material Design 3 (M3), styled by hand with inline `style` objects driven by the `M3` token map in [`src/app/utils/static-data.tsx`](../../src/app/utils/static-data.tsx) (no component library). See [`src/woo-digital-downloads-admin.md`](../../src/woo-digital-downloads-admin.md) for the full design system spec.

## Index

| Component | Summary |
|---|---|
| [ActionDropdown](ActionDropdown.md) | Generic "⋮" overflow menu driven by an `ActionItem[]` list |
| [Card](Card.md) | Base elevated surface container used by most other components |
| [ConfirmDialog](ConfirmDialog.md) | Modal confirmation dialog for destructive/important actions |
| [FilledButton](FilledButton.md) | Primary (filled) M3 button |
| [FilterChip](FilterChip.md) | Dropdown filter chip for table/list toolbars |
| [IconButton](IconButton.md) | Circular icon-only button |
| [KpiCard](KpiCard.md) | Compact metric card (label, value, trend) |
| [OutlinedButton](OutlinedButton.md) | Secondary (outlined) M3 button |
| [RowActionMenu](RowActionMenu.md) | Table-row overflow menu specialized for the Licenses table |
| [SectionTitle](SectionTitle.md) | Small section heading label |
| [SettingsField](SettingsField.md) | Labeled text/number input row for settings forms |
| [SettingsSectionHeader](SettingsSectionHeader.md) | Section heading + description for settings groups |
| [SettingsSelectField](SettingsSelectField.md) | Labeled `<select>` row for settings forms |
| [SettingsToggleField](SettingsToggleField.md) | Labeled toggle row for settings forms |
| [Sidebar](Sidebar.md) | Plugin's left navigation drawer |
| [StatCard](StatCard.md) | Larger dashboard stat card with icon, value, trend, and actions menu |
| [StatusBadge](StatusBadge.md) | Colored pill badge for license/subscription statuses |
| [TextButton](TextButton.md) | Lowest-emphasis (text-only) M3 button |
| [Toast](Toast.md) | Bottom-center snackbar/toast notification |
| [Toggle](Toggle.md) | Standalone on/off switch |
| [TonalButton](TonalButton.md) | Medium-emphasis (tonal) M3 button |
| [TopBar](TopBar.md) | Plugin's top app bar with breadcrumbs and page title |
| [TrendChip](TrendChip.md) | Small up/down trend indicator pill |

## Conventions

- All components read colors/shape tokens from `M3` — never hardcode hex values in a page, add/reuse a token instead.
- Buttons (`FilledButton`, `OutlinedButton`, `TonalButton`, `TextButton`) share the same prop shape: `children`, `onClick`, `danger?`, `small?`.
- `danger` maps to the M3 error color; use it for destructive actions (revoke, cancel, delete).
- Overflow menus (`ActionDropdown`, `RowActionMenu`) close on outside click via a fixed full-screen backdrop and stop click propagation so they can be nested inside clickable table rows.
