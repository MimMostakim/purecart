/**
 * SubRetentionSection - Settings → Subscriptions → Retention.
 *
 * @file
 * @since 1.0.0
 */
import { M3 } from '../../../utils/static-data';
import { SettingsToggleField } from '../../Subscriptions/shared';
import type { SettingsSectionProps } from '../settingsSectionTypes';

/**
 * Renders the Retention settings section.
 *
 * @since 1.0.0
 *
 * @param {SettingsSectionProps} props Component props.
 *
 * @return {JSX.Element} The Retention section fields.
 */
export function SubRetentionSection( { settings, update }: SettingsSectionProps ) {
	return (
		<>
			<SettingsToggleField label="Enable retention flow" checked={ settings.retentionFlowEnabled } onChange={ ( v ) => update( 'retentionFlowEnabled', v ) } />
			<div className="text-xs pt-2" style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif' } }>
				Per-reason offer configuration is set on each product; this is the module-wide toggle.
			</div>
		</>
	);
}
