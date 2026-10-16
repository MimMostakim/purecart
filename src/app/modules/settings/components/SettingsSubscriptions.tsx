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
import { fetchRevenueGoals } from '@/modules/analytics';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { FilledButton } from '@/shared/ui/FilledButton';
import { Toast } from '@/shared/ui/Toast';
import type { ToastProps } from '@/shared/ui';
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
import {
	selectSubscriptionItems,
	loadSubscriptions,
	defaultSubscriptionSettings,
	fetchSubscriptionSettings,
	saveSubscriptionSettings,
	createRevenueGoal,
	deleteRevenueGoal,
} from '@/modules/subscriptions';
import type { SubscriptionSettings, SubscriptionDeliveryType, RevenueGoal } from '@/modules/subscriptions';

/**
 * Renders the Subscriptions settings tab.
 *
 * @since 1.0.0
 *
 * @return {JSX.Element} The Subscriptions settings tab.
 */
export function SettingsSubscriptions() {
	const dispatch = useAppDispatch();
	const [ settings, setSettings ] = useState< SubscriptionSettings >( defaultSubscriptionSettings );
	const [ isDirty, setIsDirty ] = useState( false );
	const [ goals, setGoals ] = useState< RevenueGoal[] >( [] );
	const [ toast, setToast ] = useState< ToastProps >( { message: '', type: 'success', visible: false } );

	// Real subscriptions, not the store's default empty state — loaded here
	// too (not just on the Subscriptions page) since an admin can land on
	// Settings directly without the list ever having been fetched this
	// session. Which type-specific sections (Membership, Downloads, ...)
	// show below depends on whether any real subscription uses that
	// delivery type; a real backend query ("does a published product with
	// this delivery type exist") would be more precise, but this is what's
	// already loaded, so it's what's used.
	const storeItems = useAppSelector( selectSubscriptionItems );
	const hasType = ( type: SubscriptionDeliveryType ) => storeItems.some( ( r ) => r.deliveryType === type );

	const [ isSaving, setIsSaving ] = useState( false );

	useEffect( () => {
		fetchSubscriptionSettings()
			.then( setSettings )
			.catch( () => showToast( 'Failed to load subscription settings', 'error' ) );
		fetchRevenueGoals().then( setGoals );
		dispatch( loadSubscriptions() );
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ dispatch ] );

	const showToast = ( msg: string, type: ToastProps[ 'type' ] = 'success' ) => {
		setToast( { message: msg, type, visible: true } );
		setTimeout( () => setToast( ( t ) => ( { ...t, visible: false } ) ), 3000 );
	};

	const update = < K extends keyof SubscriptionSettings >( key: K, value: SubscriptionSettings[ K ] ) => {
		setSettings( ( s ) => ( { ...s, [ key ]: value } ) );
		setIsDirty( true );
	};

	const addGoal = async ( goal: Omit< RevenueGoal, 'id' | 'current' | 'status' > ) => {
		try {
			const saved = await createRevenueGoal( goal );
			setGoals( ( g ) => [ saved, ...g ] );
			showToast( 'Revenue goal created', 'success' );
		} catch {
			showToast( 'Failed to create revenue goal', 'error' );
		}
	};
	const handleDeleteGoal = async ( id: string ) => {
		try {
			await deleteRevenueGoal( id );
			setGoals( ( g ) => g.filter( ( goal ) => goal.id !== id ) );
			showToast( 'Revenue goal deleted', 'success' );
		} catch {
			showToast( 'Failed to delete revenue goal', 'error' );
		}
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
				<SubRevenueGoalsSection goals={ goals } onAdd={ addGoal } onDelete={ handleDeleteGoal } />
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
					disabled={ ! isDirty || isSaving }
					onClick={ async () => {
						setIsSaving( true );
						try {
							await saveSubscriptionSettings( settings );
							showToast( 'Subscription settings saved', 'success' );
							setIsDirty( false );
						} catch {
							showToast( 'Failed to save subscription settings', 'error' );
						} finally {
							setIsSaving( false );
						}
					} }
				>
					{ isSaving ? 'Saving…' : 'Save Changes' }
				</FilledButton>
			</div>
			<Toast message={ toast.message } type={ toast.type } visible={ toast.visible } />
		</div>
	);
}
