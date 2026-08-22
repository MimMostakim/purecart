/**
 * Subscriptions Redux slice.
 *
 * The shared memory bank for everything subscription-related: the full list
 * of subscription records, load status, which single subscription is
 * "selected" (read later by the Detail page), and the list page's active
 * filters. Table/badge/page components read from here and dispatch actions
 * into it instead of each keeping a private copy of the data.
 *
 * Loading and mutating go through utils/api.ts (currently a dummy layer -
 * see that file's header comment for how it goes live), wrapped in the two
 * async thunks below so components never call the API directly.
 *
 * @file
 * @since 1.0.0
 */
import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import {
	fetchSubscriptions,
	updateSubscription as apiUpdateSubscription,
} from '../../utils/api';
import type { SubscriptionRecord } from '../../utils/subscription-types';

export interface SubscriptionFilters {
	search: string;
	status: string;
	product: string;
	cycle: string;
	deliveryType: string;
	paymentType: string;
	churnRisk: string;
}

export const DEFAULT_SUBSCRIPTION_FILTERS: SubscriptionFilters = {
	search: '',
	status: 'All',
	product: 'All',
	cycle: 'All',
	deliveryType: 'All',
	paymentType: 'All',
	churnRisk: 'All',
};

interface SubscriptionsState {
	items: SubscriptionRecord[];
	status: 'idle' | 'loading' | 'succeeded' | 'failed';
	error: string | null;
	selectedId: string | null;
	filters: SubscriptionFilters;
	page: number;
	perPage: number;
}

const initialState: SubscriptionsState = {
	items: [],
	status: 'idle',
	error: null,
	selectedId: null,
	filters: DEFAULT_SUBSCRIPTION_FILTERS,
	page: 1,
	perPage: 10,
};

/**
 * Loads the full subscriptions list via the API layer.
 *
 * @since 1.0.0
 */
export const loadSubscriptions = createAsyncThunk( 'subscriptions/load', async () => {
	return await fetchSubscriptions();
} );

/**
 * Applies a partial update to one subscription via the API layer, then
 * merges the (API-confirmed) result back into the store on success.
 *
 * @since 1.0.0
 */
export const patchSubscription = createAsyncThunk(
	'subscriptions/patch',
	async ( { id, patch }: { id: string; patch: Partial< SubscriptionRecord > } ) => {
		return await apiUpdateSubscription( id, patch );
	}
);

const subscriptionsSlice = createSlice( {
	name: 'subscriptions',
	initialState,
	reducers: {
		/** Marks one subscription as "selected" - read by the Detail page once it exists. */
		setSelectedSubscriptionId( state, action: PayloadAction< string | null > ) {
			state.selectedId = action.payload;
		},
		/** Removes a subscription record entirely (Delete Record row action - no backend endpoint documented for this yet, local-only). */
		removeSubscription( state, action: PayloadAction< string > ) {
			state.items = state.items.filter( ( r ) => r.id !== action.payload );
		},
		setPage( state, action: PayloadAction< number > ) {
			state.page = Math.max( 1, action.payload );
		},
		setPerPage( state, action: PayloadAction< number > ) {
			state.perPage = action.payload;
			state.page = 1;
		},
		setSearch( state, action: PayloadAction< string > ) {
			state.filters.search = action.payload;
			state.page = 1;
		},
		setStatusFilter( state, action: PayloadAction< string > ) {
			state.filters.status = action.payload;
			state.page = 1;
		},
		setProductFilter( state, action: PayloadAction< string > ) {
			state.filters.product = action.payload;
			state.page = 1;
		},
		setCycleFilter( state, action: PayloadAction< string > ) {
			state.filters.cycle = action.payload;
			state.page = 1;
		},
		setDeliveryTypeFilter( state, action: PayloadAction< string > ) {
			state.filters.deliveryType = action.payload;
			state.page = 1;
		},
		setPaymentTypeFilter( state, action: PayloadAction< string > ) {
			state.filters.paymentType = action.payload;
			state.page = 1;
		},
		setChurnRiskFilter( state, action: PayloadAction< string > ) {
			state.filters.churnRisk = action.payload;
			state.page = 1;
		},
		clearFilters( state ) {
			state.filters = DEFAULT_SUBSCRIPTION_FILTERS;
			state.page = 1;
		},
	},
	extraReducers: ( builder ) => {
		builder
			.addCase( loadSubscriptions.pending, ( state ) => {
				state.status = 'loading';
				state.error = null;
			} )
			.addCase( loadSubscriptions.fulfilled, ( state, action ) => {
				state.status = 'succeeded';
				state.items = action.payload;
			} )
			.addCase( loadSubscriptions.rejected, ( state, action ) => {
				state.status = 'failed';
				state.error = action.error.message ?? 'Failed to load subscriptions';
			} )
			.addCase( patchSubscription.fulfilled, ( state, action ) => {
				const updated = action.payload;
				state.items = state.items.map( ( r ) => ( r.id === updated.id ? updated : r ) );
			} );
	},
} );

export const {
	setSelectedSubscriptionId,
	removeSubscription,
	setPage,
	setPerPage,
	setSearch,
	setStatusFilter,
	setProductFilter,
	setCycleFilter,
	setDeliveryTypeFilter,
	setPaymentTypeFilter,
	setChurnRiskFilter,
	clearFilters,
} = subscriptionsSlice.actions;

export default subscriptionsSlice.reducer;
