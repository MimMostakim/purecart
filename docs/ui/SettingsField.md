# SettingsField

Labeled row with a native text/number input, used to build settings forms. Renders a label + optional description on the left and an input on the right, separated by a bottom border (rows stack to form a list).

Source: [`SettingsField.tsx`](../../src/app/components/ui/SettingsField.tsx)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | — | Field label |
| `desc` | `string` | — | Optional helper text under the label |
| `type` | `string` | `"text"` | Native `input` type (e.g. `"text"`, `"number"`, `"email"`) |
| `defaultValue` | `string` | — | Initial input value (uncontrolled) |
| `placeholder` | `string` | — | Input placeholder |

Note: this is an **uncontrolled** input (`defaultValue`, not `value`) — the field manages its own DOM state; read values via a form submit / ref rather than a change handler.

## Usage

```tsx
import { SettingsField } from "../ui";

<SettingsField
  label="Grace period (days)"
  desc="Days after expiry before access is revoked."
  type="number"
  defaultValue="3"
/>
```

## Related

Sibling components: [SettingsSelectField](SettingsSelectField.md), [SettingsToggleField](SettingsToggleField.md), grouped under a [SettingsSectionHeader](SettingsSectionHeader.md).
