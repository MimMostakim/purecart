/**
 * DownloadsPage - top-level orchestrator for the Downloads log page.
 *
 * Log entries, KPI stats, and pagination live in the Redux downloadsSlice
 * (server-driven, same pattern as the Licenses module). This file owns
 * selection, the row-action confirmation dialogs, and the bulk-revoke bar —
 * see docs/RND-frontend-secure-downloads.md Screen 1 for the full spec this
 * implements.
 *
 * @file
 * @since 1.0.0
 */
import { useEffect, useState } from 'react';
import { RotateCcw, XCircle, Trash2 } from 'lucide-react';
import { __, sprintf, _n } from '@wordpress/i18n';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { getOrCreateResource } from '@/shared/suspense';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { Toast, type ToastProps } from '@/shared/ui/Toast';
import { M3 } from '@/theme';
import {
	loadDownloadLogs,
	revokeDownloadTokenThunk,
	regenerateDownloadTokenThunk,
	bulkRevokeDownloadTokensThunk,
	setSearch,
	setStatusFilter,
	setProductIdFilter,
	clearFilters,
	setPage,
} from '../store/downloads.slice';
import {
	selectDownloadItems,
	selectDownloadStats,
	selectDownloadFilters,
	selectDownloadStatus,
	selectDownloadPage,
	selectDownloadTotal,
	selectDownloadTotalPages,
} from '../store/downloads.selectors';
import { DownloadsKpiStrip } from './DownloadsKpiStrip';
import { DownloadsFilterBar } from './DownloadsFilterBar';
import { DownloadsTable } from './DownloadsTable';
import { DownloadsBulkBar } from './DownloadsBulkBar';
import { exportDownloadLogCsv } from '../api';
import type { DownloadLogEntry } from '../types';

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
	icon: RotateCcw,
	title: '',
	body: null,
	confirmLabel: '',
	onConfirm: () => {},
};

/**
 * Renders the Downloads log page.
 *
 * @since 1.0.0
 */
export function DownloadsPage() {
	const dispatch = useAppDispatch();

	const items = useAppSelector( selectDownloadItems );
	const stats = useAppSelector( selectDownloadStats );
	const filters = useAppSelector( selectDownloadFilters );
	const status = useAppSelector( selectDownloadStatus );
	const page = useAppSelector( selectDownloadPage );
	const total = useAppSelector( selectDownloadTotal );
	const totalPages = useAppSelector( selectDownloadTotalPages );

	const [ selected, setSelected ] = useState< number[] >( [] );
	const [ toast, setToast ] = useState< ToastProps >( { message: '', type: 'success', visible: false } );
	const [ dialog, setDialog ] = useState< DialogState >( EMPTY_DIALOG );

	const { resource: suspenseResource, created: suspenseTriggeredFetch } = getOrCreateResource(
		'downloads',
		() => dispatch( loadDownloadLogs( {} ) ).unwrap()
	);
	suspenseResource.read();

	useEffect( () => {
		if ( ! suspenseTriggeredFetch ) {
			dispatch( loadDownloadLogs( {} ) );
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
		if ( ! productMap.has( item.productId ) ) {
			productMap.set( item.productId, item.productName );
		}
	} );
	const productOptions = Array.from( productMap.entries() ).map( ( [ id, name ] ) => ( { id, name } ) );

	const toggleSelect = ( id: number ) =>
		setSelected( ( prev ) => ( prev.includes( id ) ? prev.filter( ( x ) => x !== id ) : [ ...prev, id ] ) );

	const handleRegenerateToken = ( entry: DownloadLogEntry ) => {
		setDialog( {
			open: true,
			danger: false,
			icon: RotateCcw,
			title: __( 'Regenerate Download Token?', 'purecart' ),
			body: __( "This invalidates the current token. The customer's existing download link will stop working and a fresh one is issued.", 'purecart' ),
			confirmLabel: __( 'Regenerate', 'purecart' ),
			onConfirm: async () => {
				const action = await dispatch( regenerateDownloadTokenThunk( entry.downloadId ) );
				if ( regenerateDownloadTokenThunk.fulfilled.match( action ) ) {
					showToast( __( 'Download token regenerated', 'purecart' ), 'success' );
				} else {
					showToast( ( action.payload as string ) || __( 'Could not regenerate this token', 'purecart' ), 'error' );
				}
				closeDialog();
			},
		} );
	};

	const handleRevokeToken = ( entry: DownloadLogEntry ) => {
		setDialog( {
			open: true,
			danger: true,
			icon: XCircle,
			title: __( 'Revoke Download Token?', 'purecart' ),
			body: __( 'Permanently revoke this download token? The customer will no longer be able to use their download link.', 'purecart' ),
			confirmLabel: __( 'Revoke Token', 'purecart' ),
			onConfirm: async () => {
				await dispatch( revokeDownloadTokenThunk( entry.downloadId ) );
				showToast( __( 'Download token revoked', 'purecart' ), 'error' );
				closeDialog();
			},
		} );
	};

	const handleBulkRevoke = () => {
		setDialog( {
			open: true,
			danger: true,
			icon: Trash2,
			/* translators: %d: number of selected download tokens */
			title: sprintf( __( 'Revoke %d Tokens?', 'purecart' ), selected.length ),
			body: sprintf(
				/* translators: %d: number of selected download tokens */
				__( 'Permanently revoke all %d selected download tokens. This cannot be undone.', 'purecart' ),
				selected.length
			),
			/* translators: %d: number of selected download tokens */
			confirmLabel: sprintf( __( 'Revoke %d Selected', 'purecart' ), selected.length ),
			onConfirm: async () => {
				await dispatch( bulkRevokeDownloadTokensThunk( selected ) );
				showToast(
					sprintf(
						/* translators: %d: number of tokens revoked */
						_n( '%d token revoked', '%d tokens revoked', selected.length, 'purecart' ),
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
					<h1 style={ { margin: 0, fontSize: '24px', fontWeight: 700, color: M3.onSurface } }>{ __( 'Secure Downloads', 'purecart' ) }</h1>
					<p style={ { margin: '4px 0 0', fontSize: '13px', color: M3.onSurfaceVariant } }>
						{ __( 'Time-limited signed tokens, download logs, and per-order access control.', 'purecart' ) }
					</p>
				</div>
			</div>

			<DownloadsKpiStrip stats={ stats } />

			<DownloadsFilterBar
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
						await exportDownloadLogCsv();
						showToast( __( 'Download log exported as CSV', 'purecart' ), 'success' );
					} catch ( err: any ) {
						showToast( err?.message || __( 'Failed to export download log CSV', 'purecart' ), 'error' );
					}
				} }
			/>

			<DownloadsTable
				items={ items }
				loading={ status === 'loading' }
				selected={ selected }
				onToggleSelect={ toggleSelect }
				onToggleSelectAll={ ( checked ) => setSelected( checked ? items.map( ( i ) => i.downloadId ) : [] ) }
				currentPage={ page }
				totalPages={ totalPages }
				totalCount={ total }
				onPageChange={ ( p ) => dispatch( setPage( p ) ) }
				onViewCustomer={ ( entry ) => {
					const adminUrl = window.purecartAdmin?.adminUrl;
					if ( adminUrl && entry.customerEmail ) {
						window.open( `${ adminUrl }users.php?s=${ encodeURIComponent( entry.customerEmail ) }`, '_blank' );
					} else {
						showToast( __( 'No customer email available for this entry', 'purecart' ), 'info' );
					}
				} }
				onRegenerateToken={ handleRegenerateToken }
				onRevokeToken={ handleRevokeToken }
			/>

			<DownloadsBulkBar selectedCount={ selected.length } onClear={ () => setSelected( [] ) } onRevokeSelected={ handleBulkRevoke } />

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
