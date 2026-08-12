/**
 * SubscriptionDetailPage - full detail view for one subscription.
 *
 * Reads `subscriptionId` from the route (`/subscriptions/:id`), looks the
 * record up in the Redux store (dispatching loadSubscriptions itself if the
 * store is empty — this page can be reached by a direct deep link, not only
 * by drilling in from the list). Reuses useSubscriptionActions for its
 * header's Pause/Cancel/⋮ buttons, so this page and the list page share
 * every modal and row action rather than each keeping a private copy.
 *
 * @file
 * @since 1.0.0
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { M3 } from '../../utils/static-data';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { loadSubscriptions } from '../../store/slices/subscriptionsSlice';
import { fetchSubscriptionLogs, fetchSubscriptionEmails, fetchPaymentHistory } from '../../utils/api';
import { PAGE_PATHS } from '../../router';
import { StatusBadge } from '../ui/StatusBadge';
import { OutlinedButton } from '../ui/OutlinedButton';
import { ActionDropdown } from '../ui/ActionDropdown';
import { SubscriptionTypeBadge } from './shared';
import { useSubscriptionActions } from './useSubscriptionActions';
import { OverviewTab, DeliveryTypeTab, PaymentLogTab, StatusHistoryTab, EmailsSentTab, RetentionTab } from './detail-tabs';
import type {
	SubscriptionDeliveryType,
	SubscriptionLogEntry,
	SubscriptionEmailLogEntry,
	PaymentRecord,
} from '../../utils/subscription-types';

type DetailTabId = 'overview' | 'type' | 'payments' | 'history' | 'emails' | 'retention';

const TYPE_TAB_LABEL: Record< SubscriptionDeliveryType, string > = {
	software: 'License',
	saas: 'Account',
	membership: 'Access',
	download: 'Downloads',
	course: 'Courses',
	service: 'Deliverables',
};

/**
 * Renders the Subscription Detail page.
 *
 * @since 1.0.0
 *
 * @return {JSX.Element} The subscription detail page.
 */
export function SubscriptionDetailPage() {
	const { id } = useParams< { id: string } >();
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const tableData = useAppSelector( ( s ) => s.subscriptions.items );
	const loadStatus = useAppSelector( ( s ) => s.subscriptions.status );
	const loading = loadStatus === 'idle' || loadStatus === 'loading';

	const [ activeTab, setActiveTab ] = useState< DetailTabId >( 'overview' );
	const [ logs, setLogs ] = useState< SubscriptionLogEntry[] >( [] );
	const [ emails, setEmails ] = useState< SubscriptionEmailLogEntry[] >( [] );
	const [ payments, setPayments ] = useState< PaymentRecord[] >( [] );

	const {
		rowActions,
		sendCardUpdateEmail,
		openCancelFlow,
		openPauseModal,
		showToast,
		openDialog,
		closeDialog,
		updateRow,
		modals,
	} = useSubscriptionActions();

	useEffect( () => {
		if ( loadStatus === 'idle' ) dispatch( loadSubscriptions() );
	}, [ dispatch, loadStatus ] );

	useEffect( () => {
		if ( ! id ) return;
		fetchSubscriptionLogs( id ).then( setLogs );
		fetchSubscriptionEmails( id ).then( setEmails );
		fetchPaymentHistory( id ).then( setPayments );
	}, [ id ] );

	const row = tableData.find( ( r ) => r.id === id );

	if ( loading ) {
		return (
			<div className="flex items-center justify-center py-24">
				<span style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif' } }>
					Loading subscription…
				</span>
			</div>
		);
	}

	if ( ! row ) {
		return (
			<div className="flex flex-col items-center justify-center gap-3 py-24">
				<span style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif' } }>
					Subscription not found.
				</span>
				<OutlinedButton small onClick={ () => navigate( PAGE_PATHS.subscriptions ) }>
					← Back to Subscriptions
				</OutlinedButton>
			</div>
		);
	}

	const tabs: { id: DetailTabId; label: string }[] = [
		{ id: 'overview', label: 'Overview' },
		{ id: 'type', label: TYPE_TAB_LABEL[ row.deliveryType ] },
		{ id: 'payments', label: 'Payment Log' },
		{ id: 'history', label: 'Status History' },
		{ id: 'emails', label: 'Emails Sent' },
		{ id: 'retention', label: 'Retention' },
	];

	return (
		<div className="flex flex-col gap-5">
			{ /* Header */ }
			<div className="flex flex-col gap-3">
				<div className="flex items-center justify-between">
					<button
						onClick={ () => navigate( PAGE_PATHS.subscriptions ) }
						className="flex items-center gap-1.5 text-sm"
						style={ { color: M3.primary, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Roboto, sans-serif' } }
					>
						<ArrowLeft size={ 14 } /> Subscriptions
					</button>
					<div className="flex items-center gap-2">
						<StatusBadge status={ row.status } />
						<OutlinedButton small onClick={ () => openPauseModal( row ) }>
							Pause
						</OutlinedButton>
						<OutlinedButton small danger onClick={ () => openCancelFlow( row ) }>
							Cancel
						</OutlinedButton>
						<ActionDropdown actions={ rowActions( row ) } hint={ `${ row.id } · ${ row.customer }` } />
					</div>
				</div>
				<div>
					<div className="flex items-center gap-2">
						<span className="text-lg font-medium" style={ { color: M3.onSurface, fontFamily: 'Roboto, sans-serif' } }>
							{ row.id } · { row.product } · { row.billing.displayLabel }
						</span>
						<SubscriptionTypeBadge type={ row.deliveryType } size="small" />
					</div>
					<div className="text-sm mt-0.5" style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif' } }>
						{ row.customer } · { row.email }
					</div>
				</div>
			</div>

			{ /* Tab bar */ }
			<div className="flex items-center gap-1 flex-wrap" style={ { borderBottom: `1px solid ${ M3.outlineVariant }` } }>
				{ tabs.map( ( t ) => (
					<button
						key={ t.id }
						onClick={ () => setActiveTab( t.id ) }
						className="px-4 py-2.5 text-sm"
						style={ {
							background: 'none',
							border: 'none',
							cursor: 'pointer',
							fontFamily: 'Roboto, sans-serif',
							color: activeTab === t.id ? M3.primary : M3.onSurfaceVariant,
							fontWeight: activeTab === t.id ? 500 : 400,
							borderBottom: activeTab === t.id ? `2px solid ${ M3.primary }` : '2px solid transparent',
							marginBottom: -1,
						} }
					>
						{ t.label }
					</button>
				) ) }
			</div>

			{ /* Tab content */ }
			{ activeTab === 'overview' && <OverviewTab row={ row } onSendCardUpdate={ () => sendCardUpdateEmail( row ) } /> }
			{ activeTab === 'type' && (
				<DeliveryTypeTab row={ row } showToast={ showToast } openDialog={ openDialog } closeDialog={ closeDialog } updateRow={ updateRow } />
			) }
			{ activeTab === 'payments' && <PaymentLogTab row={ row } payments={ payments } onExport={ () => showToast( 'Payment history exported', 'success' ) } /> }
			{ activeTab === 'history' && <StatusHistoryTab events={ logs } /> }
			{ activeTab === 'emails' && <EmailsSentTab emails={ emails } /> }
			{ activeTab === 'retention' && <RetentionTab row={ row } events={ logs } /> }

			{ modals }
		</div>
	);
}
