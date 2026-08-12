/**
 * RetentionOfferCard component.
 *
 * Renders a single retention offer (discount/pause/skip/downgrade/contact)
 * shown in step 2 of the Cancellation Flow modal, with an Accept/Decline
 * footer - except for the 'contact' type, which shows a support-chat button
 * instead of Accept, since "accepting" isn't a concept for that offer type.
 *
 * @file
 * @since 1.0.0
 */
import { Tag, PauseCircle, SkipForward, ArrowDownRight, Headphones } from 'lucide-react';
import { M3 } from '../../../utils/static-data';
import { TextButton } from '../../ui/TextButton';
import { FilledButton } from '../../ui/FilledButton';
import { OutlinedButton } from '../../ui/OutlinedButton';
import type { RetentionOffer } from '../../../utils/subscription-types';

const OFFER_ICON: Record< RetentionOffer[ 'type' ], React.ElementType > = {
	discount: Tag,
	pause: PauseCircle,
	skip: SkipForward,
	downgrade: ArrowDownRight,
	contact: Headphones,
};

/**
 * Formats a discounted price for the discount-type offer's preview line.
 *
 * @since 1.0.0
 *
 * @param {string} currentAmount Formatted current price, e.g. '$49/mo'.
 * @param {number} discountPct   Discount percentage to apply.
 *
 * @return {string} The discounted amount, keeping the original suffix (/mo, /yr).
 */
function discountedAmount( currentAmount: string, discountPct: number ): string {
	const base = parseFloat( currentAmount.replace( /[^0-9.]/g, '' ) );
	const after = base * ( 1 - discountPct / 100 );
	const suffix = currentAmount.includes( '/mo' )
		? '/mo'
		: currentAmount.includes( '/yr' )
		? '/yr'
		: '';
	return `$${ after.toFixed( 2 ) }${ suffix }`;
}

/**
 * Renders a highlighted retention offer card with an accept/decline footer.
 *
 * @since 1.0.0
 *
 * @param {Object}          props               Component props.
 * @param {RetentionOffer}  props.offer         Offer to render.
 * @param {string}          props.currentAmount Current formatted price, used for the discount preview.
 * @param {Function}        props.onAccept      Callback invoked when the offer is accepted.
 * @param {Function}        props.onDecline     Callback invoked when the customer continues cancelling instead.
 *
 * @return {JSX.Element} The retention offer card.
 */
export function RetentionOfferCard( {
	offer,
	currentAmount,
	onAccept,
	onDecline,
}: {
	offer: RetentionOffer;
	currentAmount: string;
	onAccept: () => void;
	onDecline: () => void;
} ) {
	const Icon = OFFER_ICON[ offer.type ];
	return (
		<div
			className="flex flex-col gap-3 p-4 rounded-2xl"
			style={ {
				border: `2px solid ${ M3.primary }`,
				backgroundColor: M3.primaryContainer,
			} }
		>
			<div className="flex items-start gap-3">
				<Icon size={ 20 } color={ M3.primary } />
				<div>
					<div
						className="text-sm font-semibold"
						style={ {
							color: M3.onPrimaryContainer,
							fontFamily: 'Roboto, sans-serif',
						} }
					>
						{ offer.label }
					</div>
					<div
						className="text-xs mt-0.5"
						style={ {
							color: M3.onPrimaryContainer,
							fontFamily: 'Roboto, sans-serif',
						} }
					>
						{ offer.description }
					</div>
				</div>
			</div>

			{ offer.type === 'discount' && offer.discountPct !== undefined && (
				<div
					className="text-sm"
					style={ { fontFamily: 'Roboto Mono, monospace', color: M3.onPrimaryContainer } }
				>
					{ currentAmount } → { discountedAmount( currentAmount, offer.discountPct ) }
					{ offer.discountDuration && ` for ${ offer.discountDuration }` }
				</div>
			) }
			{ offer.type === 'pause' && offer.pauseDuration !== undefined && (
				<div
					className="text-sm"
					style={ { fontFamily: 'Roboto, sans-serif', color: M3.onPrimaryContainer } }
				>
					{ offer.pauseDuration } days, no billing
				</div>
			) }
			{ offer.type === 'downgrade' && offer.downgradePlanLabel && (
				<div
					className="text-sm"
					style={ { fontFamily: 'Roboto, sans-serif', color: M3.onPrimaryContainer } }
				>
					Switch to { offer.downgradePlanLabel } at your next renewal
				</div>
			) }

			<div className="flex items-center justify-between gap-2">
				{ offer.type === 'contact' ? (
					<OutlinedButton
						small
						onClick={ () => window.open( offer.contactUrl, '_blank', 'noopener' ) }
					>
						Open Support Chat
					</OutlinedButton>
				) : (
					<FilledButton small onClick={ onAccept }>
						Accept Offer
					</FilledButton>
				) }
				<TextButton small onClick={ onDecline }>
					Continue Cancelling →
				</TextButton>
			</div>
		</div>
	);
}
