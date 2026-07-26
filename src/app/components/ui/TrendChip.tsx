import { TrendingUp, TrendingDown } from 'lucide-react';
import { M3 } from '../../utils/static-data';

export function TrendChip( {
	value,
	isPositive,
}: {
	value: string;
	isPositive: boolean;
} ) {
	return (
		<span
			className="inline-flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full"
			style={ {
				backgroundColor: isPositive ? '#C2E7A0' : '#FFDAD6',
				color: isPositive ? M3.success : M3.error,
			} }
		>
			{ isPositive ? (
				<TrendingUp size={ 11 } />
			) : (
				<TrendingDown size={ 11 } />
			) }
			{ value }
		</span>
	);
}
