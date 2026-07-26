export function isInDateRange( dateStr: string, range: string ): boolean {
	if ( ! range || range === 'All time' ) return true;
	const d = new Date( dateStr.replace( ' ', 'T' ) );
	if ( isNaN( d.getTime() ) ) return true;
	const msPerDay = 86400000;
	const now = Date.now();
	const days: Record< string, number > = {
		Today: 1,
		'This week': 7,
		'This month': 30,
		'Last 3 months': 90,
		'Last year': 365,
	};
	const n = days[ range ];
	return !! n && d.getTime() >= now - n * msPerDay;
}
