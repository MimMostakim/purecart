/**
 * LicensesPage - top-level orchestrator for the Licenses list page.
 *
 * Records, KPI stats, and pagination live in the Redux licensesSlice
 * (server-driven, same pattern as the Updates module). This file owns
 * selection, the row-action confirmation dialogs, and the bulk-revoke bar —
 * see docs/RND-frontend-license-manager.md Screen 1 for the full spec this
 * implements.
 *
 * @file
 * @since 1.0.0
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, RotateCcw, PauseCircle, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { __, sprintf, _n } from '@wordpress/i18n';
import { M3 } from '@/theme';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { getOrCreateResource } from '@/shared/suspense';
import { getAdminConfig } from '@/shared/wp';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { Toast, type ToastProps } from '@/shared/ui/Toast';
import {
	loadLicenses,
	extendLicenseThunk,
	suspendLicenseThunk,
	reinstateLicenseThunk,
	revokeLicenseThunk,
	bulkRevokeLicensesThunk,
	resetLicenseActivationsThunk,
	duplicateLicenseThunk,
	setSearch,
	setStatusFilter,
	setProductIdFilter,
	clearFilters,
	setPage,
} from '../store/licenses.slice';
import {
	selectLicenseItems,
	selectLicenseStats,
	selectLicenseFilters,
	selectLicenseStatus,
	selectLicensePage,
	selectLicenseTotal,
	selectLicenseTotalPages,
} from '../store/licenses.selectors';
import { LicensesKpiStrip } from './LicensesKpiStrip';
import { LicensesFilterBar } from './LicensesFilterBar';
import { LicensesTable } from './LicensesTable';
import { LicensesBulkBar } from './LicensesBulkBar';
import { exportLicensesCsv } from '../api';
import { licenseDetailPath } from '@/app/router';
import type { LicenseRecord } from '../types';

interface DialogState {
	open: boolean;
	danger: boolean;
	icon: React.ElementType;
	title: string;
	body: React.ReactNode;
	confirmLabel: string;
	onConfirm: () => void;
}

const EMPTY_DIALOG: DialogState = {
	open: false,
	danger: false,
	icon: Calendar,
	title: '',
	body: null,
	confirmLabel: '',
	onConfirm: () => {},
};

/**
 * Renders the Licenses list page.
 *
 * @since 1.0.0
 */
export function LicensesPage() {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();

	const items = useAppSelector( selectLicenseItems );
	const stats = useAppSelector( selectLicenseStats );
	const filters = useAppSelector( selectLicenseFilters );
	const status = useAppSelector( selectLicenseStatus );
	const page = useAppSelector( selectLicensePage );
	const total = useAppSelector( selectLicenseTotal );
	const totalPages = useAppSelector( selectLicenseTotalPages );

	const [ selected, setSelected ] = useState< number[] >( [] );
	const [ toast, setToast ] = useState< ToastProps >( { message: '', type: 'success', visible: false } );
	const [ dialog, setDialog ] = useState< DialogState >( EMPTY_DIALOG );
	const [ extendDays, setExtendDays ] = useState( 30 );

	const { resource: suspenseResource, created: suspenseTriggeredFetch } = getOrCreateResource(
		'licenses',
		() => dispatch( loadLicenses( {} ) ).unwrap()
	);
	suspenseResource.read();

	useEffect( () => {
		if ( ! suspenseTriggeredFetch ) {
			dispatch( loadLicenses( {} ) );
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ dispatch ] );

	const showToast = ( message: string, type: ToastProps[ 'type' ] = 'success' ) => {
		setToast( { message, type, visible: true } );
		setTimeout( () => setToast( ( t ) => ( { ...t, visible: false } ) ), 3000 );
	};

	const closeDialog = () => setDialog( EMPTY_DIALOG );

	const productMap = new Map< number, string >();
	items.forEach( ( item ) => {
		if ( item.productId && ! productMap.has( item.productId ) ) {
			productMap.set( item.productId, item.productName || `Product #${ item.productId }` );
		}
	} );
	const productOptions = Array.from( productMap.entries() ).map( ( [ id, name ] ) => ( { id, name } ) );

	const toggleSelect = ( id: number ) =>
		setSelected( ( prev ) => ( prev.includes( id ) ? prev.filter( ( x ) => x !== id ) : [ ...prev, id ] ) );

	const viewDetail = ( license: LicenseRecord ) => navigate( licenseDetailPath( license.id ) );

	const handleCopyKey = ( license: LicenseRecord ) => {
		navigator.clipboard.writeText( license.licenseKey );
		showToast( __( 'License key copied to clipboard', 'purecart' ), 'success' );
	};

	const handleDuplicate = async ( license: LicenseRecord ) => {
		const action = await dispatch( duplicateLicenseThunk( license.id ) );
		if ( duplicateLicenseThunk.fulfilled.match( action ) ) {
			showToast(
				/* translators: %s: first 16 characters of the new license key */
				sprintf( __( 'Duplicated — new key %s…', 'purecart' ), action.payload.licenseKey.slice( 0, 16 ) ),
				'success'
			);
		} else {
			showToast( ( action.payload as string ) || __( 'Could not duplicate this license', 'purecart' ), 'error' );
		}
	};

	const handleExtendExpiry = ( license: LicenseRecord ) => {
		setExtendDays( 30 );
		setDialog( {
			open: true,
			danger: false,
			icon: Calendar,
			title: __( 'Extend Expiry', 'purecart' ),
			body: (
				<div className="flex flex-col items-center gap-2">
					<code style={ { fontFamily: 'Roboto Mono, monospace' } }>{ license.licenseKey }</code>
					<span>{ __( 'Push this license’s expiry forward by', 'purecart' ) }</span>
					<input
						type="number"
						min={ 1 }
						defaultValue={ 30 }
						onChange={ ( e ) => setExtendDays( Math.max( 1, parseInt( e.target.value, 10 ) || 1 ) ) }
						style={ {
							width: 80, padding: '6px 10px', borderRadius: 8, border: `1px solid ${ M3.outlineVariant }`,
							textAlign: 'center', fontFamily: 'Roboto Mono, monospace',
						} }
					/>
					<span>{ __( 'days', 'purecart' ) }</span>
				</div>
			),
			confirmLabel: __( 'Extend', 'purecart' ),
			onConfirm: async () => {
				const action = await dispatch( extendLicenseThunk( { id: license.id, days: extendDays } ) );
				if ( extendLicenseThunk.fulfilled.match( action ) ) {
					showToast( __( 'License expiry extended', 'purecart' ), 'success' );
				} else {
					showToast(
						( action.payload as string ) ||
							__( 'Could not extend this license (lifetime plans have no expiry)', 'purecart' ),
						'error'
					);
				}
				closeDialog();
			},
		} );
	};

	const handleResetActivations = ( license: LicenseRecord ) => {
		setDialog( {
			open: true,
			danger: false,
			icon: RotateCcw,
			title: __( 'Reset Activations?', 'purecart' ),
			body: sprintf(
				/* translators: %s: license key */
				__( 'Clear every activated site on %s? The customer will need to re-activate each domain.', 'purecart' ),
				license.licenseKey
			),
			confirmLabel: __( 'Reset Activations', 'purecart' ),
			onConfirm: async () => {
				await dispatch( resetLicenseActivationsThunk( license.id ) );
				showToast( __( 'Activations reset', 'purecart' ), 'success' );
				closeDialog();
			},
		} );
	};

	const handleSuspend = ( license: LicenseRecord ) => {
		setDialog( {
			open: true,
			danger: false,
			icon: PauseCircle,
			title: __( 'Suspend License?', 'purecart' ),
			body: sprintf(
				/* translators: %s: license key */
				__( "Suspend %s? Updates and activation checks will stop working until it's reinstated.", 'purecart' ),
				license.licenseKey
			),
			confirmLabel: __( 'Suspend', 'purecart' ),
			onConfirm: async () => {
				await dispatch( suspendLicenseThunk( license.id ) );
				showToast(
					/* translators: %s: license key */
					sprintf( __( '%s suspended', 'purecart' ), license.licenseKey ),
					'warning'
				);
				closeDialog();
			},
		} );
	};

	const handleReinstate = ( license: LicenseRecord ) => {
		setDialog( {
			open: true,
			danger: false,
			icon: CheckCircle,
			title: __( 'Reinstate License?', 'purecart' ),
			body: sprintf(
				/* translators: %s: license key */
				__( 'Reinstate %s to active status?', 'purecart' ),
				license.licenseKey
			),
			confirmLabel: __( 'Reinstate', 'purecart' ),
			onConfirm: async () => {
				await dispatch( reinstateLicenseThunk( license.id ) );
				showToast(
					/* translators: %s: license key */
					sprintf( __( '%s reinstated', 'purecart' ), license.licenseKey ),
					'success'
				);
				closeDialog();
			},
		} );
	};

	const handleRevoke = ( license: LicenseRecord ) => {
		setDialog( {
			open: true,
			danger: true,
			icon: XCircle,
			title: __( 'Revoke License?', 'purecart' ),
			body: (
				<>
					{ __( 'Permanently revoke', 'purecart' ) }{ ' ' }
					<code style={ { fontFamily: 'Roboto Mono, monospace' } }>{ license.licenseKey }</code>?
					{ ' ' }{ __( 'This immediately stops all updates and activation checks. This cannot be undone.', 'purecart' ) }
				</>
			),
			confirmLabel: __( 'Revoke License', 'purecart' ),
			onConfirm: async () => {
				await dispatch( revokeLicenseThunk( license.id ) );
				showToast(
					/* translators: %s: license key */
					sprintf( __( '%s revoked', 'purecart' ), license.licenseKey ),
					'error'
				);
				closeDialog();
			},
		} );
	};

	const handleBulkRevoke = () => {
		setDialog( {
			open: true,
			danger: true,
			icon: Trash2,
			/* translators: %d: number of selected licenses */
			title: sprintf( __( 'Revoke %d Licenses?', 'purecart' ), selected.length ),
			body: sprintf(
				/* translators: %d: number of selected licenses */
				__( 'Permanently revoke all %d selected licenses. This cannot be undone.', 'purecart' ),
				selected.length
			),
			/* translators: %d: number of selected licenses */
			confirmLabel: sprintf( __( 'Revoke %d Selected', 'purecart' ), selected.length ),
			onConfirm: async () => {
				await dispatch( bulkRevokeLicensesThunk( selected ) );
				showToast(
					sprintf(
						/* translators: %d: number of licenses revoked */
						_n( '%d license revoked', '%d licenses revoked', selected.length, 'purecart' ),
						selected.length
					),
					'error'
				);
				setSelected( [] );
				closeDialog();
			},
		} );
	};

	return (
		<div className="flex flex-col gap-5">
			<div className="flex items-center justify-between">
				<div>
					<h1 style={ { margin: 0, fontSize: '24px', fontWeight: 700, color: M3.onSurface } }>{ __( 'Licenses', 'purecart' ) }</h1>
					<p style={ { margin: '4px 0 0', fontSize: '13px', color: M3.onSurfaceVariant } }>
						{ __( 'Generate, activate, revoke, and track license keys across all your products.', 'purecart' ) }
					</p>
				</div>
			</div>

			<LicensesKpiStrip stats={ stats } />

			<LicensesFilterBar
				search={ filters.search }
				onSearchChange={ ( v ) => dispatch( setSearch( v ) ) }
				filterStatus={ filters.status }
				onFilterStatusChange={ ( v ) => dispatch( setStatusFilter( v ) ) }
				filterProduct={
					filters.productId === 'All' ? 'All' : ( productMap.get( filters.productId as number ) ?? 'All' )
				}
				onFilterProductChange={ ( v ) => {
					const match = productOptions.find( ( p ) => p.name === v );
					dispatch( setProductIdFilter( match ? match.id : 'All' ) );
				} }
				productOptions={ productOptions }
				onClearAll={ () => dispatch( clearFilters() ) }
				onExportCsv={ async () => {
					try {
						await exportLicensesCsv();
						showToast( __( 'Licenses exported as CSV', 'purecart' ), 'success' );
					} catch ( err: any ) {
						showToast( err?.message || __( 'Failed to export licenses CSV', 'purecart' ), 'error' );
					}
				} }
			/>

			<LicensesTable
				items={ items }
				loading={ status === 'loading' }
				selected={ selected }
				onToggleSelect={ toggleSelect }
				onToggleSelectAll={ ( checked ) => setSelected( checked ? items.map( ( i ) => i.id ) : [] ) }
				currentPage={ page }
				totalPages={ totalPages }
				totalCount={ total }
				onPageChange={ ( p ) => dispatch( setPage( p ) ) }
				onViewDetail={ viewDetail }
				onViewCustomer={ ( license ) => {
					const adminUrl = getAdminConfig().adminUrl;
					if ( adminUrl && license.userId ) {
						window.open( `${ adminUrl }user-edit.php?user_id=${ license.userId }`, '_blank' );
					} else {
						showToast( __( 'No linked WordPress user for this license', 'purecart' ), 'info' );
					}
				} }
				onCopyKey={ handleCopyKey }
				onDuplicate={ handleDuplicate }
				onExtendExpiry={ handleExtendExpiry }
				onResetActivations={ handleResetActivations }
				onSendReminder={ () =>
					showToast(
						__( 'Reminder emails are not available yet — no email endpoint exists for this action', 'purecart' ),
						'info'
					)
				}
				onSuspend={ handleSuspend }
				onReinstate={ handleReinstate }
				onRevoke={ handleRevoke }
			/>

			<LicensesBulkBar selectedCount={ selected.length } onClear={ () => setSelected( [] ) } onRevokeSelected={ handleBulkRevoke } />

			<ConfirmDialog
				open={ dialog.open }
				danger={ dialog.danger }
				icon={ dialog.icon }
				title={ dialog.title }
				body={ dialog.body }
				confirmLabel={ dialog.confirmLabel }
				onConfirm={ dialog.onConfirm }
				onCancel={ closeDialog }
			/>

			<Toast { ...toast } />
		</div>
	);
}
