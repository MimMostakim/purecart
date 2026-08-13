import { createSlice } from '@reduxjs/toolkit';

// ─── Subscriptions slice ────────────────────────────────────────────────────────
// State shape and reducers to be expanded as the Subscriptions module grows.

type SubscriptionsState = Record< string, never >;

const initialState: SubscriptionsState = {};

const subscriptionsSlice = createSlice( {
	name: 'subscriptions',
	initialState,
	reducers: {},
} );

export const {} = subscriptionsSlice.actions;

export default subscriptionsSlice.reducer;
