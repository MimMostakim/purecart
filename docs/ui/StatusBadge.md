# StatusBadge

Colored pill badge for entity statuses (licenses, subscriptions). Maps a status string to a background/text color pair and a display label; unrecognized statuses fall back to the "pending" style.

Source: [`StatusBadge.tsx`](../../src/app/components/ui/StatusBadge.tsx)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `status` | `string` | — | One of the recognized status keys (see table below); any other value renders as "Pending" |

## Recognized statuses

| Status key | Label | Color |
|---|---|---|
| `active` | Active | Green |
| `expired` | Expired | Red |
| `suspended` | Suspended | Amber |
| `revoked` | Revoked | Neutral gray |
| `paused` | Paused | Blue |
| `cancelled` | Cancelled | Red |
| `past-due` | Past Due | Amber |
| `trialing` | Trialing | Primary container |
| `pending` (or unrecognized) | Pending | Neutral |

## Usage

```tsx
import { StatusBadge } from "../ui";

<StatusBadge status={license.status} />
```
