# Card

Base elevated surface: rounded corners, `M3.surface` background, and a subtle drop shadow. The foundational container most other components (`KpiCard`, `StatCard`) and page layouts build on top of.

Source: [`Card.tsx`](../../src/app/components/ui/Card.tsx)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `React.ReactNode` | — | Card content |
| `className` | `string` | `""` | Extra Tailwind classes (e.g. padding, flex layout) appended to the default `rounded-xl` |
| `style` | `React.CSSProperties` | `{}` | Inline style overrides/additions merged after the default background + shadow |

## Usage

```tsx
import { Card } from "../ui";

<Card className="p-5 flex flex-col gap-3">
  <span>Card content</span>
</Card>
```

## Related

- [KpiCard](KpiCard.md) and [StatCard](StatCard.md) wrap `Card` for dashboard metrics.
