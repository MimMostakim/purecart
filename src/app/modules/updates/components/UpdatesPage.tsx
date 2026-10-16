import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, BarChart2, RefreshCw, Trash2 } from 'lucide-react';
import { __ } from '@wordpress/i18n';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { getOrCreateResource } from '@/shared/suspense';
import {
	loadVersions,
	uploadRelease,
	promoteVersion,
	toggleVersionStatus,
	removeVersion,
	executeRollback,
	fetchTestUrl,
	setSearch,
	setChannelFilter,
	setPlatformFilter,
	setProductTypeFilter,
	setStatusFilter,
	clearFilters,
	openNewReleaseDrawer,
	closeDrawer,
} from '../store/updates.slice';
import {
	selectUpdateItems,
	selectUpdateStats,
	selectUpdateFilters,
	selectUpdateStatus,
	selectUpdateUploading,
	selectUpdateDrawerOpen,
} from '../store/updates.selectors';
import { UpdatesKpiStrip } from './UpdatesKpiStrip';
import { UpdatesFilterBar } from './UpdatesFilterBar';
import { UpdatesTable } from './UpdatesTable';
import { NewReleaseDrawer } from './NewReleaseDrawer';
import { ChangelogModal } from './ChangelogModal';
import { RollbackConfirmDialog } from './RollbackConfirmDialog';
import { M3 } from '@/theme';
import { fetchProducts } from '../api';
import type { ProductVersion, UpdateChannel, NewReleasePayload } from '../types';

export function UpdatesPage() {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();

	const items = useAppSelector( selectUpdateItems );
	const stats = useAppSelector( selectUpdateStats );
	const filters = useAppSelector( selectUpdateFilters );
	const status = useAppSelector( selectUpdateStatus );
	const uploading = useAppSelector( selectUpdateUploading );
	const isDrawerOpen = useAppSelector( selectUpdateDrawerOpen );

	const [ selectedChangelog, setSelectedChangelog ] = useState<ProductVersion | null>( null );
	const [ rollbackTarget, setRollbackTarget ] = useState<ProductVersion | null>( null );
	const [ deleteTargetId, setDeleteTargetId ] = useState<number | null>( null );
	const [ storeProducts, setStoreProducts ] = useState<Array<{ id: number; name: string }>>( [] );

	// Suspends only for the true first load this page session ever sees (a
	// module-level cache, not component state — see shared/suspense/
	// resourceCache.ts for why) — later remounts fall through to the effect
	// below, which keeps this page's existing "refetch every time you visit"
	// behavior via its own dispatch. The `created` check in that effect
	// exists solely to avoid double-dispatching loadVersions() on the one
	// render that just triggered the Suspense fetch.
	const { resource: suspenseResource, created: suspenseTriggeredFetch } = getOrCreateResource(
		'updates',
		() => dispatch( loadVersions( {} ) ).unwrap()
	);
	suspenseResource.read();

	useEffect( () => {
		if ( ! suspenseTriggeredFetch ) {
			dispatch( loadVersions( {} ) );
		}
		fetchProducts().then( ( prods ) => {
			if ( prods && prods.length > 0 ) {
				setStoreProducts( prods.map( ( p ) => ( { id: p.id, name: p.name } ) ) );
			}
		} ).catch( () => {} );
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ dispatch ] );

	// Product dropdown options derived from store products or packages
	const productMap = new Map<number, string>();
	storeProducts.forEach( ( p ) => productMap.set( p.id, p.name ) );
	items.forEach( ( item ) => {
		if ( item.productId && ! productMap.has( item.productId ) ) {
			productMap.set( item.productId, item.productName || `Product #${ item.productId }` );
		}
	} );

	const productOptions = Array.from( productMap.entries() ).map( ( [ id, name ] ) => ( { id, name } ) );
	if ( productOptions.length === 0 ) {
		productOptions.push( { id: 1, name: 'General Product' } );
	}


	const handleCreateRelease = async ( payload: NewReleasePayload ) => {
		const action = await dispatch( uploadRelease( payload ) );
		if ( uploadRelease.rejected.match( action ) ) {
			throw new Error( ( action.payload as string ) || 'Package upload failed' );
		}
	};


	const handlePromote = ( versionId: number, channel: UpdateChannel ) => {
		dispatch( promoteVersion( { versionId, channel } ) );
	};

	const handleToggleStatus = ( versionId: number, versionStatus: 'active' | 'archived' ) => {
		dispatch( toggleVersionStatus( { versionId, status: versionStatus } ) );
	};

	const handleDelete = ( versionId: number ) => {
		setDeleteTargetId( versionId );
	};

	const handleConfirmRollback = async ( reason: string ) => {
		if ( ! rollbackTarget ) return;
		await dispatch(
			executeRollback( {
				productId: rollbackTarget.productId,
				version: rollbackTarget.version,
				reason,
			} )
		);
		setRollbackTarget( null );
	};

	const handleGenerateTestUrl = async ( versionId: number ): Promise<string> => {
		const result = await dispatch( fetchTestUrl( versionId ) ).unwrap();
		return result;
	};

	return (
		<div style={ { padding: '24px', maxWidth: '1400px', margin: '0 auto' } }>
			{ /* Header */ }
			<div
				style={ {
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					flexWrap: 'wrap',
					gap: '16px',
					marginBottom: '24px',
				} }
			>
				<div>
					<h1 style={ { margin: 0, fontSize: '24px', fontWeight: 700, color: M3.onSurface } }>
						Software Update Manager
					</h1>
					<p style={ { margin: '4px 0 0', fontSize: '13px', color: M3.onSurfaceVariant } }>
						Distribute updates to WordPress sites and software installations with automatic 1-click delivery
					</p>
				</div>

				<div style={ { display: 'flex', alignItems: 'center', gap: '10px' } }>
					<button
						onClick={ () => dispatch( loadVersions() ) }
						title="Refresh package data"
						style={ {
							display: 'inline-flex',
							alignItems: 'center',
							gap: '6px',
							padding: '8px 12px',
							borderRadius: '8px',
							border: `1px solid ${ M3.outlineVariant }`,
							backgroundColor: M3.surface,
							color: M3.onSurface,
							fontSize: '13px',
							fontWeight: 500,
							cursor: 'pointer',
						} }
					>
						<RefreshCw size={ 15 } />
						<span>Refresh</span>
					</button>

					<button
						onClick={ () => navigate( '/updates/analytics' ) }
						style={ {
							display: 'inline-flex',
							alignItems: 'center',
							gap: '6px',
							padding: '8px 14px',
							borderRadius: '8px',
							border: `1px solid ${ M3.outlineVariant }`,
							backgroundColor: M3.surface,
							color: M3.onSurface,
							fontSize: '13px',
							fontWeight: 500,
							cursor: 'pointer',
						} }
					>
						<BarChart2 size={ 16 } />
						<span>Adoption Analytics</span>
					</button>

					<button
						onClick={ () => dispatch( openNewReleaseDrawer() ) }
						style={ {
							display: 'inline-flex',
							alignItems: 'center',
							gap: '6px',
							padding: '8px 16px',
							borderRadius: '8px',
							border: 'none',
							backgroundColor: M3.primary,
							color: M3.onPrimary,
							fontSize: '13px',
							fontWeight: 600,
							cursor: 'pointer',
						} }
					>
						<Plus size={ 16 } />
						<span>+ New Release</span>
					</button>
				</div>
			</div>

			{ /* KPI Metric Strip */ }
			<UpdatesKpiStrip stats={ stats } />

			{ /* New Release Form Drawer */ }
			<NewReleaseDrawer
				isOpen={ isDrawerOpen }
				onClose={ () => dispatch( closeDrawer() ) }
				onSubmit={ handleCreateRelease }
				uploading={ uploading }
				productOptions={ productOptions }
			/>

			{ /* Filter Bar */ }
			<UpdatesFilterBar
				search={ filters.search }
				onSearchChange={ ( v ) => dispatch( setSearch( v ) ) }
				channel={ filters.channel }
				onChannelChange={ ( v ) => dispatch( setChannelFilter( v ) ) }
				platform={ filters.platform }
				onPlatformChange={ ( v ) => dispatch( setPlatformFilter( v ) ) }
				productType={ filters.productType }
				onProductTypeChange={ ( v ) => dispatch( setProductTypeFilter( v ) ) }
				status={ filters.status }
				onStatusChange={ ( v ) => dispatch( setStatusFilter( v ) ) }
				onClearAll={ () => dispatch( clearFilters() ) }
			/>

			{ /* Packages Table */ }
			<UpdatesTable
				items={ items }
				loading={ status === 'loading' }
				onViewChangelog={ ( ver ) => setSelectedChangelog( ver ) }
				onPromote={ handlePromote }
				onToggleStatus={ handleToggleStatus }
				onRollback={ ( ver ) => setRollbackTarget( ver ) }
				onDelete={ handleDelete }
				onGenerateTestUrl={ handleGenerateTestUrl }
			/>

			{ /* Changelog Modal */ }
			{ selectedChangelog && (
				<ChangelogModal
					isOpen={ Boolean( selectedChangelog ) }
					onClose={ () => setSelectedChangelog( null ) }
					productName={ selectedChangelog.productName }
					version={ selectedChangelog.version }
					changelog={ selectedChangelog.changelog }
				/>
			) }

			{ /* Rollback Confirmation Modal */ }
			{ rollbackTarget && (
				<RollbackConfirmDialog
					isOpen={ Boolean( rollbackTarget ) }
					onClose={ () => setRollbackTarget( null ) }
					onConfirm={ handleConfirmRollback }
					productName={ rollbackTarget.productName }
					fromVersion={ rollbackTarget.version }
					toVersion="previous safe build"
				/>
			) }

			<ConfirmDialog
				open={ deleteTargetId !== null }
				danger
				icon={ Trash2 }
				title={ __( 'Delete Package?', 'purecart' ) }
				body={ __( 'Permanently delete this software package and its file? This cannot be undone.', 'purecart' ) }
				confirmLabel={ __( 'Delete Package', 'purecart' ) }
				onConfirm={ () => {
					if ( deleteTargetId !== null ) {
						dispatch( removeVersion( deleteTargetId ) );
					}
					setDeleteTargetId( null );
				} }
				onCancel={ () => setDeleteTargetId( null ) }
			/>
		</div>
	);
}
