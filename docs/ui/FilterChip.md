# FilterChip

Dropdown filter chip used in table/list toolbars (e.g. Licenses page filters). Shows a label with a chevron when inactive; once a value is selected it shows the value and an inline "×" to clear back to "All".

Source: [`FilterChip.tsx`](../../src/app/components/ui/FilterChip.tsx)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | — | Filter name shown when no value is selected (e.g. "Status"), and used to build the "All {label}s" option |
| `value` | `string` | — | Currently selected value; `"All"` means inactive |
| `options` | `string[]` | — | Selectable values (an implicit "All" option is prepended) |
| `onChange` | `(v: string) => void` | — | Called with the newly selected value |

## Behavior

- Open state is local (`useState`); a fixed backdrop closes the dropdown on outside click.
- Active chips (value !== "All") render in `M3.primaryContainer` with a primary border; inactive chips render neutral.
- Clicking the "×" on an active chip resets it to `"All"` without opening the dropdown.

## Usage

```tsx
import { useState } from "react";
import { FilterChip } from "../ui";

const [status, setStatus] = useState("All");

<FilterChip
  label="Status"
  value={status}
  options={["Active", "Expired", "Suspended", "Revoked"]}
  onChange={setStatus}
/>
```
