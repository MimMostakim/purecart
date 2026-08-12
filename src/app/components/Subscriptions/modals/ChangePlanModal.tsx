/**
 * ChangePlanModal component.
 *
 * Extracted from SubscriptionsPage.tsx's original inline JSX (Phase 1), with
 * one addition: a timing toggle (apply immediately vs. schedule for next
 * renewal). Scheduling doesn't change the plan yet - it sets the same
 * pendingSwitchProduct/pendingSwitchType fields a retention-flow downgrade
 * uses, so the list page's "Cancel Scheduled Switch" row action already
 * knows how to show and undo it.
 *
 * @file
 * @since 1.0.0
 */
import { useState } from 'react';
import { Repeat } from 'lucide-react';
import { M3, PLAN_OPTIONS } from '../../../utils/static-data';
import { TextButton } from '../../ui/TextButton';
import { FilledButton } from '../../ui/FilledButton';
import { addBillingInterval } from '../../../utils/subscription-metrics';
import type { SubscriptionRecord } from '../../../utils/subscription-types';

/** Parses a formatted price string like '$99/yr' or '$249' down to a raw number. */
function parseAmount( formatted: string ): number {
	return parseFloat( formatted.replace( /[^0-9.]/g, '' ) );
}

interface ChangePlanModalProps {
	row: SubscriptionRecord;
	onClose: () => void;
	onConfirm: ( patch: Partial< SubscriptionRecord > ) => void;
}

/**
 * Renders the Change Plan modal.
 *
 * @since 1.0.0
 *
 * @param {ChangePlanModalProps} props Component props.
 *
 * @return {JSX.Element} The change plan modal.
 */
export function ChangePlanModal( { row, onClose, onConfirm }: ChangePlanModalProps ) {
	const initialIndex = PLAN_OPTIONS.findIndex( ( p ) => p.cycle === row.cycle );
	const [ selectedPlan, setSelectedPlan ] = useState( initialIndex >= 0 ? initialIndex : 0 );
	const [ timing, setTiming ] = useState< 'immediate' | 'scheduled' >( 'immediate' );

	const plan = PLAN_OPTIONS[ selectedPlan ];
	const noChange = plan.cycle === row.cycle;

	const handleConfirm = () => {
		if ( timing === 'immediate' ) {
			onConfirm( {
				cycle: plan.cycle as SubscriptionRecord[ 'cycle' ],
				amount: plan.amount,
				nextPayment: plan.cycle === 'Lifetime' ? null : addBillingInterval( null, row.billing ),
			} );
		} else {
			const isUpgrade = parseAmount( plan.amount ) > row.amountRaw;
			onConfirm( {
				pendingSwitchProduct: plan.label,
				pendingSwitchType: isUpgrade ? 'upgrade' : 'downgrade',
			} );
		}
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
				style={ { width: 480, backgroundColor: M3.surfaceContainer, boxShadow: '0 8px 32px rgba(0,0,0,0.24)' } }
			>
				<div className="px-6 pt-6 pb-4">
					<div
						className="flex items-center justify-center w-12 h-12 rounded-full mx-auto mb-4"
						style={ { backgroundColor: M3.primaryContainer } }
					>
						<Repeat size={ 22 } color={ M3.primary } />
					</div>
					<div className="text-center font-semibold text-lg" style={ { color: M3.onSurface, fontFamily: 'Roboto, sans-serif' } }>
						Change Plan
					</div>
					<div className="text-center text-sm mt-1" style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif' } }>
						{ row.customer } · { row.product }
					</div>
				</div>

				<div className="px-6 pb-4 flex flex-col gap-2">
					{ PLAN_OPTIONS.map( ( p, i ) => {
						const active = selectedPlan === i;
						const isCurrent = p.cycle === row.cycle;
						return (
							<button
								key={ p.label }
								onClick={ () => setSelectedPlan( i ) }
								className="flex items-center gap-4 p-4 rounded-2xl text-left transition-all w-full"
								style={ {
									border: `2px solid ${ active ? M3.primary : M3.outlineVariant }`,
									backgroundColor: active ? M3.primaryContainer : M3.surfaceContainerLow,
									cursor: 'pointer',
								} }
							>
								<div
									className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center"
									style={ { border: `2px solid ${ active ? M3.primary : M3.outlineVariant }`, backgroundColor: active ? M3.primary : 'transparent' } }
								>
									{ active && <div className="w-2 h-2 rounded-full" style={ { backgroundColor: M3.onPrimary } } /> }
								</div>
								<div className="flex-1">
									<div className="flex items-center gap-2">
										<span className="text-sm font-medium" style={ { color: M3.onSurface, fontFamily: 'Roboto, sans-serif' } }>{ p.label }</span>
										{ isCurrent && (
											<span className="text-xs px-1.5 py-0.5 rounded-full" style={ { backgroundColor: M3.secondaryContainer, color: M3.onSecondaryContainer, fontFamily: 'Roboto, sans-serif' } }>
												Current
											</span>
										) }
									</div>
									<div className="text-xs mt-0.5" style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif' } }>{ p.note }</div>
								</div>
								<div className="text-sm font-semibold flex-shrink-0" style={ { color: active ? M3.primary : M3.onSurface, fontFamily: 'Roboto Mono, monospace' } }>
									{ p.amount }
								</div>
							</button>
						);
					} ) }
				</div>

				{ /* Timing toggle — new vs. Phase 1 */ }
				<div className="px-6 pb-4">
					<div
						className="text-xs font-medium mb-2"
						style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px' } }
					>
						Apply Change
					</div>
					<div className="flex flex-col gap-1.5">
						<button
							onClick={ () => setTiming( 'immediate' ) }
							className="flex items-center gap-2 text-left"
							style={ { background: 'none', border: 'none', cursor: 'pointer', padding: 0 } }
						>
							<span
								className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center"
								style={ { border: `2px solid ${ timing === 'immediate' ? M3.primary : M3.outlineVariant }`, backgroundColor: timing === 'immediate' ? M3.primary : 'transparent' } }
							>
								{ timing === 'immediate' && <span className="w-1.5 h-1.5 rounded-full" style={ { backgroundColor: M3.onPrimary } } /> }
							</span>
							<span className="text-sm" style={ { color: M3.onSurface, fontFamily: 'Roboto, sans-serif' } }>
								Immediately (prorate difference)
							</span>
						</button>
						<button
							onClick={ () => setTiming( 'scheduled' ) }
							className="flex items-center gap-2 text-left"
							style={ { background: 'none', border: 'none', cursor: 'pointer', padding: 0 } }
						>
							<span
								className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center"
								style={ { border: `2px solid ${ timing === 'scheduled' ? M3.primary : M3.outlineVariant }`, backgroundColor: timing === 'scheduled' ? M3.primary : 'transparent' } }
							>
								{ timing === 'scheduled' && <span className="w-1.5 h-1.5 rounded-full" style={ { backgroundColor: M3.onPrimary } } /> }
							</span>
							<span className="text-sm" style={ { color: M3.onSurface, fontFamily: 'Roboto, sans-serif' } }>
								At next renewal { row.nextPayment ? `(${ row.nextPayment })` : '' }
							</span>
						</button>
					</div>
				</div>

				<div className="mx-6 mb-4 px-3 py-2.5 rounded-xl text-xs" style={ { backgroundColor: M3.infoContainer, color: M3.info, fontFamily: 'Roboto, sans-serif' } }>
					{ timing === 'immediate'
						? 'ℹ The price difference will be prorated and charged or credited on the next billing cycle.'
						: 'ℹ No change today — the plan switches automatically at the next renewal.' }
				</div>

				<div className="flex items-center justify-end gap-2 px-6 py-4" style={ { borderTop: `1px solid ${ M3.outlineVariant }` } }>
					<TextButton onClick={ onClose }>Cancel</TextButton>
					<FilledButton small onClick={ handleConfirm } disabled={ noChange }>
						Confirm Plan Change
					</FilledButton>
				</div>
			</div>
		</div>
	);
}
