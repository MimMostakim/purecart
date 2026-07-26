# SettingsSelectField

Labeled row with a native `<select>` dropdown, used to build settings forms. Same layout as [SettingsField](SettingsField.md) but for a fixed set of options.

Source: [`SettingsSelectField.tsx`](../../src/app/components/ui/SettingsSelectField.tsx)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | — | Field label |
| `desc` | `string` | — | Optional helper text under the label |
| `options` | `string[]` | — | Selectable option strings |
| `defaultValue` | `string` | — | Initially selected option (uncontrolled) |

Note: uncontrolled (`defaultValue`, not `value`) — same caveat as [SettingsField](SettingsField.md).

## Usage

```tsx
import { SettingsSelectField } from "../ui";

<SettingsSelectField
  label="Default license type"
  options={["Single Site", "Multi Site", "Unlimited"]}
  defaultValue="Single Site"
/>
```

## Related

Sibling components: [SettingsField](SettingsField.md), [SettingsToggleField](SettingsToggleField.md), grouped under a [SettingsSectionHeader](SettingsSectionHeader.md).
