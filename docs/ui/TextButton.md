# TextButton

Lowest-emphasis M3 button — no background or border, just colored text. Use for tertiary/dismissive actions (e.g. "Cancel" in a dialog, inline "Send Reminder" link in a list row).

Source: [`TextButton.tsx`](../../src/app/components/ui/TextButton.tsx)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `React.ReactNode` | — | Button label/content |
| `onClick` | `() => void` | — | Click handler |
| `danger` | `boolean` | `false` | Uses the M3 error color for text and hover fill |
| `small` | `boolean` | `false` | Reduces padding/font-size |

## Usage

```tsx
import { TextButton } from "../ui";

<TextButton onClick={onCancel}>Cancel</TextButton>
```

## Related

Used inside [ConfirmDialog](ConfirmDialog.md) for the Cancel action. Part of the shared button family: [FilledButton](FilledButton.md), [OutlinedButton](OutlinedButton.md), [TonalButton](TonalButton.md).
