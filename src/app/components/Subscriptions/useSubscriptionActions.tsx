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
import { fetchPaymentHistory } from '../../utils/api';
import { addBillingInterval } from '../../utils/subscription-metrics';
import type { SubscriptionRecord, PaymentRecord, RetentionOffer } from '../../utils/subscription-types';
import { useAppDispatch } from '../../store/hooks';
import { patchSubscription, removeSubscription } from '../../store/slices/subscriptionsSlice';
import { ConfirmDialog, Toast } from '../ui';
import type { ActionItem, ConfirmDialogProps, ToastProps } from '../ui';
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
} from './modals';

type DialogState = Omit< ConfirmDialogProps, 'onCancel' > & { open: boolean };

const EMPTY_DIALOG: DialogState = {
	open: false,
	title: '',
	body: null,
	confirmLabel: '',
	danger: false,
	onConfirm: () => {},
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

	const [ toast, setToast ] = useState< ToastProps >( { message: '', type: 'success', visible: false } );
	const [ dialog, setDialog ] = useState< DialogState >( EMPTY_DIALOG );

	const [ cancelRow, setCancelRow ] = useState< SubscriptionRecord | null >( null );
	const [ pauseRow, setPauseRow ] = useState< SubscriptionRecord | null >( null );
	const [ planRow, setPlanRow ] = useState< SubscriptionRecord | null >( null );
	const [ discountRow, setDiscountRow ] = useState< SubscriptionRecord | null >( null );
	const [ discountBulkRows, setDiscountBulkRows ] = useState< SubscriptionRecord[] | null >( null );
	const [ historyRow, setHistoryRow ] = useState< SubscriptionRecord | null >( null );
	const [ historyPayments, setHistoryPayments ] = useState< PaymentRecord[] >( [] );

	const showToast = ( msg: string, type: ToastProps[ 'type' ] = 'success' ) => {
		setToast( { message: msg, type, visible: true } );
		setTimeout( () => setToast( ( t ) => ( { ...t, visible: false } ) ), 3000 );
	};
	const openDialog = ( opts: Omit< DialogState, 'open' > ) => setDialog( { ...opts, open: true } );
	const closeDialog = () => setDialog( ( d ) => ( { ...d, open: false } ) );

	/** Dispatches a patch through the Redux thunk, which calls the API layer and merges the confirmed result back into the store. */
	const updateRow = ( id: string, patch: Partial< SubscriptionRecord > ) => {
		dispatch( patchSubscription( { id, patch } ) );
	};
	const deleteRow = ( id: string ) => dispatch( removeSubscription( id ) );

	const openPaymentHistory = ( row: SubscriptionRecord ) => {
		setHistoryRow( row );
		setHistoryPayments( [] );
		fetchPaymentHistory( row.id ).then( setHistoryPayments );
	};

	const openBulkDiscount = ( rows: SubscriptionRecord[] ) => {
		setDiscountBulkRows( rows );
		setDiscountRow( rows[ 0 ] ?? null );
	};

	const sendCardUpdateEmail = ( row: SubscriptionRecord ) =>
		openDialog(
			buildSendCardUpdateDialog( row, () => {
				showToast( `Card update link sent to ${ row.customer }`, 'success' );
				closeDialog();
			} )
		);

	const handleOfferAccepted = ( row: SubscriptionRecord, offer: RetentionOffer ) => {
		if ( offer.type === 'discount' ) {
			const cycles =
				offer.discountDuration === 'Forever' ? 999 : parseInt( offer.discountDuration ?? '1', 10 ) || 1;
			updateRow( row.id, { retentionDiscountRemaining: cycles } );
		} else if ( offer.type === 'pause' ) {
			const pauseEndDate = offer.pauseDuration
				? addBillingInterval( null, { interval: offer.pauseDuration, period: 'day', displayLabel: '' } )
				: null;
			updateRow( row.id, { status: 'paused', pauseEndDate } );
		} else if ( offer.type === 'skip' ) {
			updateRow( row.id, {
				skipCount: row.skipCount + 1,
				nextPayment: addBillingInterval( row.nextPayment, row.billing ),
			} );
		} else if ( offer.type === 'downgrade' ) {
			updateRow( row.id, {
				pendingSwitchProduct: offer.downgradePlanLabel ?? offer.downgradePlanId ?? null,
				pendingSwitchType: 'downgrade',
			} );
		}
		// 'contact' type never reaches here — its card opens a support URL instead of calling onAccept
		showToast( `Retention offer applied for ${ row.customer }`, 'success' );
	};

	// ── Row actions ─────────────────────────────────────────────────────────────
	const rowActions = ( row: SubscriptionRecord ): ActionItem[] => {
		const universal: ActionItem[] = [
			{ label: 'View Customer', icon: Users, onClick: () => showToast( `Customer profile for ${ row.customer } — coming once a Customer module exists`, 'info' ) },
			{ label: 'View Payment History', icon: FileText, onClick: () => openPaymentHistory( row ) },
			{ label: 'Send Payment Receipt', icon: Mail, onClick: () => showToast( `Receipt emailed to ${ row.customer }`, 'success' ) },

			...( row.status === 'past_due'
				? [ {
						label: 'Retry Payment Now', icon: RefreshCw, dividerBefore: true,
						onClick: () => openDialog( {
							danger: false, icon: RefreshCw, title: 'Retry Payment?',
							body: <span>Attempt to charge <strong>{ row.amount }</strong> from <strong>{ row.customer }</strong>'s payment method on file immediately?</span>,
							confirmLabel: 'Retry Payment',
							onConfirm: () => {
								updateRow( row.id, { status: 'active', nextPayment: addBillingInterval( null, row.billing ) } );
								showToast( `Payment retried successfully for ${ row.customer }`, 'success' );
								closeDialog();
							},
						} ),
				  } as ActionItem ]
				: [] ),
			{
				label: 'Update Payment Method', icon: CreditCard, dividerBefore: row.status !== 'past_due',
				onClick: () => showToast( `Payment method update link sent to ${ row.customer }`, 'success' ),
			},
			{
				label: 'Early Renewal', icon: FastForward,
				disabled: row.cycle === 'Lifetime' || row.status !== 'active',
				onClick: () => openDialog( buildEarlyRenewalDialog( row, () => {
					updateRow( row.id, { nextPayment: addBillingInterval( null, row.billing ) } );
					showToast( `Payment renewed early for ${ row.customer }`, 'success' );
					closeDialog();
				} ) ),
			},
			{
				label: 'Skip Next Cycle', icon: SkipForward,
				disabled: row.paymentType !== 'recurring' || row.status !== 'active',
				onClick: () => openDialog( buildSkipCycleDialog( row, () => {
					updateRow( row.id, { nextPayment: addBillingInterval( row.nextPayment, row.billing ), skipCount: row.skipCount + 1 } );
					showToast( `Next cycle skipped for ${ row.customer }`, 'warning' );
					closeDialog();
				} ) ),
			},
			{
				label: 'Request Reauthorization', icon: Lock,
				disabled: row.status !== 'past_due' && row.status !== 'pending_reauth',
				onClick: () => openDialog( buildScaReauthDialog( row, () => {
					updateRow( row.id, { status: 'pending_reauth' } );
					showToast( `Reauthorization email sent to ${ row.customer }`, 'info' );
					closeDialog();
				} ) ),
			},
			{
				label: 'Send Card Update Email', icon: CreditCard,
				disabled: ! row.cardExpiring,
				onClick: () => sendCardUpdateEmail( row ),
			},

			{
				label: 'Change Plan', icon: Repeat, dividerBefore: true,
				disabled: row.status === 'cancelled',
				onClick: () => setPlanRow( row ),
			},
			{
				label: 'Apply Discount', icon: Tag,
				disabled: row.status === 'cancelled',
				onClick: () => { setDiscountBulkRows( null ); setDiscountRow( row ); },
			},
			...( row.status === 'trialing'
				? [ {
						label: 'Extend Trial (+7 days)', icon: Calendar,
						onClick: () => openDialog( {
							danger: false, icon: Calendar, title: 'Extend Trial?',
							body: <span>Add 7 more days to { row.customer }'s trial for <strong>{ row.product }</strong>?</span>,
							confirmLabel: 'Extend Trial',
							onConfirm: () => {
								updateRow( row.id, { nextPayment: addBillingInterval( row.nextPayment ?? null, { interval: 7, period: 'day', displayLabel: '' } ) } );
								showToast( `Trial extended for ${ row.customer }`, 'success' );
								closeDialog();
							},
						} ),
				  } as ActionItem ]
				: [] ),
			...( row.pendingSwitchProduct
				? [ {
						label: `Cancel Scheduled ${ row.pendingSwitchType } → ${ row.pendingSwitchProduct }`, icon: XCircle,
						onClick: () => openDialog( {
							danger: false, icon: XCircle, title: 'Cancel Scheduled Plan Switch?',
							body: <span>Cancel the scheduled { row.pendingSwitchType } to <strong>{ row.pendingSwitchProduct }</strong> for { row.customer }?</span>,
							confirmLabel: 'Cancel Switch',
							onConfirm: () => {
								updateRow( row.id, { pendingSwitchProduct: null, pendingSwitchType: null } );
								showToast( 'Scheduled plan switch cancelled', 'info' );
								closeDialog();
							},
						} ),
				  } as ActionItem ]
				: [] ),

			...( row.status === 'active'
				? [ { label: 'Pause Subscription', icon: PauseCircle, dividerBefore: true, onClick: () => setPauseRow( row ) } as ActionItem ]
				: [] ),
			...( row.status === 'paused'
				? [ {
						label: 'Resume Subscription', icon: CheckCircle, dividerBefore: true,
						onClick: () => openDialog( {
							danger: false, icon: CheckCircle, title: 'Resume Subscription?',
							body: <span>Resume billing for { row.customer }? Their next payment of <strong>{ row.amount }</strong> will be charged immediately and then on the regular cycle.</span>,
							confirmLabel: 'Resume Subscription',
							onConfirm: () => {
								updateRow( row.id, { status: 'active', nextPayment: addBillingInterval( null, row.billing ) } );
								showToast( `Subscription resumed for ${ row.customer }`, 'success' );
								closeDialog();
							},
						} ),
				  } as ActionItem ]
				: [] ),
			...( row.status === 'pending_cancel'
				? [
						{
							label: 'Cancel Immediately', icon: XCircle, danger: true, dividerBefore: true,
							onClick: () => openDialog( {
								danger: true, icon: XCircle, title: 'Cancel Immediately?',
								body: <span>Cancel <strong>{ row.product }</strong> for { row.customer } right now instead of waiting until { row.cancellationDate }? Access ends immediately.</span>,
								confirmLabel: 'Cancel Now',
								onConfirm: () => {
									updateRow( row.id, { status: 'cancelled', cancellationDate: new Date().toISOString().slice( 0, 10 ) } );
									showToast( `Subscription cancelled for ${ row.customer }`, 'error' );
									closeDialog();
								},
							} ),
						} as ActionItem,
						{
							label: 'Reinstate (undo pending cancel)', icon: CheckCircle,
							onClick: () => openDialog( {
								danger: false, icon: CheckCircle, title: 'Reinstate Subscription?',
								body: <span>Cancel the scheduled cancellation for { row.customer }? Billing resumes normally.</span>,
								confirmLabel: 'Reinstate',
								onConfirm: () => {
									updateRow( row.id, { status: 'active', cancellationDate: null, cancellationReasonId: null } );
									showToast( `Subscription reinstated for ${ row.customer }`, 'success' );
									closeDialog();
								},
							} ),
						} as ActionItem,
				  ]
				: [] ),

			{
				label: 'Cancel Subscription', icon: XCircle, danger: true, dividerBefore: true,
				disabled: row.status === 'cancelled' || row.status === 'pending_cancel',
				onClick: () => setCancelRow( row ),
			},
			{
				label: 'Refund Last Payment', icon: RotateCcw, danger: true,
				disabled: row.status === 'cancelled' || row.status === 'trialing',
				onClick: () => openDialog( {
					danger: true, icon: RotateCcw, title: 'Refund Last Payment?',
					body: <span>Issue a full refund of <strong>{ row.amount }</strong> to <strong>{ row.customer }</strong>? The refund will be credited to their original payment method within 5–10 business days.</span>,
					confirmLabel: 'Issue Refund',
					onConfirm: () => {
						showToast( `Refund of ${ row.amount } issued to ${ row.customer }`, 'warning' );
						closeDialog();
					},
				} ),
			},
			...( row.paymentType === 'split'
				? [ {
						label: 'Mark Split Payments Complete', icon: CheckSquare,
						onClick: () => openDialog( {
							danger: false, icon: CheckSquare, title: 'Mark Installments Complete?',
							body: <span>Force { row.customer }'s split payment plan to <strong>completed</strong> even though { row.paymentsCompleted }/{ row.maxPayments } installments are recorded?</span>,
							confirmLabel: 'Mark Complete',
							onConfirm: () => {
								updateRow( row.id, { status: 'completed', paymentsCompleted: row.maxPayments ?? row.paymentsCompleted } );
								showToast( `Split payments marked complete for ${ row.customer }`, 'success' );
								closeDialog();
							},
						} ),
				  } as ActionItem ]
				: [] ),
			{
				label: 'Delete Record', icon: Trash2, danger: true,
				onClick: () => openDialog( {
					danger: true, icon: Trash2, title: 'Delete Subscription Record?',
					body: <span>Permanently delete the subscription record{ ' ' }
						<strong style={ { fontFamily: 'Roboto Mono, monospace' } }>{ row.id }</strong>{ ' ' }
						for <strong>{ row.customer }</strong>? All payment history will be lost and this cannot be undone.</span>,
					confirmLabel: 'Delete Record',
					onConfirm: () => {
						deleteRow( row.id );
						showToast( `Subscription ${ row.id } deleted`, 'error' );
						closeDialog();
					},
				} ),
			},
		];

		const typeSpecific: ActionItem[] = ( () => {
			const entity = row.linkedEntity;
			switch ( entity.type ) {
				case 'software':
					return [
						{ label: 'View License', icon: Key, dividerBefore: true, onClick: () => showToast( `License ${ entity.licenseKey } — detail view coming with the Licensing module`, 'info' ) },
						{ label: 'Revoke License', icon: XCircle, danger: true, onClick: () => openDialog( {
							danger: true, icon: XCircle, title: 'Revoke License?',
							body: <span>Revoke the license key for { row.customer }? Their software will stop receiving updates and activation checks will fail.</span>,
							confirmLabel: 'Revoke License',
							onConfirm: () => { showToast( `License revoked for ${ row.customer }`, 'error' ); closeDialog(); },
						} ) },
						{ label: 'Reset Activations', icon: RotateCcw, onClick: () => openDialog( {
							danger: false, icon: RotateCcw, title: 'Reset Activations?',
							body: <span>Reset all domain activations for { row.customer }'s license? They'll need to reactivate on each site.</span>,
							confirmLabel: 'Reset Activations',
							onConfirm: () => {
								updateRow( row.id, { linkedEntity: { ...entity, domainsUsed: 0, domainCount: `0/${ entity.domainLimit }` } } );
								showToast( `Activations reset for ${ row.customer }`, 'success' );
								closeDialog();
							},
						} ) },
					] as ActionItem[];
				case 'saas':
					return [
						{ label: 'View Account', icon: Cloud, dividerBefore: true, onClick: () => showToast( `Account ${ entity.saasAccountName } — detail view coming with the SaaS module`, 'info' ) },
						{ label: 'Adjust Seat Count', icon: Users, onClick: () => showToast( 'Seat adjustment — needs a small number-input modal, not built yet', 'info' ) },
						{ label: 'Suspend Account', icon: PauseCircle, onClick: () => openDialog( {
							danger: false, icon: PauseCircle, title: 'Suspend SaaS Account?',
							body: <span>Suspend { entity.saasAccountName }'s account access?</span>,
							confirmLabel: 'Suspend Account',
							onConfirm: () => { showToast( `Account suspended for ${ row.customer }`, 'warning' ); closeDialog(); },
						} ) },
					] as ActionItem[];
				case 'membership':
					return [
						{ label: 'Change Tier', icon: ArrowUpRight, dividerBefore: true, onClick: () => showToast( 'Tier picker — reuse the Change Plan pattern once tiers are product-configurable', 'info' ) },
						{ label: 'View Restricted Content', icon: Lock, onClick: () => showToast( 'Content restriction detail — no dedicated page yet', 'info' ) },
						{ label: 'Extend Grace Period (+7 days)', icon: Calendar, onClick: () => openDialog( {
							danger: false, icon: Calendar, title: 'Extend Grace Period?',
							body: <span>Extend { row.customer }'s access grace period by 7 days?</span>,
							confirmLabel: 'Extend Grace Period',
							onConfirm: () => {
								updateRow( row.id, { linkedEntity: { ...entity, graceEndsAt: addBillingInterval( entity.graceEndsAt, { interval: 7, period: 'day', displayLabel: '' } ) } } );
								showToast( `Grace period extended for ${ row.customer }`, 'success' );
								closeDialog();
							},
						} ) },
					] as ActionItem[];
				case 'download':
					return [
						{ label: 'Reset Download Count', icon: RotateCcw, dividerBefore: true, onClick: () => openDialog( {
							danger: false, icon: RotateCcw, title: 'Reset Download Count?',
							body: <span>Reset { row.customer }'s download counter to 0 for this cycle?</span>,
							confirmLabel: 'Reset Count',
							onConfirm: () => {
								updateRow( row.id, { linkedEntity: { ...entity, downloadsThisCycle: 0 } } );
								showToast( `Download count reset for ${ row.customer }`, 'success' );
								closeDialog();
							},
						} ) },
						{ label: 'Send New Content Email', icon: Mail, onClick: () => showToast( `Content notification sent to ${ row.customer }`, 'success' ) },
						{ label: 'Manage Drip Schedule', icon: Clock, onClick: () => showToast( 'Drip schedule editor — deferred, no spec exists yet for this UI', 'info' ) },
					] as ActionItem[];
				case 'course':
					return [
						{ label: 'View Course Progress', icon: BarChart2, dividerBefore: true, onClick: () => showToast( 'Progress chart — deferred, needs real LMS API data', 'info' ) },
						{ label: 'Extend Course Access (+30 days)', icon: Calendar, onClick: () => openDialog( {
							danger: false, icon: Calendar, title: 'Extend Course Access?',
							body: <span>Extend { row.customer }'s course access by 30 days?</span>,
							confirmLabel: 'Extend Access',
							onConfirm: () => {
								updateRow( row.id, { linkedEntity: { ...entity, courseAccessUntil: addBillingInterval( entity.courseAccessUntil, { interval: 30, period: 'day', displayLabel: '' } ) } } );
								showToast( `Course access extended for ${ row.customer }`, 'success' );
								closeDialog();
							},
						} ) },
						{ label: 'Resend Enrollment Email', icon: Mail, onClick: () => showToast( `Enrollment email resent to ${ row.customer }`, 'success' ) },
					] as ActionItem[];
				case 'service':
					return [
						{ label: 'Mark Deliverable Complete', icon: CheckCircle, dividerBefore: true, onClick: () => openDialog( {
							danger: false, icon: CheckCircle, title: 'Mark Deliverable Complete?',
							body: <span>Mark this cycle's deliverable complete for { row.customer } and advance the next-due date?</span>,
							confirmLabel: 'Mark Complete',
							onConfirm: () => {
								const today = new Date().toISOString().slice( 0, 10 );
								updateRow( row.id, { linkedEntity: { ...entity, lastDeliverableAt: today, nextDeliverableDue: addBillingInterval( entity.nextDeliverableDue, row.billing ) } } );
								showToast( `Deliverable marked complete for ${ row.customer }`, 'success' );
								closeDialog();
							},
						} ) },
						{ label: 'Send Invoice', icon: FileText, onClick: () => showToast( `Invoice sent to ${ row.customer }`, 'success' ) },
						{ label: 'Add Deliverable Note', icon: Edit, onClick: () => showToast( 'Note editor — deferred, needs a small textarea modal', 'info' ) },
					] as ActionItem[];
			}
		} )();

		return [ ...universal, ...typeSpecific ];
	};

	const modals = (
		<>
			{ cancelRow && (
				<CancellationFlowModal
					row={ cancelRow }
					onClose={ () => setCancelRow( null ) }
					onCancelled={ ( patch ) => {
						updateRow( cancelRow.id, patch );
						showToast(
							patch.status === 'cancelled'
								? `Subscription cancelled for ${ cancelRow.customer }`
								: `${ cancelRow.customer }'s subscription will cancel on ${ patch.cancellationDate }`,
							'error'
						);
					} }
					onOfferAccepted={ ( offer ) => handleOfferAccepted( cancelRow, offer ) }
				/>
			) }
			{ pauseRow && (
				<PauseDurationModal
					row={ pauseRow }
					onClose={ () => setPauseRow( null ) }
					onPause={ ( pauseEndDate ) => {
						updateRow( pauseRow.id, { status: 'paused', nextPayment: null, pauseEndDate } );
						showToast( `Subscription paused for ${ pauseRow.customer }`, 'warning' );
					} }
				/>
			) }
			{ planRow && (
				<ChangePlanModal
					row={ planRow }
					onClose={ () => setPlanRow( null ) }
					onConfirm={ ( patch ) => {
						updateRow( planRow.id, patch );
						showToast(
							patch.pendingSwitchProduct
								? `${ planRow.customer }'s plan change to ${ patch.pendingSwitchProduct } is scheduled`
								: `${ planRow.customer } moved to a new plan`,
							'success'
						);
					} }
				/>
			) }
			{ discountRow && (
				<ApplyDiscountModal
					row={ discountRow }
					bulkRows={ discountBulkRows ?? undefined }
					onClose={ () => { setDiscountRow( null ); setDiscountBulkRows( null ); } }
					onConfirm={ ( targetIds, pct, duration ) => {
						targetIds.forEach( ( id ) =>
							updateRow( id, { retentionDiscountRemaining: duration === 'Forever' ? 999 : parseInt( duration, 10 ) || 1 } )
						);
						showToast(
							targetIds.length > 1
								? `${ pct }% discount (${ duration }) applied to ${ targetIds.length } subscriptions`
								: `${ pct }% discount (${ duration }) applied for ${ discountRow.customer }`,
							'success'
						);
					} }
				/>
			) }
			{ historyRow && (
				<PaymentHistoryModal
					row={ historyRow }
					payments={ historyPayments }
					onClose={ () => setHistoryRow( null ) }
					onSendReceipt={ ( p ) => showToast( `Receipt for ${ p.date } sent to ${ historyRow.customer }`, 'success' ) }
					onExport={ () => showToast( 'Payment history exported', 'success' ) }
				/>
			) }
			<ConfirmDialog
				open={ dialog.open }
				title={ dialog.title }
				body={ dialog.body }
				confirmLabel={ dialog.confirmLabel }
				danger={ dialog.danger }
				icon={ dialog.icon }
				onConfirm={ dialog.onConfirm }
				onCancel={ closeDialog }
			/>
			<Toast message={ toast.message } type={ toast.type } visible={ toast.visible } />
		</>
	);

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
		openChangePlan: setPlanRow,
		showToast,
		openDialog,
		closeDialog,
		updateRow,
		deleteRow,
		modals,
	};
}
