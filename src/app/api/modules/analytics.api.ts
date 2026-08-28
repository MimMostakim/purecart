/**
 * Analytics & Revenue Goals REST API Module.
 *
 * @file
 * @since 1.0.0
 */

import { apiFetch, delay, USE_DUMMY_DATA } from '../client';
import { revenueGoalsData, churnRiskData } from '../../utils/static-data';
import type { RevenueGoal, ChurnRiskEntry } from '../../components/Subscriptions/types';

/**
 * GET /purecart/v1/subscriptions/revenue-goals - admin-configured revenue goals.
 *
 * @since 1.0.0
 * @return {Promise<RevenueGoal[]>} All revenue goals.
 */
export async function fetchRevenueGoals(): Promise<RevenueGoal[]> {
	if (USE_DUMMY_DATA) return delay([...revenueGoalsData]);
	return apiFetch<RevenueGoal[]>('/subscriptions/revenue-goals');
}

/**
 * Analytics churn-risk table data.
 *
 * @since 1.0.0
 * @return {Promise<ChurnRiskEntry[]>} At-risk subscription entries.
 */
export async function fetchChurnRisk(): Promise<ChurnRiskEntry[]> {
	if (USE_DUMMY_DATA) return delay([...churnRiskData]);
	return apiFetch<ChurnRiskEntry[]>('/subscriptions/report/churn-risk');
}
