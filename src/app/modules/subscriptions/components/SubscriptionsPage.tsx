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
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, PauseCircle, XCircle } from 'lucide-react';
import { __ , sprintf } from '@wordpress/i18n';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { useSuspenseThunk } from '@/shared/suspense';
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
	setPage,
	setPerPage,
	pauseSubscriptionThunk,
	cancelSubscriptionThunk,
	sendCardUpdateThunk,
} from '../store/subscriptions.slice';
import {
	selectSubscriptionItems,
	selectSubscriptionFilters,
	selectSubscriptionPage,
	selectSubscriptionPerPage,
} from '../store/subscriptions.selectors';
import { SubscriptionsKpiStrip } from './SubscriptionsKpiStrip';
import { SubscriptionsFilterBar } from './SubscriptionsFilterBar';
import { SubscriptionsTable } from './SubscriptionsTable';
import { SubscriptionsBulkBar } from './SubscriptionsBulkBar';
import { useSubscriptionActions } from '../hooks/useSubscriptionActions';
import { subscriptionDetailPath } from '@/app/router';
import { exportSubscriptionsCsv } from '../api';

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
	useSuspenseThunk('subscriptions', () => dispatch(loadSubscriptions()).unwrap());

	const tableData = useAppSelector(selectSubscriptionItems);
	const filters = useAppSelector(selectSubscriptionFilters);
	const page = useAppSelector(selectSubscriptionPage);
	const perPage = useAppSelector(selectSubscriptionPerPage);

	const [selected, setSelected] = useState<string[]>([]);
	const { rowActions, openBulkDiscount, sendCardUpdateEmail, showToast, openDialog, closeDialog, modals } =
		useSubscriptionActions();

	const toggleSelect = (id: string) =>
		setSelected((prev) =>
			prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
		);

	const productOptions = Array.from(new Set(tableData.map((r) => r.product))).sort();
	const cycleOptions = Array.from(new Set(tableData.map((r) => r.cycle))).sort();

	const filtered = tableData.filter((r) => {
		const q = filters.search.toLowerCase();
		const matchSearch =
			!filters.search ||
			r.customer.toLowerCase().includes(q) ||
			r.product.toLowerCase().includes(q) ||
			r.id.toLowerCase().includes(q);
		const matchStatus =
			filters.status === 'All' ||
			r.status === filters.status.toLowerCase().replace(/ /g, '_');
		const matchProduct = filters.product === 'All' || r.product === filters.product;
		const matchCycle = filters.cycle === 'All' || r.cycle === filters.cycle;
		const matchType =
			filters.deliveryType === 'All' || r.deliveryType === filters.deliveryType.toLowerCase();
		const matchPaymentType =
			filters.paymentType === 'All' || r.paymentType === filters.paymentType.toLowerCase();
		const matchChurnRisk =
			filters.churnRisk === 'All' ||
			(filters.churnRisk === 'Low'
				? r.churnRiskScore <= 25
				: filters.churnRisk === 'Medium'
					? r.churnRiskScore > 25 && r.churnRiskScore <= 50
					: filters.churnRisk === 'High'
						? r.churnRiskScore > 50 && r.churnRiskScore <= 75
						: r.churnRiskScore > 75);
		return (
			matchSearch &&
			matchStatus &&
			matchProduct &&
			matchCycle &&
			matchType &&
			matchPaymentType &&
			matchChurnRisk
		);
	});

	const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
	const safePage = Math.min(page, totalPages);
	const paginatedRows = filtered.slice((safePage - 1) * perPage, safePage * perPage);

	const hasActiveFilters =
		filters.status !== 'All' ||
		filters.product !== 'All' ||
		filters.cycle !== 'All' ||
		filters.deliveryType !== 'All' ||
		filters.paymentType !== 'All' ||
		filters.churnRisk !== 'All';
	const clearAllFilters = () => dispatch(clearFilters());

	const viewDetail = (id: string) => {
		dispatch(setSelectedSubscriptionId(id));
		navigate(subscriptionDetailPath(id));
	};

	const cardUpdateEligibleIds = selected.filter((id) => {
		const r = tableData.find((x) => x.id === id);
		return r?.status === 'past_due' && r?.cardExpiring;
	});

	return (
		<div className="flex flex-col gap-5">
			<SubscriptionsKpiStrip data={tableData} />

			<SubscriptionsFilterBar
				search={filters.search}
				onSearchChange={(v) => dispatch(setSearch(v))}
				filterStatus={filters.status}
				onFilterStatusChange={(v) => dispatch(setStatusFilter(v))}
				filterProduct={filters.product}
				onFilterProductChange={(v) => dispatch(setProductFilter(v))}
				filterCycle={filters.cycle}
				onFilterCycleChange={(v) => dispatch(setCycleFilter(v))}
				filterDeliveryType={filters.deliveryType}
				onFilterDeliveryTypeChange={(v) => dispatch(setDeliveryTypeFilter(v))}
				filterPaymentType={filters.paymentType}
				onFilterPaymentTypeChange={(v) => dispatch(setPaymentTypeFilter(v))}
				filterChurnRisk={filters.churnRisk}
				onFilterChurnRiskChange={(v) => dispatch(setChurnRiskFilter(v))}
				productOptions={productOptions}
				cycleOptions={cycleOptions}
				onClearAll={clearAllFilters}
				onExportCsv={async () => {
					try {
						await exportSubscriptionsCsv(filters.status !== 'all' ? filters.status : undefined);
						showToast('Subscriptions exported as CSV', 'success');
					} catch (err: any) {
						showToast(err?.message || 'Failed to export subscriptions CSV', 'error');
					}
				}}
			/>

			<SubscriptionsTable
				rows={paginatedRows}
				totalCount={filtered.length}
				currentPage={safePage}
				perPage={perPage}
				totalPages={totalPages}
				onPageChange={(p) => dispatch(setPage(p))}
				onPerPageChange={(pp) => dispatch(setPerPage(pp))}
				selected={selected}
				onToggleSelect={toggleSelect}
				onToggleSelectAll={(checked) => setSelected(checked ? paginatedRows.map((s) => s.id) : [])}
				rowActions={rowActions}
				onCardExpiryClick={sendCardUpdateEmail}
				onViewDetail={viewDetail}
				hasActiveFilters={hasActiveFilters}
				onClearFilters={clearAllFilters}
			/>

			<SubscriptionsBulkBar
				selectedCount={selected.length}
				cardUpdateEligibleCount={cardUpdateEligibleIds.length}
				onClear={() => setSelected([])}
				onPauseAll={() => openDialog({
					danger: false, icon: PauseCircle,
					title: sprintf( __( 'Pause %d Subscriptions?', 'purecart' ), selected.length ),
					body: sprintf( __( 'Pause billing for all %d selected subscriptions? Customers will keep access until their current period ends.', 'purecart' ), selected.length ),
					confirmLabel: sprintf( __( 'Pause %d', 'purecart' ), selected.length ),
					onConfirm: async () => {
						const activeIds = selected.filter( ( id ) => {
							const r = tableData.find( ( x ) => x.id === id );
							return r?.status === 'active';
						} );
						await Promise.allSettled( activeIds.map( ( id ) => dispatch( pauseSubscriptionThunk( { id } ) ) ) );
						showToast( sprintf( __( '%d subscriptions paused', 'purecart' ), activeIds.length ), 'warning' );
						setSelected( [] );
						closeDialog();
					},
				})}
				onSendReceipts={() => showToast( __( 'Receipt emails are not available yet — no email endpoint exists for this action', 'purecart' ), 'info' )}
				onSendCardUpdateEmail={() => openDialog({
					danger: false, icon: CreditCard,
					title: __( 'Send Card Update Emails?', 'purecart' ),
					body: sprintf( __( 'Send a card update link to %d customer(s) with an expiring card on a past-due subscription?', 'purecart' ), cardUpdateEligibleIds.length ),
					confirmLabel: __( 'Send Links', 'purecart' ),
					onConfirm: async () => {
						await Promise.allSettled( cardUpdateEligibleIds.map( ( id ) => dispatch( sendCardUpdateThunk( id ) ) ) );
						showToast( sprintf( __( 'Card update emails sent to %d customers', 'purecart' ), cardUpdateEligibleIds.length ), 'success' );
						closeDialog();
					},
				})}
				onApplyDiscountToAll={() => openBulkDiscount(tableData.filter((r) => selected.includes(r.id)))}
				onCancelSelected={() => openDialog({
					danger: true, icon: XCircle,
					title: sprintf( __( 'Cancel %d Subscriptions?', 'purecart' ), selected.length ),
					body: sprintf( __( 'Immediately cancel billing for all %d selected subscriptions. Access ends immediately. This cannot be reversed.', 'purecart' ), selected.length ),
					confirmLabel: sprintf( __( 'Cancel %d Subscriptions', 'purecart' ), selected.length ),
					onConfirm: async () => {
						await Promise.allSettled( selected.map( ( id ) => dispatch( cancelSubscriptionThunk( { id, immediately: true } ) ) ) );
						showToast( sprintf( __( '%d subscriptions cancelled', 'purecart' ), selected.length ), 'error' );
						setSelected( [] );
						closeDialog();
					},
				})}
			/>

			{modals}
		</div>
	);
}
