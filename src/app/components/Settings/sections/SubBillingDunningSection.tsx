/**
 * SubBillingDunningSection - Settings → Subscriptions → Billing & Dunning.
 *
 * @file
 * @since 1.0.0
 */
import { SettingsField, SettingsToggleField } from '../../Subscriptions/shared';
import { numbersToCsv, csvToNumbers, type SettingsSectionProps } from '../settingsSectionTypes';

/**
 * Renders the Billing & Dunning settings section.
 *
 * @since 1.0.0
 *
 * @param {SettingsSectionProps} props Component props.
 *
 * @return {JSX.Element} The Billing & Dunning section fields.
 */
export function SubBillingDunningSection( { settings, update }: SettingsSectionProps ) {
	return (
		<>
			<SettingsField label="Max retry attempts" type="number" value={ settings.maxRetryAttempts } onChange={ ( v ) => update( 'maxRetryAttempts', parseInt( v, 10 ) || 0 ) } />
			<SettingsField
				label="Retry schedule (days after fail)"
				value={ numbersToCsv( settings.retryIntervalDays ) }
				onChange={ ( v ) => update( 'retryIntervalDays', csvToNumbers( v ) ) }
				helpText="Comma-separated, e.g. 1, 3, 5"
			/>
			<SettingsField label="Active grace days (past_due → suspended)" type="number" suffix="days" value={ settings.activeGraceDays } onChange={ ( v ) => update( 'activeGraceDays', parseInt( v, 10 ) || 0 ) } />
			<SettingsField label="Suspended grace days (suspended → cancelled)" type="number" suffix="days" value={ settings.suspendedGraceDays } onChange={ ( v ) => update( 'suspendedGraceDays', parseInt( v, 10 ) || 0 ) } />
			<SettingsToggleField label="Send dunning emails" checked={ settings.sendDunningEmails } onChange={ ( v ) => update( 'sendDunningEmails', v ) } />
		</>
	);
}
