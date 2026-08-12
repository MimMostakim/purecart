/**
 * SubCustomerPortalSection - Settings → Subscriptions → Customer Portal.
 *
 * @file
 * @since 1.0.0
 */
import { SettingsToggleField, SettingsField } from '../../Subscriptions/shared';
import type { SettingsSectionProps } from '../settingsSectionTypes';

/**
 * Renders the Customer Portal settings section.
 *
 * @since 1.0.0
 *
 * @param {SettingsSectionProps} props Component props.
 *
 * @return {JSX.Element} The Customer Portal section fields.
 */
export function SubCustomerPortalSection( { settings, update }: SettingsSectionProps ) {
	return (
		<>
			<SettingsToggleField label="Allow customer self-pause" checked={ settings.allowSelfPause } onChange={ ( v ) => update( 'allowSelfPause', v ) } />
			<SettingsToggleField label="Allow customer self-cancel" checked={ settings.allowSelfCancel } onChange={ ( v ) => update( 'allowSelfCancel', v ) } />
			<SettingsToggleField label="Allow customer early renewal" checked={ settings.allowEarlyRenewal } onChange={ ( v ) => update( 'allowEarlyRenewal', v ) } />
			<SettingsToggleField label="Allow customer to skip renewal" checked={ settings.allowSkipRenewal } onChange={ ( v ) => update( 'allowSkipRenewal', v ) } />
			<SettingsField label="Max skips per billing year (0 = unlimited)" type="number" value={ settings.skipLimitPerYear } onChange={ ( v ) => update( 'skipLimitPerYear', parseInt( v, 10 ) || 0 ) } />
		</>
	);
}
