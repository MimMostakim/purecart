# ConfirmDialog

Centered modal dialog used to confirm important or destructive actions (revoke, cancel, delete) before they execute. Renders an overlay backdrop, optional icon, title, body text, and Cancel/Confirm buttons.

Source: [`ConfirmDialog.tsx`](../../src/app/components/ui/ConfirmDialog.tsx)

## Props (`ConfirmDialogProps`)

| Prop | Type | Default | Description |
|---|---|---|---|
| `open` | `boolean` | — | Whether the dialog is rendered; returns `null` when `false` |
| `title` | `string` | — | Dialog heading |
| `body` | `React.ReactNode` | — | Explanatory copy shown under the title |
| `confirmLabel` | `string` | — | Label for the confirm button |
| `danger` | `boolean` | `false` | Styles the icon container and confirm button in the M3 error color |
| `icon` | `React.ElementType` | — | Optional Lucide icon shown centered above the title |
| `onConfirm` | `() => void` | — | Called when the confirm button is clicked |
| `onCancel` | `() => void` | — | Called when Cancel is clicked or the backdrop is clicked |

## Behavior

- Clicking the backdrop (not the dialog itself) triggers `onCancel`.
- Internally composed from [TextButton](TextButton.md) (Cancel) and [FilledButton](FilledButton.md) (Confirm, `small`).
- This component is controlled — the caller owns the `open` boolean in its own state.

## Usage

```tsx
import { useState } from "react";
import { ConfirmDialog } from "../ui";
import { XCircle } from "lucide-react";

const [open, setOpen] = useState(false);

<ConfirmDialog
  open={open}
  icon={XCircle}
  danger
  title="Revoke this license?"
  body="This action cannot be undone. The customer will lose access immediately."
  confirmLabel="Revoke"
  onConfirm={() => { doRevoke(); setOpen(false); }}
  onCancel={() => setOpen(false)}
/>
```
