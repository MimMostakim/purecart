/**
 * ConfirmDialog UI component.
 *
 * Renders a modal confirmation dialog with optional icon, title, body content,
 * and a confirm/cancel action pair. Supports danger styling for destructive actions.
 *
 * @file
 * @since 1.0.0
 */
import { M3 } from '../../utils/static-data';
import { TextButton } from './TextButton';
import { FilledButton } from './FilledButton';

/**
 * Props for the ConfirmDialog component.
 *
 * @since 1.0.0
 *
 * @typedef  {Object}            ConfirmDialogProps
 * @property {boolean}           open          Controls dialog visibility.
 * @property {string}            title         Heading text displayed in the dialog.
 * @property {React.ReactNode}   body          Body content rendered below the title.
 * @property {string}            confirmLabel  Label for the primary confirm button.
 * @property {boolean}           [danger]      Applies error styling to the confirm button when true.
 * @property {React.ElementType} [icon]        Optional icon rendered above the title.
 * @property {Function}          onConfirm     Callback invoked when the confirm button is clicked.
 * @property {Function}          onCancel      Callback invoked when the cancel button or backdrop is clicked.
 */
export interface ConfirmDialogProps {
	open: boolean;
	title: string;
	body: React.ReactNode;
	confirmLabel: string;
	danger?: boolean;
	icon?: React.ElementType;
	onConfirm: () => void;
	onCancel: () => void;
}

/**
 * Renders a modal confirmation dialog over a semi-transparent backdrop.
 *
 * Returns null when the dialog is not open. Clicking the backdrop triggers
 * the onCancel callback.
 *
 * @since 1.0.0
 *
 * @param {ConfirmDialogProps} props Component props.
 *
 * @return {JSX.Element|null} The modal overlay, or null when closed.
 */
export function ConfirmDialog( {
	open,
	title,
	body,
	confirmLabel,
	danger = false,
	icon: Icon,
	onConfirm,
	onCancel,
}: ConfirmDialogProps ) {
	if ( ! open ) return null;
	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center"
			style={ { backgroundColor: 'rgba(0,0,0,0.40)' } }
			onClick={ ( e ) => {
				if ( e.target === e.currentTarget ) onCancel();
			} }
		>
			<div
				className="flex flex-col rounded-3xl overflow-hidden"
				style={ {
					width: 400,
					backgroundColor: M3.surfaceContainer,
					boxShadow: '0 8px 32px rgba(0,0,0,0.24)',
				} }
			>
				<div className="px-6 pt-6 pb-4 flex flex-col gap-3">
					{ Icon && (
						<div
							className="flex items-center justify-center w-12 h-12 rounded-full self-center mb-1"
							style={ {
								backgroundColor: danger
									? '#FFDAD6'
									: M3.primaryContainer,
							} }
						>
							<Icon
								size={ 22 }
								color={ danger ? M3.error : M3.primary }
							/>
						</div>
					) }
					<div className="text-center">
						<div
							className="font-semibold text-lg"
							style={ {
								color: M3.onSurface,
								fontFamily: 'Roboto, sans-serif',
							} }
						>
							{ title }
						</div>
					</div>
					<div
						className="text-sm text-center"
						style={ {
							color: M3.onSurfaceVariant,
							fontFamily: 'Roboto, sans-serif',
							lineHeight: 1.6,
						} }
					>
						{ body }
					</div>
				</div>
				<div
					className="flex items-center justify-end gap-2 px-6 py-4"
					style={ { borderTop: `1px solid ${ M3.outlineVariant }` } }
				>
					<TextButton onClick={ onCancel }>Cancel</TextButton>
					<FilledButton danger={ danger } small onClick={ onConfirm }>
						{ confirmLabel }
					</FilledButton>
				</div>
			</div>
		</div>
	);
}
