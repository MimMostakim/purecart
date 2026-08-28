import type { SubscriptionSettings } from '../Subscriptions/types';

/** Shared prop shape every Settings section component receives. */
export interface SettingsSectionProps {
	settings: SubscriptionSettings;
	update: < K extends keyof SubscriptionSettings >( key: K, value: SubscriptionSettings[ K ] ) => void;
}

/** Converts a number[] setting to a comma-separated display string, e.g. [1, 3, 5] -> '1, 3, 5'. */
export function numbersToCsv( values: number[] ): string {
	return values.join( ', ' );
}

/** Parses a comma-separated string back into a number[], dropping anything that doesn't parse. */
export function csvToNumbers( text: string ): number[] {
	return text
		.split( ',' )
		.map( ( s ) => parseInt( s.trim(), 10 ) )
		.filter( ( n ) => ! isNaN( n ) );
}
