import { createSlice } from '@reduxjs/toolkit';

// ─── Subscriptions slice ────────────────────────────────────────────────────────
// Intentionally left empty — state shape and reducers to be added later.

type SubscriptionsState = Record< string, never >;

const initialState: SubscriptionsState = {};

const subscriptionsSlice = createSlice( {
	name: 'subscriptions',
	initialState,
	reducers: {},
} );

export const {} = subscriptionsSlice.actions;

export default subscriptionsSlice.reducer;
