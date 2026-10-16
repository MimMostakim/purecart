/**
 * React context that holds the set of enabled module slugs.
 *
 * Consumed by Sidebar to hide disabled modules and by SettingsModules
 * to update the set when an admin toggles a module.
 *
 * @file
 * @since 1.0.0
 */
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { fetchModuleSettings, saveModuleSettings } from './api';

interface EnabledModulesValue {
	slugs: string[];
	toggle: ( slug: string ) => Promise< boolean >;
}

const EnabledModulesContext = createContext< EnabledModulesValue >( {
	slugs: [],
	toggle: async () => false,
} );

const ALL_DEFAULTS = [
	'secure-downloads',
	'license-manager',
	'update-manager',
	'subscriptions',
	'saas-provisioning',
	'affiliate-program',
	'abandoned-cart',
	'analytics',
	'security-suite',
];

export function EnabledModulesProvider( { children }: { children: ReactNode } ) {
	const [ slugs, setSlugs ] = useState< string[] >( ALL_DEFAULTS );

	useEffect( () => {
		fetchModuleSettings()
			.then( ( res ) => setSlugs( res.enabledModules ) )
			.catch( () => {} );
	}, [] );

	const toggle = useCallback( async ( slug: string ): Promise< boolean > => {
		const next = slugs.includes( slug )
			? slugs.filter( ( s ) => s !== slug )
			: [ ...slugs, slug ];

		try {
			await saveModuleSettings( next );
			setSlugs( next );
			return true;
		} catch {
			return false;
		}
	}, [ slugs ] );

	return (
		<EnabledModulesContext.Provider value={ { slugs, toggle } }>
			{ children }
		</EnabledModulesContext.Provider>
	);
}

export function useEnabledModules() {
	return useContext( EnabledModulesContext );
}
