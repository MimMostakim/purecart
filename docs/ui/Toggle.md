# Toggle

Standalone M3-style on/off switch (pill track + sliding thumb). Fully controlled — the caller owns the state.

Source: [`Toggle.tsx`](../../src/app/components/ui/Toggle.tsx)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `on` | `boolean` | — | Current state |
| `onChange` | `(v: boolean) => void` | — | Called with the new state when clicked |

## Usage

```tsx
import { useState } from "react";
import { Toggle } from "../ui";

const [on, setOn] = useState(false);

<Toggle on={on} onChange={setOn} />
```

## Related

Used internally by [SettingsToggleField](SettingsToggleField.md) for labeled settings rows.
