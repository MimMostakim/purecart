# SettingsSectionHeader

Heading used to divide groups of rows on a settings tab (e.g. [SettingsPage](../../src/app/components/Settings/SettingsPage.tsx) tabs). Renders a title and an optional description underneath.

Source: [`SettingsSectionHeader.tsx`](../../src/app/components/ui/SettingsSectionHeader.tsx)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` | `string` | — | Section heading |
| `desc` | `string` | — | Optional description shown below the title |

## Usage

```tsx
import { SettingsSectionHeader } from "../ui";

<SettingsSectionHeader title="License Enforcement" desc="Control how strictly activations are checked." />
```

## Related

Typically followed by rows of [SettingsField](SettingsField.md), [SettingsSelectField](SettingsSelectField.md), or [SettingsToggleField](SettingsToggleField.md).
