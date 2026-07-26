import { M3 } from '../../utils/static-data';

export function StatusBadge( { status }: { status: string } ) {
	const styles: Record<
		string,
		{ bg: string; text: string; label: string }
	> = {
		active: { bg: '#C2E7A0', text: M3.success, label: 'Active' },
		expired: { bg: '#FFDAD6', text: M3.error, label: 'Expired' },
		suspended: { bg: '#FFDEA5', text: '#5C4200', label: 'Suspended' },
		revoked: {
			bg: M3.surfaceContainerHigh,
			text: M3.onSurfaceVariant,
			label: 'Revoked',
		},
		paused: { bg: '#C8E6FF', text: M3.info, label: 'Paused' },
		cancelled: { bg: '#FFDAD6', text: M3.error, label: 'Cancelled' },
		'past-due': { bg: '#FFDEA5', text: '#5C4200', label: 'Past Due' },
		trialing: {
			bg: M3.primaryContainer,
			text: M3.onPrimaryContainer,
			label: 'Trialing',
		},
		pending: {
			bg: M3.surfaceContainer,
			text: M3.onSurfaceVariant,
			label: 'Pending',
		},
	};
	const s = styles[ status ] ?? styles.pending;
	return (
		<span
			className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
			style={ {
				backgroundColor: s.bg,
				color: s.text,
				fontFamily: 'Roboto, sans-serif',
			} }
		>
			{ s.label }
		</span>
	);
}
