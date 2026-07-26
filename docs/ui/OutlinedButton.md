# OutlinedButton

Medium-emphasis M3 button — transparent background with a 1px border, primary-colored text. Use for secondary actions alongside a [FilledButton](FilledButton.md) (e.g. "Export CSV" next to "Save").

Source: [`OutlinedButton.tsx`](../../src/app/components/ui/OutlinedButton.tsx)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `React.ReactNode` | — | Button label/content |
| `onClick` | `() => void` | — | Click handler |
| `danger` | `boolean` | `false` | Uses the M3 error color for border/text and hover fill |
| `small` | `boolean` | `false` | Reduces padding/font-size |

## Usage

```tsx
import { OutlinedButton } from "../ui";

<OutlinedButton onClick={handleExport}>Export CSV</OutlinedButton>
<OutlinedButton danger onClick={handleCancel}>Cancel subscription</OutlinedButton>
```

## Related

Part of the shared button family: [FilledButton](FilledButton.md) (highest emphasis), [TonalButton](TonalButton.md), [TextButton](TextButton.md) (lowest emphasis).
