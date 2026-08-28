/**
 * SubAdvancedSection - Settings → Subscriptions → Advanced.
 *
 * @file
 * @since 1.0.0
 */
import { SettingsTextareaField, SettingsToggleField } from '../../Subscriptions/shared';
import type { SettingsSectionProps } from '../settingsSectionTypes';

/**
 * Renders the Advanced settings section.
 *
 * @since 1.0.0
 *
 * @param {SettingsSectionProps} props Component props.
 *
 * @return {JSX.Element} The Advanced section fields.
 */
export function SubAdvancedSection( { settings, update }: SettingsSectionProps ) {
	return (
		<>
			<SettingsTextareaField
				label="Staging / blocked domains"
				helpText="Domains that should never trigger a live renewal charge, one per line"
				value={ settings.stagingDomains }
				onChange={ ( v ) => update( 'stagingDomains', v ) }
			/>
			<SettingsTextareaField
				label="Gateway meta keys"
				helpText="One per line"
				value={ settings.gatewayMetaKeys }
				onChange={ ( v ) => update( 'gatewayMetaKeys', v ) }
			/>
			<SettingsToggleField label="Cancel SaaS immediately" checked={ settings.cancelSaasImmediately } onChange={ ( v ) => update( 'cancelSaasImmediately', v ) } />
			<SettingsToggleField label="Debug mode" checked={ settings.debugMode } onChange={ ( v ) => update( 'debugMode', v ) } />
		</>
	);
}
