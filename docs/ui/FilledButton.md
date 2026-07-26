# FilledButton

Highest-emphasis M3 button — solid `M3.primary` background. Use for the single primary action in a view or dialog (e.g. "Save", "Confirm", "Revoke" when `danger`).

Source: [`FilledButton.tsx`](../../src/app/components/ui/FilledButton.tsx)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `React.ReactNode` | — | Button label/content |
| `onClick` | `() => void` | — | Click handler |
| `danger` | `boolean` | `false` | Uses the M3 error color instead of primary |
| `small` | `boolean` | `false` | Reduces padding/font-size (used in dialogs and inline table actions) |

## Usage

```tsx
import { FilledButton } from "../ui";

<FilledButton onClick={handleSave}>Save changes</FilledButton>
<FilledButton danger small onClick={handleRevoke}>Revoke</FilledButton>
```

## Related

Part of the shared button family with identical props: [OutlinedButton](OutlinedButton.md) (medium emphasis), [TonalButton](TonalButton.md) (medium emphasis, secondary color), [TextButton](TextButton.md) (lowest emphasis).
