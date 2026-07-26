import { Package, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { M3, NAV_SCHEMA } from '../../utils/static-data';
import type { Page } from '../../utils/static-data';

export function Sidebar( {
	activePage,
	onNav,
	collapsed,
	onToggle,
	enabledModules,
}: {
	activePage: Page;
	onNav: ( p: Page ) => void;
	collapsed: boolean;
	onToggle: () => void;
	enabledModules: Set< string >;
} ) {
	return (
		<aside
			className="flex flex-col h-full transition-all duration-200 flex-shrink-0"
			style={ {
				width: collapsed ? 80 : 256,
				backgroundColor: M3.surfaceContainerLow,
				borderRadius: '0 16px 16px 0',
				boxShadow: '1px 0 2px rgba(0,0,0,0.06)',
				overflow: 'hidden',
			} }
		>
			{ /* Logo */ }
			<div
				className="flex items-center gap-3 px-4 py-5 flex-shrink-0"
				style={ { minHeight: 72 } }
			>
				<div
					className="flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0"
					style={ { backgroundColor: M3.primary } }
				>
					<Package size={ 20 } color={ M3.onPrimary } />
				</div>
				{ ! collapsed && (
					<div>
						<div
							className="font-semibold text-sm leading-tight"
							style={ {
								color: M3.onSurface,
								fontFamily: 'Roboto, sans-serif',
							} }
						>
							PureCart
						</div>
						<div
							className="text-xs"
							style={ {
								color: M3.onSurfaceVariant,
								fontFamily: 'Roboto, sans-serif',
							} }
						>
							Digital Downloads
						</div>
					</div>
				) }
				<button
					onClick={ onToggle }
					className="ml-auto flex items-center justify-center w-8 h-8 rounded-full transition-all flex-shrink-0"
					style={ {
						color: M3.onSurfaceVariant,
						border: 'none',
						background: 'transparent',
						cursor: 'pointer',
					} }
				>
					{ collapsed ? (
						<ChevronRight size={ 16 } />
					) : (
						<ChevronLeft size={ 16 } />
					) }
				</button>
			</div>

			{ /* Nav */ }
			<nav className="flex-1 px-3 overflow-y-auto pb-4">
				{ NAV_SCHEMA.map( ( item ) => {
					const active =
						activePage === item.id ||
						( item.id === 'analytics' &&
							activePage.startsWith( 'analytics' ) );
					const enabled =
						item.moduleKey === null ||
						enabledModules.has( item.moduleKey );
					const Icon = item.icon;
					return (
						<div key={ item.id }>
							{ item.dividerBefore && (
								<div
									className="my-2"
									style={ {
										borderTop: `1px solid ${ M3.outlineVariant }`,
									} }
								/>
							) }
							<button
								onClick={ () => enabled && onNav( item.id ) }
								className="relative flex items-center w-full transition-all mb-0.5"
								style={ {
									height: 56,
									borderRadius: 9999,
									backgroundColor: active
										? M3.secondaryContainer
										: 'transparent',
									color: active
										? M3.onSecondaryContainer
										: M3.onSurfaceVariant,
									opacity: enabled ? 1 : 0.38,
									border: 'none',
									cursor: enabled ? 'pointer' : 'default',
									paddingLeft: collapsed ? 0 : 16,
									paddingRight: collapsed ? 0 : 16,
									justifyContent: collapsed
										? 'center'
										: 'flex-start',
									gap: collapsed ? 0 : 12,
								} }
								onMouseEnter={ ( e ) => {
									if ( ! active && enabled )
										(
											e.currentTarget as HTMLElement
										 ).style.backgroundColor =
											M3.surfaceContainerHigh;
								} }
								onMouseLeave={ ( e ) => {
									if ( ! active )
										(
											e.currentTarget as HTMLElement
										 ).style.backgroundColor =
											'transparent';
								} }
							>
								<Icon size={ 22 } />
								{ ! collapsed && (
									<span
										className="text-sm font-medium"
										style={ {
											fontFamily: 'Roboto, sans-serif',
											letterSpacing: '0.1px',
										} }
									>
										{ item.label }
									</span>
								) }
								{ ! enabled && ! collapsed && (
									<Lock
										size={ 12 }
										className="ml-auto opacity-60"
									/>
								) }
							</button>
						</div>
					);
				} ) }
			</nav>
		</aside>
	);
}
