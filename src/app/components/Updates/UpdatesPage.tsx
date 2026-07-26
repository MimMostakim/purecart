import { useState } from 'react';
import {
	Edit3,
	FileText,
	Download,
	Copy,
	BarChart2,
	Zap,
	CheckCircle,
	RotateCcw,
	XCircle,
	Trash2,
	Package,
	Download as DownloadIcon,
} from 'lucide-react';
import {
	M3,
	packagesData,
	PRODUCTS_LIST,
	RELEASE_TYPES,
	CHANNELS,
	releaseHistoryData,
} from '../../utils/static-data';
import {
	KpiCard,
	FilledButton,
	Card,
	IconButton,
	TextButton,
	TonalButton,
	ActionDropdown,
	SectionTitle,
	OutlinedButton,
	ConfirmDialog,
	Toast,
} from '../ui';
import type { ToastProps, ActionItem } from '../ui';

export function UpdatesPage() {
	const [ tableData, setTableData ] = useState( packagesData );
	const [ toast, setToast ] = useState< ToastProps >( {
		message: '',
		type: 'success',
		visible: false,
	} );
	const [ dialog, setDialog ] = useState< {
		open: boolean;
		title: string;
		body: React.ReactNode;
		confirmLabel: string;
		danger: boolean;
		icon?: React.ElementType;
		onConfirm: () => void;
	} >( {
		open: false,
		title: '',
		body: null,
		confirmLabel: '',
		danger: false,
		onConfirm: () => {},
	} );

	// New Release form state
	const [ newReleaseOpen, setNewReleaseOpen ] = useState( false );
	const [ nrProduct, setNrProduct ] = useState( PRODUCTS_LIST[ 0 ] );
	const [ nrVersion, setNrVersion ] = useState( '' );
	const [ nrType, setNrType ] =
		useState< ( typeof RELEASE_TYPES )[ number ] >( 'patch' );
	const [ nrChannel, setNrChannel ] =
		useState< ( typeof CHANNELS )[ number ] >( 'draft' );
	const [ nrChangelog, setNrChangelog ] = useState( '' );
	const [ nrFileReady, setNrFileReady ] = useState( false );
	const [ nrDragOver, setNrDragOver ] = useState( false );

	// Edit Package panel state
	const [ editRow, setEditRow ] = useState<
		( typeof tableData )[ 0 ] | null
	>( null );
	const [ editVersion, setEditVersion ] = useState( '' );
	const [ editChangelog, setEditChangelog ] = useState( '' );
	const [ editChannel, setEditChannel ] = useState< string >( '' );

	// Changelog viewer modal
	const [ changelogRow, setChangelogRow ] = useState<
		( typeof tableData )[ 0 ] | null
	>( null );

	const showToast = (
		msg: string,
		type: ToastProps[ 'type' ] = 'success'
	) => {
		setToast( { message: msg, type, visible: true } );
		setTimeout(
			() => setToast( ( t ) => ( { ...t, visible: false } ) ),
			3000
		);
	};
	const openDialog = ( opts: typeof dialog ) => setDialog( opts );
	const closeDialog = () => setDialog( ( d ) => ( { ...d, open: false } ) );

	const updateRow = (
		id: number,
		patch: Partial< ( typeof tableData )[ 0 ] >
	) =>
		setTableData( ( rows ) =>
			rows.map( ( r ) => ( r.id === id ? { ...r, ...patch } : r ) )
		);
	const deleteRow = ( id: number ) =>
		setTableData( ( rows ) => rows.filter( ( r ) => r.id !== id ) );

	const openEdit = ( row: ( typeof tableData )[ 0 ] ) => {
		setEditRow( row );
		setEditVersion( row.current );
		setEditChangelog( row.changelog );
		setEditChannel( row.channel );
	};

	// ── Row actions ─────────────────────────────────────────────────────────────
	const rowActions = ( row: ( typeof tableData )[ 0 ] ): ActionItem[] => [
		// Info
		{
			label: 'Edit Package',
			icon: Edit3,
			onClick: () => openEdit( row ),
		},
		{
			label: 'View Changelog',
			icon: FileText,
			onClick: () => setChangelogRow( row ),
		},
		{
			label: 'Download ZIP',
			icon: Download,
			onClick: () =>
				showToast(
					`Downloading ${ row.product } ${ row.current }.zip…`,
					'info'
				),
		},
		{
			label: 'Copy Download URL',
			icon: Copy,
			onClick: () => {
				navigator.clipboard?.writeText(
					`https://cdn.example.com/${ row.slug }/${ row.current }.zip`
				);
				showToast( 'Download URL copied to clipboard', 'info' );
			},
		},
		{
			label: 'View Download Stats',
			icon: BarChart2,
			onClick: () =>
				showToast(
					`Download stats for ${ row.product } opened`,
					'info'
				),
		},

		// Workflow transitions (context-aware)
		...( row.status === 'draft'
			? [
					{
						label: 'Publish to Beta',
						icon: Zap,
						dividerBefore: true,
						onClick: () =>
							openDialog( {
								open: true,
								danger: false,
								icon: Zap,
								title: 'Publish to Beta Channel?',
								body: (
									<span>
										Move{ ' ' }
										<strong>
											{ row.product } { row.current }
										</strong>{ ' ' }
										to the beta channel? Beta customers will
										be offered this update immediately.
									</span>
								),
								confirmLabel: 'Publish to Beta',
								onConfirm: () => {
									updateRow( row.id, {
										status: 'beta',
										channel: 'beta',
									} );
									showToast(
										`${ row.product } ${ row.current } published to beta`,
										'success'
									);
									closeDialog();
								},
							} ),
					},
			  ]
			: [] ),
		...( row.status === 'beta'
			? [
					{
						label: 'Promote to Stable',
						icon: CheckCircle,
						dividerBefore: true,
						onClick: () =>
							openDialog( {
								open: true,
								danger: false,
								icon: CheckCircle,
								title: 'Promote to Stable Channel?',
								body: (
									<span>
										Push{ ' ' }
										<strong>
											{ row.product } { row.current }
										</strong>{ ' ' }
										to the stable channel? All customers on
										stable will receive this update
										automatically.
									</span>
								),
								confirmLabel: 'Promote to Stable',
								onConfirm: () => {
									updateRow( row.id, {
										status: 'live',
										channel: 'stable',
										released: new Date()
											.toISOString()
											.split( 'T' )[ 0 ],
									} );
									showToast(
										`${ row.product } ${ row.current } is now live on stable`,
										'success'
									);
									closeDialog();
								},
							} ),
					},
			  ]
			: [] ),
		...( row.status === 'beta' || row.status === 'live'
			? [
					{
						label: 'Revert to Draft',
						icon: RotateCcw,
						onClick: () =>
							openDialog( {
								open: true,
								danger: false,
								icon: RotateCcw,
								title: 'Revert to Draft?',
								body: (
									<span>
										Pull{ ' ' }
										<strong>
											{ row.product } { row.current }
										</strong>{ ' ' }
										back to draft?
										{ row.status === 'live' &&
											' Customers will immediately stop receiving this update.' }
									</span>
								),
								confirmLabel: 'Revert to Draft',
								onConfirm: () => {
									updateRow( row.id, {
										status: 'draft',
										channel: 'draft',
										released: '—',
									} );
									showToast(
										`${ row.product } ${ row.current } reverted to draft`,
										'warning'
									);
									closeDialog();
								},
							} ),
					},
			  ]
			: [] ),

		// Destructive
		{
			label: 'Rollback to Previous',
			icon: RotateCcw,
			danger: true,
			dividerBefore: true,
			disabled: ! row.previous || row.status === 'draft',
			onClick: () =>
				openDialog( {
					open: true,
					danger: true,
					icon: RotateCcw,
					title: 'Rollback Release?',
					body: (
						<span>
							Roll <strong>{ row.product }</strong> back from{ ' ' }
							<strong
								style={ {
									fontFamily: 'Roboto Mono, monospace',
								} }
							>
								{ row.current }
							</strong>{ ' ' }
							to{ ' ' }
							<strong
								style={ {
									fontFamily: 'Roboto Mono, monospace',
								} }
							>
								{ row.previous }
							</strong>
							? All customers on { row.current } will be
							downgraded on their next update check.
						</span>
					),
					confirmLabel: 'Rollback',
					onConfirm: () => {
						updateRow( row.id, {
							current: row.previous,
							previous: '—',
							downloads: 0,
							released: new Date()
								.toISOString()
								.split( 'T' )[ 0 ],
						} );
						showToast(
							`${ row.product } rolled back to ${ row.previous }`,
							'warning'
						);
						closeDialog();
					},
				} ),
		},
		{
			label: 'Unpublish Package',
			icon: XCircle,
			danger: true,
			disabled: row.status === 'draft',
			onClick: () =>
				openDialog( {
					open: true,
					danger: true,
					icon: XCircle,
					title: 'Unpublish Package?',
					body: (
						<span>
							Remove{ ' ' }
							<strong>
								{ row.product } { row.current }
							</strong>{ ' ' }
							from the update feed? Customers will no longer be
							offered this version. The package file is kept.
						</span>
					),
					confirmLabel: 'Unpublish',
					onConfirm: () => {
						updateRow( row.id, {
							status: 'draft',
							channel: 'draft',
						} );
						showToast(
							`${ row.product } ${ row.current } unpublished`,
							'warning'
						);
						closeDialog();
					},
				} ),
		},
		{
			label: 'Delete Package',
			icon: Trash2,
			danger: true,
			onClick: () =>
				openDialog( {
					open: true,
					danger: true,
					icon: Trash2,
					title: 'Delete Package?',
					body: (
						<span>
							Permanently delete{ ' ' }
							<strong>
								{ row.product } { row.current }
							</strong>
							? The ZIP file and all download records for this
							version will be removed. This cannot be undone.
						</span>
					),
					confirmLabel: 'Delete Package',
					onConfirm: () => {
						deleteRow( row.id );
						showToast(
							`${ row.product } ${ row.current } deleted`,
							'error'
						);
						closeDialog();
					},
				} ),
		},
	];

	// ── Channel / status badge styles ──────────────────────────────────────────
	const channelColor: Record< string, { bg: string; text: string } > = {
		stable: { bg: M3.successContainer, text: M3.success },
		beta: { bg: M3.warningContainer, text: M3.warning },
		draft: { bg: M3.surfaceContainerHigh, text: M3.onSurfaceVariant },
	};
	const statusColor: Record< string, { bg: string; text: string } > = {
		live: { bg: M3.successContainer, text: M3.success },
		beta: { bg: M3.warningContainer, text: M3.warning },
		draft: { bg: M3.surfaceContainerHigh, text: M3.onSurfaceVariant },
	};

	// ── New Release submit ─────────────────────────────────────────────────────
	const handleCreateRelease = () => {
		if ( ! nrVersion.trim() ) {
			showToast( 'Please enter a version number', 'error' );
			return;
		}
		const newPkg = {
			id: Date.now(),
			product: nrProduct,
			slug: nrProduct.toLowerCase().replace( / /g, '-' ),
			current: nrVersion.trim(),
			previous:
				tableData.find( ( r ) => r.product === nrProduct )?.current ??
				'—',
			released:
				nrChannel === 'draft'
					? '—'
					: new Date().toISOString().split( 'T' )[ 0 ],
			downloads: 0,
			channel: nrChannel,
			status: nrChannel === 'stable' ? 'live' : nrChannel,
			changelog: nrChangelog.trim() || 'No changelog provided.',
		};
		setTableData( ( d ) => [ newPkg, ...d ] );
		showToast(
			`${ nrProduct } ${ nrVersion } created as ${ nrChannel }`,
			'success'
		);
		setNewReleaseOpen( false );
		setNrVersion( '' );
		setNrChangelog( '' );
		setNrFileReady( false );
		setNrChannel( 'draft' );
		setNrType( 'patch' );
	};

	// ── Edit Package save ──────────────────────────────────────────────────────
	const handleSaveEdit = () => {
		if ( ! editRow ) return;
		updateRow( editRow.id, {
			current: editVersion,
			changelog: editChangelog,
			channel: editChannel,
			status: editChannel === 'stable' ? 'live' : editChannel,
		} );
		showToast( `${ editRow.product } updated`, 'success' );
		setEditRow( null );
	};

	return (
		<div className="flex flex-col gap-5">
			{ /* ── KPI strip ─────────────────────────────────────────────────────── */ }
			<div className="grid grid-cols-4 gap-4">
				<KpiCard
					label="Live Packages"
					value={ String(
						tableData.filter( ( r ) => r.status === 'live' ).length
					) }
					trend="▲ +1 this week"
					trendUp
					icon={ Package }
				/>
				<KpiCard
					label="Downloads Today"
					value="2,104"
					trend="▲ +6.8%"
					trendUp
					icon={ Download }
				/>
				<KpiCard
					label="Beta Packages"
					value={ String(
						tableData.filter( ( r ) => r.status === 'beta' ).length
					) }
					trend="Needs promotion"
					trendUp={ false }
					icon={ Zap }
				/>
				<KpiCard
					label="Draft Packages"
					value={ String(
						tableData.filter( ( r ) => r.status === 'draft' ).length
					) }
					trend="Pending release"
					trendUp={ false }
					icon={ FileText }
				/>
			</div>

			{ /* ── Header row ─────────────────────────────────────────────────────── */ }
			<div className="flex items-center justify-between">
				<div
					className="text-sm font-medium"
					style={ {
						color: M3.onSurface,
						fontFamily: 'Roboto, sans-serif',
					} }
				>
					Update Packages
				</div>
				<FilledButton small onClick={ () => setNewReleaseOpen( true ) }>
					<Zap size={ 14 } /> New Release
				</FilledButton>
			</div>

			{ /* ── New Release form panel ──────────────────────────────────────────── */ }
			{ newReleaseOpen && (
				<Card
					className="overflow-hidden"
					style={ { border: `2px solid ${ M3.primary }` } }
				>
					{ /* Panel header */ }
					<div
						className="flex items-center justify-between px-6 py-4"
						style={ {
							backgroundColor: M3.primaryContainer,
							borderBottom: `1px solid ${ M3.outlineVariant }`,
						} }
					>
						<div className="flex items-center gap-3">
							<div
								className="w-8 h-8 rounded-lg flex items-center justify-center"
								style={ { backgroundColor: M3.primary } }
							>
								<Zap size={ 16 } color={ M3.onPrimary } />
							</div>
							<div>
								<div
									className="font-medium text-sm"
									style={ {
										color: M3.onPrimaryContainer,
										fontFamily: 'Roboto, sans-serif',
									} }
								>
									Create New Release
								</div>
								<div
									className="text-xs"
									style={ {
										color: M3.onPrimaryContainer,
										opacity: 0.7,
										fontFamily: 'Roboto, sans-serif',
									} }
								>
									Fill in the details below — you can save as
									draft and publish later.
								</div>
							</div>
						</div>
						<IconButton
							icon={ XCircle }
							onClick={ () => setNewReleaseOpen( false ) }
						/>
					</div>

					<div
						className="p-6 grid gap-6"
						style={ { gridTemplateColumns: '1fr 1fr' } }
					>
						{ /* Left column */ }
						<div className="flex flex-col gap-4">
							{ /* Product */ }
							<div>
								<div
									className="text-xs font-medium mb-1.5"
									style={ {
										color: M3.onSurfaceVariant,
										fontFamily: 'Roboto, sans-serif',
										textTransform: 'uppercase',
										letterSpacing: '0.5px',
									} }
								>
									Product *
								</div>
								<select
									value={ nrProduct }
									onChange={ ( e ) =>
										setNrProduct( e.target.value )
									}
									className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
									style={ {
										backgroundColor: M3.surfaceContainerLow,
										border: `1px solid ${ M3.outlineVariant }`,
										color: M3.onSurface,
										fontFamily: 'Roboto, sans-serif',
									} }
								>
									{ PRODUCTS_LIST.map( ( p ) => (
										<option key={ p }>{ p }</option>
									) ) }
								</select>
							</div>

							{ /* Version */ }
							<div>
								<div
									className="text-xs font-medium mb-1.5"
									style={ {
										color: M3.onSurfaceVariant,
										fontFamily: 'Roboto, sans-serif',
										textTransform: 'uppercase',
										letterSpacing: '0.5px',
									} }
								>
									Version Number *
								</div>
								<input
									type="text"
									placeholder="e.g. v2.5.0"
									value={ nrVersion }
									onChange={ ( e ) =>
										setNrVersion( e.target.value )
									}
									className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
									style={ {
										backgroundColor: M3.surfaceContainerLow,
										border: `1px solid ${
											nrVersion
												? M3.primary
												: M3.outlineVariant
										}`,
										color: M3.onSurface,
										fontFamily: 'Roboto Mono, monospace',
									} }
								/>
							</div>

							{ /* Release type */ }
							<div>
								<div
									className="text-xs font-medium mb-1.5"
									style={ {
										color: M3.onSurfaceVariant,
										fontFamily: 'Roboto, sans-serif',
										textTransform: 'uppercase',
										letterSpacing: '0.5px',
									} }
								>
									Release Type
								</div>
								<div className="flex gap-2">
									{ RELEASE_TYPES.map( ( t ) => (
										<button
											key={ t }
											onClick={ () => setNrType( t ) }
											className="flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-all"
											style={ {
												backgroundColor:
													nrType === t
														? M3.primary
														: M3.surfaceContainerLow,
												color:
													nrType === t
														? M3.onPrimary
														: M3.onSurfaceVariant,
												border: `1px solid ${
													nrType === t
														? M3.primary
														: M3.outlineVariant
												}`,
												cursor: 'pointer',
												fontFamily:
													'Roboto, sans-serif',
											} }
										>
											{ t }
										</button>
									) ) }
								</div>
								<div
									className="text-xs mt-1.5"
									style={ {
										color: M3.onSurfaceVariant,
										fontFamily: 'Roboto, sans-serif',
									} }
								>
									{ nrType === 'patch' &&
										'Bug fixes and security patches only.' }
									{ nrType === 'minor' &&
										'New features, backwards compatible.' }
									{ nrType === 'major' &&
										'Breaking changes — communicate clearly.' }
								</div>
							</div>

							{ /* Channel */ }
							<div>
								<div
									className="text-xs font-medium mb-1.5"
									style={ {
										color: M3.onSurfaceVariant,
										fontFamily: 'Roboto, sans-serif',
										textTransform: 'uppercase',
										letterSpacing: '0.5px',
									} }
								>
									Release Channel
								</div>
								<div className="flex gap-2">
									{ CHANNELS.map( ( ch ) => {
										const style = channelColor[ ch ];
										const active = nrChannel === ch;
										return (
											<button
												key={ ch }
												onClick={ () =>
													setNrChannel( ch )
												}
												className="flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-all"
												style={ {
													backgroundColor: active
														? style.bg
														: M3.surfaceContainerLow,
													color: active
														? style.text
														: M3.onSurfaceVariant,
													border: `1px solid ${
														active
															? style.text
															: M3.outlineVariant
													}`,
													cursor: 'pointer',
													fontFamily:
														'Roboto, sans-serif',
												} }
											>
												{ ch }
											</button>
										);
									} ) }
								</div>
								<div
									className="text-xs mt-1.5"
									style={ {
										color: M3.onSurfaceVariant,
										fontFamily: 'Roboto, sans-serif',
									} }
								>
									{ nrChannel === 'draft' &&
										'Saved but not visible to customers yet.' }
									{ nrChannel === 'beta' &&
										'Pushed to beta testers immediately on save.' }
									{ nrChannel === 'stable' &&
										'Pushed to all customers immediately on save.' }
								</div>
							</div>
						</div>

						{ /* Right column */ }
						<div className="flex flex-col gap-4">
							{ /* Changelog */ }
							<div className="flex-1 flex flex-col">
								<div
									className="text-xs font-medium mb-1.5"
									style={ {
										color: M3.onSurfaceVariant,
										fontFamily: 'Roboto, sans-serif',
										textTransform: 'uppercase',
										letterSpacing: '0.5px',
									} }
								>
									Changelog
								</div>
								<textarea
									placeholder={
										'• Fixed: PHP 8.3 compatibility issue\n• Added: New block pattern for hero sections\n• Improved: License validation response time by 40%'
									}
									value={ nrChangelog }
									onChange={ ( e ) =>
										setNrChangelog( e.target.value )
									}
									className="flex-1 w-full px-3 py-2.5 rounded-lg text-sm resize-none outline-none"
									rows={ 7 }
									style={ {
										backgroundColor: M3.surfaceContainerLow,
										border: `1px solid ${ M3.outlineVariant }`,
										color: M3.onSurface,
										fontFamily: 'Roboto, sans-serif',
										lineHeight: 1.6,
									} }
								/>
							</div>

							{ /* File upload */ }
							<div>
								<div
									className="text-xs font-medium mb-1.5"
									style={ {
										color: M3.onSurfaceVariant,
										fontFamily: 'Roboto, sans-serif',
										textTransform: 'uppercase',
										letterSpacing: '0.5px',
									} }
								>
									Package File (ZIP)
								</div>
								<div
									onDragOver={ ( e ) => {
										e.preventDefault();
										setNrDragOver( true );
									} }
									onDragLeave={ () => setNrDragOver( false ) }
									onDrop={ ( e ) => {
										e.preventDefault();
										setNrDragOver( false );
										setNrFileReady( true );
										showToast(
											'Package file ready',
											'success'
										);
									} }
									onClick={ () => setNrFileReady( true ) }
									className="flex flex-col items-center justify-center gap-2 rounded-xl cursor-pointer transition-all"
									style={ {
										border: `2px dashed ${
											nrDragOver
												? M3.primary
												: nrFileReady
												? M3.success
												: M3.outlineVariant
										}`,
										backgroundColor: nrDragOver
											? `${ M3.primary }08`
											: nrFileReady
											? `${ M3.success }08`
											: M3.surfaceContainerLow,
										padding: '20px 16px',
									} }
								>
									{ nrFileReady ? (
										<>
											<CheckCircle
												size={ 24 }
												color={ M3.success }
											/>
											<div
												className="text-sm font-medium"
												style={ {
													color: M3.success,
													fontFamily:
														'Roboto, sans-serif',
												} }
											>
												{ nrProduct
													.toLowerCase()
													.replace( / /g, '-' ) }
												-{ nrVersion || 'x.x.x' }.zip
												ready
											</div>
											<button
												onClick={ ( e ) => {
													e.stopPropagation();
													setNrFileReady( false );
												} }
												className="text-xs"
												style={ {
													color: M3.onSurfaceVariant,
													background: 'none',
													border: 'none',
													cursor: 'pointer',
													fontFamily:
														'Roboto, sans-serif',
												} }
											>
												Remove file
											</button>
										</>
									) : (
										<>
											<DownloadIcon
												size={ 24 }
												color={ M3.onSurfaceVariant }
												style={ {
													transform: 'rotate(180deg)',
												} }
											/>
											<div
												className="text-sm"
												style={ {
													color: M3.onSurfaceVariant,
													fontFamily:
														'Roboto, sans-serif',
												} }
											>
												Drop ZIP here, or{ ' ' }
												<span
													style={ {
														color: M3.primary,
														fontWeight: 500,
													} }
												>
													click to select
												</span>
											</div>
											<div
												className="text-xs"
												style={ {
													color: M3.outlineVariant,
													fontFamily:
														'Roboto, sans-serif',
												} }
											>
												Max 50 MB · .zip only
											</div>
										</>
									) }
								</div>
							</div>
						</div>
					</div>

					{ /* Panel footer */ }
					<div
						className="flex items-center justify-between px-6 py-4"
						style={ {
							backgroundColor: M3.surfaceContainerLow,
							borderTop: `1px solid ${ M3.outlineVariant }`,
						} }
					>
						<div
							className="text-xs"
							style={ {
								color: M3.onSurfaceVariant,
								fontFamily: 'Roboto, sans-serif',
							} }
						>
							{ ! nrFileReady && (
								<span style={ { color: M3.warning } }>
									⚠ No package file attached — customers
									won't be able to download.
								</span>
							) }
							{ nrFileReady && (
								<span style={ { color: M3.success } }>
									✓ Package file attached.
								</span>
							) }
						</div>
						<div className="flex items-center gap-2">
							<TextButton
								onClick={ () => setNewReleaseOpen( false ) }
							>
								Cancel
							</TextButton>
							<TonalButton
								small
								onClick={ () => {
									setNrChannel( 'draft' );
									handleCreateRelease();
								} }
							>
								<FileText size={ 14 } /> Save as Draft
							</TonalButton>
							<FilledButton small onClick={ handleCreateRelease }>
								<Zap size={ 14 } /> Create Release
							</FilledButton>
						</div>
					</div>
				</Card>
			) }

			{ /* ── Edit Package panel ──────────────────────────────────────────────── */ }
			{ editRow && (
				<Card
					className="overflow-hidden"
					style={ { border: `2px solid ${ M3.secondary }` } }
				>
					<div
						className="flex items-center justify-between px-6 py-4"
						style={ {
							backgroundColor: M3.secondaryContainer,
							borderBottom: `1px solid ${ M3.outlineVariant }`,
						} }
					>
						<div className="flex items-center gap-3">
							<div
								className="w-8 h-8 rounded-lg flex items-center justify-center"
								style={ { backgroundColor: M3.secondary } }
							>
								<Edit3 size={ 16 } color={ M3.onSecondary } />
							</div>
							<div>
								<div
									className="font-medium text-sm"
									style={ {
										color: M3.onSecondaryContainer,
										fontFamily: 'Roboto, sans-serif',
									} }
								>
									Edit Package — { editRow.product }
								</div>
								<div
									className="text-xs"
									style={ {
										color: M3.onSecondaryContainer,
										opacity: 0.7,
										fontFamily: 'Roboto, sans-serif',
									} }
								>
									Currently{ ' ' }
									<strong>{ editRow.current }</strong> ·{ ' ' }
									{ editRow.downloads.toLocaleString() }{ ' ' }
									downloads
								</div>
							</div>
						</div>
						<IconButton
							icon={ XCircle }
							onClick={ () => setEditRow( null ) }
						/>
					</div>

					<div
						className="p-6 grid gap-5"
						style={ { gridTemplateColumns: '1fr 1fr 1fr' } }
					>
						<div>
							<div
								className="text-xs font-medium mb-1.5"
								style={ {
									color: M3.onSurfaceVariant,
									fontFamily: 'Roboto, sans-serif',
									textTransform: 'uppercase',
									letterSpacing: '0.5px',
								} }
							>
								Version
							</div>
							<input
								value={ editVersion }
								onChange={ ( e ) =>
									setEditVersion( e.target.value )
								}
								className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
								style={ {
									backgroundColor: M3.surfaceContainerLow,
									border: `1px solid ${ M3.primary }`,
									color: M3.onSurface,
									fontFamily: 'Roboto Mono, monospace',
								} }
							/>
						</div>
						<div>
							<div
								className="text-xs font-medium mb-1.5"
								style={ {
									color: M3.onSurfaceVariant,
									fontFamily: 'Roboto, sans-serif',
									textTransform: 'uppercase',
									letterSpacing: '0.5px',
								} }
							>
								Channel
							</div>
							<div className="flex gap-2">
								{ CHANNELS.map( ( ch ) => (
									<button
										key={ ch }
										onClick={ () => setEditChannel( ch ) }
										className="flex-1 py-2 rounded-lg text-xs font-medium capitalize"
										style={ {
											backgroundColor:
												editChannel === ch
													? M3.primary
													: M3.surfaceContainerLow,
											color:
												editChannel === ch
													? M3.onPrimary
													: M3.onSurfaceVariant,
											border: `1px solid ${
												editChannel === ch
													? M3.primary
													: M3.outlineVariant
											}`,
											cursor: 'pointer',
											fontFamily: 'Roboto, sans-serif',
										} }
									>
										{ ch }
									</button>
								) ) }
							</div>
						</div>
						<div>
							<div
								className="text-xs font-medium mb-1.5"
								style={ {
									color: M3.onSurfaceVariant,
									fontFamily: 'Roboto, sans-serif',
									textTransform: 'uppercase',
									letterSpacing: '0.5px',
								} }
							>
								Replace ZIP
							</div>
							<button
								onClick={ () =>
									showToast( 'File picker opened', 'info' )
								}
								className="w-full py-2.5 rounded-lg text-xs flex items-center justify-center gap-2"
								style={ {
									backgroundColor: M3.surfaceContainerLow,
									border: `1px dashed ${ M3.outlineVariant }`,
									color: M3.onSurfaceVariant,
									cursor: 'pointer',
									fontFamily: 'Roboto, sans-serif',
								} }
							>
								<DownloadIcon
									size={ 13 }
									style={ { transform: 'rotate(180deg)' } }
								/>{ ' ' }
								Upload new ZIP
							</button>
						</div>
						<div className="col-span-3">
							<div
								className="text-xs font-medium mb-1.5"
								style={ {
									color: M3.onSurfaceVariant,
									fontFamily: 'Roboto, sans-serif',
									textTransform: 'uppercase',
									letterSpacing: '0.5px',
								} }
							>
								Changelog
							</div>
							<textarea
								value={ editChangelog }
								onChange={ ( e ) =>
									setEditChangelog( e.target.value )
								}
								className="w-full px-3 py-2.5 rounded-lg text-sm resize-none outline-none"
								rows={ 3 }
								style={ {
									backgroundColor: M3.surfaceContainerLow,
									border: `1px solid ${ M3.outlineVariant }`,
									color: M3.onSurface,
									fontFamily: 'Roboto, sans-serif',
									lineHeight: 1.6,
								} }
							/>
						</div>
					</div>

					<div
						className="flex items-center justify-end gap-2 px-6 py-4"
						style={ {
							borderTop: `1px solid ${ M3.outlineVariant }`,
						} }
					>
						<TextButton onClick={ () => setEditRow( null ) }>
							Cancel
						</TextButton>
						<FilledButton small onClick={ handleSaveEdit }>
							Save Changes
						</FilledButton>
					</div>
				</Card>
			) }

			{ /* ── Packages table ─────────────────────────────────────────────────── */ }
			<Card style={ { overflow: 'visible' } }>
				<div
					className="overflow-x-auto"
					style={ { overflowY: 'visible' } }
				>
					<table className="w-full">
						<thead>
							<tr
								style={ {
									backgroundColor: M3.surfaceContainerLow,
								} }
							>
								{ [
									'Product',
									'Current Version',
									'Previous',
									'Released',
									'Downloads',
									'Channel',
									'Status',
									'',
								].map( ( h ) => (
									<th
										key={ h }
										className="px-4 py-3 text-left text-xs font-medium"
										style={ {
											color: M3.onSurfaceVariant,
											fontFamily: 'Roboto, sans-serif',
											letterSpacing: '0.5px',
											textTransform: 'uppercase',
											whiteSpace: 'nowrap',
										} }
									>
										{ h }
									</th>
								) ) }
							</tr>
						</thead>
						<tbody>
							{ tableData.map( ( row, idx ) => (
								<tr
									key={ row.id }
									style={ {
										backgroundColor:
											editRow?.id === row.id
												? `${ M3.secondary }10`
												: idx % 2 === 0
												? M3.surface
												: M3.surfaceContainerLow,
										opacity:
											row.status === 'draft' ? 0.75 : 1,
									} }
									onMouseEnter={ ( e ) => {
										(
											e.currentTarget as HTMLElement
										 ).style.backgroundColor =
											M3.surfaceContainerHigh;
										(
											e.currentTarget as HTMLElement
										 ).style.opacity = '1';
									} }
									onMouseLeave={ ( e ) => {
										(
											e.currentTarget as HTMLElement
										 ).style.backgroundColor =
											editRow?.id === row.id
												? `${ M3.secondary }10`
												: idx % 2 === 0
												? M3.surface
												: M3.surfaceContainerLow;
										(
											e.currentTarget as HTMLElement
										 ).style.opacity =
											row.status === 'draft'
												? '0.75'
												: '1';
									} }
								>
									<td className="px-4 py-3">
										<div
											className="text-sm font-medium"
											style={ {
												color: M3.onSurface,
												fontFamily:
													'Roboto, sans-serif',
											} }
										>
											{ row.product }
										</div>
										<div
											className="text-xs font-normal mt-0.5 max-w-xs truncate"
											style={ {
												color: M3.onSurfaceVariant,
												fontFamily:
													'Roboto, sans-serif',
											} }
										>
											{ row.changelog }
										</div>
									</td>
									<td className="px-4 py-3">
										<span
											className="text-xs font-medium px-2 py-0.5 rounded-full"
											style={ {
												backgroundColor:
													M3.primaryContainer,
												color: M3.onPrimaryContainer,
												fontFamily:
													'Roboto Mono, monospace',
											} }
										>
											{ row.current }
										</span>
									</td>
									<td
										className="px-4 py-3 text-xs"
										style={ {
											color: M3.onSurfaceVariant,
											fontFamily:
												'Roboto Mono, monospace',
										} }
									>
										{ row.previous }
									</td>
									<td
										className="px-4 py-3 text-xs"
										style={ {
											color: M3.onSurfaceVariant,
											fontFamily: 'Roboto, sans-serif',
										} }
									>
										{ row.released }
									</td>
									<td
										className="px-4 py-3 text-sm font-medium"
										style={ {
											color: M3.onSurface,
											fontFamily:
												'Roboto Mono, monospace',
										} }
									>
										{ row.downloads.toLocaleString() }
									</td>
									<td className="px-4 py-3">
										<span
											className="text-xs px-2 py-0.5 rounded-full capitalize"
											style={ {
												backgroundColor:
													channelColor[ row.channel ]
														?.bg,
												color: channelColor[
													row.channel
												]?.text,
												fontFamily:
													'Roboto, sans-serif',
											} }
										>
											{ row.channel }
										</span>
									</td>
									<td className="px-4 py-3">
										<span
											className="text-xs px-2 py-0.5 rounded-full capitalize"
											style={ {
												backgroundColor:
													statusColor[ row.status ]
														?.bg,
												color: statusColor[ row.status ]
													?.text,
												fontFamily:
													'Roboto, sans-serif',
											} }
										>
											{ row.status }
										</span>
									</td>
									<td
										className="px-4 py-3"
										style={ { overflow: 'visible' } }
									>
										<ActionDropdown
											actions={ rowActions( row ) }
											hint={ `${ row.product } · ${ row.current }` }
										/>
									</td>
								</tr>
							) ) }
						</tbody>
					</table>
				</div>
				<div
					className="px-4 py-3"
					style={ { borderTop: `1px solid ${ M3.outlineVariant }` } }
				>
					<span
						className="text-xs"
						style={ {
							color: M3.onSurfaceVariant,
							fontFamily: 'Roboto, sans-serif',
						} }
					>
						{ tableData.length } packages ·{ ' ' }
						{
							tableData.filter( ( r ) => r.status === 'live' )
								.length
						}{ ' ' }
						live ·{ ' ' }
						{
							tableData.filter( ( r ) => r.status === 'beta' )
								.length
						}{ ' ' }
						beta ·{ ' ' }
						{
							tableData.filter( ( r ) => r.status === 'draft' )
								.length
						}{ ' ' }
						draft
					</span>
				</div>
			</Card>

			{ /* ── Release history ─────────────────────────────────────────────────── */ }
			<Card className="p-5">
				<SectionTitle>Recent Release History</SectionTitle>
				<table className="w-full">
					<thead>
						<tr>
							{ [
								'Product',
								'Version',
								'Release Date',
								'Downloads',
								'Type',
							].map( ( h ) => (
								<th
									key={ h }
									className="text-left pb-2 text-xs font-medium"
									style={ {
										color: M3.onSurfaceVariant,
										fontFamily: 'Roboto, sans-serif',
										letterSpacing: '0.5px',
										textTransform: 'uppercase',
									} }
								>
									{ h }
								</th>
							) ) }
						</tr>
					</thead>
					<tbody>
						{ releaseHistoryData.map( ( r, i ) => (
							<tr
								key={ i }
								style={ {
									borderTop: `1px solid ${ M3.outlineVariant }`,
								} }
							>
								<td
									className="py-2.5 text-sm"
									style={ {
										color: M3.onSurface,
										fontFamily: 'Roboto, sans-serif',
									} }
								>
									{ r.product }
								</td>
								<td className="py-2.5">
									<span
										className="text-xs px-2 py-0.5 rounded-full"
										style={ {
											backgroundColor:
												M3.primaryContainer,
											color: M3.onPrimaryContainer,
											fontFamily:
												'Roboto Mono, monospace',
										} }
									>
										{ r.version }
									</span>
								</td>
								<td
									className="py-2.5 text-xs"
									style={ {
										color: M3.onSurfaceVariant,
										fontFamily: 'Roboto, sans-serif',
									} }
								>
									{ r.date }
								</td>
								<td
									className="py-2.5 text-sm font-medium"
									style={ {
										color: M3.onSurface,
										fontFamily: 'Roboto Mono, monospace',
									} }
								>
									{ r.downloads.toLocaleString() }
								</td>
								<td className="py-2.5">
									<span
										className="text-xs px-2 py-0.5 rounded-full capitalize"
										style={ {
											backgroundColor:
												r.type === 'minor'
													? M3.primaryContainer
													: M3.surfaceContainerHigh,
											color:
												r.type === 'minor'
													? M3.onPrimaryContainer
													: M3.onSurfaceVariant,
											fontFamily: 'Roboto, sans-serif',
										} }
									>
										{ r.type }
									</span>
								</td>
							</tr>
						) ) }
					</tbody>
				</table>
			</Card>

			{ /* ── Changelog viewer modal ──────────────────────────────────────────── */ }
			{ changelogRow && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center"
					style={ { backgroundColor: 'rgba(0,0,0,0.40)' } }
					onClick={ ( e ) => {
						if ( e.target === e.currentTarget )
							setChangelogRow( null );
					} }
				>
					<div
						className="rounded-3xl overflow-hidden flex flex-col"
						style={ {
							width: 560,
							maxHeight: '80vh',
							backgroundColor: M3.surfaceContainer,
							boxShadow: '0 8px 32px rgba(0,0,0,0.24)',
						} }
					>
						{ /* Modal header */ }
						<div
							className="flex items-center justify-between px-6 py-5"
							style={ {
								borderBottom: `1px solid ${ M3.outlineVariant }`,
							} }
						>
							<div>
								<div
									className="font-semibold text-base"
									style={ {
										color: M3.onSurface,
										fontFamily: 'Roboto, sans-serif',
									} }
								>
									{ changelogRow.product }
								</div>
								<div className="flex items-center gap-2 mt-1">
									<span
										className="text-xs px-2 py-0.5 rounded-full"
										style={ {
											backgroundColor:
												M3.primaryContainer,
											color: M3.onPrimaryContainer,
											fontFamily:
												'Roboto Mono, monospace',
										} }
									>
										{ changelogRow.current }
									</span>
									<span
										className="text-xs"
										style={ {
											color: M3.onSurfaceVariant,
											fontFamily: 'Roboto, sans-serif',
										} }
									>
										Released { changelogRow.released } ·{ ' ' }
										{ changelogRow.downloads.toLocaleString() }{ ' ' }
										downloads
									</span>
								</div>
							</div>
							<IconButton
								icon={ XCircle }
								onClick={ () => setChangelogRow( null ) }
							/>
						</div>

						{ /* Changelog body */ }
						<div className="px-6 py-5 overflow-y-auto flex-1">
							<div
								className="text-xs font-medium mb-3"
								style={ {
									color: M3.onSurfaceVariant,
									fontFamily: 'Roboto, sans-serif',
									textTransform: 'uppercase',
									letterSpacing: '0.5px',
								} }
							>
								What's changed
							</div>
							<div
								className="text-sm leading-relaxed whitespace-pre-wrap"
								style={ {
									color: M3.onSurface,
									fontFamily: 'Roboto, sans-serif',
									lineHeight: 1.8,
								} }
							>
								{ changelogRow.changelog }
							</div>

							<div
								className="mt-5 pt-4 flex flex-col gap-2"
								style={ {
									borderTop: `1px solid ${ M3.outlineVariant }`,
								} }
							>
								<div
									className="text-xs font-medium"
									style={ {
										color: M3.onSurfaceVariant,
										fontFamily: 'Roboto, sans-serif',
										textTransform: 'uppercase',
										letterSpacing: '0.5px',
									} }
								>
									Release info
								</div>
								{ [
									{
										label: 'Channel',
										value: changelogRow.channel,
									},
									{
										label: 'Status',
										value: changelogRow.status,
									},
									{
										label: 'Previous',
										value: changelogRow.previous,
									},
								].map( ( item ) => (
									<div
										key={ item.label }
										className="flex items-center justify-between text-xs"
										style={ {
											fontFamily: 'Roboto, sans-serif',
										} }
									>
										<span
											style={ {
												color: M3.onSurfaceVariant,
											} }
										>
											{ item.label }
										</span>
										<span
											className="font-medium capitalize"
											style={ { color: M3.onSurface } }
										>
											{ item.value }
										</span>
									</div>
								) ) }
							</div>
						</div>

						{ /* Modal footer */ }
						<div
							className="flex items-center justify-end gap-2 px-6 py-4"
							style={ {
								borderTop: `1px solid ${ M3.outlineVariant }`,
							} }
						>
							<OutlinedButton
								small
								onClick={ () => {
									navigator.clipboard?.writeText(
										changelogRow.changelog
									);
									showToast( 'Changelog copied', 'info' );
								} }
							>
								<Copy size={ 14 } /> Copy
							</OutlinedButton>
							<FilledButton
								small
								onClick={ () => {
									openEdit( changelogRow );
									setChangelogRow( null );
								} }
							>
								<Edit3 size={ 14 } /> Edit
							</FilledButton>
						</div>
					</div>
				</div>
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
			<Toast
				message={ toast.message }
				type={ toast.type }
				visible={ toast.visible }
			/>
		</div>
	);
}
