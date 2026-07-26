# SettingsToggleField

Labeled row with a [Toggle](Toggle.md) switch, used to build settings forms. Same layout as [SettingsField](SettingsField.md) but for a boolean setting.

Source: [`SettingsToggleField.tsx`](../../src/app/components/ui/SettingsToggleField.tsx)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | — | Field label |
| `desc` | `string` | — | Optional helper text under the label |
| `defaultOn` | `boolean` | `false` | Initial toggle state |

## Behavior

Unlike [SettingsField](SettingsField.md)/[SettingsSelectField](SettingsSelectField.md), this component owns its own `on`/`off` state internally (`useState`) rather than being purely uncontrolled — there's no way to read or externally control the current value via props. If the parent needs to persist the value, lift the state up or read it via a form submission wrapper.

## Usage

```tsx
import { SettingsToggleField } from "../ui";

<SettingsToggleField
  label="Require license activation"
  desc="Block downloads until the license is activated."
  defaultOn
/>
```

## Related

Sibling components: [SettingsField](SettingsField.md), [SettingsSelectField](SettingsSelectField.md), grouped under a [SettingsSectionHeader](SettingsSectionHeader.md). Built on [Toggle](Toggle.md).
