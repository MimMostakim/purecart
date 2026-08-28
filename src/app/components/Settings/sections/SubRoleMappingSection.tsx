/**
 * SubRoleMappingSection - Settings → Subscriptions → Role Mapping.
 *
 * Data gap, honestly noted: there's no list of real WP roles anywhere in
 * this frontend-only plan (that's a `wp_roles` PHP lookup). The options
 * below are a short hardcoded placeholder list - replace with a real roles
 * endpoint once the backend exists.
 *
 * @file
 * @since 1.0.0
 */
import { SettingsSelectField } from '../../Subscriptions/shared';
import type { SettingsSectionProps } from '../settingsSectionTypes';

const ROLE_OPTIONS = [
	{ label: 'None', value: '' },
	{ label: 'Administrator', value: 'administrator' },
	{ label: 'Subscriber', value: 'subscriber' },
	{ label: 'Premium Member', value: 'premium_member' },
];

/**
 * Renders the Role Mapping settings section.
 *
 * @since 1.0.0
 *
 * @param {SettingsSectionProps} props Component props.
 *
 * @return {JSX.Element} The Role Mapping section fields.
 */
export function SubRoleMappingSection( { settings, update }: SettingsSectionProps ) {
	return (
		<>
			<SettingsSelectField label="Trial role" value={ settings.trialRole ?? '' } options={ ROLE_OPTIONS } onChange={ ( v ) => update( 'trialRole', v || null ) } />
			<SettingsSelectField label="Active role" value={ settings.activeRole ?? '' } options={ ROLE_OPTIONS } onChange={ ( v ) => update( 'activeRole', v || null ) } />
			<SettingsSelectField label="Cancelled role" value={ settings.cancelledRole ?? '' } options={ ROLE_OPTIONS } onChange={ ( v ) => update( 'cancelledRole', v || null ) } />
		</>
	);
}
