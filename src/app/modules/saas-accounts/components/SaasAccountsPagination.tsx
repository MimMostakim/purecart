/**
 * SaasAccountsPagination component.
 *
 * Footer pagination strip for the SaaS Accounts table. Factored out of
 * SaasAccountsTable to keep that file within the ~150-line guideline (B1).
 *
 * @file
 * @since 1.0.0
 */
import React from 'react';
import { __, sprintf } from '@wordpress/i18n';
import { M3 } from '@/theme';

interface SaasAccountsPaginationProps {
	currentPage: number;
	totalPages: number;
	totalCount: number;
	/** Number of rows visible on this page (may be less than the page size on the last page). */
	itemCount: number;
	onPageChange: ( page: number ) => void;
}

function paginationButtonStyle( active: boolean, disabled: boolean ): React.CSSProperties {
	return {
		padding: '4px 10px',
		borderRadius: '6px',
		fontSize: '12px',
		cursor: disabled ? 'default' : 'pointer',
		opacity: disabled ? 0.4 : 1,
		backgroundColor: active ? M3.primary : 'transparent',
		color: active ? M3.onPrimary : M3.onSurfaceVariant,
		border: active ? 'none' : `1px solid ${ M3.outline }`,
	};
}

/**
 * Renders the SaaS Accounts table's pagination footer.
 *
 * @since 1.0.0
 *
 * @param {SaasAccountsPaginationProps} props Component props.
 * @return {JSX.Element} The pagination row.
 */
export function SaasAccountsPagination( {
	currentPage,
	totalPages,
	totalCount,
	itemCount,
	onPageChange,
}: SaasAccountsPaginationProps ) {
	return (
		<div
			style={ {
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				padding: '12px 16px',
				borderTop: `1px solid ${ M3.outlineVariant }`,
				fontSize: '12px',
				color: M3.onSurfaceVariant,
			} }
		>
			<span>
				{
					/* translators: 1: accounts shown on this page, 2: total matching accounts */
					sprintf( __( 'Showing %1$d of %2$d accounts', 'purecart' ), itemCount, totalCount )
				}
			</span>
			<div style={ { display: 'flex', gap: '4px' } }>
				<button
					disabled={ currentPage <= 1 }
					onClick={ () => onPageChange( currentPage - 1 ) }
					style={ paginationButtonStyle( false, currentPage <= 1 ) }
				>
					{ __( 'Previous', 'purecart' ) }
				</button>
				{ Array.from( { length: totalPages }, ( _, i ) => i + 1 )
					.slice( Math.max( 0, currentPage - 3 ), Math.max( 0, currentPage - 3 ) + 5 )
					.map( ( p ) => (
						<button
							key={ p }
							onClick={ () => onPageChange( p ) }
							style={ paginationButtonStyle( p === currentPage, false ) }
						>
							{ p }
						</button>
					) ) }
				<button
					disabled={ currentPage >= totalPages }
					onClick={ () => onPageChange( currentPage + 1 ) }
					style={ paginationButtonStyle( false, currentPage >= totalPages ) }
				>
					{ __( 'Next', 'purecart' ) }
				</button>
			</div>
		</div>
	);
}
