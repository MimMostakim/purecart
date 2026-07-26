# KpiCard

Compact metric card: uppercase label + icon badge in the header, a large numeric value, and a [TrendChip](TrendChip.md) underneath. Lighter-weight than [StatCard](StatCard.md) (no actions menu, no warning styling) — use for secondary/summary metrics.

Source: [`KpiCard.tsx`](../../src/app/components/ui/KpiCard.tsx)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | — | Metric name (rendered uppercase) |
| `value` | `string` | — | Headline value, e.g. `"1,204"` |
| `trend` | `string` | — | Trend text passed to `TrendChip`, e.g. `"+12%"` |
| `trendUp` | `boolean` | — | Whether the trend is positive (green) or negative (red) |
| `icon` | `React.ElementType` | — | Lucide icon shown in the top-right badge |

## Usage

```tsx
import { KpiCard } from "../ui";
import { Download } from "lucide-react";

<KpiCard label="Downloads This Month" value="3,482" trend="+8%" trendUp icon={Download} />
```

## Related

Built on top of [Card](Card.md) and [TrendChip](TrendChip.md). See [StatCard](StatCard.md) for the larger dashboard variant with an actions menu.
