/**
 * PauseDurationModal component.
 *
 * Replaces the plain "pause subscription?" confirm with a duration picker -
 * 1/2/3 months, or an indefinite "Until I resume" option.
 *
 * @file
 * @since 1.0.0
 */
import { useState } from 'react';
import { PauseCircle } from 'lucide-react';
import { M3 } from '../../../utils/static-data';
import { TextButton } from '../../ui/TextButton';
import { FilledButton } from '../../ui/FilledButton';
import { addBillingInterval } from '../utils';
import type { SubscriptionRecord } from '../types';

const DURATION_OPTIONS = [
	{ label: '1 month', months: 1 },
	{ label: '2 months', months: 2 },
	{ label: '3 months', months: 3 },
	{ label: 'Until I resume', months: null },
];

interface PauseDurationModalProps {
	row: SubscriptionRecord;
	onClose: () => void;
	onPause: ( pauseEndDate: string | null ) => void;
}

/**
 * Renders the pause-duration picker modal.
 *
 * @since 1.0.0
 *
 * @param {PauseDurationModalProps} props Component props.
 *
 * @return {JSX.Element} The pause duration modal.
 */
export function PauseDurationModal( { row, onClose, onPause }: PauseDurationModalProps ) {
	const [ selectedIndex, setSelectedIndex ] = useState( 0 );
	const selected = DURATION_OPTIONS[ selectedIndex ];
	const resumeDate =
		selected.months === null
			? null
			: addBillingInterval( null, { interval: selected.months, period: 'month', displayLabel: '' } );

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
				style={ {
					width: 420,
					backgroundColor: M3.surfaceContainer,
					boxShadow: '0 8px 32px rgba(0,0,0,0.24)',
				} }
			>
				<div className="px-6 pt-6 pb-4 text-center">
					<div
						className="flex items-center justify-center w-12 h-12 rounded-full mx-auto mb-4"
						style={ { backgroundColor: M3.infoContainer } }
					>
						<PauseCircle size={ 22 } color={ M3.info } />
					</div>
					<div className="font-semibold text-lg" style={ { color: M3.onSurface, fontFamily: 'Roboto, sans-serif' } }>
						Pause Subscription
					</div>
					<div className="text-sm mt-1" style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif' } }>
						{ row.customer } · { row.product }
					</div>
				</div>

				<div className="px-6 pb-4 flex gap-2 flex-wrap justify-center">
					{ DURATION_OPTIONS.map( ( opt, i ) => (
						<button
							key={ opt.label }
							onClick={ () => setSelectedIndex( i ) }
							className="px-3 py-2 rounded-full text-xs transition-all"
							style={ {
								backgroundColor: selectedIndex === i ? M3.primary : M3.surfaceContainerHigh,
								color: selectedIndex === i ? M3.onPrimary : M3.onSurfaceVariant,
								border: 'none',
								cursor: 'pointer',
								fontFamily: 'Roboto, sans-serif',
							} }
						>
							{ opt.label }
						</button>
					) ) }
				</div>

				<div
					className="mx-6 mb-4 px-3 py-2.5 rounded-xl text-xs"
					style={ { backgroundColor: M3.infoContainer, color: M3.info, fontFamily: 'Roboto, sans-serif' } }
				>
					{ resumeDate
						? `Access continues until ${ resumeDate }, then billing resumes automatically.`
						: 'Access continues indefinitely until you resume billing manually.' }
				</div>

				<div
					className="flex items-center justify-end gap-2 px-6 py-4"
					style={ { borderTop: `1px solid ${ M3.outlineVariant }` } }
				>
					<TextButton onClick={ onClose }>Cancel</TextButton>
					<FilledButton small onClick={ () => { onPause( resumeDate ); onClose(); } }>
						Pause Subscription
					</FilledButton>
				</div>
			</div>
		</div>
	);
}
