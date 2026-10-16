/**
 * SubRoleMappingSection - Settings → Subscriptions → Role Mapping.
 *
 * @file
 * @since 1.0.0
 */
import { useEffect, useState } from 'react';
import { fetchWpRoles, type WpRole } from '@/modules/subscriptions';
import { SettingsSelectField } from '../shared';
import type { SettingsSectionProps } from '../settingsSectionTypes';

const FALLBACK_ROLES: WpRole[] = [
	{ label: 'None', value: '' },
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
export function SubRoleMappingSection( {
	settings,
	update,
}: SettingsSectionProps ) {
	const [ roles, setRoles ] = useState< WpRole[] >( FALLBACK_ROLES );

	useEffect( () => {
		fetchWpRoles()
			.then( setRoles )
			.catch( () => {} );
	}, [] );

	return (
		<>
			<SettingsSelectField
				label="Trial role"
				value={ settings.trialRole ?? '' }
				options={ roles }
				onChange={ ( v ) => update( 'trialRole', v || null ) }
			/>
			<SettingsSelectField
				label="Active role"
				value={ settings.activeRole ?? '' }
				options={ roles }
				onChange={ ( v ) => update( 'activeRole', v || null ) }
			/>
			<SettingsSelectField
				label="Cancelled role"
				value={ settings.cancelledRole ?? '' }
				options={ roles }
				onChange={ ( v ) => update( 'cancelledRole', v || null ) }
			/>
		</>
	);
}
