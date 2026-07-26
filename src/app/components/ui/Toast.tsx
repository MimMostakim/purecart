import { CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { M3 } from '../../utils/static-data';

export interface ToastProps {
	message: string;
	type: 'success' | 'info' | 'warning' | 'error';
	visible: boolean;
}

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
