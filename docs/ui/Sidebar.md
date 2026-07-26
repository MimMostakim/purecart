# Sidebar

The plugin's left navigation drawer (M3 Navigation Drawer). Renders the logo/brand header, a collapse toggle, and the nav item list driven by `NAV_SCHEMA` from [`static-data.tsx`](../../src/app/utils/static-data.tsx). Locked (disabled) modules render at reduced opacity with a lock icon.

Source: [`Sidebar.tsx`](../../src/app/components/ui/Sidebar.tsx)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `activePage` | `Page` | — | Currently active page id, used to highlight the matching nav item |
| `onNav` | `(p: Page) => void` | — | Called with a nav item's page id when clicked (only for enabled items) |
| `collapsed` | `boolean` | — | Renders the icon-only 80px width instead of the full 256px width |
| `onToggle` | `() => void` | — | Called when the collapse/expand chevron button is clicked |
| `enabledModules` | `Set<string>` | — | Set of enabled module keys; nav items whose `moduleKey` isn't in this set render disabled/locked |

## Behavior

- Width animates between 256px (expanded) and 80px (collapsed) via a CSS transition.
- The Analytics nav item is treated as active for any `Page` starting with `"analytics"` (sub-pages like `analytics-affiliates`).
- Items with `dividerBefore: true` in `NAV_SCHEMA` render a horizontal rule above them.

## Usage

```tsx
import { useState } from "react";
import { Sidebar } from "../ui";

const [collapsed, setCollapsed] = useState(false);

<Sidebar
  activePage={page}
  onNav={setPage}
  collapsed={collapsed}
  onToggle={() => setCollapsed(c => !c)}
  enabledModules={enabledModules}
/>
```

## Related

Pairs with [TopBar](TopBar.md) to form the plugin's page chrome (see the layout diagram in [`woo-digital-downloads-admin.md`](../../src/woo-digital-downloads-admin.md)).
