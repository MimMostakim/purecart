/**
 * SettingsSubscriptions - the "Subscriptions" settings tab.
 *
 * Holds the settings object as local component state (unlike subscription
 * records, settings aren't shared domain data another page currently reads,
 * so this doesn't need the Redux slice treatment the subscriptions list
 * got). 10 always-visible sections plus 4 conditional ones, each inside a
 * CollapsibleSection accordion.
 *
 * @file
 * @since 1.0.0
 */
import { useEffect, useState } from 'react';
import { defaultSubscriptionSettings, subscriptionsData } from '../../utils/static-data';
import { fetchRevenueGoals } from '../../utils/api';
import { useAppSelector } from '../../store/hooks';
import { FilledButton } from '../ui/FilledButton';
import { Toast } from '../ui/Toast';
import type { ToastProps } from '../ui';
import { CollapsibleSection } from './CollapsibleSection';
import {
	SubGeneralSection,
	SubBillingDunningSection,
	SubRenewalsSection,
	SubUpgradeDowngradeSection,
	SubRetentionSection,
	SubCustomerPortalSection,
	SubRoleMappingSection,
	SubSubscribeSaveSection,
	SubAdvancedSection,
	SubRevenueGoalsSection,
	SubMembershipSection,
	SubDownloadsSection,
	SubCoursesSection,
	SubServiceSection,
} from './sections';
import type { SubscriptionSettings, SubscriptionDeliveryType, RevenueGoal } from '../../utils/subscription-types';

/**
 * Renders the Subscriptions settings tab.
 *
 * @since 1.0.0
 *
 * @return {JSX.Element} The Subscriptions settings tab.
 */
export function SettingsSubscriptions() {
	const [ settings, setSettings ] = useState< SubscriptionSettings >( defaultSubscriptionSettings );
	const [ isDirty, setIsDirty ] = useState( false );
	const [ goals, setGoals ] = useState< RevenueGoal[] >( [] );
	const [ toast, setToast ] = useState< ToastProps >( { message: '', type: 'success', visible: false } );

	// Falls back to the static sample data if the Redux store hasn't loaded
	// yet (e.g. the admin navigates straight to Settings) - a real backend
	// would instead ask "does a published product with this delivery type
	// exist," a manage_woocommerce-gated product query the frontend can't
	// determine on its own; this is a placeholder rule, not final logic.
	const storeItems = useAppSelector( ( s ) => s.subscriptions.items );
	const sampleSource = storeItems.length > 0 ? storeItems : subscriptionsData;
	const hasType = ( type: SubscriptionDeliveryType ) => sampleSource.some( ( r ) => r.deliveryType === type );

	useEffect( () => {
		fetchRevenueGoals().then( setGoals );
	}, [] );

	const showToast = ( msg: string, type: ToastProps[ 'type' ] = 'success' ) => {
		setToast( { message: msg, type, visible: true } );
		setTimeout( () => setToast( ( t ) => ( { ...t, visible: false } ) ), 3000 );
	};

	const update = < K extends keyof SubscriptionSettings >( key: K, value: SubscriptionSettings[ K ] ) => {
		setSettings( ( s ) => ( { ...s, [ key ]: value } ) );
		setIsDirty( true );
	};

	const addGoal = ( goal: Omit< RevenueGoal, 'id' | 'current' | 'status' > ) => {
		setGoals( ( g ) => [ ...g, { ...goal, id: `goal-${ Date.now() }`, current: 0, status: 'on_track' } ] );
		setIsDirty( true );
	};
	const deleteGoal = ( id: string ) => {
		setGoals( ( g ) => g.filter( ( goal ) => goal.id !== id ) );
		setIsDirty( true );
	};

	return (
		<div className="flex flex-col gap-3 pb-20">
			<CollapsibleSection title="General" defaultOpen>
				<SubGeneralSection settings={ settings } update={ update } />
			</CollapsibleSection>
			<CollapsibleSection title="Billing & Dunning" description="Configure retry attempts and grace periods before suspension">
				<SubBillingDunningSection settings={ settings } update={ update } />
			</CollapsibleSection>
			<CollapsibleSection title="Renewals & Reminders">
				<SubRenewalsSection settings={ settings } update={ update } />
			</CollapsibleSection>
			<CollapsibleSection title="Upgrade / Downgrade">
				<SubUpgradeDowngradeSection settings={ settings } update={ update } />
			</CollapsibleSection>
			<CollapsibleSection title="Retention">
				<SubRetentionSection settings={ settings } update={ update } />
			</CollapsibleSection>
			<CollapsibleSection title="Customer Portal">
				<SubCustomerPortalSection settings={ settings } update={ update } />
			</CollapsibleSection>
			<CollapsibleSection title="Role Mapping">
				<SubRoleMappingSection settings={ settings } update={ update } />
			</CollapsibleSection>
			<CollapsibleSection title="Subscribe & Save">
				<SubSubscribeSaveSection settings={ settings } update={ update } />
			</CollapsibleSection>
			<CollapsibleSection title="Advanced">
				<SubAdvancedSection settings={ settings } update={ update } />
			</CollapsibleSection>
			<CollapsibleSection title="Revenue Goals">
				<SubRevenueGoalsSection goals={ goals } onAdd={ addGoal } onDelete={ deleteGoal } />
			</CollapsibleSection>

			{ hasType( 'membership' ) && (
				<CollapsibleSection title="Membership">
					<SubMembershipSection settings={ settings } update={ update } />
				</CollapsibleSection>
			) }
			{ hasType( 'download' ) && (
				<CollapsibleSection title="Digital Downloads">
					<SubDownloadsSection settings={ settings } update={ update } />
				</CollapsibleSection>
			) }
			{ hasType( 'course' ) && (
				<CollapsibleSection title="Courses / LMS">
					<SubCoursesSection settings={ settings } update={ update } />
				</CollapsibleSection>
			) }
			{ hasType( 'service' ) && (
				<CollapsibleSection title="Service / Retainer">
					<SubServiceSection settings={ settings } update={ update } />
				</CollapsibleSection>
			) }

			<div className="fixed bottom-6 right-6">
				<FilledButton
					disabled={ ! isDirty }
					onClick={ () => {
						showToast( 'Settings saved', 'success' );
						setIsDirty( false );
					} }
				>
					Save Changes
				</FilledButton>
			</div>
			<Toast message={ toast.message } type={ toast.type } visible={ toast.visible } />
		</div>
	);
}
