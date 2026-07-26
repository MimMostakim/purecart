import { M3 } from '../../utils/static-data';
import {
	SettingsToggleField,
	SettingsSelectField,
	SettingsField,
	FilledButton,
} from '../ui';

export function SettingsGenericTab( {
	name,
	onSave,
}: {
	name: string;
	onSave: () => void;
} ) {
	const configs: Record<
		string,
		Array< {
			type: 'toggle' | 'field' | 'select';
			label: string;
			desc?: string;
			defaultValue?: string;
			defaultOn?: boolean;
			options?: string[];
		} >
	> = {
		Updates: [
			{
				type: 'toggle',
				label: 'Auto-Publish Patch Releases',
				desc: 'Automatically promote x.x.N releases to stable without manual review.',
				defaultOn: false,
			},
			{
				type: 'field',
				label: 'Update Check Interval (hours)',
				desc: 'How often connected plugins check for updates.',
				defaultValue: '12',
			},
			{
				type: 'toggle',
				label: 'Notify Admin on New Release',
				desc: 'Send admin email when a new package is published.',
				defaultOn: true,
			},
			{
				type: 'select',
				label: 'Default Release Channel',
				options: [ 'stable', 'beta', 'nightly' ],
				defaultValue: 'stable',
			},
		],
		Subscriptions: [
			{
				type: 'field',
				label: 'Dunning Retry Attempts',
				desc: 'How many times to retry a failed payment before cancelling.',
				defaultValue: '3',
			},
			{
				type: 'field',
				label: 'Retry Interval (days)',
				desc: 'Days between each payment retry.',
				defaultValue: '3',
			},
			{
				type: 'toggle',
				label: 'Prorate Plan Changes',
				desc: 'Charge/credit the difference when a customer changes plans.',
				defaultOn: true,
			},
			{
				type: 'toggle',
				label: 'Allow Customer Pausing',
				desc: 'Let customers pause their own subscription from the portal.',
				defaultOn: true,
			},
			{
				type: 'select',
				label: 'Cancellation Behaviour',
				options: [ 'End of period', 'Immediately', 'Ask customer' ],
				defaultValue: 'End of period',
			},
		],
		SaaS: [
			{
				type: 'field',
				label: 'Trial Period (days)',
				desc: 'Length of free trial for new SaaS accounts.',
				defaultValue: '14',
			},
			{
				type: 'toggle',
				label: 'Require Credit Card on Trial',
				desc: 'Require payment details before starting a trial.',
				defaultOn: false,
			},
			{
				type: 'field',
				label: 'Seat Over-Provisioning (%)',
				desc: 'Allow accounts to exceed their seat limit by this %.',
				defaultValue: '10',
			},
			{
				type: 'toggle',
				label: 'Auto-Suspend on Non-Payment',
				desc: 'Suspend account immediately if payment fails after dunning.',
				defaultOn: true,
			},
		],
		Affiliates: [
			{
				type: 'field',
				label: 'Default Commission Rate (%)',
				desc: 'Default % commission for new affiliates.',
				defaultValue: '10',
			},
			{
				type: 'field',
				label: 'Cookie Duration (days)',
				desc: 'How long a referral cookie lasts before expiring.',
				defaultValue: '60',
			},
			{
				type: 'select',
				label: 'Commission Trigger',
				options: [
					'On purchase',
					'After refund window',
					'On subscription renewal',
				],
				defaultValue: 'After refund window',
			},
			{
				type: 'toggle',
				label: 'Auto-Approve Affiliates',
				desc: 'Automatically approve new affiliate applications.',
				defaultOn: false,
			},
			{
				type: 'field',
				label: 'Minimum Payout ($)',
				desc: 'Minimum balance required before a payout is triggered.',
				defaultValue: '50',
			},
		],
		'Abandoned Cart': [
			{
				type: 'field',
				label: 'Abandon Timeout (minutes)',
				desc: 'Minutes of inactivity before a cart is marked abandoned.',
				defaultValue: '30',
			},
			{
				type: 'field',
				label: 'Email 1 Delay (minutes)',
				desc: 'Send first recovery email X minutes after abandonment.',
				defaultValue: '60',
			},
			{
				type: 'field',
				label: 'Email 2 Delay (hours)',
				desc: 'Send second recovery email X hours after abandonment.',
				defaultValue: '24',
			},
			{
				type: 'field',
				label: 'Email 3 Delay (hours)',
				desc: 'Send third recovery email X hours after abandonment.',
				defaultValue: '72',
			},
			{
				type: 'toggle',
				label: 'Include Discount in Email 3',
				desc: 'Attach a one-time discount code to the final recovery email.',
				defaultOn: true,
			},
			{
				type: 'field',
				label: 'Auto-Discount Amount (%)',
				desc: '% discount to include in the final recovery email.',
				defaultValue: '10',
			},
		],
		Security: [
			{
				type: 'field',
				label: 'Max Login Attempts',
				desc: 'Failed logins before an IP is auto-blocked.',
				defaultValue: '10',
			},
			{
				type: 'field',
				label: 'Lockout Duration (minutes)',
				desc: 'How long a blocked IP stays locked out.',
				defaultValue: '60',
			},
			{
				type: 'toggle',
				label: 'Block Tor Exit Nodes',
				desc: 'Auto-block all known Tor exit node IPs.',
				defaultOn: true,
			},
			{
				type: 'toggle',
				label: 'Geo-Block High-Risk Countries',
				desc: 'Block requests from countries flagged as high risk.',
				defaultOn: false,
			},
			{
				type: 'toggle',
				label: 'Alert Admin on Brute Force',
				desc: 'Email admin when a brute-force wave is detected.',
				defaultOn: true,
			},
			{
				type: 'select',
				label: '2FA Requirement',
				options: [ 'None', 'Admin users only', 'All users' ],
				defaultValue: 'Admin users only',
			},
		],
	};
	const fields = configs[ name ] ?? [];
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
					{ name } Settings
				</h2>
			</div>
			{ fields.map( ( f, i ) =>
				f.type === 'toggle' ? (
					<SettingsToggleField
						key={ i }
						label={ f.label }
						desc={ f.desc }
						defaultOn={ f.defaultOn }
					/>
				) : f.type === 'select' ? (
					<SettingsSelectField
						key={ i }
						label={ f.label }
						desc={ f.desc }
						options={ f.options! }
						defaultValue={ f.defaultValue }
					/>
				) : (
					<SettingsField
						key={ i }
						label={ f.label }
						desc={ f.desc }
						type="text"
						defaultValue={ f.defaultValue }
					/>
				)
			) }
			<div className="mt-6">
				<FilledButton small onClick={ onSave }>
					Save { name } Settings
				</FilledButton>
			</div>
		</div>
	);
}
