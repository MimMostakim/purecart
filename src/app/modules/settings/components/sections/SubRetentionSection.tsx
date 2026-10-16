/**
 * SubRetentionSection - Settings → Subscriptions → Retention.
 *
 * @file
 * @since 1.0.0
 */
import { SettingsToggleField, SettingsField } from '../shared';
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
export function SubRetentionSection( {
	settings,
	update,
}: SettingsSectionProps ) {
	return (
		<>
			<SettingsToggleField
				label="Enable retention flow"
				checked={ settings.retentionFlowEnabled }
				onChange={ ( v ) => update( 'retentionFlowEnabled', v ) }
			/>
			<SettingsField
				label="Retention discount (%)"
				type="number"
				value={ settings.retentionDiscountPercent }
				onChange={ ( v ) =>
					update( 'retentionDiscountPercent', parseInt( v, 10 ) || 0 )
				}
				disabled={ ! settings.retentionFlowEnabled }
				helpText="Discount offered to customers attempting to cancel"
			/>
			<SettingsField
				label="Discount cycles"
				type="number"
				value={ settings.retentionDiscountCycles }
				onChange={ ( v ) =>
					update( 'retentionDiscountCycles', parseInt( v, 10 ) || 0 )
				}
				disabled={ ! settings.retentionFlowEnabled }
				helpText="Number of billing cycles the retention discount applies"
			/>
			<SettingsField
				label="Pause duration"
				suffix="days"
				type="number"
				value={ settings.retentionPauseDays }
				onChange={ ( v ) =>
					update( 'retentionPauseDays', parseInt( v, 10 ) || 0 )
				}
				disabled={ ! settings.retentionFlowEnabled }
				helpText="How long a subscription can be paused via the retention flow"
			/>
			<SettingsField
				label="Support contact URL"
				value={ settings.retentionContactUrl }
				onChange={ ( v ) => update( 'retentionContactUrl', v ) }
				disabled={ ! settings.retentionFlowEnabled }
				helpText="Shown in the retention flow as a 'Talk to us' option"
			/>
		</>
	);
}
