/**
 * OverviewTab component.
 *
 * Subscription Detail page's default tab: billing summary, card-expiry
 * warning, churn gauge, LTV, and (when relevant) split-payment progress and
 * a pending-switch banner. Two-column layout - this is the only Detail tab
 * with a sidebar-worthy set of always-visible facts.
 *
 * @file
 * @since 1.0.0
 */
import { M3 } from '../../../utils/static-data';
import { Card } from '../../ui/Card';
import { ChurnGauge, CardExpiryWarning, InstallmentProgress } from '../shared';
import type { SubscriptionRecord } from '../../../utils/subscription-types';

interface OverviewTabProps {
	row: SubscriptionRecord;
	onSendCardUpdate: () => void;
}

/** One label/value row inside the Billing Summary card. */
function SummaryRow( { label, value }: { label: string; value: React.ReactNode } ) {
	return (
		<div className="flex items-center justify-between py-1.5 text-sm" style={ { fontFamily: 'Roboto, sans-serif' } }>
			<span style={ { color: M3.onSurfaceVariant } }>{ label }</span>
			<span style={ { color: M3.onSurface } }>{ value }</span>
		</div>
	);
}

/**
 * Renders the Detail page's Overview tab.
 *
 * @since 1.0.0
 *
 * @param {OverviewTabProps} props Component props.
 *
 * @return {JSX.Element} The overview tab content.
 */
export function OverviewTab( { row, onSendCardUpdate }: OverviewTabProps ) {
	return (
		<div className="grid gap-5" style={ { gridTemplateColumns: '2fr 1fr' } }>
			<div className="flex flex-col gap-4">
				<Card className="p-5">
					<div className="text-sm font-semibold mb-2" style={ { color: M3.onSurface, fontFamily: 'Roboto, sans-serif' } }>
						Billing Summary
					</div>
					<SummaryRow label="Amount" value={ <span style={ { fontFamily: 'Roboto Mono, monospace' } }>{ row.amount }</span> } />
					<SummaryRow label="Cycle" value={ row.billing.displayLabel } />
					<SummaryRow
						label="Next payment"
						value={
							row.status === 'past_due'
								? <span style={ { color: M3.error } }>⚠ { row.nextPayment }</span>
								: row.nextPayment ?? '—'
						}
					/>
					<SummaryRow label="Started" value={ row.startDate } />
					<SummaryRow
						label="Payment method"
						value={ row.paymentMethod ? `${ row.paymentMethod.brand } ····${ row.paymentMethod.last4 }` : '—' }
					/>
					{ row.maxLengthAt && <SummaryRow label="Ends" value={ `${ row.maxLengthAt } (fixed-length subscription)` } /> }
				</Card>

				{ row.cardExpiring && row.cardExpiryDate && (
					<CardExpiryWarning expiryDate={ row.cardExpiryDate } onSendUpdateLink={ onSendCardUpdate } />
				) }

				{ row.pendingSwitchProduct && (
					<div
						className="px-3 py-2.5 rounded-xl text-xs"
						style={ { backgroundColor: M3.infoContainer, color: M3.info, fontFamily: 'Roboto, sans-serif' } }
					>
						🔄 Scheduled { row.pendingSwitchType } to { row.pendingSwitchProduct } on renewal
					</div>
				) }

				{ row.paymentType === 'split' && row.maxPayments !== null && (
					<Card className="p-5">
						<div className="text-sm font-semibold mb-2" style={ { color: M3.onSurface, fontFamily: 'Roboto, sans-serif' } }>
							Split Payment Progress
						</div>
						<InstallmentProgress completed={ row.paymentsCompleted } total={ row.maxPayments } />
						<div className="text-xs mt-2" style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif' } }>
							Access: { row.accessTiming === 'immediate' ? 'Immediately' : row.accessTiming === 'after_full_payment' ? 'After full payment' : 'Custom duration' }
						</div>
					</Card>
				) }

				<Card className="p-5">
					<div className="text-sm font-semibold mb-2" style={ { color: M3.onSurface, fontFamily: 'Roboto, sans-serif' } }>
						Churn Risk
					</div>
					<ChurnGauge score={ row.churnRiskScore } />
				</Card>

				<Card className="p-5">
					<div className="text-sm font-semibold mb-1" style={ { color: M3.onSurface, fontFamily: 'Roboto, sans-serif' } }>
						Customer LTV
					</div>
					<div className="text-sm" style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif' } }>
						${ row.customerLtv.toLocaleString() } projected over 24 months
					</div>
				</Card>
			</div>

			<div className="flex flex-col gap-4">
				<Card className="p-4">
					<div className="text-sm font-medium" style={ { color: M3.onSurface, fontFamily: 'Roboto, sans-serif' } }>
						{ row.customer }
					</div>
					<div className="text-xs mt-0.5" style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif' } }>
						{ row.email }
					</div>
					<div className="text-xs mt-1" style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif' } }>
						LTV: ${ row.customerLtv.toLocaleString() }
					</div>
				</Card>
				<Card className="p-4">
					<div className="text-sm font-medium" style={ { color: M3.onSurface, fontFamily: 'Roboto, sans-serif' } }>
						{ row.product }
					</div>
					<div className="text-xs mt-0.5" style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif' } }>
						Product #{ row.productId }
					</div>
				</Card>
			</div>
		</div>
	);
}
