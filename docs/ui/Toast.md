# Toast

Bottom-center snackbar/toast notification with an icon colored by type. Fades and slides in/out based on `visible`; does not auto-dismiss itself — the parent controls timing.

Source: [`Toast.tsx`](../../src/app/components/ui/Toast.tsx)

## Props (`ToastProps`)

| Prop | Type | Default | Description |
|---|---|---|---|
| `message` | `string` | — | Toast text |
| `type` | `"success" \| "info" \| "warning" \| "error"` | — | Determines icon and icon color |
| `visible` | `boolean` | — | Controls the fade/slide transition; the DOM node stays mounted regardless (`pointer-events-none`), only opacity/position animate |

## Usage

```tsx
import { useState, useEffect } from "react";
import { Toast } from "../ui";

const [toast, setToast] = useState({ visible: false, message: "", type: "success" as const });

function showToast(message: string, type: "success" | "info" | "warning" | "error" = "success") {
  setToast({ visible: true, message, type });
  setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000);
}

<Toast {...toast} />
```

Note: the caller is responsible for the dismiss timer (e.g. `setTimeout`) — `Toast` itself has no internal auto-hide logic.
