/**
 * Settings module REST API client.
 *
 * @file
 * @since 1.0.0
 */
import { purecartFetch } from '@/shared/api';

/**
 * GET /purecart/v1/modules/settings
 *
 * @since 1.0.0
 */
export async function fetchModuleSettings(): Promise< { enabledModules: string[] } > {
	const raw = await purecartFetch< { enabled_modules: string[] } >( '/modules/settings' );
	return { enabledModules: raw.enabled_modules };
}

/**
 * POST /purecart/v1/modules/settings
 *
 * @since 1.0.0
 */
export async function saveModuleSettings( enabledModules: string[] ): Promise< void > {
	await purecartFetch( '/modules/settings', {
		method: 'POST',
		data: { enabled_modules: enabledModules },
	} );
}
