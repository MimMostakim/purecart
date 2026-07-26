import { useState } from 'react';
import { M3, SETTINGS_TABS } from '../../utils/static-data';
import type { Module } from '../../utils/static-data';
import { Card, Toggle, Toast } from '../ui';
import type { ToastProps } from '../ui';
import { SettingsLicensing } from './SettingsLicensing';
import { SettingsDownloads } from './SettingsDownloads';
import { SettingsEmails } from './SettingsEmails';
import { SettingsAdvanced } from './SettingsAdvanced';
import { SettingsGenericTab } from './SettingsGenericTab';

export function SettingsPage( {
	modules,
	onToggleModule,
}: {
	modules: Module[];
	onToggleModule: ( name: string ) => void;
} ) {
	const [ activeTab, setActiveTab ] = useState( 'Modules' );
	const [ toast, setToast ] = useState< ToastProps >( {
		message: '',
		type: 'success',
		visible: false,
	} );
	const showSettingsToast = ( msg: string ) => {
		setToast( { message: msg, type: 'success', visible: true } );
		setTimeout(
			() => setToast( ( t ) => ( { ...t, visible: false } ) ),
			3000
		);
	};

	return (
		<div className="flex min-h-[600px]" style={ { gap: 0 } }>
			<div
				className="flex flex-col flex-shrink-0"
				style={ {
					width: 200,
					borderRight: `1px solid ${ M3.outlineVariant }`,
				} }
			>
				{ SETTINGS_TABS.map( ( tab ) => (
					<button
						key={ tab }
						onClick={ () => setActiveTab( tab ) }
						className="text-left px-4 py-3 text-sm transition-all"
						style={ {
							backgroundColor:
								activeTab === tab
									? M3.primaryContainer
									: 'transparent',
							color:
								activeTab === tab
									? M3.onPrimaryContainer
									: M3.onSurfaceVariant,
							borderRight:
								activeTab === tab
									? `3px solid ${ M3.primary }`
									: '3px solid transparent',
							border: 'none',
							borderRight:
								activeTab === tab
									? `3px solid ${ M3.primary }`
									: '3px solid transparent',
							cursor: 'pointer',
							fontFamily: 'Roboto, sans-serif',
							fontWeight: activeTab === tab ? 500 : 400,
						} }
					>
						{ tab }
					</button>
				) ) }
			</div>

			<div className="flex-1 p-6">
				{ activeTab === 'Modules' ? (
					<div className="flex flex-col gap-2">
						<div className="mb-4">
							<h2
								className="font-medium text-lg"
								style={ {
									color: M3.onSurface,
									fontFamily: 'Roboto, sans-serif',
								} }
							>
								Plugin Modules
							</h2>
							<p
								className="text-sm mt-1"
								style={ {
									color: M3.onSurfaceVariant,
									fontFamily: 'Roboto, sans-serif',
								} }
							>
								Enable or disable modules. Enabled modules
								appear in the sidebar and unlock their
								analytics.
							</p>
						</div>
						{ modules.map( ( mod ) => (
							<Card
								key={ mod.name }
								className="flex items-center gap-4 px-5 py-4"
							>
								<div
									className="w-2.5 h-2.5 rounded-full flex-shrink-0"
									style={ {
										backgroundColor: mod.enabled
											? M3.success
											: M3.outlineVariant,
									} }
								/>
								<div className="flex-1 min-w-0">
									<div
										className="text-sm font-medium"
										style={ {
											color: M3.onSurface,
											fontFamily: 'Roboto, sans-serif',
										} }
									>
										{ mod.name }
									</div>
									<div
										className="text-xs mt-0.5"
										style={ {
											color: M3.onSurfaceVariant,
											fontFamily: 'Roboto, sans-serif',
										} }
									>
										{ mod.desc }
									</div>
								</div>
								<div className="flex items-center gap-3 flex-shrink-0">
									<span
										className="text-xs px-2 py-0.5 rounded-full"
										style={ {
											border: `1px solid ${ M3.outlineVariant }`,
											color: M3.onSurfaceVariant,
											fontFamily: 'Roboto, sans-serif',
										} }
									>
										{ mod.phase }
									</span>
									<span
										className="text-xs px-2 py-0.5 rounded-full"
										style={ {
											backgroundColor: mod.enabled
												? M3.successContainer
												: M3.surfaceContainerHigh,
											color: mod.enabled
												? M3.success
												: M3.onSurfaceVariant,
											fontFamily: 'Roboto, sans-serif',
										} }
									>
										{ mod.enabled ? 'Active' : 'Disabled' }
									</span>
									<Toggle
										on={ mod.enabled }
										onChange={ () =>
											onToggleModule( mod.name )
										}
									/>
								</div>
							</Card>
						) ) }
					</div>
				) : activeTab === 'Licensing' ? (
					<SettingsLicensing
						onSave={ () =>
							showSettingsToast( 'Licensing settings saved' )
						}
					/>
				) : activeTab === 'Downloads' ? (
					<SettingsDownloads
						onSave={ () =>
							showSettingsToast( 'Download settings saved' )
						}
					/>
				) : activeTab === 'Emails' ? (
					<SettingsEmails
						onSave={ () =>
							showSettingsToast( 'Email settings saved' )
						}
					/>
				) : activeTab === 'Advanced' ? (
					<SettingsAdvanced
						onSave={ () =>
							showSettingsToast( 'Advanced settings saved' )
						}
					/>
				) : (
					<SettingsGenericTab
						name={ activeTab }
						onSave={ () =>
							showSettingsToast( `${ activeTab } settings saved` )
						}
					/>
				) }
			</div>
			<Toast
				message={ toast.message }
				type={ toast.type }
				visible={ toast.visible }
			/>
		</div>
	);
}
