/**
 * ChurnRiskTable component.
 *
 * Extended churn risk table for the Analytics page. Row actions are
 * contextual - "Retry Payment" only for past_due/suspended rows - and reuse
 * the exact same effect a list-page row action would have; this table holds
 * no modal/mutation logic of its own, only the callbacks its parent supplies.
 *
 * @file
 * @since 1.0.0
 */
import { CreditCard } from 'lucide-react';
import { M3 } from '../../utils/static-data';
import { Card } from '../ui/Card';
import { StatusBadge } from '../ui/StatusBadge';
import { TextButton } from '../ui/TextButton';
import { ChurnScoreBadge } from '../Subscriptions/shared';
import type { ChurnRiskEntry } from '../Subscriptions/types';

interface ChurnRiskTableProps {
	entries: ChurnRiskEntry[];
	onSendReminder: ( entry: ChurnRiskEntry ) => void;
	onApplyDiscount: ( entry: ChurnRiskEntry ) => void;
	onRetryPayment: ( entry: ChurnRiskEntry ) => void;
}

/**
 * Renders the Analytics page's extended churn risk table.
 *
 * @since 1.0.0
 *
 * @param {ChurnRiskTableProps} props Component props.
 *
 * @return {JSX.Element} The churn risk table.
 */
export function ChurnRiskTable( { entries, onSendReminder, onApplyDiscount, onRetryPayment }: ChurnRiskTableProps ) {
	return (
		<Card className="p-5">
			<div className="text-sm font-semibold mb-4" style={ { color: M3.onSurface, fontFamily: 'Roboto, sans-serif' } }>
				Churn Risk
			</div>
			<table className="w-full text-sm">
				<thead>
					<tr style={ { borderBottom: `1px solid ${ M3.outlineVariant }` } }>
						{ [ 'Customer', 'Product', 'Plan', 'Status', 'Days', 'Churn', 'Card', 'LTV', 'Actions' ].map( ( h ) => (
							<th
								key={ h }
								className="text-left py-2 px-2 text-xs font-medium"
								style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px' } }
							>
								{ h }
							</th>
						) ) }
					</tr>
				</thead>
				<tbody>
					{ entries.map( ( e ) => (
						<tr key={ e.subscriptionId } style={ { borderBottom: `1px solid ${ M3.outlineVariant }` } }>
							<td className="py-2 px-2" style={ { color: M3.onSurface, fontFamily: 'Roboto, sans-serif' } }>{ e.customer }</td>
							<td className="py-2 px-2" style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif' } }>{ e.product }</td>
							<td className="py-2 px-2" style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif' } }>{ e.cycle }</td>
							<td className="py-2 px-2"><StatusBadge status={ e.status } /></td>
							<td className="py-2 px-2" style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif' } }>{ e.dayLabel }</td>
							<td className="py-2 px-2"><ChurnScoreBadge score={ e.churnScore } /></td>
							<td className="py-2 px-2">{ e.cardExpiring && <CreditCard size={ 14 } color={ M3.warning } /> }</td>
							<td className="py-2 px-2" style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto Mono, monospace' } }>${ e.ltv.toLocaleString() }</td>
							<td className="py-2 px-2">
								<div className="flex items-center gap-1 flex-wrap">
									<TextButton small onClick={ () => onSendReminder( e ) }>Remind</TextButton>
									<TextButton small onClick={ () => onApplyDiscount( e ) }>Discount</TextButton>
									{ ( e.status === 'past_due' || e.status === 'suspended' ) && (
										<TextButton small onClick={ () => onRetryPayment( e ) }>Retry</TextButton>
									) }
								</div>
							</td>
						</tr>
					) ) }
				</tbody>
			</table>
		</Card>
	);
}
