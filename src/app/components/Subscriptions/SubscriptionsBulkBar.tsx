/**
 * SubscriptionsBulkBar component.
 *
 * Renders the floating bulk-action bar shown at the bottom of the screen
 * once at least one table row is selected. Fully controlled - owns no state,
 * every button just calls a callback supplied by the parent.
 *
 * @file
 * @since 1.0.0
 */
import { Mail, PauseCircle, XCircle, CreditCard, Tag } from 'lucide-react';
import { M3 } from '../../utils/static-data';
import { TextButton } from '../ui/TextButton';
import { TonalButton } from '../ui/TonalButton';
import { OutlinedButton } from '../ui/OutlinedButton';
import { FilledButton } from '../ui/FilledButton';

export interface SubscriptionsBulkBarProps {
	selectedCount: number;
	cardUpdateEligibleCount: number;
	onClear: () => void;
	onPauseAll: () => void;
	onSendReceipts: () => void;
	onSendCardUpdateEmail: () => void;
	onApplyDiscountToAll: () => void;
	onCancelSelected: () => void;
}

/**
 * Renders the floating bulk-action bar.
 *
 * @since 1.0.0
 *
 * @param {SubscriptionsBulkBarProps} props Component props.
 *
 * @return {JSX.Element|null} The bulk bar element, or null when nothing is selected.
 */
export function SubscriptionsBulkBar( {
	selectedCount,
	cardUpdateEligibleCount,
	onClear,
	onPauseAll,
	onSendReceipts,
	onSendCardUpdateEmail,
	onApplyDiscountToAll,
	onCancelSelected,
}: SubscriptionsBulkBarProps ) {
	if ( selectedCount === 0 ) return null;
	return (
		<div
			className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-5 py-3 rounded-2xl z-50 flex-wrap justify-center"
			style={ {
				backgroundColor: M3.onSurface,
				boxShadow: '0 4px 16px rgba(0,0,0,0.24)',
				maxWidth: '90vw',
			} }
		>
			<span
				className="text-sm font-medium"
				style={ { color: M3.surface, fontFamily: 'Roboto, sans-serif' } }
			>
				{ selectedCount } selected
			</span>
			<div style={ { width: 1, height: 20, backgroundColor: M3.outlineVariant } } />
			<TextButton onClick={ onClear }>Cancel</TextButton>
			<TonalButton small onClick={ onPauseAll }>
				<PauseCircle size={ 14 } /> Pause All
			</TonalButton>
			<OutlinedButton small onClick={ onSendReceipts }>
				<Mail size={ 14 } /> Send Receipts
			</OutlinedButton>
			<div
				style={ {
					opacity: cardUpdateEligibleCount === 0 ? 0.4 : 1,
					pointerEvents: cardUpdateEligibleCount === 0 ? 'none' : 'auto',
				} }
			>
				<OutlinedButton small onClick={ onSendCardUpdateEmail }>
					<CreditCard size={ 14 } /> Send Card Update Email ({ cardUpdateEligibleCount })
				</OutlinedButton>
			</div>
			<OutlinedButton small onClick={ onApplyDiscountToAll }>
				<Tag size={ 14 } /> Apply Discount to All
			</OutlinedButton>
			<FilledButton danger small onClick={ onCancelSelected }>
				<XCircle size={ 14 } /> Cancel { selectedCount }
			</FilledButton>
		</div>
	);
}
