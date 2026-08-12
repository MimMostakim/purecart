/**
 * ApplyDiscountModal component.
 *
 * Extracted from SubscriptionsPage.tsx's original inline JSX (Phase 1), with
 * one addition: bulk mode. When bulkRows is passed (from the bulk action
 * bar), the header and confirm handler target every row in bulkRows instead
 * of just the single row prop, which is still required and used for the
 * live price preview.
 *
 * @file
 * @since 1.0.0
 */
import { useState } from 'react';
import { Tag } from 'lucide-react';
import { M3, DISCOUNT_DURATIONS } from '../../../utils/static-data';
import { TextButton } from '../../ui/TextButton';
import { FilledButton } from '../../ui/FilledButton';
import type { SubscriptionRecord } from '../../../utils/subscription-types';

type DiscountDuration = ( typeof DISCOUNT_DURATIONS )[ number ];

interface ApplyDiscountModalProps {
	row: SubscriptionRecord;
	bulkRows?: SubscriptionRecord[];
	onClose: () => void;
	onConfirm: ( targetIds: string[], discountPct: number, duration: DiscountDuration ) => void;
}

/**
 * Renders the Apply Discount modal, single-row or bulk.
 *
 * @since 1.0.0
 *
 * @param {ApplyDiscountModalProps} props Component props.
 *
 * @return {JSX.Element} The apply discount modal.
 */
export function ApplyDiscountModal( { row, bulkRows, onClose, onConfirm }: ApplyDiscountModalProps ) {
	const [ discountPct, setDiscountPct ] = useState( '10' );
	const [ discountDur, setDiscountDur ] = useState< DiscountDuration >( 'Once' );

	const handleConfirm = () => {
		const targetIds = bulkRows ? bulkRows.map( ( r ) => r.id ) : [ row.id ];
		onConfirm( targetIds, parseInt( discountPct, 10 ) || 0, discountDur );
		onClose();
	};

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
				style={ { width: 420, backgroundColor: M3.surfaceContainer, boxShadow: '0 8px 32px rgba(0,0,0,0.24)' } }
			>
				<div className="px-6 pt-6 pb-4 text-center">
					<div
						className="flex items-center justify-center w-12 h-12 rounded-full mx-auto mb-4"
						style={ { backgroundColor: M3.secondaryContainer } }
					>
						<Tag size={ 22 } color={ M3.secondary } />
					</div>
					<div className="font-semibold text-lg" style={ { color: M3.onSurface, fontFamily: 'Roboto, sans-serif' } }>Apply Discount</div>
					<div className="text-sm mt-1" style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif' } }>
						{ bulkRows && bulkRows.length > 1
							? `Applying to ${ bulkRows.length } subscriptions`
							: `${ row.customer } · ${ row.product }` }
					</div>
				</div>

				<div className="px-6 pb-4 flex flex-col gap-4">
					<div>
						<div
							className="text-xs font-medium mb-2"
							style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px' } }
						>
							Discount Percentage
						</div>
						<div className="flex items-center gap-3">
							<input
								type="number" min={ 1 } max={ 100 } value={ discountPct }
								onChange={ ( e ) => setDiscountPct( e.target.value ) }
								className="flex-1 px-3 py-2.5 rounded-lg text-2xl font-light outline-none text-center"
								style={ { backgroundColor: M3.surfaceContainerLow, border: `1px solid ${ M3.primary }`, color: M3.primary, fontFamily: 'Roboto Mono, monospace' } }
							/>
							<span className="text-2xl font-light" style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif' } }>%</span>
						</div>
						<div className="flex gap-2 mt-2">
							{ [ '10', '15', '20', '25', '50' ].map( ( p ) => (
								<button
									key={ p } onClick={ () => setDiscountPct( p ) }
									className="flex-1 py-1.5 rounded-full text-xs transition-all"
									style={ {
										backgroundColor: discountPct === p ? M3.primary : M3.surfaceContainerHigh,
										color: discountPct === p ? M3.onPrimary : M3.onSurfaceVariant,
										border: 'none', cursor: 'pointer', fontFamily: 'Roboto, sans-serif',
									} }
								>
									{ p }%
								</button>
							) ) }
						</div>
					</div>

					<div>
						<div
							className="text-xs font-medium mb-2"
							style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px' } }
						>
							Apply For
						</div>
						<div className="flex gap-2">
							{ DISCOUNT_DURATIONS.map( ( d ) => (
								<button
									key={ d } onClick={ () => setDiscountDur( d ) }
									className="flex-1 py-2 rounded-lg text-xs transition-all"
									style={ {
										backgroundColor: discountDur === d ? M3.secondaryContainer : M3.surfaceContainerLow,
										color: discountDur === d ? M3.onSecondaryContainer : M3.onSurfaceVariant,
										border: `1px solid ${ discountDur === d ? M3.secondary : M3.outlineVariant }`,
										cursor: 'pointer', fontFamily: 'Roboto, sans-serif',
									} }
								>
									{ d }
								</button>
							) ) }
						</div>
					</div>

					<div className="p-3 rounded-xl" style={ { backgroundColor: M3.surfaceContainerLow } }>
						<div className="text-xs font-medium mb-2" style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif' } }>
							Preview{ bulkRows && bulkRows.length > 1 ? ` (based on ${ row.customer }'s price)` : '' }
						</div>
						<div className="flex items-center justify-between text-sm" style={ { fontFamily: 'Roboto, sans-serif' } }>
							<span style={ { color: M3.onSurfaceVariant } }>Current price</span>
							<span style={ { color: M3.onSurface } }>{ row.amount }</span>
						</div>
						<div className="flex items-center justify-between text-sm mt-1" style={ { fontFamily: 'Roboto, sans-serif' } }>
							<span style={ { color: M3.onSurfaceVariant } }>After discount</span>
							<span className="font-semibold" style={ { color: M3.success } }>
								{ ( () => {
									const disc = row.amountRaw * ( 1 - parseInt( discountPct || '0', 10 ) / 100 );
									const suffix = row.amount.includes( '/mo' ) ? '/mo' : row.amount.includes( '/yr' ) ? '/yr' : '';
									return `$${ disc.toFixed( 2 ) }${ suffix }`;
								} )() }
							</span>
						</div>
						<div className="flex items-center justify-between text-xs mt-1" style={ { fontFamily: 'Roboto, sans-serif' } }>
							<span style={ { color: M3.onSurfaceVariant } }>Duration</span>
							<span style={ { color: M3.onSurface } }>{ discountDur }</span>
						</div>
					</div>
				</div>

				<div className="flex items-center justify-end gap-2 px-6 py-4" style={ { borderTop: `1px solid ${ M3.outlineVariant }` } }>
					<TextButton onClick={ onClose }>Cancel</TextButton>
					<FilledButton small onClick={ handleConfirm }>Apply Discount</FilledButton>
				</div>
			</div>
		</div>
	);
}
