/**
 * Toast UI component.
 *
 * Renders a fixed-position notification snackbar that slides up from the
 * bottom center of the screen. Visibility is controlled externally via the
 * visible prop; the host component is responsible for auto-dismissal timing.
 *
 * @file
 * @since 1.0.0
 */
import { CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { M3 } from '../../utils/static-data';

/**
 * Props for the Toast component.
 *
 * @since 1.0.0
 *
 * @typedef  {Object}  ToastProps
 * @property {string}  message  Notification text displayed inside the toast.
 * @property {'success'|'info'|'warning'|'error'} type Determines icon and accent color.
 * @property {boolean} visible  Controls opacity and slide-in animation state.
 */
export interface ToastProps {
	message: string;
	type: 'success' | 'info' | 'warning' | 'error';
	visible: boolean;
}

/**
 * Renders a bottom-center toast notification with icon and message text.
 *
 * The element is always present in the DOM but transitions between visible
 * and hidden states via opacity and translateY to enable CSS animation.
 *
 * @since 1.0.0
 *
 * @param {ToastProps} props Component props.
 *
 * @return {JSX.Element} The fixed-position toast notification element.
 */
export function Toast( { message, type, visible }: ToastProps ) {
	const colors = {
		success: M3.success,
		info: M3.info,
		warning: M3.warning,
		error: M3.error,
	};
	const icons = {
		success: CheckCircle,
		info: AlertCircle,
		warning: AlertCircle,
		error: XCircle,
	};
	const Icon = icons[ type ];
	return (
		<div
			className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 pointer-events-none"
			style={ {
				opacity: visible ? 1 : 0,
				transform: `translateX(-50%) translateY(${
					visible ? 0 : 12
				}px)`,
			} }
		>
			<div
				className="flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl"
				style={ {
					backgroundColor: M3.onSurface,
					fontFamily: 'Roboto, sans-serif',
					minWidth: 280,
				} }
			>
				<Icon size={ 16 } color={ colors[ type ] } />
				<span className="text-sm" style={ { color: M3.surface } }>
					{ message }
				</span>
			</div>
		</div>
	);
}
