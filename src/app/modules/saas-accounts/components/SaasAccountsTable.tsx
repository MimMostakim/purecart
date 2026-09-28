/**
 * SaasAccountsTable component.
 *
 * Renders the SaaS Accounts list — columns, the per-row ⋮ action menu, and
 * the pagination footer. Rows are clickable and open the detail panel; the
 * ⋮ menu comes from useSaasAccountActions so the table and the panel drive
 * the same actions.
 *
 * Unlike the Licenses/Downloads tables there is no row selection: the
 * backend exposes no bulk route for SaaS accounts (see
 * docs/saas-module/dev-plan-saas-frontend.md's Appendix — bulk actions are
 * deliberately out of scope until one exists).
 *
 * @file
 * @since 1.0.0
 */
import React from 'react';
import { __ } from '@wordpress/i18n';
import { M3 } from '@/theme';
import type { ActionItem } from '@/shared/ui';
import type { SaasAccountRecord } from '../types';
import { SaasAccountsTableRow } from './SaasAccountsTableRow';
import { SaasAccountsPagination } from './SaasAccountsPagination';

interface SaasAccountsTableProps {
	items: SaasAccountRecord[];
	loading: boolean;
	currentPage: number;
	totalPages: number;
	totalCount: number;
	onPageChange: ( page: number ) => void;
	onViewDetail: ( account: SaasAccountRecord ) => void;
	rowActions: ( account: SaasAccountRecord ) => ActionItem[];
}

/**
 * Renders the SaaS Accounts table: header, rows, action menu, pagination.
 *
 * @since 1.0.0
 *
 * @param {SaasAccountsTableProps} props Component props.
 * @return {JSX.Element} The table, or its loading/empty placeholder.
 */
export function SaasAccountsTable( {
	items,
	loading,
	currentPage,
	totalPages,
	totalCount,
	onPageChange,
	onViewDetail,
	rowActions,
}: SaasAccountsTableProps ) {
	if ( loading && 0 === items.length ) {
		return <Placeholder>{ __( 'Loading SaaS accounts…', 'purecart' ) }</Placeholder>;
	}

	if ( 0 === items.length ) {
		return (
			<Placeholder>
				<p style={ { fontSize: '14px', fontWeight: 500, color: M3.onSurface, margin: '0 0 8px' } }>
					{ __( 'No SaaS accounts yet', 'purecart' ) }
				</p>
				<p style={ { fontSize: '13px', margin: 0 } }>
					{ __(
						'Accounts appear here automatically once an order containing a SaaS product completes.',
						'purecart'
					) }
				</p>
			</Placeholder>
		);
	}

	return (
		<div
			style={ {
				backgroundColor: M3.surface,
				borderRadius: '12px',
				border: `1px solid ${ M3.outlineVariant }`,
				overflow: 'hidden',
			} }
		>
			{ /* Narrow viewports scroll the table sideways rather than
			     squashing the key/date columns into illegibility. */ }
			<div style={ { overflowX: 'auto' } }>
				<table style={ { width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '860px' } }>
					<thead>
						<tr
							style={ {
								backgroundColor: M3.surfaceContainerLow,
								borderBottom: `1px solid ${ M3.outlineVariant }`,
								fontSize: '12px',
								fontWeight: 500,
								color: M3.onSurfaceVariant,
								textTransform: 'uppercase',
								letterSpacing: '0.04em',
							} }
						>
							<th style={ { padding: '12px 16px' } }>{ __( 'Customer', 'purecart' ) }</th>
							<th style={ { padding: '12px 16px' } }>{ __( 'Product', 'purecart' ) }</th>
							<th style={ { padding: '12px 16px' } }>{ __( 'Plan', 'purecart' ) }</th>
							<th style={ { padding: '12px 16px' } }>{ __( 'API Key', 'purecart' ) }</th>
							<th style={ { padding: '12px 16px' } }>{ __( 'Status', 'purecart' ) }</th>
							<th style={ { padding: '12px 16px' } }>{ __( 'Provisioned', 'purecart' ) }</th>
							<th style={ { width: '60px', padding: '12px 16px', textAlign: 'right' } }>
								{ __( 'Actions', 'purecart' ) }
							</th>
						</tr>
					</thead>
					<tbody>
						{ items.map( ( account, i ) => (
							<SaasAccountsTableRow
								key={ account.id }
								account={ account }
								zebra={ 0 === i % 2 }
								onViewDetail={ onViewDetail }
								rowActions={ rowActions }
							/>
						) ) }
					</tbody>
				</table>
			</div>

			<SaasAccountsPagination
				currentPage={ currentPage }
				totalPages={ totalPages }
				totalCount={ totalCount }
				itemCount={ items.length }
				onPageChange={ onPageChange }
			/>
		</div>
	);
}

/** Shared frame for the table's loading and empty states. */
function Placeholder( { children }: { children: React.ReactNode } ) {
	return (
		<div
			style={ {
				padding: '48px',
				textAlign: 'center',
				backgroundColor: M3.surface,
				borderRadius: '12px',
				border: `1px solid ${ M3.outlineVariant }`,
				color: M3.onSurfaceVariant,
			} }
		>
			{ children }
		</div>
	);
}
