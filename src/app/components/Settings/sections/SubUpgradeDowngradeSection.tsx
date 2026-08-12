/**
 * SubUpgradeDowngradeSection - Settings → Subscriptions → Upgrade / Downgrade.
 *
 * @file
 * @since 1.0.0
 */
import { SettingsSelectField, SettingsToggleField } from '../../Subscriptions/shared';
import type { SettingsSectionProps } from '../settingsSectionTypes';

const PRORATION_OPTIONS = [
	{ label: 'Apply at renewal (default)', value: 'apply_at_renewal' },
	{ label: 'Prorate immediately', value: 'prorate_immediately' },
	{ label: 'No proration', value: 'no_proration' },
];

/**
 * Renders the Upgrade / Downgrade settings section.
 *
 * @since 1.0.0
 *
 * @param {SettingsSectionProps} props Component props.
 *
 * @return {JSX.Element} The Upgrade / Downgrade section fields.
 */
export function SubUpgradeDowngradeSection( { settings, update }: SettingsSectionProps ) {
	return (
		<>
			<SettingsSelectField
				label="Default proration mode"
				value={ settings.defaultProrationMode }
				options={ PRORATION_OPTIONS }
				onChange={ ( v ) => update( 'defaultProrationMode', v as typeof settings.defaultProrationMode ) }
			/>
			<SettingsToggleField label="Allow customer upgrade/downgrade" checked={ settings.allowCustomerUpgrade } onChange={ ( v ) => update( 'allowCustomerUpgrade', v ) } />
		</>
	);
}
