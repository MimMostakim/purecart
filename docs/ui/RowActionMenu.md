# RowActionMenu

Overflow menu ("⋮") for a row in the Licenses table. Unlike the generic [ActionDropdown](ActionDropdown.md), this component hardcodes the license-specific action list (view detail, view customer, copy key, duplicate, extend expiry, reset activations, send reminder, suspend/reinstate, revoke) and derives which items are enabled/disabled/shown from the row's status.

Source: [`RowActionMenu.tsx`](../../src/app/components/ui/RowActionMenu.tsx)

## Props (`RowMenuProps`)

| Prop | Type | Description |
|---|---|---|
| `row` | `typeof licensesTableData[0]` | The license row this menu acts on (used for status logic and the key preview in the header) |
| `open` | `boolean` | Whether the menu is open |
| `onOpen` | `() => void` | Called to open the menu |
| `onClose` | `() => void` | Called to close the menu (outside click, action click, Escape-equivalent) |
| `onViewDetail` | `() => void` | "View License Detail" |
| `onViewCustomer` | `() => void` | "View Customer" |
| `onCopyKey` | `() => void` | "Copy License Key" |
| `onExtendExpiry` | `() => void` | "Extend Expiry" — disabled when revoked |
| `onResetActivations` | `() => void` | "Reset Activations" — disabled when revoked or expired |
| `onSendReminder` | `() => void` | "Send Reminder Email" |
| `onSuspend` | `() => void` | "Suspend License" — shown only when status is `active` |
| `onReinstate` | `() => void` | "Reinstate License" — shown only when status is `suspended` |
| `onRevoke` | `() => void` | "Revoke License" — disabled when already revoked; always danger-styled |
| `onDuplicate` | `() => void` | "Duplicate License" |

## Behavior

- Unlike `ActionDropdown`, open/close state is **lifted to the parent** (via `open`/`onOpen`/`onClose`) rather than local — this lets a table coordinate "only one row menu open at a time."
- Status-derived logic: `isActive` shows Suspend, `isSuspended` shows Reinstate, `isRevoked`/`isExpired` disable the relevant destructive/administrative actions.
- Renders a small header showing a truncated license key for context.

## Usage

```tsx
import { useState } from "react";
import { RowActionMenu } from "../ui";

const [openRowId, setOpenRowId] = useState<string | null>(null);

<RowActionMenu
  row={row}
  open={openRowId === row.id}
  onOpen={() => setOpenRowId(row.id)}
  onClose={() => setOpenRowId(null)}
  onViewDetail={() => goToDetail(row.id)}
  onViewCustomer={() => goToCustomer(row.customerId)}
  onCopyKey={() => copyToClipboard(row.key)}
  onExtendExpiry={() => extendExpiry(row.id)}
  onResetActivations={() => resetActivations(row.id)}
  onSendReminder={() => sendReminder(row.id)}
  onSuspend={() => suspend(row.id)}
  onReinstate={() => reinstate(row.id)}
  onRevoke={() => revoke(row.id)}
  onDuplicate={() => duplicate(row.id)}
/>
```

## Related

Same visual/interaction pattern as [ActionDropdown](ActionDropdown.md), but purpose-built for the Licenses table rather than accepting an arbitrary action list.
