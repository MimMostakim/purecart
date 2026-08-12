/**
 * DeliveryTypeTab component.
 *
 * The Detail page's 6th tab - one file, one switch on `row.linkedEntity.type`,
 * six render branches. Each branch shows what's genuinely in the data model
 * today and is explicit about what isn't, rather than inventing a fake log
 * that doesn't connect to anything real (per-download logs, deliverable
 * logs, SaaS user lists, and tier-change history all need new data types
 * this plan hasn't built).
 *
 * @file
 * @since 1.0.0
 */
import { RotateCcw, Calendar, PauseCircle, XCircle } from 'lucide-react';
import { M3 } from '../../../utils/static-data';
import { Card } from '../../ui/Card';
import { OutlinedButton } from '../../ui/OutlinedButton';
import { addBillingInterval } from '../../../utils/subscription-metrics';
import type { SubscriptionRecord } from '../../../utils/subscription-types';
import type { ConfirmDialogProps, ToastProps } from '../../ui';

interface DeliveryTypeTabProps {
	row: SubscriptionRecord;
	showToast: ( msg: string, type?: ToastProps[ 'type' ] ) => void;
	openDialog: ( opts: Omit< ConfirmDialogProps, 'onCancel' | 'open' > ) => void;
	closeDialog: () => void;
	updateRow: ( id: string, patch: Partial< SubscriptionRecord > ) => void;
}

/** Small "not built yet" notice, shared visual language across the type-specific tabs. */
function NotBuiltNotice( { children }: { children: React.ReactNode } ) {
	return (
		<div
			className="text-xs px-3 py-2.5 rounded-xl"
			style={ { backgroundColor: M3.surfaceContainerHigh, color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif' } }
		>
			{ children }
		</div>
	);
}

/**
 * Renders the type-specific 6th tab, matching `row.deliveryType`.
 *
 * @since 1.0.0
 *
 * @param {DeliveryTypeTabProps} props Component props.
 *
 * @return {JSX.Element} The type-specific tab content.
 */
export function DeliveryTypeTab( { row, showToast, openDialog, closeDialog, updateRow }: DeliveryTypeTabProps ) {
	const entity = row.linkedEntity;
	const rowStyle = { fontFamily: 'Roboto, sans-serif' } as const;

	switch ( entity.type ) {
		case 'software':
			return (
				<Card className="p-5 flex flex-col gap-3">
					<div className="flex items-center justify-between text-sm" style={ rowStyle }>
						<span style={ { color: M3.onSurfaceVariant } }>License Key</span>
						<span style={ { color: M3.onSurface, fontFamily: 'Roboto Mono, monospace' } }>{ entity.licenseKey }</span>
					</div>
					<div className="flex items-center justify-between text-sm" style={ rowStyle }>
						<span style={ { color: M3.onSurfaceVariant } }>Activations</span>
						<span style={ { color: M3.onSurface } }>{ entity.domainCount } domains</span>
					</div>
					<div className="flex gap-2 mt-2">
						<OutlinedButton
							small
							danger
							onClick={ () => openDialog( {
								danger: true, icon: XCircle, title: 'Revoke License?',
								body: <span>Revoke the license key for { row.customer }? Their software will stop receiving updates and activation checks will fail.</span>,
								confirmLabel: 'Revoke License',
								onConfirm: () => { showToast( `License revoked for ${ row.customer }`, 'error' ); closeDialog(); },
							} ) }
						>
							Revoke License
						</OutlinedButton>
						<OutlinedButton
							small
							onClick={ () => openDialog( {
								danger: false, icon: RotateCcw, title: 'Reset Activations?',
								body: <span>Reset all domain activations for { row.customer }'s license?</span>,
								confirmLabel: 'Reset Activations',
								onConfirm: () => {
									updateRow( row.id, { linkedEntity: { ...entity, domainsUsed: 0, domainCount: `0/${ entity.domainLimit }` } } );
									showToast( `Activations reset for ${ row.customer }`, 'success' );
									closeDialog();
								},
							} ) }
						>
							Reset Activations
						</OutlinedButton>
					</div>
				</Card>
			);

		case 'saas':
			return (
				<Card className="p-5 flex flex-col gap-3">
					<div className="flex items-center justify-between text-sm" style={ rowStyle }>
						<span style={ { color: M3.onSurfaceVariant } }>Account</span>
						<span style={ { color: M3.onSurface } }>{ entity.saasAccountName }</span>
					</div>
					<div>
						<div className="flex items-center justify-between text-sm mb-1" style={ rowStyle }>
							<span style={ { color: M3.onSurfaceVariant } }>Seats</span>
							<span style={ { color: M3.onSurface } }>{ entity.seatUsage } used</span>
						</div>
						<div className="w-full h-2 rounded-full" style={ { backgroundColor: M3.surfaceContainerHigh } }>
							<div
								className="h-2 rounded-full"
								style={ { width: `${ Math.min( 100, ( entity.seatsUsed / Math.max( 1, entity.seatsTotal ) ) * 100 ) }%`, backgroundColor: M3.secondary } }
							/>
						</div>
					</div>
					<NotBuiltNotice>
						User list &amp; provisioning log aren't built in this plan yet — they need real data from the
						SaaS module, which doesn't exist in this repo. Showing the seat summary only.
					</NotBuiltNotice>
					<div className="flex gap-2 mt-1">
						<OutlinedButton
							small
							onClick={ () => openDialog( {
								danger: false, icon: PauseCircle, title: 'Suspend SaaS Account?',
								body: <span>Suspend { entity.saasAccountName }'s account access?</span>,
								confirmLabel: 'Suspend Account',
								onConfirm: () => { showToast( `Account suspended for ${ row.customer }`, 'warning' ); closeDialog(); },
							} ) }
						>
							Suspend Account
						</OutlinedButton>
					</div>
				</Card>
			);

		case 'membership':
			return (
				<Card className="p-5 flex flex-col gap-3">
					<div className="flex items-center justify-between text-sm" style={ rowStyle }>
						<span style={ { color: M3.onSurfaceVariant } }>Tier</span>
						<span style={ { color: M3.onSurface } }>{ entity.membershipTier }</span>
					</div>
					<div className="flex items-center justify-between text-sm" style={ rowStyle }>
						<span style={ { color: M3.onSurfaceVariant } }>Assigned role</span>
						<span style={ { color: M3.onSurface, fontFamily: 'Roboto Mono, monospace' } }>{ entity.assignedRole }</span>
					</div>
					<div className="flex items-center justify-between text-sm" style={ rowStyle }>
						<span style={ { color: M3.onSurfaceVariant } }>Content access</span>
						<span style={ { color: M3.onSurface } }>{ entity.contentAccessLabel }</span>
					</div>
					<div className="flex items-center justify-between text-sm" style={ rowStyle }>
						<span style={ { color: M3.onSurfaceVariant } }>Grace period</span>
						<span style={ { color: M3.onSurface } }>{ entity.graceEndsAt ?? '— (not currently in grace)' }</span>
					</div>
					<NotBuiltNotice>Tier change history isn't tracked in this plan yet — would need a new log data type.</NotBuiltNotice>
					<div className="flex gap-2 mt-1">
						<OutlinedButton small onClick={ () => showToast( 'Tier picker — reuse the Change Plan pattern once tiers are product-configurable', 'info' ) }>
							Change Tier
						</OutlinedButton>
						<OutlinedButton
							small
							onClick={ () => openDialog( {
								danger: false, icon: Calendar, title: 'Extend Grace Period?',
								body: <span>Extend { row.customer }'s access grace period by 7 days?</span>,
								confirmLabel: 'Extend Grace Period',
								onConfirm: () => {
									updateRow( row.id, { linkedEntity: { ...entity, graceEndsAt: addBillingInterval( entity.graceEndsAt, { interval: 7, period: 'day', displayLabel: '' } ) } } );
									showToast( `Grace period extended for ${ row.customer }`, 'success' );
									closeDialog();
								},
							} ) }
						>
							Extend Grace Period (+7d)
						</OutlinedButton>
					</div>
				</Card>
			);

		case 'download':
			return (
				<Card className="p-5 flex flex-col gap-3">
					<div>
						<div className="flex items-center justify-between text-sm mb-1" style={ rowStyle }>
							<span style={ { color: M3.onSurfaceVariant } }>This cycle</span>
							<span style={ { color: M3.onSurface } }>{ entity.downloadsThisCycle } / { entity.downloadLimit ?? '∞' } downloads</span>
						</div>
						{ entity.downloadLimit && (
							<div className="w-full h-2 rounded-full" style={ { backgroundColor: M3.surfaceContainerHigh } }>
								<div
									className="h-2 rounded-full"
									style={ { width: `${ Math.min( 100, ( entity.downloadsThisCycle / entity.downloadLimit ) * 100 ) }%`, backgroundColor: M3.success } }
								/>
							</div>
						) }
					</div>
					<div className="flex items-center justify-between text-sm" style={ rowStyle }>
						<span style={ { color: M3.onSurfaceVariant } }>Next drip</span>
						<span style={ { color: M3.onSurface } }>{ entity.nextDripDate ?? '—' }</span>
					</div>
					<NotBuiltNotice>Per-download log (file, date, IP) isn't built — would need a new data type this plan didn't define.</NotBuiltNotice>
					<div className="flex gap-2 mt-1">
						<OutlinedButton
							small
							onClick={ () => openDialog( {
								danger: false, icon: RotateCcw, title: 'Reset Download Count?',
								body: <span>Reset { row.customer }'s download counter to 0 for this cycle?</span>,
								confirmLabel: 'Reset Count',
								onConfirm: () => {
									updateRow( row.id, { linkedEntity: { ...entity, downloadsThisCycle: 0 } } );
									showToast( `Download count reset for ${ row.customer }`, 'success' );
									closeDialog();
								},
							} ) }
						>
							Reset Download Count
						</OutlinedButton>
						<OutlinedButton small onClick={ () => showToast( 'Drip schedule editor — deferred, no spec exists yet for this UI', 'info' ) }>
							Manage Drip Schedule
						</OutlinedButton>
					</div>
				</Card>
			);

		case 'course':
			return (
				<Card className="p-5 flex flex-col gap-3">
					<div className="text-sm" style={ rowStyle }>
						<span style={ { color: M3.onSurfaceVariant } }>Enrolled: </span>
						<span style={ { color: M3.onSurface } }>{ entity.enrolledCourses.join( ', ' ) }</span>
					</div>
					<div className="flex items-center justify-between text-sm" style={ rowStyle }>
						<span style={ { color: M3.onSurfaceVariant } }>LMS enrollment</span>
						<span style={ { color: M3.onSurface, fontFamily: 'Roboto Mono, monospace' } }>{ entity.lmsEnrollmentId }</span>
					</div>
					<div className="flex items-center justify-between text-sm" style={ rowStyle }>
						<span style={ { color: M3.onSurfaceVariant } }>Access until</span>
						<span style={ { color: M3.onSurface } }>{ entity.courseAccessUntil ?? '—' }</span>
					</div>
					{ entity.progressPct !== null && (
						<div>
							<div className="flex items-center justify-between text-sm mb-1" style={ rowStyle }>
								<span style={ { color: M3.onSurfaceVariant } }>Progress</span>
								<span style={ { color: M3.onSurface } }>{ entity.progressPct }%</span>
							</div>
							<div className="w-full h-2 rounded-full" style={ { backgroundColor: M3.surfaceContainerHigh } }>
								<div className="h-2 rounded-full" style={ { width: `${ entity.progressPct }%`, backgroundColor: M3.warning } } />
							</div>
						</div>
					) }
					<div className="flex gap-2 mt-1">
						<OutlinedButton
							small
							onClick={ () => openDialog( {
								danger: false, icon: Calendar, title: 'Extend Course Access?',
								body: <span>Extend { row.customer }'s course access by 30 days?</span>,
								confirmLabel: 'Extend Access',
								onConfirm: () => {
									updateRow( row.id, { linkedEntity: { ...entity, courseAccessUntil: addBillingInterval( entity.courseAccessUntil, { interval: 30, period: 'day', displayLabel: '' } ) } } );
									showToast( `Course access extended for ${ row.customer }`, 'success' );
									closeDialog();
								},
							} ) }
						>
							Extend Access (+30d)
						</OutlinedButton>
						<OutlinedButton small onClick={ () => showToast( `Enrollment email resent to ${ row.customer }`, 'success' ) }>
							Resend Enrollment Email
						</OutlinedButton>
					</div>
				</Card>
			);

		case 'service':
			return (
				<Card className="p-5 flex flex-col gap-3">
					<div className="text-sm" style={ rowStyle }>
						<span style={ { color: M3.onSurfaceVariant } }>Notes: </span>
						<span style={ { color: M3.onSurface } }>{ entity.deliverableNotes }</span>
					</div>
					<div className="flex items-center justify-between text-sm" style={ rowStyle }>
						<span style={ { color: M3.onSurfaceVariant } }>Next due</span>
						<span style={ { color: M3.onSurface } }>{ entity.nextDeliverableDue ?? '—' }</span>
					</div>
					<div className="flex items-center justify-between text-sm" style={ rowStyle }>
						<span style={ { color: M3.onSurfaceVariant } }>Last completed</span>
						<span style={ { color: M3.onSurface } }>{ entity.lastDeliverableAt ?? '—' }</span>
					</div>
					<NotBuiltNotice>Past-deliverables log isn't built — would need a new per-deliverable data type.</NotBuiltNotice>
					<div className="flex gap-2 mt-1">
						<OutlinedButton
							small
							onClick={ () => openDialog( {
								danger: false, icon: Calendar, title: 'Mark Deliverable Complete?',
								body: <span>Mark this cycle's deliverable complete for { row.customer } and advance the next-due date?</span>,
								confirmLabel: 'Mark Complete',
								onConfirm: () => {
									const today = new Date().toISOString().slice( 0, 10 );
									updateRow( row.id, { linkedEntity: { ...entity, lastDeliverableAt: today, nextDeliverableDue: addBillingInterval( entity.nextDeliverableDue, row.billing ) } } );
									showToast( `Deliverable marked complete for ${ row.customer }`, 'success' );
									closeDialog();
								},
							} ) }
						>
							Mark Complete
						</OutlinedButton>
						<OutlinedButton small onClick={ () => showToast( `Invoice sent to ${ row.customer }`, 'success' ) }>
							Send Invoice
						</OutlinedButton>
					</div>
				</Card>
			);
	}
}
