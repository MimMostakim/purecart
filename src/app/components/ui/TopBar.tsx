import { ChevronRight, HelpCircle, Bell } from 'lucide-react';
import { M3, PAGE_TITLES, CUSTOMER_SARAH } from '../../utils/static-data';
import type { Page } from '../../utils/static-data';
import { IconButton } from './IconButton';

export function TopBar( {
	page,
	onNav,
}: {
	page: Page;
	onNav: ( p: Page ) => void;
} ) {
	const crumbs: Array< { label: string; page?: Page } > = [
		{ label: 'PureCart -  Digital Downloads' },
	];
	if ( page.startsWith( 'analytics-' ) ) {
		crumbs.push( { label: 'Analytics', page: 'analytics' } );
		crumbs.push( { label: PAGE_TITLES[ page ] } );
	} else if ( page === 'customer-detail' ) {
		crumbs.push( { label: 'Licenses', page: 'licenses' } );
		crumbs.push( { label: CUSTOMER_SARAH.name } );
	} else if ( page === 'saas-detail' ) {
		crumbs.push( { label: 'SaaS Accounts', page: 'saas' } );
		crumbs.push( { label: 'Account Details' } );
	} else if ( page === 'affiliate-detail' ) {
		crumbs.push( { label: 'Affiliates', page: 'affiliates' } );
		crumbs.push( { label: 'Affiliate Details' } );
	} else if ( page === 'license-summary' ) {
		crumbs.push( { label: 'Licenses', page: 'licenses' } );
		crumbs.push( { label: 'Summary' } );
	} else if ( page === 'license-detail' ) {
		crumbs.push( { label: 'Licenses', page: 'licenses' } );
		crumbs.push( { label: 'License Detail' } );
	} else if ( page !== 'overview' ) {
		crumbs.push( { label: PAGE_TITLES[ page ] } );
	}

	return (
		<header
			className="flex items-center px-6 flex-shrink-0"
			style={ {
				height: 64,
				backgroundColor: M3.surface,
				borderBottom: `1px solid ${ M3.outlineVariant }`,
			} }
		>
			<div className="flex-1 min-w-0">
				<div
					className="flex items-center gap-1 text-xs"
					style={ {
						color: M3.onSurfaceVariant,
						fontFamily: 'Roboto, sans-serif',
					} }
				>
					{ crumbs.map( ( c, i ) => (
						<span key={ i } className="flex items-center gap-1">
							{ i > 0 && <ChevronRight size={ 12 } /> }
							{ c.page ? (
								<button
									onClick={ () => onNav( c.page! ) }
									style={ {
										background: 'none',
										border: 'none',
										cursor: 'pointer',
										color: M3.primary,
										fontFamily: 'Roboto, sans-serif',
										fontSize: 12,
										padding: 0,
									} }
								>
									{ c.label }
								</button>
							) : (
								<span>{ c.label }</span>
							) }
						</span>
					) ) }
				</div>
				<h1
					className="font-medium leading-tight"
					style={ {
						fontSize: 22,
						color: M3.onSurface,
						fontFamily: 'Roboto, sans-serif',
					} }
				>
					{ PAGE_TITLES[ page ] }
				</h1>
			</div>
			<div className="flex items-center gap-1">
				<IconButton icon={ HelpCircle } title="Help" />
				<IconButton icon={ Bell } title="Notifications" />
				<div
					className="flex items-center justify-center w-9 h-9 rounded-full text-sm font-medium ml-1 cursor-pointer"
					style={ {
						backgroundColor: M3.primaryContainer,
						color: M3.onPrimaryContainer,
						fontFamily: 'Roboto, sans-serif',
					} }
				>
					AD
				</div>
			</div>
		</header>
	);
}
