import { M3 } from '../../utils/static-data';
import { Card } from './Card';
import { TrendChip } from './TrendChip';

export function KpiCard( {
	label,
	value,
	trend,
	trendUp,
	icon: Icon,
}: {
	label: string;
	value: string;
	trend: string;
	trendUp: boolean;
	icon: React.ElementType;
} ) {
	return (
		<Card className="p-4">
			<div className="flex items-start justify-between mb-2">
				<div
					className="text-xs font-medium"
					style={ {
						color: M3.onSurfaceVariant,
						fontFamily: 'Roboto, sans-serif',
						textTransform: 'uppercase',
						letterSpacing: '0.5px',
					} }
				>
					{ label }
				</div>
				<div
					className="w-7 h-7 rounded-lg flex items-center justify-center"
					style={ { backgroundColor: M3.primaryContainer } }
				>
					<Icon size={ 14 } color={ M3.primary } />
				</div>
			</div>
			<div
				className="text-3xl font-light mb-2"
				style={ {
					color: M3.onSurface,
					fontFamily: 'Roboto, sans-serif',
				} }
			>
				{ value }
			</div>
			<TrendChip value={ trend } isPositive={ trendUp } />
		</Card>
	);
}
