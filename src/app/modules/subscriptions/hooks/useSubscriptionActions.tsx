/**
 * useSubscriptionActions hook.
 *
 * Owns every row-action, toast, and modal used to mutate a subscription -
 * factored out of SubscriptionsPage so the Detail page (Phase 3) can reuse
 * the exact same ⋮ menu and popups instead of a second, drifting copy.
 * Callers get back a `rowActions(row)` builder, a couple of open-a-specific-
 * modal helpers for actions that don't live behind a row (bulk discount),
 * `showToast`/`openDialog`/`closeDialog`/`updateRow` for anything page-
 * specific (e.g. the list page's bulk-action bar), and one `modals` node to
 * render once near the bottom of the page.
 *
 * @file
 * @since 1.0.0
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { applyFilters } from '@wordpress/hooks';
import { __, sprintf } from '@wordpress/i18n';
import { SUBSCRIPTION_ACTIONS_FILTER } from '@/shared/wp';
import { getAdminConfig } from '@/shared/wp';
import {
	Users,
	FileText,
	Mail,
	RefreshCw,
	CreditCard,
	Repeat,
	Tag,
	Calendar,
	PauseCircle,
	CheckCircle,
	XCircle,
	RotateCcw,
	Trash2,
	FastForward,
	SkipForward,
	Key,
	Cloud,
	ArrowUpRight,
	Lock,
	Clock,
	BarChart2,
	CheckSquare,
	Edit,
} from 'lucide-react';
import { fetchPaymentHistory } from '../api';
import { addBillingInterval } from '../utils';
import type { SubscriptionRecord, PaymentRecord, RetentionOffer } from '../types';
import { useAppDispatch } from '@/app/store/hooks';
import { licenseDetailPath } from '@/app/router';
import {
	revokeLicenseThunk,
	resetLicenseActivationsThunk,
} from '@/modules/licenses';
import {
	suspendSaasAccountThunk,
} from '@/modules/saas-accounts';
import {
	patchSubscription,
	earlyRenewSubscriptionThunk,
	retryPaymentThunk,
	pauseSubscriptionThunk,
	resumeSubscriptionThunk,
	cancelSubscriptionThunk,
	acceptCancellationOfferThunk,
	skipSubscriptionThunk,
	upgradeSubscriptionThunk,
	applyDiscountThunk,
	sendCardUpdateThunk,
	resubscribeSubscriptionThunk,
	deleteSubscriptionThunk,
} from '../store/subscriptions.slice';
import { ConfirmDialog, Toast } from '@/shared/ui';
import type { ActionItem, ConfirmDialogProps, ToastProps } from '@/shared/ui';
import {
	CancellationFlowModal,
	PauseDurationModal,
	ChangePlanModal,
	ApplyDiscountModal,
	PaymentHistoryModal,
	buildEarlyRenewalDialog,
	buildSkipCycleDialog,
	buildScaReauthDialog,
	buildSendCardUpdateDialog,
} from '../components/modals';

type DialogState = Omit<ConfirmDialogProps, 'onCancel'> & { open: boolean };

const EMPTY_DIALOG: DialogState = {
	open: false,
	title: '',
	body: null,
	confirmLabel: '',
	danger: false,
	onConfirm: () => { },
};

/**
 * Provides the row-actions builder, toast/dialog primitives, and modal tree
 * shared by every page that manages subscriptions.
 *
 * @since 1.0.0
 *
 * @return {Object} `{ rowActions, openPaymentHistory, openBulkDiscount, showToast, openDialog, closeDialog, updateRow, deleteRow, modals }`.
 */
export function useSubscriptionActions() {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();

	const [toast, setToast] = useState<ToastProps>({ message: '', type: 'success', visible: false });
	const [dialog, setDialog] = useState<DialogState>(EMPTY_DIALOG);

	const [cancelRow, setCancelRow] = useState<SubscriptionRecord | null>(null);
	const [pauseRow, setPauseRow] = useState<SubscriptionRecord | null>(null);
	const [planRow, setPlanRow] = useState<SubscriptionRecord | null>(null);
	const [discountRow, setDiscountRow] = useState<SubscriptionRecord | null>(null);
	const [discountBulkRows, setDiscountBulkRows] = useState<SubscriptionRecord[] | null>(null);
	const [historyRow, setHistoryRow] = useState<SubscriptionRecord | null>(null);
	const [historyPayments, setHistoryPayments] = useState<PaymentRecord[]>([]);

	const showToast = (msg: string, type: ToastProps['type'] = 'success') => {
		setToast({ message: msg, type, visible: true });
		setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3000);
	};
	const openDialog = (opts: Omit<DialogState, 'open'>) => setDialog({ ...opts, open: true });
	const closeDialog = () => setDialog((d) => ({ ...d, open: false }));

	/** Dispatches a patch through the Redux thunk, which calls the API layer and merges the confirmed result back into the store. */
	const updateRow = (id: string, patch: Partial<SubscriptionRecord>) => {
		dispatch(patchSubscription({ id, patch }));
	};
	const deleteRow = async (id: string) => {
		try {
			await dispatch(deleteSubscriptionThunk(id)).unwrap();
			showToast(`Subscription ${id} deleted`, 'error');
		} catch (err: any) {
			showToast(err?.message || `Failed to delete subscription ${id}`, 'error');
		}
	};

	const openPaymentHistory = (row: SubscriptionRecord) => {
		setHistoryRow(row);
		setHistoryPayments([]);
		fetchPaymentHistory(row.id).then(setHistoryPayments);
	};

	const openBulkDiscount = (rows: SubscriptionRecord[]) => {
		setDiscountBulkRows(rows);
		setDiscountRow(rows[0] ?? null);
	};

	const sendCardUpdateEmail = (row: SubscriptionRecord) =>
		openDialog(
			buildSendCardUpdateDialog(row, async () => {
				try {
					const res = await dispatch(sendCardUpdateThunk(row.id)).unwrap();
					if (res?.url && typeof navigator !== 'undefined' && navigator.clipboard) {
						try {
							await navigator.clipboard.writeText(res.url);
							showToast(`Card update link generated and copied to clipboard for ${row.customer}`, 'success');
						} catch {
							showToast(`Card update link generated for ${row.customer}`, 'success');
						}
					} else {
						showToast(`Card update link generated for ${row.customer}`, 'success');
					}
				} catch (err: any) {
					showToast(err?.message || `Failed to generate card update link for ${row.customer}`, 'error');
				}
				closeDialog();
			})
		);

	const handleOfferAccepted = (row: SubscriptionRecord, offer: RetentionOffer) => {
		if (offer.type === 'discount') {
			const cycles =
				offer.discountDuration === 'Forever' ? 999 : parseInt(offer.discountDuration ?? '1', 10) || 1;
			updateRow(row.id, { retentionDiscountRemaining: cycles });
		} else if (offer.type === 'pause') {
			const pauseEndDate = offer.pauseDuration
				? addBillingInterval(null, { interval: offer.pauseDuration, period: 'day', displayLabel: '' })
				: null;
			updateRow(row.id, { status: 'paused', pauseEndDate });
		} else if (offer.type === 'skip') {
			updateRow(row.id, {
				skipCount: row.skipCount + 1,
				nextPayment: addBillingInterval(row.nextPayment, row.billing),
			});
		} else if (offer.type === 'downgrade') {
			updateRow(row.id, {
				pendingSwitchProduct: offer.downgradePlanLabel ?? offer.downgradePlanId ?? null,
				pendingSwitchType: 'downgrade',
			});
		}
		// 'contact' type never reaches here — its card opens a support URL instead of calling onAccept
		showToast(`Retention offer applied for ${row.customer}`, 'success');
	};

	// ── Row actions ─────────────────────────────────────────────────────────────
	const rowActions = (row: SubscriptionRecord): ActionItem[] => {
		const universal: ActionItem[] = [
			{ label: __( 'View Customer', 'purecart' ), icon: Users, onClick: () => {
			const adminUrl = getAdminConfig().adminUrl;
			const wpUserId = row.customerId?.replace( /\D/g, '' );
			if ( adminUrl && wpUserId ) {
				window.open( `${ adminUrl }user-edit.php?user_id=${ wpUserId }`, '_blank' );
			} else {
				showToast( __( 'No linked WordPress user for this subscription', 'purecart' ), 'info' );
			}
		} },
			{ label: 'View Payment History', icon: FileText, onClick: () => openPaymentHistory(row) },
			{ label: __( 'Send Payment Receipt', 'purecart' ), icon: Mail, onClick: () => showToast( __( 'Receipt emails are not available yet — no email endpoint exists for this action', 'purecart' ), 'info' ) },

			...(row.status === 'past_due'
				? [{
					label: 'Retry Payment Now', icon: RefreshCw, dividerBefore: true,
					onClick: () => openDialog({
						danger: false, icon: RefreshCw, title: 'Retry Payment?',
						body: <span>Attempt to charge <strong>{row.amount}</strong> from <strong>{row.customer}</strong>'s payment method on file immediately?</span>,
						confirmLabel: 'Retry Payment',
						onConfirm: async () => {
							try {
								await dispatch(retryPaymentThunk(row.id)).unwrap();
								showToast(`Payment retried successfully for ${row.customer}`, 'success');
							} catch (err: any) {
								showToast(err?.message || `Payment retry failed for ${row.customer}`, 'error');
							}
							closeDialog();
						},
					}),
				} as ActionItem]
				: []),
			{
				label: __( 'Update Payment Method', 'purecart' ), icon: CreditCard, dividerBefore: row.status !== 'past_due',
				onClick: () => sendCardUpdateEmail( row ),
			},
			{
				label: 'Early Renewal', icon: FastForward,
				disabled: row.cycle === 'Lifetime' || !['active', 'trialing'].includes(row.status),
				onClick: () => openDialog(buildEarlyRenewalDialog(row, async () => {
					try {
						await dispatch(earlyRenewSubscriptionThunk(row.id)).unwrap();
						showToast(`Payment renewed early for ${row.customer}`, 'success');
					} catch (err: any) {
						showToast(err?.message || `Payment renewal failed for ${row.customer}`, 'error');
					}
					closeDialog();
				})),
			},
			{
				label: 'Skip Next Cycle', icon: SkipForward,
				disabled: row.paymentType !== 'recurring' || row.status !== 'active',
				onClick: () => openDialog(buildSkipCycleDialog(row, async () => {
					try {
						await dispatch(skipSubscriptionThunk(row.id)).unwrap();
						showToast(`Next cycle skipped for ${row.customer}`, 'warning');
					} catch (err: any) {
						showToast(err?.message || `Failed to skip next cycle for ${row.customer}`, 'error');
					}
					closeDialog();
				})),
			},
			{
				label: __( 'Request Reauthorization', 'purecart' ), icon: Lock,
				disabled: row.status !== 'past_due' && row.status !== 'pending_reauth',
				onClick: () => openDialog(buildScaReauthDialog(row, () => {
					updateRow(row.id, { status: 'pending_reauth' });
					showToast( __( 'Reauthorization status updated — outbound reauth email is not yet implemented', 'purecart' ), 'info' );
					closeDialog();
				})),
			},
			{
				label: 'Send Card Update Email', icon: CreditCard,
				disabled: row.status === 'cancelled' || row.status === 'completed' || row.status === 'expired',
				onClick: () => sendCardUpdateEmail(row),
			},

			{
				label: 'Change Plan', icon: Repeat, dividerBefore: true,
				disabled: row.status === 'cancelled',
				onClick: () => setPlanRow(row),
			},
			{
				label: 'Apply Discount', icon: Tag,
				disabled: row.status === 'cancelled',
				onClick: () => { setDiscountBulkRows(null); setDiscountRow(row); },
			},
			...(row.status === 'trialing'
				? [{
					label: 'Extend Trial (+7 days)', icon: Calendar,
					onClick: () => openDialog({
						danger: false, icon: Calendar, title: 'Extend Trial?',
						body: <span>Add 7 more days to {row.customer}'s trial for <strong>{row.product}</strong>?</span>,
						confirmLabel: 'Extend Trial',
						onConfirm: () => {
							updateRow(row.id, { nextPayment: addBillingInterval(row.nextPayment ?? null, { interval: 7, period: 'day', displayLabel: '' }) });
							showToast(`Trial extended for ${row.customer}`, 'success');
							closeDialog();
						},
					}),
				} as ActionItem]
				: []),
			...(row.pendingSwitchProduct
				? [{
					label: `Cancel Scheduled ${row.pendingSwitchType} → ${row.pendingSwitchProduct}`, icon: XCircle,
					onClick: () => openDialog({
						danger: false, icon: XCircle, title: 'Cancel Scheduled Plan Switch?',
						body: <span>Cancel the scheduled {row.pendingSwitchType} to <strong>{row.pendingSwitchProduct}</strong> for {row.customer}?</span>,
						confirmLabel: 'Cancel Switch',
						onConfirm: () => {
							updateRow(row.id, { pendingSwitchProduct: null, pendingSwitchType: null });
							showToast('Scheduled plan switch cancelled', 'info');
							closeDialog();
						},
					}),
				} as ActionItem]
				: []),

			...( (row.status === 'active' || row.status === 'trialing')
				? [{ label: 'Pause Subscription', icon: PauseCircle, dividerBefore: true, onClick: () => setPauseRow(row) } as ActionItem]
				: []),
			...(row.status === 'paused'
				? [{
					label: 'Resume Subscription', icon: CheckCircle, dividerBefore: true,
					onClick: () => openDialog({
						danger: false, icon: CheckCircle, title: 'Resume Subscription?',
						body: <span>Resume billing for {row.customer}? Their next payment of <strong>{row.amount}</strong> will be charged immediately and then on the regular cycle.</span>,
						confirmLabel: 'Resume Subscription',
						onConfirm: async () => {
							try {
								await dispatch(resumeSubscriptionThunk(row.id)).unwrap();
								showToast(`Subscription resumed for ${row.customer}`, 'success');
							} catch (err: any) {
								showToast(err?.message || `Failed to resume subscription for ${row.customer}`, 'error');
							}
							closeDialog();
						},
					}),
				} as ActionItem]
				: []),
			...(row.status === 'pending_cancel'
				? [
					{
						label: 'Cancel Immediately', icon: XCircle, danger: true, dividerBefore: true,
						onClick: () => openDialog({
							danger: true, icon: XCircle, title: 'Cancel Immediately?',
							body: <span>Cancel <strong>{row.product}</strong> for {row.customer} right now instead of waiting until {row.cancellationDate}? Access ends immediately.</span>,
							confirmLabel: 'Cancel Now',
							onConfirm: async () => {
								try {
									await dispatch(cancelSubscriptionThunk({ id: row.id, immediately: true })).unwrap();
									showToast(`Subscription cancelled for ${row.customer}`, 'error');
								} catch (err: any) {
									showToast(err?.message || `Failed to cancel subscription for ${row.customer}`, 'error');
								}
								closeDialog();
							},
						}),
					} as ActionItem,
					{
						label: __( 'Reinstate (undo pending cancel)', 'purecart' ), icon: CheckCircle,
						onClick: () => openDialog({
							danger: false, icon: CheckCircle, title: __( 'Reinstate Subscription?', 'purecart' ),
							body: <span>{ sprintf( __( 'Cancel the scheduled cancellation for %s? Billing resumes normally.', 'purecart' ), row.customer ) }</span>,
							confirmLabel: __( 'Reinstate', 'purecart' ),
							onConfirm: async () => {
								try {
									await dispatch( resumeSubscriptionThunk( row.id ) ).unwrap();
									showToast( sprintf( __( 'Subscription reinstated for %s', 'purecart' ), row.customer ), 'success' );
								} catch ( err: unknown ) {
									const msg = err && typeof err === 'object' && 'message' in err ? ( err as { message: string } ).message : __( 'Failed to reinstate subscription', 'purecart' );
									showToast( msg, 'error' );
								}
								closeDialog();
							},
						}),
					} as ActionItem,
				]
				: []),

			{
				label: 'Cancel Subscription', icon: XCircle, danger: true, dividerBefore: true,
				disabled: row.status === 'cancelled' || row.status === 'pending_cancel',
				onClick: () => setCancelRow(row),
			},
			{
				label: __( 'Refund Last Payment', 'purecart' ), icon: RotateCcw, danger: true,
				disabled: true,
				onClick: () => showToast( __( 'Refund processing is not available yet — no refund endpoint exists', 'purecart' ), 'info' ),
			},
			...(row.paymentType === 'split'
				? [{
					label: 'Mark Split Payments Complete', icon: CheckSquare,
					onClick: () => openDialog({
						danger: false, icon: CheckSquare, title: 'Mark Installments Complete?',
						body: <span>Force {row.customer}'s split payment plan to <strong>completed</strong> even though {row.paymentsCompleted}/{row.maxPayments} installments are recorded?</span>,
						confirmLabel: 'Mark Complete',
						onConfirm: () => {
							updateRow(row.id, { status: 'completed', paymentsCompleted: row.maxPayments ?? row.paymentsCompleted });
							showToast(`Split payments marked complete for ${row.customer}`, 'success');
							closeDialog();
						},
					}),
				} as ActionItem]
				: []),
			...(row.status === 'cancelled' || row.status === 'expired' || row.status === 'completed'
				? [{
					label: 'Resubscribe', icon: RefreshCw, dividerBefore: true,
					onClick: () => openDialog({
						danger: false, icon: RefreshCw, title: 'Resubscribe Customer?',
						body: <span>Reactivate the subscription for <strong>{row.customer}</strong> on <strong>{row.product}</strong> ({row.amount})? Their billing cycle will restart from today.</span>,
						confirmLabel: 'Resubscribe',
						onConfirm: async () => {
							try {
								await dispatch(resubscribeSubscriptionThunk(row.id)).unwrap();
								showToast(`Subscription reactivated for ${row.customer}`, 'success');
							} catch (err: any) {
								showToast(err?.message || `Failed to resubscribe ${row.customer}`, 'error');
							}
							closeDialog();
						},
					}),
				} as ActionItem]
				: []),
			{
				label: 'Delete Record', icon: Trash2, danger: true,
				onClick: () => openDialog({
					danger: true, icon: Trash2, title: 'Delete Subscription Record?',
					body: <span>Permanently delete the subscription record{' '}
						<strong style={{ fontFamily: 'Roboto Mono, monospace' }}>{row.id}</strong>{' '}
						for <strong>{row.customer}</strong>? All payment history will be lost and this cannot be undone.</span>,
					confirmLabel: 'Delete Record',
					onConfirm: async () => {
						await deleteRow(row.id);
						closeDialog();
					},
				}),
			},
		];

		const typeSpecific: ActionItem[] = (() => {
			const entity = row.linkedEntity;
			switch (entity.type) {
				case 'software':
					return [
						{
							label: __( 'View License', 'purecart' ), icon: Key, dividerBefore: true,
							onClick: () => {
								const licId = parseInt( entity.licenseId, 10 );
								if ( licId ) {
									navigate( licenseDetailPath( licId ) );
								} else {
									showToast( __( 'No linked license found', 'purecart' ), 'info' );
								}
							},
						},
						{
							label: __( 'Revoke License', 'purecart' ), icon: XCircle, danger: true,
							onClick: () => openDialog({
								danger: true, icon: XCircle, title: __( 'Revoke License?', 'purecart' ),
								body: <span>{ sprintf( __( 'Revoke the license key for %s? Their software will stop receiving updates and activation checks will fail.', 'purecart' ), row.customer ) }</span>,
								confirmLabel: __( 'Revoke License', 'purecart' ),
								onConfirm: async () => {
									const licId = parseInt( entity.licenseId, 10 );
									if ( ! licId ) { showToast( __( 'No linked license found', 'purecart' ), 'error' ); closeDialog(); return; }
									try {
										await dispatch( revokeLicenseThunk( licId ) ).unwrap();
										showToast( sprintf( __( 'License revoked for %s', 'purecart' ), row.customer ), 'error' );
									} catch ( err: unknown ) {
										const msg = err && typeof err === 'object' && 'message' in err ? ( err as { message: string } ).message : __( 'Failed to revoke license', 'purecart' );
										showToast( msg, 'error' );
									}
									closeDialog();
								},
							}),
						},
						{
							label: __( 'Reset Activations', 'purecart' ), icon: RotateCcw,
							onClick: () => openDialog({
								danger: false, icon: RotateCcw, title: __( 'Reset Activations?', 'purecart' ),
								body: <span>{ sprintf( __( "Reset all domain activations for %s's license? They'll need to reactivate on each site.", 'purecart' ), row.customer ) }</span>,
								confirmLabel: __( 'Reset Activations', 'purecart' ),
								onConfirm: async () => {
									const licId = parseInt( entity.licenseId, 10 );
									if ( ! licId ) { showToast( __( 'No linked license found', 'purecart' ), 'error' ); closeDialog(); return; }
									try {
										await dispatch( resetLicenseActivationsThunk( licId ) ).unwrap();
										showToast( sprintf( __( 'Activations reset for %s', 'purecart' ), row.customer ), 'success' );
									} catch ( err: unknown ) {
										const msg = err && typeof err === 'object' && 'message' in err ? ( err as { message: string } ).message : __( 'Failed to reset activations', 'purecart' );
										showToast( msg, 'error' );
									}
									closeDialog();
								},
							}),
						},
					] as ActionItem[];
				case 'saas':
					return [
						{
							label: __( 'View Account', 'purecart' ), icon: Cloud, dividerBefore: true,
							onClick: () => navigate( '/saas-accounts' ),
						},
						{
							label: __( 'Adjust Seat Count', 'purecart' ), icon: Users,
							onClick: () => showToast( __( 'Seat adjustment is not available yet — no endpoint exists for this action', 'purecart' ), 'info' ),
						},
						{
							label: __( 'Suspend Account', 'purecart' ), icon: PauseCircle, danger: true,
							onClick: () => openDialog({
								danger: true, icon: PauseCircle, title: __( 'Suspend SaaS Account?', 'purecart' ),
								body: <span>{ sprintf( __( "Suspend %s's account access?", 'purecart' ), entity.saasAccountName ) }</span>,
								confirmLabel: __( 'Suspend Account', 'purecart' ),
								onConfirm: async () => {
									const accId = parseInt( entity.saasAccountId, 10 );
									if ( ! accId ) { showToast( __( 'No linked SaaS account found', 'purecart' ), 'error' ); closeDialog(); return; }
									try {
										await dispatch( suspendSaasAccountThunk( accId ) ).unwrap();
										showToast( sprintf( __( 'Account suspended for %s', 'purecart' ), row.customer ), 'warning' );
									} catch ( err: unknown ) {
										const msg = err && typeof err === 'object' && 'message' in err ? ( err as { message: string } ).message : __( 'Failed to suspend account', 'purecart' );
										showToast( msg, 'error' );
									}
									closeDialog();
								},
							}),
						},
					] as ActionItem[];
				case 'membership':
					return [
						{ label: __( 'Change Tier', 'purecart' ), icon: ArrowUpRight, dividerBefore: true, onClick: () => showToast( __( 'Tier switching is not available yet — requires product-level tier configuration', 'purecart' ), 'info' ) },
						{ label: __( 'View Restricted Content', 'purecart' ), icon: Lock, onClick: () => showToast( __( 'Content restriction overview is not available yet', 'purecart' ), 'info' ) },
						{
							label: 'Extend Grace Period (+7 days)', icon: Calendar, onClick: () => openDialog({
								danger: false, icon: Calendar, title: 'Extend Grace Period?',
								body: <span>Extend {row.customer}'s access grace period by 7 days?</span>,
								confirmLabel: 'Extend Grace Period',
								onConfirm: () => {
									updateRow(row.id, { linkedEntity: { ...entity, graceEndsAt: addBillingInterval(entity.graceEndsAt, { interval: 7, period: 'day', displayLabel: '' }) } });
									showToast(`Grace period extended for ${row.customer}`, 'success');
									closeDialog();
								},
							})
						},
					] as ActionItem[];
				case 'download':
					return [
						{
							label: 'Reset Download Count', icon: RotateCcw, dividerBefore: true, onClick: () => openDialog({
								danger: false, icon: RotateCcw, title: 'Reset Download Count?',
								body: <span>Reset {row.customer}'s download counter to 0 for this cycle?</span>,
								confirmLabel: 'Reset Count',
								onConfirm: () => {
									updateRow(row.id, { linkedEntity: { ...entity, downloadsThisCycle: 0 } });
									showToast(`Download count reset for ${row.customer}`, 'success');
									closeDialog();
								},
							})
						},
						{ label: __( 'Send New Content Email', 'purecart' ), icon: Mail, onClick: () => showToast( __( 'Content notification emails are not available yet — no email endpoint exists', 'purecart' ), 'info' ) },
						{ label: __( 'Manage Drip Schedule', 'purecart' ), icon: Clock, onClick: () => showToast( __( 'Drip schedule editor is not available yet', 'purecart' ), 'info' ) },
					] as ActionItem[];
				case 'course':
					return [
						{ label: __( 'View Course Progress', 'purecart' ), icon: BarChart2, dividerBefore: true, onClick: () => showToast( __( 'Course progress tracking is not available yet — requires LMS API integration', 'purecart' ), 'info' ) },
						{
							label: 'Extend Course Access (+30 days)', icon: Calendar, onClick: () => openDialog({
								danger: false, icon: Calendar, title: 'Extend Course Access?',
								body: <span>Extend {row.customer}'s course access by 30 days?</span>,
								confirmLabel: 'Extend Access',
								onConfirm: () => {
									updateRow(row.id, { linkedEntity: { ...entity, courseAccessUntil: addBillingInterval(entity.courseAccessUntil, { interval: 30, period: 'day', displayLabel: '' }) } });
									showToast(`Course access extended for ${row.customer}`, 'success');
									closeDialog();
								},
							})
						},
						{ label: __( 'Resend Enrollment Email', 'purecart' ), icon: Mail, onClick: () => showToast( __( 'Enrollment emails are not available yet — no email endpoint exists', 'purecart' ), 'info' ) },
					] as ActionItem[];
				case 'service':
					return [
						{
							label: 'Mark Deliverable Complete', icon: CheckCircle, dividerBefore: true, onClick: () => openDialog({
								danger: false, icon: CheckCircle, title: 'Mark Deliverable Complete?',
								body: <span>Mark this cycle's deliverable complete for {row.customer} and advance the next-due date?</span>,
								confirmLabel: 'Mark Complete',
								onConfirm: () => {
									const today = new Date().toISOString().slice(0, 10);
									updateRow(row.id, { linkedEntity: { ...entity, lastDeliverableAt: today, nextDeliverableDue: addBillingInterval(entity.nextDeliverableDue, row.billing) } });
									showToast(`Deliverable marked complete for ${row.customer}`, 'success');
									closeDialog();
								},
							})
						},
						{ label: __( 'Send Invoice', 'purecart' ), icon: FileText, onClick: () => showToast( __( 'Invoice sending is not available yet — no invoice endpoint exists', 'purecart' ), 'info' ) },
						{ label: __( 'Add Deliverable Note', 'purecart' ), icon: Edit, onClick: () => showToast( __( 'Deliverable note editor is not available yet', 'purecart' ), 'info' ) },
					] as ActionItem[];
			}
		})();

		/**
		 * @see SUBSCRIPTION_ACTIONS_FILTER for the documented contract.
		 */
		return applyFilters(SUBSCRIPTION_ACTIONS_FILTER, [...universal, ...typeSpecific], row) as ActionItem[];
	};

	const modals = (
		<>
			{cancelRow && (
				<CancellationFlowModal
					row={cancelRow}
					onClose={() => setCancelRow(null)}
					onCancelled={async (patch) => {
						try {
							const immediately = patch.status === 'cancelled';
							await dispatch(cancelSubscriptionThunk({
								id: cancelRow.id,
								immediately,
								reason: patch.cancellationReasonId,
							})).unwrap();
							showToast(
								immediately
									? `Subscription cancelled for ${cancelRow.customer}`
									: `${cancelRow.customer}'s subscription will cancel on ${patch.cancellationDate || 'period end'}`,
								'error'
							);
						} catch (err: any) {
							showToast(err?.message || `Failed to cancel subscription for ${cancelRow.customer}`, 'error');
						}
					}}
					onOfferAccepted={async (offer, reasonId) => {
						try {
							await dispatch(acceptCancellationOfferThunk({
								id: cancelRow.id,
								offerType: offer.type,
								reason: reasonId || 'too_expensive',
							})).unwrap();
							showToast(`Retention offer applied for ${cancelRow.customer}`, 'success');
						} catch (err: any) {
							showToast(err?.message || `Failed to apply retention offer for ${cancelRow.customer}`, 'error');
						}
					}}
				/>
			)}
			{pauseRow && (
				<PauseDurationModal
					row={pauseRow}
					onClose={() => setPauseRow(null)}
					onPause={async (pauseEndDate) => {
						try {
							await dispatch(pauseSubscriptionThunk({ id: pauseRow.id, resumeAt: pauseEndDate })).unwrap();
							showToast(`Subscription paused for ${pauseRow.customer}`, 'warning');
						} catch (err: any) {
							showToast(err?.message || `Failed to pause subscription for ${pauseRow.customer}`, 'error');
						}
					}}
				/>
			)}
			{planRow && (
				<ChangePlanModal
					row={planRow}
					onClose={() => setPlanRow(null)}
					onConfirm={async (plan, timing) => {
						try {
							const mode = timing === 'immediate' ? 'prorate_immediately' : 'apply_at_renewal';
							const amountNum = parseFloat(plan.amount.replace(/[^0-9.]/g, '')) || planRow.amountRaw;
							await dispatch(upgradeSubscriptionThunk({
								id: planRow.id,
								productId: planRow.productId,
								cycle: plan.cycle,
								planLabel: plan.label,
								amount: amountNum,
								mode,
							})).unwrap();
							showToast(
								timing === 'scheduled'
									? `${planRow.customer}'s plan change to ${plan.label} is scheduled for next renewal`
									: `${planRow.customer} moved to ${plan.label} plan`,
								'success'
							);
						} catch (err: any) {
							showToast(err?.message || `Failed to change plan for ${planRow.customer}`, 'error');
						}
					}}
				/>
			)}
			{discountRow && (
				<ApplyDiscountModal
					row={discountRow}
					bulkRows={discountBulkRows ?? undefined}
					onClose={() => { setDiscountRow(null); setDiscountBulkRows(null); }}
					onConfirm={async (targetIds, pct, duration) => {
						try {
							await Promise.all(
								targetIds.map((id) =>
									dispatch(applyDiscountThunk({ id, percent: pct, duration })).unwrap()
								)
							);
							showToast(
								targetIds.length > 1
									? `${pct}% discount (${duration}) applied to ${targetIds.length} subscriptions`
									: `${pct}% discount (${duration}) applied for ${discountRow.customer}`,
								'success'
							);
						} catch (err: any) {
							showToast(err?.message || 'Failed to apply discount', 'error');
						}
					}}
				/>
			)}
			{historyRow && (
				<PaymentHistoryModal
					row={historyRow}
					payments={historyPayments}
					onClose={() => setHistoryRow(null)}
					onSendReceipt={() => showToast( __( 'Receipt emails are not available yet — no email endpoint exists', 'purecart' ), 'info' )}
					onExport={() => showToast( __( 'Payment history export is not available yet', 'purecart' ), 'info' )}
				/>
			)}
			<ConfirmDialog
				open={dialog.open}
				title={dialog.title}
				body={dialog.body}
				confirmLabel={dialog.confirmLabel}
				danger={dialog.danger}
				icon={dialog.icon}
				onConfirm={dialog.onConfirm}
				onCancel={closeDialog}
			/>
			<Toast message={toast.message} type={toast.type} visible={toast.visible} />
		</>
	);

	const openResumeModal = (row: SubscriptionRecord) => {
		openDialog({
			danger: false,
			icon: CheckCircle,
			title: 'Resume Subscription?',
			body: (
				<span>
					Resume billing for {row.customer}? Their next payment of <strong>{row.amount}</strong> will be charged immediately and then on the regular cycle.
				</span>
			),
			confirmLabel: 'Resume Subscription',
			onConfirm: async () => {
				try {
					await dispatch(resumeSubscriptionThunk(row.id)).unwrap();
					showToast(`Subscription resumed for ${row.customer}`, 'success');
				} catch (err: any) {
					showToast(err?.message || `Failed to resume subscription for ${row.customer}`, 'error');
				}
				closeDialog();
			},
		});
	};

	return {
		rowActions,
		openPaymentHistory,
		openBulkDiscount,
		sendCardUpdateEmail,
		// Direct openers for header-level buttons (e.g. the Detail page's
		// Pause/Cancel buttons) that need the same modals the ⋮ menu uses,
		// without hunting through the rowActions() array for a matching label.
		openCancelFlow: setCancelRow,
		openPauseModal: setPauseRow,
		openResumeModal,
		openChangePlan: setPlanRow,
		showToast,
		openDialog,
		closeDialog,
		updateRow,
		deleteRow,
		modals,
	};
}
