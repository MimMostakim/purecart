/**
 * SubscriptionsFilterBar component.
 *
 * Renders the subscriptions list page's search box, 6 filter chips, a
 * "clear all" affordance (shown only when at least one filter is active),
 * and the Export CSV button. Fully controlled - owns no state itself.
 *
 * @file
 * @since 1.0.0
 */
import { Search, Download as DownloadIcon } from 'lucide-react';
import { M3 } from '../../utils/static-data';
import { FilterChip } from '../ui/FilterChip';
import { OutlinedButton } from '../ui/OutlinedButton';

export interface SubscriptionsFilterBarProps {
	search: string;
	onSearchChange: ( v: string ) => void;
	filterStatus: string;
	onFilterStatusChange: ( v: string ) => void;
	filterProduct: string;
	onFilterProductChange: ( v: string ) => void;
	filterCycle: string;
	onFilterCycleChange: ( v: string ) => void;
	filterType: string;
	onFilterTypeChange: ( v: string ) => void;
	filterPaymentType: string;
	onFilterPaymentTypeChange: ( v: string ) => void;
	filterChurnRisk: string;
	onFilterChurnRiskChange: ( v: string ) => void;
	productOptions: string[];
	cycleOptions: string[];
	onClearAll: () => void;
	onExportCsv: () => void;
}

/**
 * Renders the subscriptions list page's filter bar.
 *
 * @since 1.0.0
 *
 * @param {SubscriptionsFilterBarProps} props Component props.
 *
 * @return {JSX.Element} The filter bar element.
 */
export function SubscriptionsFilterBar( {
	search,
	onSearchChange,
	filterStatus,
	onFilterStatusChange,
	filterProduct,
	onFilterProductChange,
	filterCycle,
	onFilterCycleChange,
	filterType,
	onFilterTypeChange,
	filterPaymentType,
	onFilterPaymentTypeChange,
	filterChurnRisk,
	onFilterChurnRiskChange,
	productOptions,
	cycleOptions,
	onClearAll,
	onExportCsv,
}: SubscriptionsFilterBarProps ) {
	const anyActive =
		filterStatus !== 'All' ||
		filterProduct !== 'All' ||
		filterCycle !== 'All' ||
		filterType !== 'All' ||
		filterPaymentType !== 'All' ||
		filterChurnRisk !== 'All';

	return (
		<div className="flex items-center gap-2 flex-wrap">
			<div
				className="flex items-center gap-2 flex-1 max-w-xs px-3 py-2 rounded-lg"
				style={ {
					backgroundColor: M3.surfaceContainerHigh,
					border: `1px solid ${ M3.outlineVariant }`,
				} }
			>
				<Search size={ 16 } color={ M3.onSurfaceVariant } />
				<input
					type="text"
					placeholder="Search subscriptions…"
					value={ search }
					onChange={ ( e ) => onSearchChange( e.target.value ) }
					className="flex-1 bg-transparent outline-none text-sm"
					style={ {
						color: M3.onSurface,
						fontFamily: 'Roboto, sans-serif',
						border: 'none',
					} }
				/>
			</div>
			<FilterChip
				label="Status"
				value={ filterStatus }
				options={ [ 'Active', 'Paused', 'Past Due', 'Pending Cancel', 'Suspended', 'Cancelled', 'Trialing', 'Completed', 'Expired' ] }
				onChange={ onFilterStatusChange }
			/>
			<FilterChip
				label="Product"
				value={ filterProduct }
				options={ productOptions }
				onChange={ onFilterProductChange }
			/>
			<FilterChip
				label="Cycle"
				value={ filterCycle }
				options={ cycleOptions }
				onChange={ onFilterCycleChange }
			/>
			<FilterChip
				label="Type"
				value={ filterType }
				options={ [ 'Software', 'SaaS', 'Membership', 'Download', 'Course', 'Service' ] }
				onChange={ onFilterTypeChange }
			/>
			<FilterChip
				label="Payment Type"
				value={ filterPaymentType }
				options={ [ 'Recurring', 'Split' ] }
				onChange={ onFilterPaymentTypeChange }
			/>
			<FilterChip
				label="Churn Risk"
				value={ filterChurnRisk }
				options={ [ 'Low', 'Medium', 'High', 'Critical' ] }
				onChange={ onFilterChurnRiskChange }
			/>
			{ anyActive && (
				<button
					onClick={ onClearAll }
					className="text-xs px-3 py-1.5 rounded-full"
					style={ {
						color: M3.error,
						border: `1px solid ${ M3.error }`,
						background: 'none',
						cursor: 'pointer',
						fontFamily: 'Roboto, sans-serif',
					} }
				>
					Clear all
				</button>
			) }
			<div className="ml-auto">
				<OutlinedButton small onClick={ onExportCsv }>
					<DownloadIcon size={ 14 } /> Export CSV
				</OutlinedButton>
			</div>
		</div>
	);
}
