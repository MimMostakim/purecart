/**
 * Loading fallback for SaasAccountsPage, shown by the <Suspense> boundary
 * around it in AppRoutes for the true first load this session only. Mirrors
 * the real page's shape — header, 4-card KPI strip, filter bar, 7-column
 * table.
 *
 * @file
 * @since 1.0.0
 */
import { M3 } from '@/theme';
import { Card } from '@/shared/ui/Card';
import { Skeleton } from '@/shared/ui/Skeleton';

const KPI_COUNT = 4;
const COLUMN_COUNT = 7;
const ROW_COUNT = 6;

/** One table cell: flexes to fill its column's share of the row's full width. */
function Cell( { grow = 1, fill = '65%' }: { grow?: number; fill?: number | string } ) {
	return (
		<div style={ { flex: grow, minWidth: 0 } }>
			<Skeleton height={ 14 } width={ fill } />
		</div>
	);
}

/**
 * Renders the SaaS Accounts page's loading skeleton.
 *
 * @since 1.0.0
 *
 * @return {JSX.Element} The skeleton.
 */
export function SaasAccountsPageSkeleton() {
	return (
		<div className="flex flex-col gap-5">
			<div className="flex flex-col gap-2">
				<Skeleton height={ 22 } width={ 180 } />
				<Skeleton height={ 12 } width={ 340 } />
			</div>

			<div className="grid grid-cols-4 gap-3">
				{ Array.from( { length: KPI_COUNT } ).map( ( _, i ) => (
					<Card key={ i } className="p-4 flex flex-col gap-2">
						<Skeleton height={ 12 } width="60%" />
						<Skeleton height={ 24 } width="40%" />
					</Card>
				) ) }
			</div>

			<div className="flex items-center gap-2 flex-wrap">
				<div style={ { flex: '1 1 240px', maxWidth: 320 } }>
					<Skeleton height={ 36 } width="100%" radius={ 18 } />
				</div>
				<Skeleton height={ 32 } width={ 96 } radius={ 16 } />
				<Skeleton height={ 32 } width={ 96 } radius={ 16 } />
				<Skeleton height={ 32 } width={ 96 } radius={ 16 } />
			</div>

			<Card className="p-0 overflow-hidden">
				<div className="flex items-center gap-4 px-4" style={ { height: 44 } }>
					{ Array.from( { length: COLUMN_COUNT } ).map( ( _, i ) => (
						<Cell key={ i } grow={ COLUMN_COUNT - 1 === i ? 0.4 : 1 } fill="45%" />
					) ) }
				</div>
				{ Array.from( { length: ROW_COUNT } ).map( ( _, row ) => (
					<div
						key={ row }
						className="flex items-center gap-4 px-4"
						style={ { height: 56, borderTop: `1px solid ${ M3.outlineVariant }` } }
					>
						{ Array.from( { length: COLUMN_COUNT } ).map( ( _, col ) => (
							<Cell key={ col } grow={ COLUMN_COUNT - 1 === col ? 0.4 : 1 } />
						) ) }
					</div>
				) ) }
			</Card>
		</div>
	);
}
