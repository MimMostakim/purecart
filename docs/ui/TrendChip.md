# TrendChip

Small pill showing a trend value with an up/down arrow, colored green for positive and red for negative. Used inside [KpiCard](KpiCard.md) and [StatCard](StatCard.md).

Source: [`TrendChip.tsx`](../../src/app/components/ui/TrendChip.tsx)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | `string` | — | Text to display, e.g. `"+124"` or `"-3%"` |
| `isPositive` | `boolean` | — | `true` renders green with a `TrendingUp` icon; `false` renders red with `TrendingDown` |

## Usage

```tsx
import { TrendChip } from "../ui";

<TrendChip value="+124 this month" isPositive />
<TrendChip value="-3%" isPositive={false} />
```
