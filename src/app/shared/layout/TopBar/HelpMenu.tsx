/**
 * HelpMenu component.
 *
 * The top bar's "?" button: a contextual help panel for whichever page is
 * open — what it is for, and a few concrete things that can be done on it.
 *
 * It explains the page in place rather than linking out: the plugin ships no
 * documentation site, and a Help button pointing at a URL that doesn't exist
 * is worse than one that answers the question itself. Point the footer at
 * real docs the day there are some.
 *
 * @file
 * @since 1.1.0
 */
import { HelpCircle } from 'lucide-react';
import { __, sprintf } from '@wordpress/i18n';
import { M3 } from '@/theme';
import { AnchoredMenu, IconButton } from '@/shared/ui';
import { getAdminConfig } from '@/shared/wp';
import type { Page } from '@/shared/types/page';
import { PAGE_TITLES } from '../nav-schema';
import { getPageHelp } from './page-help';

/**
 * Renders the help button and its panel for the current page.
 *
 * @since 1.1.0
 *
 * @param {Object} props      Component props.
 * @param {Page}   props.page The page the panel describes.
 *
 * @return {JSX.Element} The help button and its menu.
 */
export function HelpMenu( { page }: { page: Page } ) {
	const help = getPageHelp( page );
	const version = getAdminConfig().version;

	return (
		<AnchoredMenu
			panelWidth={ 340 }
			label={ __( 'Help', 'purecart' ) }
			trigger={ ( open ) => (
				<IconButton icon={ HelpCircle } title={ __( 'Help', 'purecart' ) } active={ open } />
			) }
		>
			{ () => (
				<>
					<div
						className="px-4 py-2.5 flex-shrink-0"
						style={ {
							backgroundColor: M3.surfaceContainerLow,
							borderBottom: `1px solid ${ M3.outlineVariant }`,
						} }
					>
						<span
							className="text-xs font-medium"
							style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif' } }
						>
							{ sprintf(
								/* translators: %s: name of the current admin page. */
								__( 'About %s', 'purecart' ),
								PAGE_TITLES[ page ]
							) }
						</span>
					</div>

					<div className="overflow-y-auto px-4 py-3" style={ { overscrollBehavior: 'contain' } }>
						<p
							className="text-sm"
							style={ {
								color: M3.onSurface,
								fontFamily: 'Roboto, sans-serif',
								margin: 0,
							} }
						>
							{ help.description }
						</p>

						<ul className="mt-3 flex flex-col gap-2" style={ { margin: 0, padding: 0, listStyle: 'none' } }>
							{ help.tips.map( ( tip ) => (
								<li
									key={ tip }
									className="flex items-start gap-2 text-xs"
									style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif' } }
								>
									<span
										className="rounded-full flex-shrink-0"
										style={ {
											width: 5,
											height: 5,
											marginTop: 6,
											backgroundColor: M3.primary,
										} }
									/>
									<span>{ tip }</span>
								</li>
							) ) }
						</ul>
					</div>

					{ version && (
						<div
							className="px-4 py-2 flex-shrink-0"
							style={ {
								borderTop: `1px solid ${ M3.outlineVariant }`,
								color: M3.onSurfaceVariant,
								fontFamily: 'Roboto, sans-serif',
								fontSize: '11px',
							} }
						>
							{ sprintf(
								/* translators: %s: plugin version number. */
								__( 'PureCart %s', 'purecart' ),
								version
							) }
						</div>
					) }
				</>
			) }
		</AnchoredMenu>
	);
}
