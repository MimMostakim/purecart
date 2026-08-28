/**
 * SubMembershipSection - Settings → Subscriptions → Membership (conditional,
 * visible only when a membership-type subscription exists).
 *
 * @file
 * @since 1.0.0
 */
import { SettingsField, SettingsSelectField, SettingsTextareaField, SettingsToggleField } from '../../Subscriptions/shared';
import type { SettingsSectionProps } from '../settingsSectionTypes';

const RESTRICTION_PLUGIN_OPTIONS = [
	{ label: 'None', value: 'none' },
	{ label: 'MemberPress', value: 'memberpress' },
	{ label: 'Restrict Content Pro', value: 'restrict_content_pro' },
	{ label: 'Custom', value: 'custom' },
];

/**
 * Renders the Membership settings section.
 *
 * @since 1.0.0
 *
 * @param {SettingsSectionProps} props Component props.
 *
 * @return {JSX.Element} The Membership section fields.
 */
export function SubMembershipSection( { settings, update }: SettingsSectionProps ) {
	return (
		<>
			<SettingsField label="Grace period after cancellation" suffix="days" type="number" value={ settings.membershipGraceDays } onChange={ ( v ) => update( 'membershipGraceDays', parseInt( v, 10 ) || 0 ) } />
			<SettingsSelectField
				label="Content restriction plugin"
				value={ settings.contentRestrictionPlugin }
				options={ RESTRICTION_PLUGIN_OPTIONS }
				onChange={ ( v ) => update( 'contentRestrictionPlugin', v ) }
			/>
			<SettingsTextareaField label="Available tiers" helpText="Comma-separated" value={ settings.availableTiers } onChange={ ( v ) => update( 'availableTiers', v ) } />
			<SettingsToggleField label="Allow self-tier-upgrade" checked={ settings.allowSelfTierUpgrade } onChange={ ( v ) => update( 'allowSelfTierUpgrade', v ) } />
		</>
	);
}
