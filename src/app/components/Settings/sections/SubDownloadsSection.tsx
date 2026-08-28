/**
 * SubDownloadsSection - Settings → Subscriptions → Digital Downloads
 * (conditional, visible only when a download-type subscription exists).
 *
 * @file
 * @since 1.0.0
 */
import { SettingsField, SettingsToggleField } from '../../Subscriptions/shared';
import type { SettingsSectionProps } from '../settingsSectionTypes';

/**
 * Renders the Digital Downloads settings section.
 *
 * @since 1.0.0
 *
 * @param {SettingsSectionProps} props Component props.
 *
 * @return {JSX.Element} The Digital Downloads section fields.
 */
export function SubDownloadsSection( { settings, update }: SettingsSectionProps ) {
	return (
		<>
			<SettingsField label="Download limit per billing cycle (0 = unlimited)" type="number" value={ settings.downloadLimitPerCycle } onChange={ ( v ) => update( 'downloadLimitPerCycle', parseInt( v, 10 ) || 0 ) } />
			<SettingsToggleField label="Reset downloads on renewal" checked={ settings.resetDownloadsOnRenewal } onChange={ ( v ) => update( 'resetDownloadsOnRenewal', v ) } />
			<SettingsToggleField label="Enable drip content delivery" checked={ settings.enableDripContent } onChange={ ( v ) => update( 'enableDripContent', v ) } />
			<SettingsField label="Drip interval (days between releases)" type="number" value={ settings.dripIntervalDays } onChange={ ( v ) => update( 'dripIntervalDays', parseInt( v, 10 ) || 0 ) } disabled={ ! settings.enableDripContent } />
		</>
	);
}
