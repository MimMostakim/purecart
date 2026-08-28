/**
 * SubSubscribeSaveSection - Settings → Subscriptions → Subscribe & Save.
 *
 * @file
 * @since 1.0.0
 */
import { SettingsToggleField, SettingsSelectField, SettingsField } from '../../Subscriptions/shared';
import type { SettingsSectionProps } from '../settingsSectionTypes';

const DISCOUNT_TYPE_OPTIONS = [
	{ label: 'Percentage', value: 'percentage' },
	{ label: 'Fixed amount', value: 'fixed' },
];

/**
 * Renders the Subscribe & Save settings section.
 *
 * @since 1.0.0
 *
 * @param {SettingsSectionProps} props Component props.
 *
 * @return {JSX.Element} The Subscribe & Save section fields.
 */
export function SubSubscribeSaveSection( { settings, update }: SettingsSectionProps ) {
	return (
		<>
			<SettingsToggleField label="Enable Subscribe & Save" checked={ settings.subscribeSaveEnabled } onChange={ ( v ) => update( 'subscribeSaveEnabled', v ) } />
			<SettingsSelectField
				label="Discount type"
				value={ settings.discountType }
				options={ DISCOUNT_TYPE_OPTIONS }
				onChange={ ( v ) => update( 'discountType', v as typeof settings.discountType ) }
			/>
			<SettingsField label="Discount value" type="number" value={ settings.discountValue } onChange={ ( v ) => update( 'discountValue', parseInt( v, 10 ) || 0 ) } />
			<SettingsField label="Savings badge label" value={ settings.savingsBadgeLabel } onChange={ ( v ) => update( 'savingsBadgeLabel', v ) } />
		</>
	);
}
