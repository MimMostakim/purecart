/**
 * SubscriptionsPage - top-level orchestrator for the subscriptions list page.
 *
 * Subscription records, load status, and the filter bar's active filters all
 * live in the Redux subscriptionsSlice rather than local component state.
 * Row actions, toasts, and the mutation modals (Cancel/Pause/Change Plan/
 * Apply Discount/Payment History) are all owned by useSubscriptionActions,
 * shared with the Subscription Detail page (Phase 3) so both pages show the
 * exact same ⋮ menu and popups. This file owns only what's specific to the
 * list view: selection, filtering-derived data, the KPI strip, and the bulk
 * action bar.
 *
 * @file
 * @since 1.0.0
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, PauseCircle, XCircle } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
	loadSubscriptions,
	setSearch,
	setStatusFilter,
	setProductFilter,
	setCycleFilter,
	setDeliveryTypeFilter,
	setPaymentTypeFilter,
	setChurnRiskFilter,
	clearFilters,
	setSelectedSubscriptionId,
} from '../../store/slices/subscriptionsSlice';
import { SubscriptionsKpiStrip } from './SubscriptionsKpiStrip';
import { SubscriptionsFilterBar } from './SubscriptionsFilterBar';
import { SubscriptionsTable } from './SubscriptionsTable';
import { SubscriptionsBulkBar } from './SubscriptionsBulkBar';
import { useSubscriptionActions } from './useSubscriptionActions';
import { subscriptionDetailPath } from '../../router';
import { M3 } from '../../utils/static-data';

/**
 * Renders the subscriptions list page.
 *
 * @since 1.0.0
 *
 * @return {JSX.Element} The subscriptions page.
 */
export function SubscriptionsPage() {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const tableData = useAppSelector( ( s ) => s.subscriptions.items );
	const loadStatus = useAppSelector( ( s ) => s.subscriptions.status );
	const filters = useAppSelector( ( s ) => s.subscriptions.filters );
	const loading = loadStatus === 'idle' || loadStatus === 'loading';

	const [ selected, setSelected ] = useState< string[] >( [] );
	const { rowActions, openBulkDiscount, sendCardUpdateEmail, showToast, openDialog, updateRow, modals } =
		useSubscriptionActions();

	useEffect( () => {
		if ( loadStatus === 'idle' ) dispatch( loadSubscriptions() );
	}, [ dispatch, loadStatus ] );

	const toggleSelect = ( id: string ) =>
		setSelected( ( prev ) =>
			prev.includes( id ) ? prev.filter( ( x ) => x !== id ) : [ ...prev, id ]
		);

	const productOptions = Array.from( new Set( tableData.map( ( r ) => r.product ) ) ).sort();
	const cycleOptions = Array.from( new Set( tableData.map( ( r ) => r.cycle ) ) ).sort();

	const filtered = tableData.filter( ( r ) => {
		const q = filters.search.toLowerCase();
		const matchSearch =
			! filters.search ||
			r.customer.toLowerCase().includes( q ) ||
			r.product.toLowerCase().includes( q ) ||
			r.id.toLowerCase().includes( q );
		const matchStatus =
			filters.status === 'All' ||
			r.status === filters.status.toLowerCase().replace( / /g, '_' );
		const matchProduct = filters.product === 'All' || r.product === filters.product;
		const matchCycle = filters.cycle === 'All' || r.cycle === filters.cycle;
		const matchType =
			filters.deliveryType === 'All' || r.deliveryType === filters.deliveryType.toLowerCase();
		const matchPaymentType =
			filters.paymentType === 'All' || r.paymentType === filters.paymentType.toLowerCase();
		const matchChurnRisk =
			filters.churnRisk === 'All' ||
			( filters.churnRisk === 'Low'
				? r.churnRiskScore <= 25
				: filters.churnRisk === 'Medium'
				? r.churnRiskScore > 25 && r.churnRiskScore <= 50
				: filters.churnRisk === 'High'
				? r.churnRiskScore > 50 && r.churnRiskScore <= 75
				: r.churnRiskScore > 75 );
		return (
			matchSearch &&
			matchStatus &&
			matchProduct &&
			matchCycle &&
			matchType &&
			matchPaymentType &&
			matchChurnRisk
		);
	} );
	const hasActiveFilters =
		filters.status !== 'All' ||
		filters.product !== 'All' ||
		filters.cycle !== 'All' ||
		filters.deliveryType !== 'All' ||
		filters.paymentType !== 'All' ||
		filters.churnRisk !== 'All';
	const clearAllFilters = () => dispatch( clearFilters() );

	const viewDetail = ( id: string ) => {
		dispatch( setSelectedSubscriptionId( id ) );
		navigate( subscriptionDetailPath( id ) );
	};

	if ( loading ) {
		return (
			<div className="flex items-center justify-center py-24">
				<span style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif' } }>
					Loading subscriptions…
				</span>
			</div>
		);
	}

	const cardUpdateEligibleIds = selected.filter( ( id ) => {
		const r = tableData.find( ( x ) => x.id === id );
		return r?.status === 'past_due' && r?.cardExpiring;
	} );

	return (
		<div className="flex flex-col gap-5">
			<SubscriptionsKpiStrip data={ tableData } />

			<SubscriptionsFilterBar
				search={ filters.search }
				onSearchChange={ ( v ) => dispatch( setSearch( v ) ) }
				filterStatus={ filters.status }
				onFilterStatusChange={ ( v ) => dispatch( setStatusFilter( v ) ) }
				filterProduct={ filters.product }
				onFilterProductChange={ ( v ) => dispatch( setProductFilter( v ) ) }
				filterCycle={ filters.cycle }
				onFilterCycleChange={ ( v ) => dispatch( setCycleFilter( v ) ) }
				filterType={ filters.deliveryType }
				onFilterTypeChange={ ( v ) => dispatch( setDeliveryTypeFilter( v ) ) }
				filterPaymentType={ filters.paymentType }
				onFilterPaymentTypeChange={ ( v ) => dispatch( setPaymentTypeFilter( v ) ) }
				filterChurnRisk={ filters.churnRisk }
				onFilterChurnRiskChange={ ( v ) => dispatch( setChurnRiskFilter( v ) ) }
				productOptions={ productOptions }
				cycleOptions={ cycleOptions }
				onClearAll={ clearAllFilters }
				onExportCsv={ () => showToast( 'Subscriptions exported as CSV', 'success' ) }
			/>

			<SubscriptionsTable
				rows={ filtered }
				totalCount={ tableData.length }
				selected={ selected }
				onToggleSelect={ toggleSelect }
				onToggleSelectAll={ ( checked ) => setSelected( checked ? filtered.map( ( s ) => s.id ) : [] ) }
				rowActions={ rowActions }
				onCardExpiryClick={ sendCardUpdateEmail }
				onViewDetail={ viewDetail }
				hasActiveFilters={ hasActiveFilters }
				onClearFilters={ clearAllFilters }
			/>

			<SubscriptionsBulkBar
				selectedCount={ selected.length }
				cardUpdateEligibleCount={ cardUpdateEligibleIds.length }
				onClear={ () => setSelected( [] ) }
				onPauseAll={ () => openDialog( {
					danger: false, icon: PauseCircle, title: `Pause ${ selected.length } Subscriptions?`,
					body: `Pause billing for all ${ selected.length } selected subscriptions? Customers will keep access until their current period ends.`,
					confirmLabel: `Pause ${ selected.length }`,
					onConfirm: () => {
						selected.forEach( ( id ) => {
							const r = tableData.find( ( x ) => x.id === id );
							if ( r?.status === 'active' ) updateRow( id, { status: 'paused', nextPayment: null } );
						} );
						showToast( `${ selected.length } subscriptions paused`, 'warning' );
						setSelected( [] );
					},
				} ) }
				onSendReceipts={ () => showToast( `Receipt sent to ${ selected.length } customers`, 'success' ) }
				onSendCardUpdateEmail={ () => openDialog( {
					danger: false, icon: CreditCard, title: 'Send Card Update Emails?',
					body: `Send a card update link to ${ cardUpdateEligibleIds.length } customer(s) with an expiring card on a past-due subscription?`,
					confirmLabel: 'Send Links',
					onConfirm: () => { showToast( `Card update emails sent to ${ cardUpdateEligibleIds.length } customers`, 'success' ); },
				} ) }
				onApplyDiscountToAll={ () => openBulkDiscount( tableData.filter( ( r ) => selected.includes( r.id ) ) ) }
				onCancelSelected={ () => openDialog( {
					danger: true, icon: XCircle, title: `Cancel ${ selected.length } Subscriptions?`,
					body: `Immediately cancel billing for all ${ selected.length } selected subscriptions. Access ends immediately. This cannot be reversed.`,
					confirmLabel: `Cancel ${ selected.length } Subscriptions`,
					onConfirm: () => {
						const today = new Date().toISOString().slice( 0, 10 );
						selected.forEach( ( id ) => updateRow( id, { status: 'cancelled', nextPayment: null, cancellationDate: today } ) );
						showToast( `${ selected.length } subscriptions cancelled`, 'error' );
						setSelected( [] );
					},
				} ) }
			/>

			{ modals }
		</div>
	);
}
