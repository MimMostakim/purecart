# IconButton

Circular, icon-only button with a hover state layer. Used for compact actions like the [TopBar](TopBar.md) help/notification buttons.

Source: [`IconButton.tsx`](../../src/app/components/ui/IconButton.tsx)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `icon` | `React.ElementType` | — | Lucide icon component to render |
| `onClick` | `() => void` | — | Click handler |
| `title` | `string` | `""` | Native `title` attribute (tooltip on hover) |

## Usage

```tsx
import { IconButton } from "../ui";
import { Bell } from "lucide-react";

<IconButton icon={Bell} title="Notifications" onClick={openNotifications} />
```

## Related

Used by [TopBar](TopBar.md) for its Help and Notifications actions.
