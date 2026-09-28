/**
 * SaasAccountsTableRow component.
 *
 * One `<tr>` in the SaaS Accounts table. Factored out of SaasAccountsTable
 * to keep that file within the ~150-line guideline (B1).
 *
 * @file
 * @since 1.0.0
 */
import { __, sprintf } from '@wordpress/i18n';
import { M3 } from '@/theme';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { ActionDropdown } from '@/shared/ui/ActionDropdown';
import type { ActionItem } from '@/shared/ui';
import { saasPlanLabel, formatProvisionedAt } from '../constants';
import type { SaasAccountRecord } from '../types';

interface SaasAccountsTableRowProps {
	account: SaasAccountRecord;
	/** True for even-indexed rows — drives the alternating surface color. */
	zebra: boolean;
	onViewDetail: ( account: SaasAccountRecord ) => void;
	rowActions: ( account: SaasAccountRecord ) => ActionItem[];
}

/**
 * Renders one row of the SaaS Accounts table.
 *
 * @since 1.0.0
 *
 * @param {SaasAccountsTableRowProps} props Component props.
 * @return {JSX.Element} The table row.
 */
export function SaasAccountsTableRow( {
	account,
	zebra,
	onViewDetail,
	rowActions,
}: SaasAccountsTableRowProps ) {
	return (
		<tr
			onClick={ () => onViewDetail( account ) }
			style={ {
				borderBottom: `1px solid ${ M3.outlineVariant }`,
				borderLeft:
					'suspended' === account.status
						? `3px solid ${ M3.warning }`
						: '3px solid transparent',
				backgroundColor: zebra ? M3.surface : M3.surfaceContainerLow,
				cursor: 'pointer',
			} }
		>
			<td style={ { padding: '12px 16px' } }>
				<div style={ { fontSize: '13px', fontWeight: 500, color: M3.onSurface } }>
					{ account.customerName ||
						/* translators: %s: order number, shown when an account has no resolved customer name */
						sprintf( __( 'Order #%s', 'purecart' ), account.orderNumber ) }
				</div>
				<div style={ { fontSize: '12px', color: M3.onSurfaceVariant } }>
					{ account.customerEmail }
				</div>
			</td>
			<td style={ { padding: '12px 16px' } }>
				<div style={ { fontSize: '13px', color: M3.onSurface } }>{ account.productName }</div>
				<div style={ { fontSize: '12px', color: M3.onSurfaceVariant } }>
					{
						/* translators: %s: WooCommerce order number */
						sprintf( __( 'Order #%s', 'purecart' ), account.orderNumber )
					}
				</div>
			</td>
			<td style={ { padding: '12px 16px' } }>
				<span
					className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
					style={ {
						backgroundColor: M3.secondaryContainer,
						color: M3.onSecondaryContainer,
						fontFamily: 'Roboto, sans-serif',
					} }
				>
					{ saasPlanLabel( account.plan ) }
				</span>
			</td>
			<td
				style={ {
					padding: '12px 16px',
					fontSize: '12px',
					fontFamily: 'Roboto Mono, monospace',
					color: M3.onSurfaceVariant,
					whiteSpace: 'nowrap',
				} }
			>
				{ account.apiKeyMasked }
			</td>
			<td style={ { padding: '12px 16px' } }>
				<StatusBadge status={ account.status } />
			</td>
			<td
				style={ {
					padding: '12px 16px',
					fontSize: '12px',
					color: M3.onSurfaceVariant,
					whiteSpace: 'nowrap',
				} }
			>
				{ formatProvisionedAt( account.provisionedAt ) }
			</td>
			<td style={ { padding: '12px 16px', textAlign: 'right' } }>
				<ActionDropdown actions={ rowActions( account ) } />
			</td>
		</tr>
	);
}
