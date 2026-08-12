/**
 * SubRevenueGoalsSection - Settings → Subscriptions → Revenue Goals.
 *
 * The one place goals are actually created/edited/deleted - the Analytics
 * page's placement of RevenueGoalCard is read-only by design (see
 * Analytics/RevenueGoalsWidget.tsx), so there's exactly one management UI.
 *
 * @file
 * @since 1.0.0
 */
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { OutlinedButton } from '../../ui/OutlinedButton';
import { RevenueGoalCard } from '../../Subscriptions/shared';
import { AddRevenueGoalModal } from '../AddRevenueGoalModal';
import type { RevenueGoal } from '../../../utils/subscription-types';

interface SubRevenueGoalsSectionProps {
	goals: RevenueGoal[];
	onAdd: ( goal: Omit< RevenueGoal, 'id' | 'current' | 'status' > ) => void;
	onDelete: ( id: string ) => void;
}

/**
 * Renders the Revenue Goals settings section.
 *
 * @since 1.0.0
 *
 * @param {SubRevenueGoalsSectionProps} props Component props.
 *
 * @return {JSX.Element} The Revenue Goals section content.
 */
export function SubRevenueGoalsSection( { goals, onAdd, onDelete }: SubRevenueGoalsSectionProps ) {
	const [ showAddModal, setShowAddModal ] = useState( false );

	return (
		<div className="flex flex-col gap-3 pt-2">
			<div>
				<OutlinedButton small onClick={ () => setShowAddModal( true ) }>
					<Plus size={ 14 } /> Add Goal
				</OutlinedButton>
			</div>
			<div className="grid grid-cols-2 gap-3">
				{ goals.map( ( g ) => (
					<RevenueGoalCard key={ g.id } goal={ g } onDelete={ () => onDelete( g.id ) } />
				) ) }
			</div>
			{ showAddModal && (
				<AddRevenueGoalModal
					onClose={ () => setShowAddModal( false ) }
					onAdd={ onAdd }
				/>
			) }
		</div>
	);
}
