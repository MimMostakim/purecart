/**
 * SettingsPage - top-level Settings container.
 *
 * This repo has no other modules yet (Licensing, SaaS, etc.), so a
 * multi-tab shell with stub tabs for modules that don't exist would be
 * inventing UI nobody asked for. Ships with exactly one real tab.
 *
 * @file
 * @since 1.0.0
 */
import { M3 } from '../../utils/static-data';
import { SettingsSubscriptions } from './SettingsSubscriptions';

export const SETTINGS_TABS = [ 'Subscriptions' ] as const;
// Add 'Licensing', 'Downloads', 'Emails', etc. here only when those modules
// actually land in this repo — each brings its own settings section the
// same way this file brings 'Subscriptions'.

/**
 * Renders the Settings page.
 *
 * @since 1.0.0
 *
 * @return {JSX.Element} The settings page.
 */
export function SettingsPage() {
	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center gap-1" style={ { borderBottom: `1px solid ${ M3.outlineVariant }` } }>
				{ SETTINGS_TABS.map( ( tab ) => (
					<div
						key={ tab }
						className="px-4 py-2.5 text-sm font-medium"
						style={ {
							color: M3.primary,
							fontFamily: 'Roboto, sans-serif',
							borderBottom: `2px solid ${ M3.primary }`,
							marginBottom: -1,
						} }
					>
						{ tab }
					</div>
				) ) }
			</div>
			<SettingsSubscriptions />
		</div>
	);
}
