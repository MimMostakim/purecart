# StatCard

Larger dashboard stat card: icon badge, an [ActionDropdown](ActionDropdown.md) that fades in on hover, a large value, label, and a [TrendChip](TrendChip.md). Supports a `warning` state (left accent border + warning-colored icon badge) for cards that need attention, e.g. "Expiring Soon".

Source: [`StatCard.tsx`](../../src/app/components/ui/StatCard.tsx)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `icon` | `React.ElementType` | — | Lucide icon shown in the top-left badge |
| `label` | `string` | — | Metric name shown under the value |
| `value` | `string` | — | Headline value |
| `trend` | `string` | — | Trend text passed to `TrendChip` |
| `trendUp` | `boolean` | — | Whether the trend is positive or negative |
| `warning` | `boolean` | `false` | Applies a warning-colored left border and icon badge |
| `actions` | `ActionItem[]` | `[]` | Menu items for the hover-revealed `ActionDropdown` |

## Usage

```tsx
import { StatCard } from "../ui";
import { Key, RefreshCw } from "lucide-react";

<StatCard
  icon={Key}
  label="Active Licenses"
  value="1,204"
  trend="+124"
  trendUp
  warning={expiringCount > 0}
  actions={[{ label: "Refresh", icon: RefreshCw, onClick: refetch }]}
/>
```

## Related

Built on top of [Card](Card.md), [ActionDropdown](ActionDropdown.md), and [TrendChip](TrendChip.md). See [KpiCard](KpiCard.md) for a lighter-weight variant without the actions menu.
