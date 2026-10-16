/**
 * SettingsUpdates - the "Updates" settings tab.
 *
 * Mirrors SettingsSubscriptions' structure (CollapsibleSection cards built
 * from the shared SettingsField/SettingsToggleField/SettingsSelectField
 * row primitives) so the two real settings tabs share one visual language
 * instead of each inventing its own markup.
 *
 * @file
 * @since 1.0.0
 */
import { useEffect, useState } from 'react';
import { Mail, RefreshCw } from 'lucide-react';
import { M3 } from '@/theme';
import {
	fetchEmailPreview,
	fetchUpdateSettings,
	saveUpdateSettings,
	regenerateUpdateSecret,
} from '@/modules/updates';
import { FilledButton } from '@/shared/ui/FilledButton';
import { OutlinedButton } from '@/shared/ui/OutlinedButton';
import { TonalButton } from '@/shared/ui/TonalButton';
import { TextButton } from '@/shared/ui/TextButton';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { Toast } from '@/shared/ui/Toast';
import { Input } from '@/shared/ui/Input';
import type { ToastProps } from '@/shared/ui';
import { CollapsibleSection } from './CollapsibleSection';
import {
	SettingsField,
	SettingsToggleField,
	SettingsSelectField,
} from './shared';

const CHANNEL_OPTIONS = [
	{ label: 'Stable (Production Releases)', value: 'stable' },
	{ label: 'Beta (Pre-release testing)', value: 'beta' },
	{ label: 'Nightly (Bleeding Edge)', value: 'nightly' },
];

/**
 * Renders the Updates settings tab.
 *
 * @since 1.0.0
 *
 * @return {JSX.Element} The Updates settings tab.
 */
export function SettingsUpdates() {
	const [ defaultChannel, setDefaultChannel ] = useState( 'stable' );
	const [ requireLicense, setRequireLicense ] = useState( true );
	const [ allowRollback, setAllowRollback ] = useState( true );
	const [ tokenTtl, setTokenTtl ] = useState( 15 );
	const [ emailNotifications, setEmailNotifications ] = useState( true );
	const [ isDirty, setIsDirty ] = useState( false );
	const [ isSaving, setIsSaving ] = useState( false );

	const [ confirmRegenerate, setConfirmRegenerate ] = useState( false );
	const [ previewHtml, setPreviewHtml ] = useState< string | null >( null );
	const [ previewLoading, setPreviewLoading ] = useState( false );
	const [ toast, setToast ] = useState< ToastProps >( {
		message: '',
		type: 'success',
		visible: false,
	} );

	useEffect( () => {
		fetchUpdateSettings()
			.then( ( s ) => {
				setDefaultChannel( s.defaultChannel );
				setRequireLicense( s.requireLicense );
				setAllowRollback( s.allowRollback );
				setTokenTtl( s.tokenTtl );
				setEmailNotifications( s.emailNotifications );
			} )
			.catch( () => showToast( 'Failed to load update settings', 'error' ) );
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [] );

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

	const handlePreviewEmail = async () => {
		setPreviewLoading( true );
		try {
			const res = await fetchEmailPreview();
			setPreviewHtml( res.html );
		} catch ( err ) {
			console.error( 'Failed to load preview:', err );
			showToast( 'Failed to load email preview', 'error' );
		} finally {
			setPreviewLoading( false );
		}
	};

	const handleRegenerateSecret = async () => {
		setConfirmRegenerate( false );
		try {
			await regenerateUpdateSecret();
			showToast(
				'HMAC secret regenerated — all previous download links are now invalid',
				'success'
			);
		} catch {
			showToast( 'Failed to regenerate HMAC secret', 'error' );
		}
	};

	return (
		<div className="flex flex-col gap-3 pb-20">
			<CollapsibleSection
				title="General"
				description="Update channel and license requirements for customer downloads"
				defaultOpen
			>
				<SettingsSelectField
					label="Default Update Channel"
					value={ defaultChannel }
					options={ CHANNEL_OPTIONS }
					onChange={ ( v ) => {
						setDefaultChannel( v );
						setIsDirty( true );
					} }
				/>
				<SettingsToggleField
					label="Require Active License"
					checked={ requireLicense }
					onChange={ ( v ) => {
						setRequireLicense( v );
						setIsDirty( true );
					} }
					helpText="Require an active, unexpired license key to download package updates"
				/>
				<SettingsToggleField
					label="Allow Manual Rollback"
					checked={ allowRollback }
					onChange={ ( v ) => {
						setAllowRollback( v );
						setIsDirty( true );
					} }
					helpText="Let customers manually download previous versions from their account"
				/>
			</CollapsibleSection>

			<CollapsibleSection
				title="Security & Signed Tokens"
				description="HMAC signing and expiry for 1-click update download links"
			>
				<div className="flex items-center justify-between gap-4 py-2.5">
					<div>
						<div
							className="text-sm"
							style={ {
								color: M3.onSurface,
								fontFamily: 'Roboto, sans-serif',
							} }
						>
							HMAC Signing Secret
						</div>
						<div
							className="text-xs mt-0.5"
							style={ {
								color: M3.onSurfaceVariant,
								fontFamily: 'Roboto, sans-serif',
							} }
						>
							Used to sign 1-click update links. Rotate this
							regularly.
						</div>
					</div>
					<div className="flex items-center gap-2 flex-shrink-0">
						<Input
							type="password"
							value="••••••••••••••••••••••••••••••••"
							readOnly
						/>
						<OutlinedButton
							danger
							small
							onClick={ () => setConfirmRegenerate( true ) }
						>
							<RefreshCw size={ 13 } />
							Regenerate
						</OutlinedButton>
					</div>
				</div>
				<SettingsField
					label="Signed URL Lifetime"
					suffix="minutes"
					type="number"
					value={ tokenTtl }
					onChange={ ( v ) => {
						setTokenTtl( parseInt( v, 10 ) || 0 );
						setIsDirty( true );
					} }
					helpText="Download links auto-expire after this duration"
				/>
			</CollapsibleSection>

			<CollapsibleSection
				title="Release Announcement Emails"
				description="Notify license holders when a new stable version ships"
			>
				<SettingsToggleField
					label="Send Release Announcements"
					checked={ emailNotifications }
					onChange={ ( v ) => {
						setEmailNotifications( v );
						setIsDirty( true );
					} }
					helpText="Email active license holders when a stable version is released"
				/>
				<div className="flex items-center justify-between gap-4 py-2.5">
					<div
						className="text-sm"
						style={ {
							color: M3.onSurface,
							fontFamily: 'Roboto, sans-serif',
						} }
					>
						Email Template
					</div>
					<TonalButton small onClick={ handlePreviewEmail }>
						<Mail size={ 14 } />
						{ previewLoading
							? 'Loading Preview...'
							: 'Preview Template' }
					</TonalButton>
				</div>
				{ previewHtml && (
					<div className="pt-2 pb-2.5">
						<div
							className="rounded-xl p-4"
							style={ {
								border: `1px solid ${ M3.outlineVariant }`,
								backgroundColor: M3.surfaceContainerLow,
							} }
						>
							<div className="flex items-center justify-between mb-2">
								<span
									className="text-xs font-medium"
									style={ {
										color: M3.onSurfaceVariant,
										fontFamily: 'Roboto, sans-serif',
									} }
								>
									Sandboxed Preview
								</span>
								<TextButton
									small
									onClick={ () => setPreviewHtml( null ) }
								>
									Hide Preview
								</TextButton>
							</div>
							<div
								dangerouslySetInnerHTML={ {
									__html: previewHtml,
								} }
							/>
						</div>
					</div>
				) }
			</CollapsibleSection>

			<div className="fixed bottom-6 right-6">
				<FilledButton
					disabled={ ! isDirty || isSaving }
					onClick={ async () => {
						setIsSaving( true );
						try {
							await saveUpdateSettings( {
								defaultChannel: defaultChannel as 'stable' | 'beta' | 'nightly',
								requireLicense,
								allowRollback,
								tokenTtl,
								emailNotifications,
							} );
							showToast( 'Update settings saved', 'success' );
							setIsDirty( false );
						} catch {
							showToast( 'Failed to save update settings', 'error' );
						} finally {
							setIsSaving( false );
						}
					} }
				>
					{ isSaving ? 'Saving…' : 'Save Changes' }
				</FilledButton>
			</div>
			<Toast
				message={ toast.message }
				type={ toast.type }
				visible={ toast.visible }
			/>

			<ConfirmDialog
				open={ confirmRegenerate }
				title="Regenerate HMAC Secret?"
				body="All previously generated 1-click update links will stop working immediately. This can't be undone."
				confirmLabel="Regenerate"
				danger
				icon={ RefreshCw }
				onConfirm={ handleRegenerateSecret }
				onCancel={ () => setConfirmRegenerate( false ) }
			/>
		</div>
	);
}
