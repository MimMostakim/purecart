import { M3 } from '../../utils/static-data';
import {
	SettingsSectionHeader,
	SettingsSelectField,
	SettingsField,
	SettingsToggleField,
	FilledButton,
	TonalButton,
} from '../ui';

export function SettingsEmails( { onSave }: { onSave: () => void } ) {
	return (
		<div>
			<div className="mb-5">
				<h2
					className="font-medium text-lg"
					style={ {
						color: M3.onSurface,
						fontFamily: 'Roboto, sans-serif',
					} }
				>
					Emails
				</h2>
				<p
					className="text-sm mt-1"
					style={ {
						color: M3.onSurfaceVariant,
						fontFamily: 'Roboto, sans-serif',
					} }
				>
					Configure transactional email delivery and notification
					templates.
				</p>
			</div>
			<SettingsSectionHeader title="SMTP / Delivery" />
			<SettingsSelectField
				label="Mail Driver"
				desc="Email delivery provider."
				options={ [ 'SMTP', 'Postmark', 'SendGrid', 'Mailgun', 'SES' ] }
				defaultValue="Postmark"
			/>
			<SettingsField
				label="From Name"
				defaultValue="PureCart - Digital Downloads"
			/>
			<SettingsField
				label="From Email"
				type="email"
				defaultValue="noreply@example.com"
			/>
			<SettingsField
				label="Reply-To Email"
				type="email"
				defaultValue="support@example.com"
			/>
			<SettingsSectionHeader title="Notification Triggers" />
			<SettingsToggleField
				label="License Issued"
				desc="Send email when a new license is created after purchase."
				defaultOn
			/>
			<SettingsToggleField
				label="License Expiry Reminder"
				desc="Send reminder 7 days before license expiry."
				defaultOn
			/>
			<SettingsToggleField
				label="License Revoked"
				desc="Notify customer when their license is revoked by an admin."
				defaultOn
			/>
			<SettingsToggleField
				label="Subscription Renewal"
				desc="Confirm each successful subscription renewal."
				defaultOn
			/>
			<SettingsToggleField
				label="Subscription Failed"
				desc="Alert customer when a renewal payment fails."
				defaultOn
			/>
			<SettingsToggleField
				label="Abandoned Cart Recovery"
				desc="Send recovery emails as configured in the Abandoned Cart module."
				defaultOn
			/>
			<SettingsToggleField
				label="Admin Security Alerts"
				desc="Email admin when critical security events are detected."
				defaultOn
			/>
			<div className="mt-6 flex gap-2">
				<FilledButton small onClick={ onSave }>
					Save Email Settings
				</FilledButton>
				<TonalButton small onClick={ () => {} }>
					Send Test Email
				</TonalButton>
			</div>
		</div>
	);
}
