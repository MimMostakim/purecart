/**
 * StepIndicator component.
 *
 * Renders a row of step-progress dots for multi-step modals (e.g. the
 * Cancellation Flow modal's 3 steps).
 *
 * @file
 * @since 1.0.0
 */
import { Check } from 'lucide-react';
import { M3 } from '../../../utils/static-data';

/**
 * Renders `steps` circles: filled + check for done steps, a solid dot for
 * the current step, and empty rings for upcoming steps.
 *
 * @since 1.0.0
 *
 * @param {Object} props         Component props.
 * @param {number} props.steps   Total number of steps.
 * @param {number} props.current Current step index, 0-based.
 *
 * @return {JSX.Element} The step indicator element.
 */
export function StepIndicator( {
	steps,
	current,
}: {
	steps: number;
	current: number;
} ) {
	return (
		<div className="flex items-center justify-center gap-2">
			{ Array.from( { length: steps } ).map( ( _, i ) => {
				const done = i < current;
				const active = i === current;
				return (
					<span
						key={ i }
						className="flex items-center justify-center rounded-full flex-shrink-0"
						style={ {
							width: 20,
							height: 20,
							backgroundColor:
								done || active ? M3.primary : 'transparent',
							border:
								done || active
									? 'none'
									: `1.5px solid ${ M3.outlineVariant }`,
						} }
					>
						{ done && <Check size={ 12 } color={ M3.onPrimary } /> }
					</span>
				);
			} ) }
		</div>
	);
}
