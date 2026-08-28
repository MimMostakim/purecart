/**
 * InstallmentProgress component.
 *
 * Renders a dot-bar showing split-payment progress, e.g. "2 of 3
 * installments · Next: $83 on Feb 15". Used in the subscriptions table's
 * "Payment" column and the Detail page's Overview tab.
 *
 * @file
 * @since 1.0.0
 */
import { M3 } from '../../../utils/static-data';

/**
 * Renders completed/remaining dots plus an installment progress summary.
 *
 * @since 1.0.0
 *
 * @param {Object} props             Component props.
 * @param {number} props.completed   Installments completed so far.
 * @param {number} props.total       Total installments in the plan.
 * @param {string} [props.nextDate]  Next installment's date - omits the "Next:" suffix when absent.
 * @param {string} [props.nextAmount] Next installment's formatted amount.
 *
 * @return {JSX.Element} The installment progress element.
 */
export function InstallmentProgress( {
	completed,
	total,
	nextDate,
	nextAmount,
}: {
	completed: number;
	total: number;
	nextDate?: string | null;
	nextAmount?: string | null;
} ) {
	return (
		<div
			className="flex items-center gap-1.5 text-xs"
			style={ { fontFamily: 'Roboto, sans-serif', color: M3.onSurfaceVariant } }
		>
			<span className="flex items-center gap-0.5">
				{ Array.from( { length: total } ).map( ( _, i ) => (
					<span
						key={ i }
						className="inline-block rounded-full"
						style={ {
							width: 6,
							height: 6,
							backgroundColor:
								i < completed ? M3.primary : 'transparent',
							border:
								i < completed
									? 'none'
									: `1px solid ${ M3.outlineVariant }`,
						} }
					/>
				) ) }
			</span>
			<span>
				{ completed } of { total } installments
				{ nextDate && (
					<>
						{ ' ' }· Next: { nextAmount } on { nextDate }
					</>
				) }
			</span>
		</div>
	);
}
