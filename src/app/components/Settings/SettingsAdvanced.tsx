import { M3 } from '../../utils/static-data';
import {
	SettingsSectionHeader,
	SettingsField,
	SettingsToggleField,
	SettingsSelectField,
	FilledButton,
	OutlinedButton,
} from '../ui';

export function SettingsAdvanced( { onSave }: { onSave: () => void } ) {
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
					Advanced
				</h2>
				<p
					className="text-sm mt-1"
					style={ {
						color: M3.onSurfaceVariant,
						fontFamily: 'Roboto, sans-serif',
					} }
				>
					Low-level configuration. Change with care.
				</p>
			</div>
			<SettingsSectionHeader title="API & Webhooks" />
			<SettingsField
				label="Webhook URL"
				desc="POST endpoint for license and subscription events."
				placeholder="https://your-app.com/webhooks/wdd"
			/>
			<SettingsField
				label="Webhook Secret"
				type="password"
				desc="Used to sign webhook payloads."
				placeholder="••••••••••••••••"
			/>
			<SettingsSelectField
				label="Webhook Events"
				desc="Which events trigger a webhook call."
				options={ [
					'All events',
					'License events only',
					'Subscription events only',
					'Security events only',
				] }
				defaultValue="All events"
			/>
			<SettingsSectionHeader title="Data & Privacy" />
			<SettingsField
				label="Data Retention (days)"
				desc="How long logs and event records are kept. 0 = forever."
				type="number"
				defaultValue="365"
			/>
			<SettingsToggleField
				label="Anonymise IP Addresses"
				desc="Store only the /24 subnet of customer IPs in logs."
				defaultOn={ false }
			/>
			<SettingsToggleField
				label="GDPR Deletion on Request"
				desc="Automatically delete all PII when a customer requests erasure."
				defaultOn
			/>
			<SettingsSectionHeader title="Cache & Performance" />
			<SettingsField
				label="License Validation Cache (sec)"
				desc="How long a successful validation result is cached."
				type="number"
				defaultValue="300"
			/>
			<SettingsToggleField
				label="Enable Query Cache"
				desc="Cache database queries for dashboard stats."
				defaultOn
			/>
			<div
				className="mt-6 pt-4"
				style={ { borderTop: `1px solid ${ M3.outlineVariant }` } }
			>
				<div
					className="text-sm font-medium mb-3"
					style={ {
						color: M3.error,
						fontFamily: 'Roboto, sans-serif',
					} }
				>
					Danger Zone
				</div>
				<div className="flex gap-2">
					<OutlinedButton danger small onClick={ () => {} }>
						Flush All Caches
					</OutlinedButton>
					<OutlinedButton danger small onClick={ () => {} }>
						Reset Plugin to Defaults
					</OutlinedButton>
				</div>
			</div>
			<div className="mt-4">
				<FilledButton small onClick={ onSave }>
					Save Advanced Settings
				</FilledButton>
			</div>
		</div>
	);
}
