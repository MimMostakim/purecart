/**
 * SubscriptionsTable component.
 *
 * Renders the subscriptions list table: 13 columns covering every delivery
 * type, split-payment progress, churn risk, and card-expiry status. Fully
 * controlled - rows are pre-filtered by the parent, row actions are built by
 * the parent (so they can close over the parent's own handlers/state).
 *
 * @file
 * @since 1.0.0
 */
import { CreditCard } from 'lucide-react';
import { M3 } from '../../utils/static-data';
import { Card } from '../ui/Card';
import { StatusBadge } from '../ui/StatusBadge';
import { ActionDropdown, type ActionItem } from '../ui/ActionDropdown';
import { SubscriptionTypeBadge, TYPE_CONFIG, ChurnScoreBadge, InstallmentProgress } from './shared';
import type { SubscriptionRecord, SubscriptionLinkedEntity } from '../../utils/subscription-types';

/**
 * Renders the type-specific "Linked" column content for one row.
 *
 * @since 1.0.0
 *
 * @param {Object}                  props        Component props.
 * @param {SubscriptionLinkedEntity} props.entity The row's linked entity.
 *
 * @return {JSX.Element} A small icon + summary text matching the entity's delivery type.
 */
function LinkedEntityCell( { entity }: { entity: SubscriptionLinkedEntity } ) {
	const iconStyle = { display: 'inline', verticalAlign: -2, marginRight: 4 };
	switch ( entity.type ) {
		case 'software': {
			const Icon = TYPE_CONFIG.software.icon;
			return (
				<>
					<Icon size={ 12 } style={ iconStyle } />
					{ entity.licenseKey.slice( 0, 9 ) }… · { entity.domainCount }
				</>
			);
		}
		case 'saas': {
			const Icon = TYPE_CONFIG.saas.icon;
			return (
				<>
					<Icon size={ 12 } style={ iconStyle } />
					{ entity.saasAccountName } · { entity.seatUsage }
				</>
			);
		}
		case 'membership': {
			const Icon = TYPE_CONFIG.membership.icon;
			return (
				<>
					<Icon size={ 12 } style={ iconStyle } />
					{ entity.membershipTier } · { entity.assignedRole }
				</>
			);
		}
		case 'download': {
			const Icon = TYPE_CONFIG.download.icon;
			return (
				<>
					<Icon size={ 12 } style={ iconStyle } />
					{ entity.downloadsThisCycle }/{ entity.downloadLimit ?? '∞' } downloads
				</>
			);
		}
		case 'course': {
			const Icon = TYPE_CONFIG.course.icon;
			return (
				<>
					<Icon size={ 12 } style={ iconStyle } />
					{ entity.enrolledCourses.length } course
					{ entity.enrolledCourses.length !== 1 ? 's' : '' }
				</>
			);
		}
		case 'service': {
			const Icon = TYPE_CONFIG.service.icon;
			return (
				<>
					<Icon size={ 12 } style={ iconStyle } />
					Next due { entity.nextDeliverableDue ?? '—' }
				</>
			);
		}
	}
}

const COLUMN_HEADERS = [
	'ID', 'Customer', 'Product', 'Type', 'Linked', 'Amount',
	'Payment', 'Churn', 'Status', 'Next Payment', 'LTV', '',
];

export interface SubscriptionsTableProps {
	rows: SubscriptionRecord[];
	totalCount: number;
	selected: string[];
	onToggleSelect: ( id: string ) => void;
	onToggleSelectAll: ( checked: boolean ) => void;
	rowActions: ( row: SubscriptionRecord ) => ActionItem[];
	onCardExpiryClick: ( row: SubscriptionRecord ) => void;
	onViewDetail: ( id: string ) => void;
	hasActiveFilters: boolean;
	onClearFilters: () => void;
}

/**
 * Renders the subscriptions table.
 *
 * @since 1.0.0
 *
 * @param {SubscriptionsTableProps} props Component props.
 *
 * @return {JSX.Element} The table element.
 */
export function SubscriptionsTable( {
	rows,
	totalCount,
	selected,
	onToggleSelect,
	onToggleSelectAll,
	rowActions,
	onCardExpiryClick,
	onViewDetail,
	hasActiveFilters,
	onClearFilters,
}: SubscriptionsTableProps ) {
	/**
	 * Computes a row's background color for its resting/hover states. A
	 * single source of truth for this - the base style, onMouseEnter, and
	 * onMouseLeave all call it - so a new highlight condition is a one-line
	 * change here instead of three separate places.
	 */
	const getRowBg = ( row: SubscriptionRecord, idx: number, isSelected: boolean, hovering = false ): string => {
		if ( hovering ) return M3.surfaceContainerHigh;
		if ( isSelected ) return `${ M3.primary }14`;
		if ( row.status === 'past_due' ) return `${ M3.error }08`;
		return idx % 2 === 0 ? M3.surface : M3.surfaceContainerLow;
	};

	return (
		<Card style={ { overflow: 'visible' } }>
			<div className="overflow-x-auto" style={ { overflowY: 'visible' } }>
				<table className="w-full">
					<thead>
						<tr style={ { backgroundColor: M3.surfaceContainerLow } }>
							<th className="w-10 px-4 py-3 text-left">
								<input
									type="checkbox"
									onChange={ ( e ) => onToggleSelectAll( e.target.checked ) }
									checked={ selected.length === rows.length && rows.length > 0 }
								/>
							</th>
							{ COLUMN_HEADERS.map( ( h, i ) => (
								<th
									key={ i }
									className="px-3 py-3 text-left text-xs font-medium"
									style={ {
										color: M3.onSurfaceVariant,
										fontFamily: 'Roboto, sans-serif',
										letterSpacing: '0.5px',
										textTransform: 'uppercase',
									} }
								>
									{ h }
								</th>
							) ) }
						</tr>
					</thead>
					<tbody>
						{ rows.length === 0 && (
							<tr>
								<td colSpan={ COLUMN_HEADERS.length + 1 } className="px-4 py-10 text-center">
									<div
										className="text-sm mb-2"
										style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif' } }
									>
										No subscriptions match your filters.
									</div>
									{ hasActiveFilters && (
										<button
											onClick={ onClearFilters }
											className="text-sm"
											style={ {
												color: M3.primary,
												background: 'none',
												border: 'none',
												cursor: 'pointer',
												fontFamily: 'Roboto, sans-serif',
											} }
										>
											Clear filters
										</button>
									) }
								</td>
							</tr>
						) }
						{ rows.map( ( row, idx ) => {
							const isSelected = selected.includes( row.id );
							return (
								<tr
									key={ row.id }
									style={ { backgroundColor: getRowBg( row, idx, isSelected ) } }
									onMouseEnter={ ( e ) => {
										( e.currentTarget as HTMLElement ).style.backgroundColor = getRowBg(
											row, idx, isSelected, true
										);
									} }
									onMouseLeave={ ( e ) => {
										( e.currentTarget as HTMLElement ).style.backgroundColor = getRowBg(
											row, idx, isSelected
										);
									} }
								>
									<td className="px-4 py-3">
										<input
											type="checkbox"
											checked={ isSelected }
											onChange={ () => onToggleSelect( row.id ) }
										/>
									</td>
									<td className="px-3 py-3 text-xs">
										<button
											onClick={ ( e ) => { e.stopPropagation(); onViewDetail( row.id ); } }
											style={ {
												color: M3.primary,
												fontFamily: 'Roboto Mono, monospace',
												background: 'none',
												border: 'none',
												cursor: 'pointer',
												textDecoration: 'underline',
												padding: 0,
											} }
										>
											{ row.id }
										</button>
									</td>
									<td className="px-3 py-3">
										<div
											className="text-sm font-medium"
											style={ { color: M3.onSurface, fontFamily: 'Roboto, sans-serif' } }
										>
											{ row.customer }
										</div>
										<div
											className="text-xs"
											style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif' } }
										>
											{ row.email }
										</div>
									</td>
									<td className="px-3 py-3">
										<div
											className="text-sm"
											style={ { color: M3.onSurface, fontFamily: 'Roboto, sans-serif' } }
										>
											{ row.product }
										</div>
										<span
											className="inline-block text-xs px-1.5 py-0.5 rounded-full mt-0.5"
											style={ {
												backgroundColor: M3.surfaceContainerHigh,
												color: M3.onSurfaceVariant,
												fontFamily: 'Roboto, sans-serif',
											} }
										>
											{ row.billing.displayLabel }
										</span>
									</td>
									<td className="px-3 py-3">
										<SubscriptionTypeBadge type={ row.deliveryType } size="small" />
									</td>
									<td
										className="px-3 py-3 text-xs"
										style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif' } }
									>
										<LinkedEntityCell entity={ row.linkedEntity } />
									</td>
									<td
										className="px-3 py-3 text-sm font-medium"
										style={ { color: M3.onSurface, fontFamily: 'Roboto Mono, monospace' } }
									>
										{ row.amount }
									</td>
									<td className="px-3 py-3">
										{ row.paymentType === 'split' && row.maxPayments !== null ? (
											<InstallmentProgress
												completed={ row.paymentsCompleted }
												total={ row.maxPayments }
											/>
										) : (
											<span
												className="text-xs"
												style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif' } }
											>
												Recurring
											</span>
										) }
									</td>
									<td className="px-3 py-3">
										<ChurnScoreBadge score={ row.churnRiskScore } />
									</td>
									<td className="px-3 py-3">
										<StatusBadge status={ row.status } />
									</td>
									<td
										className="px-3 py-3 text-xs font-medium"
										style={ {
											color: row.status === 'past_due' ? M3.error : M3.onSurfaceVariant,
											fontFamily: 'Roboto, sans-serif',
										} }
									>
										{ row.cardExpiring && (
											<button
												onClick={ ( e ) => {
													e.stopPropagation();
													onCardExpiryClick( row );
												} }
												title={ `Card expires ${ row.cardExpiryDate }` }
												className="mr-1"
												style={ { background: 'none', border: 'none', cursor: 'pointer', color: M3.warning } }
											>
												<CreditCard size={ 12 } style={ { display: 'inline', verticalAlign: -2 } } />
											</button>
										) }
										{ row.status === 'past_due' && <span className="mr-1">⚠</span> }
										{ row.status === 'pending_cancel'
											? `Cancels ${ row.cancellationDate }`
											: row.nextPayment ?? '—' }
									</td>
									<td
										className="px-3 py-3 text-sm"
										style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto Mono, monospace' } }
									>
										${ row.customerLtv.toLocaleString() }
									</td>
									<td className="px-3 py-3" style={ { overflow: 'visible' } }>
										<ActionDropdown
											actions={ rowActions( row ) }
											hint={ `${ row.id } · ${ row.customer }` }
										/>
									</td>
								</tr>
							);
						} ) }
					</tbody>
				</table>
			</div>
			<div
				className="flex items-center justify-between px-4 py-3"
				style={ { borderTop: `1px solid ${ M3.outlineVariant }` } }
			>
				<span
					className="text-xs"
					style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif' } }
				>
					Showing { rows.length } of { totalCount } subscriptions
				</span>
			</div>
		</Card>
	);
}
