/**
 * SubRenewalsSection - Settings → Subscriptions → Renewals & Reminders.
 *
 * @file
 * @since 1.0.0
 */
import { SettingsField, SettingsToggleField } from '../../Subscriptions/shared';
import { numbersToCsv, csvToNumbers, type SettingsSectionProps } from '../settingsSectionTypes';

/**
 * Renders the Renewals & Reminders settings section.
 *
 * @since 1.0.0
 *
 * @param {SettingsSectionProps} props Component props.
 *
 * @return {JSX.Element} The Renewals & Reminders section fields.
 */
export function SubRenewalsSection( { settings, update }: SettingsSectionProps ) {
	return (
		<>
			<SettingsField
				label="Renewal reminder days (before due)"
				value={ numbersToCsv( settings.renewalReminderDays ) }
				onChange={ ( v ) => update( 'renewalReminderDays', csvToNumbers( v ) ) }
				helpText="Comma-separated, e.g. 7, 3, 1"
			/>
			<SettingsField label="Card expiry warning days" type="number" suffix="days" value={ settings.cardExpiryWarningDays } onChange={ ( v ) => update( 'cardExpiryWarningDays', parseInt( v, 10 ) || 0 ) } />
			<SettingsToggleField label="Enable renewal sync" checked={ settings.enableRenewalSync } onChange={ ( v ) => update( 'enableRenewalSync', v ) } helpText="Align all subscriptions on a product to a fixed calendar date" />
			<SettingsField label="Sync day of month" type="number" value={ settings.renewalSyncDate } onChange={ ( v ) => update( 'renewalSyncDate', parseInt( v, 10 ) || 1 ) } disabled={ ! settings.enableRenewalSync } />
		</>
	);
}
