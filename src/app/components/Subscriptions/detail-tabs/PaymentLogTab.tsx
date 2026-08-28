/**
 * PaymentLogTab component.
 *
 * Full-page version of the Payment History modal's table, plus a dunning
 * attempt counter badge when the subscription is past_due.
 *
 * @file
 * @since 1.0.0
 */
import { M3 } from '../../../utils/static-data';
import { Card } from '../../ui/Card';
import { OutlinedButton } from '../../ui/OutlinedButton';
import type { SubscriptionRecord, PaymentRecord } from '../types';

const STATUS_STYLE: Record< string, { color: string; bg: string; label: string } > = {
	paid: { color: M3.success, bg: M3.successContainer, label: 'Paid' },
	failed: { color: M3.error, bg: '#FFDAD6', label: 'Failed' },
	trial: { color: M3.info, bg: M3.infoContainer, label: 'Trial' },
	refunded: { color: M3.onSurfaceVariant, bg: M3.surfaceContainerHigh, label: 'Refunded' },
	pending: { color: M3.warning, bg: M3.warningContainer, label: 'Pending' },
};

interface PaymentLogTabProps {
	row: SubscriptionRecord;
	payments: PaymentRecord[];
	onExport: () => void;
}

/**
 * Renders the Detail page's Payment Log tab.
 *
 * @since 1.0.0
 *
 * @param {PaymentLogTabProps} props Component props.
 *
 * @return {JSX.Element} The payment log tab content.
 */
export function PaymentLogTab( { row, payments, onExport }: PaymentLogTabProps ) {
	return (
		<Card className="p-5">
			<div className="flex items-center justify-between mb-4">
				<div className="text-sm font-semibold" style={ { color: M3.onSurface, fontFamily: 'Roboto, sans-serif' } }>
					Payment Log
				</div>
				<OutlinedButton small onClick={ onExport }>Export CSV</OutlinedButton>
			</div>
			{ row.status === 'past_due' && (
				<div
					className="inline-block text-xs px-2 py-1 rounded-full mb-3"
					style={ { backgroundColor: '#FFDAD6', color: M3.error, fontFamily: 'Roboto, sans-serif' } }
				>
					{ Math.max( ...payments.map( ( p ) => p.dunningAttempt ), 0 ) }/3 retries used
				</div>
			) }
			<table className="w-full text-sm">
				<thead>
					<tr style={ { borderBottom: `1px solid ${ M3.outlineVariant }` } }>
						{ [ 'Date', 'Amount', 'Method', 'Retry', 'Gateway Response', 'Status', 'Receipt' ].map( ( h ) => (
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
					{ payments.length === 0 && (
						<tr>
							<td colSpan={ 7 } className="text-center py-6 text-sm" style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif' } }>
								No payments on record.
							</td>
						</tr>
					) }
					{ payments.map( ( p ) => {
						const s = STATUS_STYLE[ p.status ] ?? STATUS_STYLE.paid;
						return (
							<tr key={ p.id } style={ { borderBottom: `1px solid ${ M3.outlineVariant }` } }>
								<td className="py-2 px-2" style={ { color: M3.onSurface, fontFamily: 'Roboto, sans-serif' } }>{ p.date }</td>
								<td className="py-2 px-2" style={ { color: M3.onSurface, fontFamily: 'Roboto Mono, monospace' } }>{ p.amount }</td>
								<td className="py-2 px-2" style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif' } }>{ p.method }</td>
								<td className="py-2 px-2" style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif' } }>{ p.dunningAttempt }</td>
								<td className="py-2 px-2" style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif' } }>{ p.gatewayResponse ?? '—' }</td>
								<td className="py-2 px-2">
									<span className="text-xs px-2 py-0.5 rounded-full" style={ { backgroundColor: s.bg, color: s.color, fontFamily: 'Roboto, sans-serif' } }>
										{ s.label }
									</span>
								</td>
								<td className="py-2 px-2" style={ { color: M3.primary, fontFamily: 'Roboto, sans-serif' } }>
									{ p.status === 'paid' ? 'Receipt' : '—' }
								</td>
							</tr>
						);
					} ) }
				</tbody>
			</table>
		</Card>
	);
}
