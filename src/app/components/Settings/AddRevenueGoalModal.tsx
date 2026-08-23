/**
 * AddRevenueGoalModal component.
 *
 * Small 4-field modal for creating a new revenue goal from the Settings →
 * Revenue Goals section. New goals always start at current: 0,
 * status: 'on_track'.
 *
 * @file
 * @since 1.0.0
 */
import { useState } from 'react';
import { Target } from 'lucide-react';
import { M3 } from '../../utils/static-data';
import { TextButton } from '../ui/TextButton';
import { FilledButton } from '../ui/FilledButton';
import { SettingsField, SettingsSelectField } from '../Subscriptions/shared';
import type { RevenueGoal } from '../Subscriptions/types';

interface AddRevenueGoalModalProps {
	onClose: () => void;
	onAdd: ( goal: Omit< RevenueGoal, 'id' | 'current' | 'status' > ) => void;
}

const TYPE_OPTIONS = [
	{ label: 'MRR', value: 'mrr' },
	{ label: 'ARR', value: 'arr' },
	{ label: 'Total Revenue', value: 'total_revenue' },
];

/**
 * Renders the Add Revenue Goal modal.
 *
 * @since 1.0.0
 *
 * @param {AddRevenueGoalModalProps} props Component props.
 *
 * @return {JSX.Element} The add-goal modal.
 */
export function AddRevenueGoalModal( { onClose, onAdd }: AddRevenueGoalModalProps ) {
	const [ label, setLabel ] = useState( '' );
	const [ type, setType ] = useState< RevenueGoal[ 'type' ] >( 'mrr' );
	const [ target, setTarget ] = useState( '1000' );
	const [ period, setPeriod ] = useState( '' );

	const canSubmit = label.trim().length > 0 && period.trim().length > 0;

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
						style={ { backgroundColor: M3.primaryContainer } }
					>
						<Target size={ 22 } color={ M3.primary } />
					</div>
					<div className="font-semibold text-lg" style={ { color: M3.onSurface, fontFamily: 'Roboto, sans-serif' } }>
						Add Revenue Goal
					</div>
				</div>

				<div className="px-6 pb-4 flex flex-col">
					<SettingsField label="Label" value={ label } onChange={ setLabel } />
					<SettingsSelectField label="Type" value={ type } options={ TYPE_OPTIONS } onChange={ ( v ) => setType( v as RevenueGoal[ 'type' ] ) } />
					<SettingsField label="Target amount" type="number" value={ target } onChange={ setTarget } suffix="$" />
					<SettingsField label="Period" value={ period } onChange={ setPeriod } helpText="e.g. Q4 2026" />
				</div>

				<div className="flex items-center justify-end gap-2 px-6 py-4" style={ { borderTop: `1px solid ${ M3.outlineVariant }` } }>
					<TextButton onClick={ onClose }>Cancel</TextButton>
					<FilledButton
						small
						disabled={ ! canSubmit }
						onClick={ () => {
							onAdd( { label, type, target: parseInt( target, 10 ) || 0, period } );
							onClose();
						} }
					>
						Add Goal
					</FilledButton>
				</div>
			</div>
		</div>
	);
}
