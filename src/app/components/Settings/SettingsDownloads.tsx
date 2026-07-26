import { M3 } from '../../utils/static-data';
import {
	SettingsSectionHeader,
	SettingsField,
	SettingsToggleField,
	SettingsSelectField,
	FilledButton,
} from '../ui';

export function SettingsDownloads( { onSave }: { onSave: () => void } ) {
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
					Downloads
				</h2>
				<p
					className="text-sm mt-1"
					style={ {
						color: M3.onSurfaceVariant,
						fontFamily: 'Roboto, sans-serif',
					} }
				>
					Control how download links are generated, secured, and
					expired.
				</p>
			</div>
			<SettingsSectionHeader title="Secure Link Settings" />
			<SettingsField
				label="Link Expiry (minutes)"
				desc="How long a generated download URL remains valid."
				type="number"
				defaultValue="60"
			/>
			<SettingsField
				label="Max Downloads per Link"
				desc="Maximum number of times a single signed URL can be used."
				type="number"
				defaultValue="3"
			/>
			<SettingsToggleField
				label="Bind Link to IP"
				desc="Download links are only valid from the IP that requested them."
				defaultOn={ false }
			/>
			<SettingsSectionHeader title="Storage" />
			<SettingsSelectField
				label="Storage Driver"
				desc="Where package files are stored."
				options={ [
					'Local (filesystem)',
					'Amazon S3',
					'Cloudflare R2',
					'DigitalOcean Spaces',
				] }
				defaultValue="Amazon S3"
			/>
			<SettingsField
				label="CDN Base URL"
				desc="Public CDN domain used to serve download files."
				defaultValue="https://cdn.example.com/downloads"
			/>
			<SettingsSectionHeader title="Rate Limiting" />
			<SettingsField
				label="Max Downloads / IP / Hour"
				desc="Set 0 to disable IP-level rate limiting."
				type="number"
				defaultValue="10"
			/>
			<SettingsToggleField
				label="Block Tor Exit Nodes"
				desc="Automatically block download requests from known Tor IPs."
				defaultOn
			/>
			<div className="mt-6">
				<FilledButton small onClick={ onSave }>
					Save Download Settings
				</FilledButton>
			</div>
		</div>
	);
}
