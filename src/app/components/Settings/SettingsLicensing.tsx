import { M3 } from '../../utils/static-data';
import {
	SettingsSectionHeader,
	SettingsSelectField,
	SettingsField,
	SettingsToggleField,
	FilledButton,
} from '../ui';

export function SettingsLicensing( { onSave }: { onSave: () => void } ) {
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
					Licensing
				</h2>
				<p
					className="text-sm mt-1"
					style={ {
						color: M3.onSurfaceVariant,
						fontFamily: 'Roboto, sans-serif',
					} }
				>
					Configure how licenses are issued, validated, and expired.
				</p>
			</div>
			<SettingsSectionHeader title="License Generation" />
			<SettingsSelectField
				label="Key Format"
				desc="Pattern used when generating new license keys."
				options={ [
					'WDD-XXXX-XXXX-XXXX',
					'XXXX-XXXX-XXXX-XXXX',
					'Custom',
				] }
				defaultValue="WDD-XXXX-XXXX-XXXX"
			/>
			<SettingsField
				label="Default Expiry (days)"
				desc="Default validity period for new licenses. Leave blank for lifetime."
				type="number"
				defaultValue="365"
			/>
			<SettingsField
				label="Grace Period (days)"
				desc="Days after expiry before a license stops functioning."
				type="number"
				defaultValue="14"
			/>
			<SettingsSectionHeader title="Activation Limits" />
			<SettingsField
				label="Default Site Activations"
				desc="Maximum sites a single license can activate on."
				type="number"
				defaultValue="1"
			/>
			<SettingsToggleField
				label="Allow Staging Activations"
				desc="Staging and local domains don't count toward the activation limit."
				defaultOn
			/>
			<SettingsToggleField
				label="Lock to IP on First Use"
				desc="Bind a license to the IP used during first activation."
				defaultOn={ false }
			/>
			<SettingsSectionHeader title="Validation API" />
			<SettingsField
				label="API Endpoint Base URL"
				desc="Public URL where plugins call for license validation."
				defaultValue="https://store.example.com/api/v1"
			/>
			<SettingsToggleField
				label="Require HMAC Signature"
				desc="Validate each request with a shared HMAC-SHA256 secret."
				defaultOn
			/>
			<SettingsField
				label="HMAC Secret"
				desc="Rotate this regularly. Changes take effect immediately."
				type="password"
				placeholder="••••••••••••••••••••••••••••••••"
			/>
			<div className="mt-6">
				<FilledButton small onClick={ onSave }>
					Save Licensing Settings
				</FilledButton>
			</div>
		</div>
	);
}
