/**
 * Config-builder functions for the "Kind A" row-action popups - Early
 * Renewal, Skip Cycle, SCA Reauth, Send Card Update. Each of these is
 * simple enough (icon + title + body + one confirm button) to be content
 * for the single shared ConfirmDialog rather than a standalone modal
 * component - building dedicated components for them would duplicate what
 * ConfirmDialog already renders.
 *
 * @file
 * @since 1.0.0
 */
import { FastForward, SkipForward, Lock, CreditCard } from 'lucide-react';
import type { ConfirmDialogProps } from '../../ui';
import type { SubscriptionRecord } from '../types';

type DialogConfig = Omit< ConfirmDialogProps, 'onCancel' >;

/**
 * Builds the Early Renewal confirm dialog.
 *
 * @since 1.0.0
 *
 * @param {SubscriptionRecord} row       Subscription being renewed early.
 * @param {Function}           onConfirm Callback invoked when the admin confirms.
 *
 * @return {DialogConfig} Config for the shared ConfirmDialog.
 */
export function buildEarlyRenewalDialog( row: SubscriptionRecord, onConfirm: () => void ): DialogConfig {
	return {
		open: true,
		danger: false,
		icon: FastForward,
		title: 'Process Early Renewal?',
		body: `Charge ${ row.amount } to ${ row.customer }'s payment method now? Their billing cycle restarts from today.`,
		confirmLabel: 'Renew Now',
		onConfirm,
	};
}

/**
 * Builds the Skip Next Cycle confirm dialog.
 *
 * @since 1.0.0
 *
 * @param {SubscriptionRecord} row       Subscription whose next cycle is being skipped.
 * @param {Function}           onConfirm Callback invoked when the admin confirms.
 *
 * @return {DialogConfig} Config for the shared ConfirmDialog.
 */
export function buildSkipCycleDialog( row: SubscriptionRecord, onConfirm: () => void ): DialogConfig {
	return {
		open: true,
		danger: false,
		icon: SkipForward,
		title: 'Skip Next Renewal?',
		body: `Skip ${ row.customer }'s payment on ${ row.nextPayment }? Access continues; the next charge moves one cycle out.`,
		confirmLabel: 'Skip Cycle',
		onConfirm,
	};
}

/**
 * Builds the SCA/3DS reauthorization-request confirm dialog.
 *
 * @since 1.0.0
 *
 * @param {SubscriptionRecord} row       Subscription needing reauthorization.
 * @param {Function}           onConfirm Callback invoked when the admin confirms.
 *
 * @return {DialogConfig} Config for the shared ConfirmDialog.
 */
export function buildScaReauthDialog( row: SubscriptionRecord, onConfirm: () => void ): DialogConfig {
	return {
		open: true,
		danger: false,
		icon: Lock,
		title: 'Request Payment Reauthorization',
		body: `A secure payment confirmation link will be emailed to ${ row.customer }. They must re-confirm their payment method to continue. The subscription stays active for 7 days while they confirm.`,
		confirmLabel: 'Send Reauth Email',
		onConfirm,
	};
}

/**
 * Builds the Send Card Update Link confirm dialog.
 *
 * @since 1.0.0
 *
 * @param {SubscriptionRecord} row       Subscription whose card needs updating.
 * @param {Function}           onConfirm Callback invoked when the admin confirms.
 *
 * @return {DialogConfig} Config for the shared ConfirmDialog.
 */
export function buildSendCardUpdateDialog( row: SubscriptionRecord, onConfirm: () => void ): DialogConfig {
	return {
		open: true,
		danger: false,
		icon: CreditCard,
		title: 'Send Card Update Link?',
		body: `Email ${ row.customer } a secure link to update their payment method?`,
		confirmLabel: 'Send Link',
		onConfirm,
	};
}
