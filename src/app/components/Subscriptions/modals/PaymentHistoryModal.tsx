/**
 * PaymentHistoryModal component.
 *
 * Extracted from SubscriptionsPage.tsx's original inline JSX (Phase 1) - no
 * behavior change, just its own file. Read-only: the only interactive bit
 * is a per-row "Receipt" toast, closing it changes nothing about the
 * subscription itself.
 *
 * @file
 * @since 1.0.0
 */
import { XCircle } from 'lucide-react';
import { M3 } from '../../../utils/static-data';
import { OutlinedButton } from '../../ui/OutlinedButton';
import { IconButton } from '../../ui/IconButton';
import type { SubscriptionRecord, PaymentRecord } from '../types';

interface PaymentHistoryModalProps {
	row: SubscriptionRecord;
	payments: PaymentRecord[];
	onClose: () => void;
	onSendReceipt: ( payment: PaymentRecord ) => void;
	onExport: () => void;
}

const STATUS_STYLE: Record< string, { color: string; bg: string; label: string } > = {
	paid: { color: M3.success, bg: M3.successContainer, label: 'Paid' },
	failed: { color: M3.error, bg: '#FFDAD6', label: 'Failed' },
	trial: { color: M3.info, bg: M3.infoContainer, label: 'Trial' },
	refunded: { color: M3.onSurfaceVariant, bg: M3.surfaceContainerHigh, label: 'Refunded' },
	pending: { color: M3.warning, bg: M3.warningContainer, label: 'Pending' },
};

/**
 * Renders the read-only Payment History modal.
 *
 * @since 1.0.0
 *
 * @param {PaymentHistoryModalProps} props Component props.
 *
 * @return {JSX.Element} The payment history modal.
 */
export function PaymentHistoryModal( {
	row,
	payments,
	onClose,
	onSendReceipt,
	onExport,
}: PaymentHistoryModalProps ) {
	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center"
			style={ { backgroundColor: 'rgba(0,0,0,0.40)' } }
			onClick={ ( e ) => {
				if ( e.target === e.currentTarget ) onClose();
			} }
		>
			<div
				className="rounded-3xl overflow-hidden flex flex-col"
				style={ { width: 520, backgroundColor: M3.surfaceContainer, boxShadow: '0 8px 32px rgba(0,0,0,0.24)' } }
			>
				<div className="flex items-center justify-between px-6 py-5" style={ { borderBottom: `1px solid ${ M3.outlineVariant }` } }>
					<div>
						<div className="font-semibold text-base" style={ { color: M3.onSurface, fontFamily: 'Roboto, sans-serif' } }>Payment History</div>
						<div className="text-sm mt-0.5" style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif' } }>
							{ row.customer } · { row.product } ·{ ' ' }
							<span style={ { fontFamily: 'Roboto Mono, monospace' } }>{ row.id }</span>
						</div>
					</div>
					<IconButton icon={ XCircle } onClick={ onClose } />
				</div>
				<div className="p-6 flex flex-col gap-1" style={ { maxHeight: 400, overflowY: 'auto' } }>
					{ payments.length === 0 && (
						<div className="text-sm text-center py-6" style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif' } }>
							No payments on record.
						</div>
					) }
					{ payments.map( ( p, i ) => {
						const s = STATUS_STYLE[ p.status ] ?? STATUS_STYLE.paid;
						return (
							<div key={ p.id } className="flex items-center gap-4 px-4 py-3.5 rounded-xl" style={ { backgroundColor: i % 2 === 0 ? M3.surfaceContainerLow : 'transparent' } }>
								<div className="flex-1">
									<div className="text-sm font-medium" style={ { color: M3.onSurface, fontFamily: 'Roboto, sans-serif' } }>{ p.date }</div>
									<div className="text-xs mt-0.5" style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif' } }>{ p.method }</div>
								</div>
								<div className="text-sm font-semibold" style={ { color: M3.onSurface, fontFamily: 'Roboto Mono, monospace' } }>{ p.amount }</div>
								<span className="text-xs px-2 py-0.5 rounded-full" style={ { backgroundColor: s.bg, color: s.color, fontFamily: 'Roboto, sans-serif' } }>{ s.label }</span>
								{ p.status === 'paid' && (
									<button
										onClick={ () => onSendReceipt( p ) }
										className="text-xs" style={ { color: M3.primary, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Roboto, sans-serif' } }
									>
										Receipt
									</button>
								) }
							</div>
						);
					} ) }
				</div>
				<div className="flex items-center justify-between px-6 py-4" style={ { borderTop: `1px solid ${ M3.outlineVariant }` } }>
					<span className="text-xs" style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif' } }>
						{ payments.length } payment{ payments.length !== 1 ? 's' : '' } on record
					</span>
					<OutlinedButton small onClick={ onExport }>Export</OutlinedButton>
				</div>
			</div>
		</div>
	);
}
