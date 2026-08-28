/**
 * SubscriptionTypeBadge component.
 *
 * Small colored icon-pill identifying a subscription's delivery type. Used
 * in the subscriptions table's "Type" column and the Detail page header.
 * TYPE_CONFIG is exported so the table's "Linked" column cell can reuse the
 * same icon choices instead of redefining them.
 *
 * @file
 * @since 1.0.0
 */
import {
	Key,
	Cloud,
	Shield,
	Download,
	GraduationCap,
	Briefcase,
	type LucideIcon,
} from 'lucide-react';
import { M3 } from '../../../utils/static-data';
import type { SubscriptionDeliveryType } from '../types';

export const TYPE_CONFIG: Record<
	SubscriptionDeliveryType,
	{ icon: LucideIcon; label: string; bg: string; fg: string }
> = {
	software: { icon: Key, label: 'Software', bg: M3.primaryContainer, fg: M3.primary },
	saas: { icon: Cloud, label: 'SaaS', bg: M3.secondaryContainer, fg: M3.secondary },
	membership: { icon: Shield, label: 'Membership', bg: M3.infoContainer, fg: M3.info },
	download: { icon: Download, label: 'Download', bg: M3.successContainer, fg: M3.success },
	course: { icon: GraduationCap, label: 'Course', bg: M3.warningContainer, fg: M3.warning },
	service: { icon: Briefcase, label: 'Service', bg: M3.surfaceContainerHigh, fg: M3.onSurfaceVariant },
};

/**
 * Renders a colored pill identifying a subscription's delivery type.
 *
 * @since 1.0.0
 *
 * @param {Object} props        Component props.
 * @param {SubscriptionDeliveryType} props.type Delivery type to render.
 * @param {'default'|'small'} [props.size] Renders icon-only (with a title tooltip) when 'small'.
 *
 * @return {JSX.Element} The type badge element.
 */
export function SubscriptionTypeBadge( {
	type,
	size = 'default',
}: {
	type: SubscriptionDeliveryType;
	size?: 'default' | 'small';
} ) {
	const config = TYPE_CONFIG[ type ];
	const Icon = config.icon;
	return (
		<span
			className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
			style={ {
				backgroundColor: config.bg,
				color: config.fg,
				fontFamily: 'Roboto, sans-serif',
			} }
			title={ size === 'small' ? config.label : undefined }
		>
			<Icon size={ size === 'small' ? 12 : 14 } />
			{ size === 'default' && config.label }
		</span>
	);
}
