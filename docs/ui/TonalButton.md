# TonalButton

Medium-emphasis M3 button — filled with `M3.secondaryContainer` background. Sits between [FilledButton](FilledButton.md) and [OutlinedButton](OutlinedButton.md) in visual weight; use for secondary actions that still need a filled look (e.g. "Send Reminder").

Source: [`TonalButton.tsx`](../../src/app/components/ui/TonalButton.tsx)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `React.ReactNode` | — | Button label/content |
| `onClick` | `() => void` | — | Click handler |
| `small` | `boolean` | `false` | Reduces padding/font-size |

Note: unlike the other buttons in this family, `TonalButton` has no `danger` prop — it's not intended for destructive actions.

## Usage

```tsx
import { TonalButton } from "../ui";

<TonalButton onClick={handleReminder}>Send Reminder</TonalButton>
```

## Related

Part of the shared button family: [FilledButton](FilledButton.md), [OutlinedButton](OutlinedButton.md), [TextButton](TextButton.md).
