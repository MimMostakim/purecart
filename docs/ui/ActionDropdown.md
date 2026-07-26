# ActionDropdown

Generic "⋮" overflow menu. Renders a circular trigger button and a floating menu of actions, each with an icon, optional danger styling, disabled state, and an optional divider above it. Used by [StatCard](StatCard.md) and anywhere else a lightweight per-item action list is needed.

Source: [`ActionDropdown.tsx`](../../src/app/components/ui/ActionDropdown.tsx)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `actions` | `ActionItem[]` | — | Menu items to render, in order |
| `hint` | `string` | — | Optional small header line shown above the action list (e.g. context label) |

### `ActionItem`

| Field | Type | Description |
|---|---|---|
| `label` | `string` | Menu item text |
| `icon` | `React.ElementType` | Lucide icon component rendered before the label |
| `danger?` | `boolean` | Styles the item in the M3 error color (destructive actions) |
| `disabled?` | `boolean` | Greys out the item and blocks `onClick` |
| `dividerBefore?` | `boolean` | Renders a horizontal rule above this item |
| `onClick` | `() => void` | Invoked on click; the menu closes automatically afterward |

## Behavior

- Menu open state is local (`useState`).
- A fixed, transparent full-screen backdrop closes the menu on outside click.
- All click handlers call `e.stopPropagation()` so the trigger can live inside a clickable row/card without triggering the row's own click handler.

## Usage

```tsx
import { ActionDropdown } from "../ui";
import { Pencil, Trash2 } from "lucide-react";

<ActionDropdown
  hint="Quick actions"
  actions={[
    { label: "Edit", icon: Pencil, onClick: handleEdit },
    { label: "Delete", icon: Trash2, danger: true, dividerBefore: true, onClick: handleDelete },
  ]}
/>
```

## Related

- [RowActionMenu](RowActionMenu.md) — same visual pattern, but with a fixed action set tailored to the Licenses table row.
