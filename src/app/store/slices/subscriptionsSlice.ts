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
	earlyRenewSubscription as apiEarlyRenewSubscription,
	renewSubscription as apiRenewSubscription,
	retryPaymentSubscription as apiRetryPaymentSubscription,
	pauseSubscription as apiPauseSubscription,
	resumeSubscription as apiResumeSubscription,
	cancelSubscription as apiCancelSubscription,
	acceptCancellationOffer as apiAcceptCancellationOffer,
	skipSubscription as apiSkipSubscription,
	upgradeSubscription as apiUpgradeSubscription,
	applySubscriptionDiscount as apiApplySubscriptionDiscount,
	sendCardUpdate as apiSendCardUpdate,
	resubscribeSubscription as apiResubscribeSubscription,
	deleteSubscription as apiDeleteSubscription,
} from '../../api';
import type { SubscriptionRecord } from '../../components/Subscriptions/types';

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

/**
 * Executes an early renewal via the API and updates the store with the active record.
 */
export const earlyRenewSubscriptionThunk = createAsyncThunk(
	'subscriptions/earlyRenew',
	async ( id: string ) => {
		return await apiEarlyRenewSubscription( id );
	}
);

/**
 * Executes an admin renewal via the API and updates the store with the active record.
 */
export const renewSubscriptionThunk = createAsyncThunk(
	'subscriptions/renew',
	async ( id: string ) => {
		return await apiRenewSubscription( id );
	}
);

/**
 * Retries payment on a past_due subscription.
 */
export const retryPaymentThunk = createAsyncThunk(
	'subscriptions/retryPayment',
	async ( id: string ) => {
		return await apiRetryPaymentSubscription( id );
	}
);

/**
 * Pauses an active or trialing subscription.
 */
export const pauseSubscriptionThunk = createAsyncThunk(
	'subscriptions/pause',
	async ( { id, resumeAt }: { id: string; resumeAt?: string | null } ) => {
		return await apiPauseSubscription( id, resumeAt );
	}
);

/**
 * Resumes a paused subscription.
 */
export const resumeSubscriptionThunk = createAsyncThunk(
	'subscriptions/resume',
	async ( id: string ) => {
		return await apiResumeSubscription( id );
	}
);

/**
 * Cancels a subscription immediately or at the end of the billing period.
 */
export const cancelSubscriptionThunk = createAsyncThunk(
	'subscriptions/cancel',
	async ( { id, immediately = true, reason }: { id: string; immediately?: boolean; reason?: string | null } ) => {
		return await apiCancelSubscription( id, immediately, reason );
	}
);

/**
 * Accepts a retention offer (discount, pause, skip, downgrade).
 */
export const acceptCancellationOfferThunk = createAsyncThunk(
	'subscriptions/acceptOffer',
	async ( { id, offerType, reason }: { id: string; offerType: string; reason: string } ) => {
		return await apiAcceptCancellationOffer( id, offerType, reason );
	}
);

/**
 * Skips the next renewal cycle.
 */
export const skipSubscriptionThunk = createAsyncThunk(
	'subscriptions/skip',
	async ( id: string ) => {
		return await apiSkipSubscription( id );
	}
);

/**
 * Upgrades or changes subscription plan tier.
 */
export const upgradeSubscriptionThunk = createAsyncThunk(
	'subscriptions/upgrade',
	async ( {
		id,
		productId,
		cycle,
		planLabel,
		amount,
		mode,
	}: {
		id: string;
		productId?: number;
		cycle?: string;
		planLabel?: string;
		amount?: number;
		mode?: 'prorate_immediately' | 'apply_at_renewal' | 'no_proration';
	} ) => {
		return await apiUpgradeSubscription( id, { productId, cycle, planLabel, amount, mode } );
	}
);

/**
 * Applies a manual admin discount to a subscription.
 */
export const applyDiscountThunk = createAsyncThunk(
	'subscriptions/applyDiscount',
	async ( {
		id,
		percent,
		duration,
		cycles,
	}: {
		id: string;
		percent: number;
		duration: string;
		cycles?: number;
	} ) => {
		return await apiApplySubscriptionDiscount( id, percent, duration, cycles );
	}
);

/**
 * Generates a card update magic link.
 */
export const sendCardUpdateThunk = createAsyncThunk(
	'subscriptions/sendCardUpdate',
	async ( id: string ) => {
		return await apiSendCardUpdate( id );
	}
);

/**
 * Resubscribes / reactivates a cancelled or expired subscription.
 */
export const resubscribeSubscriptionThunk = createAsyncThunk(
	'subscriptions/resubscribe',
	async ( id: string ) => {
		return await apiResubscribeSubscription( id );
	}
);

/**
 * Permanently deletes a subscription record from the database.
 */
export const deleteSubscriptionThunk = createAsyncThunk(
	'subscriptions/delete',
	async ( id: string ) => {
		return await apiDeleteSubscription( id );
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
			} )
			.addCase( earlyRenewSubscriptionThunk.fulfilled, ( state, action ) => {
				const updated = action.payload;
				state.items = state.items.map( ( r ) => ( r.id === updated.id ? updated : r ) );
			} )
			.addCase( renewSubscriptionThunk.fulfilled, ( state, action ) => {
				const updated = action.payload;
				state.items = state.items.map( ( r ) => ( r.id === updated.id ? updated : r ) );
			} )
			.addCase( retryPaymentThunk.fulfilled, ( state, action ) => {
				const updated = action.payload;
				state.items = state.items.map( ( r ) => ( r.id === updated.id ? updated : r ) );
			} )
			.addCase( pauseSubscriptionThunk.fulfilled, ( state, action ) => {
				const updated = action.payload;
				state.items = state.items.map( ( r ) => ( r.id === updated.id ? updated : r ) );
			} )
			.addCase( resumeSubscriptionThunk.fulfilled, ( state, action ) => {
				const updated = action.payload;
				state.items = state.items.map( ( r ) => ( r.id === updated.id ? updated : r ) );
			} )
			.addCase( cancelSubscriptionThunk.fulfilled, ( state, action ) => {
				const updated = action.payload;
				state.items = state.items.map( ( r ) => ( r.id === updated.id ? updated : r ) );
			} )
			.addCase( acceptCancellationOfferThunk.fulfilled, ( state, action ) => {
				const updated = action.payload;
				state.items = state.items.map( ( r ) => ( r.id === updated.id ? updated : r ) );
			} )
			.addCase( skipSubscriptionThunk.fulfilled, ( state, action ) => {
				const updated = action.payload;
				state.items = state.items.map( ( r ) => ( r.id === updated.id ? updated : r ) );
			} )
			.addCase( upgradeSubscriptionThunk.fulfilled, ( state, action ) => {
				const updated = action.payload;
				state.items = state.items.map( ( r ) => ( r.id === updated.id ? updated : r ) );
			} )
			.addCase( applyDiscountThunk.fulfilled, ( state, action ) => {
				const updated = action.payload;
				state.items = state.items.map( ( r ) => ( r.id === updated.id ? updated : r ) );
			} )
			.addCase( resubscribeSubscriptionThunk.fulfilled, ( state, action ) => {
				const updated = action.payload;
				state.items = state.items.map( ( r ) => ( r.id === updated.id ? updated : r ) );
			} )
			.addCase( deleteSubscriptionThunk.fulfilled, ( state, action ) => {
				const deletedId = action.payload.id;
				state.items = state.items.filter( ( r ) => r.id !== deletedId );
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
