import {
	Key,
	Filter,
	AlertCircle,
	Download,
	Copy,
	Bell,
	BarChart2,
	Repeat,
	Layers,
	Calendar,
	Globe,
	Mail,
	CheckCircle,
	Users,
	Clock,
	DollarSign,
	UserPlus,
	ShoppingCart,
	Activity,
	Send,
	Settings,
	Shield,
	Ban,
	FileText,
	CreditCard,
	Download as DownloadIcon,
} from 'lucide-react';
import {
	LineChart,
	Line,
	PieChart,
	Pie,
	Cell,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer,
} from 'recharts';
import {
	M3,
	mrrData,
	licenseStatusData,
	recentLicenses,
	recentDownloads,
	expiringLicenses,
} from '../../utils/static-data';
import type { Page } from '../../utils/static-data';
import {
	StatCard,
	Card,
	SectionTitle,
	StatusBadge,
	TextButton,
	Toast,
} from '../ui';
import type { ActionItem, ToastProps } from '../ui';
import { useState } from 'react';

export function OverviewPage( { onNav }: { onNav: ( p: Page ) => void } ) {
	const [ toast, setToast ] = useState< ToastProps >( {
		message: '',
		type: 'success',
		visible: false,
	} );
	const showToast = (
		msg: string,
		type: ToastProps[ 'type' ] = 'success'
	) => {
		setToast( { message: msg, type, visible: true } );
		setTimeout(
			() => setToast( ( t ) => ( { ...t, visible: false } ) ),
			3000
		);
	};

	const licenseActions: ActionItem[] = [
		{
			label: 'View All Licenses',
			icon: Key,
			onClick: () => onNav( 'licenses' ),
		},
		{
			label: 'Filter: Active Only',
			icon: Filter,
			onClick: () => {
				onNav( 'licenses' );
				showToast( 'Filter applied — Active licenses', 'info' );
			},
		},
		{
			label: 'View Expiring Soon',
			icon: AlertCircle,
			onClick: () => {
				onNav( 'licenses' );
				showToast( 'Filtered to expiring licenses', 'info' );
			},
		},
		{
			label: 'Export Active Licenses',
			icon: DownloadIcon,
			onClick: () =>
				showToast( 'Active licenses exported as CSV', 'success' ),
			dividerBefore: true,
		},
		{
			label: 'Copy Count',
			icon: Copy,
			onClick: () => {
				navigator.clipboard?.writeText( '8432' );
				showToast( 'Count copied: 8,432', 'info' );
			},
		},
		{
			label: 'Set Alert Threshold',
			icon: Bell,
			onClick: () => showToast( 'Alert threshold saved', 'success' ),
			dividerBefore: true,
		},
	];

	const mrrActions: ActionItem[] = [
		{
			label: 'View in Analytics',
			icon: BarChart2,
			onClick: () => onNav( 'analytics' ),
		},
		{
			label: 'View Subscription MRR',
			icon: Repeat,
			onClick: () => onNav( 'analytics-subscriptions' ),
		},
		{
			label: 'MRR Breakdown by Product',
			icon: Layers,
			onClick: () =>
				showToast( 'MRR breakdown opened in Analytics', 'info' ),
		},
		{
			label: 'Export Revenue Report',
			icon: DownloadIcon,
			onClick: () =>
				showToast( 'Revenue report exported as CSV', 'success' ),
			dividerBefore: true,
		},
		{
			label: 'Copy Value',
			icon: Copy,
			onClick: () => {
				navigator.clipboard?.writeText( '44600' );
				showToast( 'Value copied: $44,600', 'info' );
			},
		},
		{
			label: 'Set MRR Alert',
			icon: Bell,
			onClick: () => showToast( 'MRR alert threshold saved', 'success' ),
			dividerBefore: true,
		},
	];

	const downloadsActions: ActionItem[] = [
		{
			label: 'View All Downloads',
			icon: Download,
			onClick: () => onNav( 'downloads' ),
		},
		{
			label: 'Filter: This Month',
			icon: Calendar,
			onClick: () => {
				onNav( 'downloads' );
				showToast( 'Filter applied — this month', 'info' );
			},
		},
		{
			label: 'Top Products This Month',
			icon: BarChart2,
			onClick: () => showToast( 'Top products breakdown opened', 'info' ),
		},
		{
			label: 'Top Countries This Month',
			icon: Globe,
			onClick: () =>
				showToast( 'Top countries breakdown opened', 'info' ),
		},
		{
			label: 'Export Download Log',
			icon: DownloadIcon,
			onClick: () =>
				showToast( 'Download log exported as CSV', 'success' ),
			dividerBefore: true,
		},
		{
			label: 'Copy Count',
			icon: Copy,
			onClick: () => {
				navigator.clipboard?.writeText( '12847' );
				showToast( 'Count copied: 12,847', 'info' );
			},
		},
	];

	const expiringActions: ActionItem[] = [
		{
			label: 'View Expiring Licenses',
			icon: Key,
			onClick: () => {
				onNav( 'licenses' );
				showToast( 'Filtered to expiring licenses', 'info' );
			},
		},
		{
			label: 'Send Bulk Reminder',
			icon: Mail,
			onClick: () =>
				showToast( 'Bulk reminder sent to 187 customers', 'success' ),
		},
		{
			label: 'Auto-Extend All (7 days)',
			icon: Calendar,
			onClick: () =>
				showToast(
					'All 187 expiring licenses extended by 7 days',
					'success'
				),
		},
		{
			label: 'Export Expiring List',
			icon: DownloadIcon,
			onClick: () =>
				showToast( 'Expiring licenses exported as CSV', 'success' ),
			dividerBefore: true,
		},
		{
			label: 'Copy Count',
			icon: Copy,
			onClick: () => {
				navigator.clipboard?.writeText( '187' );
				showToast( 'Count copied: 187', 'info' );
			},
		},
		{
			label: 'Change Alert Window',
			icon: Bell,
			onClick: () =>
				showToast( 'Alert window updated to 30 days', 'success' ),
			dividerBefore: true,
		},
	];

	const subscriptionsActions: ActionItem[] = [
		{
			label: 'View All Subscriptions',
			icon: Repeat,
			onClick: () => onNav( 'subscriptions' ),
		},
		{
			label: 'View Active Only',
			icon: CheckCircle,
			onClick: () => {
				onNav( 'subscriptions' );
				showToast( 'Filtered to active subscriptions', 'info' );
			},
		},
		{
			label: 'View Past Due',
			icon: AlertCircle,
			onClick: () => {
				onNav( 'subscriptions' );
				showToast( 'Filtered to past-due subscriptions', 'info' );
			},
		},
		{
			label: 'Subscription Analytics',
			icon: BarChart2,
			onClick: () => onNav( 'analytics-subscriptions' ),
		},
		{
			label: 'Export Subscriptions',
			icon: DownloadIcon,
			onClick: () =>
				showToast( 'Subscriptions exported as CSV', 'success' ),
			dividerBefore: true,
		},
		{
			label: 'Copy Active Count',
			icon: Copy,
			onClick: () => {
				navigator.clipboard?.writeText( '5241' );
				showToast( 'Count copied: 5,241', 'info' );
			},
		},
		{
			label: 'Set Churn Alert',
			icon: Bell,
			onClick: () => showToast( 'Churn rate alert saved', 'success' ),
			dividerBefore: true,
		},
	];

	const affiliatesActions: ActionItem[] = [
		{
			label: 'View All Affiliates',
			icon: Users,
			onClick: () => onNav( 'affiliates' ),
		},
		{
			label: 'View Pending Approvals',
			icon: Clock,
			onClick: () => {
				onNav( 'affiliates' );
				showToast( 'Filtered to pending affiliates', 'info' );
			},
		},
		{
			label: 'Affiliate Analytics',
			icon: BarChart2,
			onClick: () => onNav( 'analytics-affiliates' ),
		},
		{
			label: 'Pay All Commissions',
			icon: DollarSign,
			onClick: () =>
				showToast(
					'Commission payments queued for all active affiliates',
					'success'
				),
		},
		{
			label: 'Export Affiliate Report',
			icon: DownloadIcon,
			onClick: () =>
				showToast( 'Affiliate report exported as CSV', 'success' ),
			dividerBefore: true,
		},
		{
			label: 'Copy Total Clicks',
			icon: Copy,
			onClick: () => {
				navigator.clipboard?.writeText( '17490' );
				showToast( 'Count copied: 17,490', 'info' );
			},
		},
		{
			label: 'Add New Affiliate',
			icon: UserPlus,
			onClick: () => {
				onNav( 'affiliates' );
				showToast( 'New affiliate form opened', 'info' );
			},
			dividerBefore: true,
		},
	];

	const abandonedCartActions: ActionItem[] = [
		{
			label: 'View All Carts',
			icon: ShoppingCart,
			onClick: () => onNav( 'abandoned-cart' ),
		},
		{
			label: 'View Recovering',
			icon: Activity,
			onClick: () => {
				onNav( 'abandoned-cart' );
				showToast( 'Filtered to recovering carts', 'info' );
			},
		},
		{
			label: 'Abandoned Cart Analytics',
			icon: BarChart2,
			onClick: () => onNav( 'analytics-abandoned-cart' ),
		},
		{
			label: 'Send All Recovery Emails',
			icon: Send,
			onClick: () =>
				showToast(
					'Recovery emails queued for all eligible carts',
					'success'
				),
		},
		{
			label: 'Export Cart Report',
			icon: DownloadIcon,
			onClick: () =>
				showToast( 'Abandoned cart report exported as CSV', 'success' ),
			dividerBefore: true,
		},
		{
			label: 'Copy Abandoned Count',
			icon: Copy,
			onClick: () => {
				navigator.clipboard?.writeText( '1340' );
				showToast( 'Count copied: 1,340', 'info' );
			},
		},
		{
			label: 'Configure Email Sequence',
			icon: Settings,
			onClick: () => {
				onNav( 'settings' );
				showToast( 'Abandoned Cart settings opened', 'info' );
			},
			dividerBefore: true,
		},
	];

	const securityActions: ActionItem[] = [
		{
			label: 'View Security Dashboard',
			icon: Shield,
			onClick: () => onNav( 'security' ),
		},
		{
			label: 'View IP Blocklist',
			icon: Ban,
			onClick: () => {
				onNav( 'security' );
				showToast( 'IP Blocklist tab opened', 'info' );
			},
		},
		{
			label: 'View Suspicious Downloads',
			icon: AlertCircle,
			onClick: () => {
				onNav( 'security' );
				showToast( 'Suspicious Downloads tab opened', 'info' );
			},
		},
		{
			label: 'View Audit Log',
			icon: FileText,
			onClick: () => {
				onNav( 'security' );
				showToast( 'Audit Log tab opened', 'info' );
			},
		},
		{
			label: 'Export Security Report',
			icon: DownloadIcon,
			onClick: () =>
				showToast( 'Security report exported as CSV', 'success' ),
			dividerBefore: true,
		},
		{
			label: 'Copy Blocked IP Count',
			icon: Copy,
			onClick: () => {
				navigator.clipboard?.writeText( '8' );
				showToast( 'Count copied: 8', 'info' );
			},
		},
		{
			label: 'Configure Firewall Rules',
			icon: Settings,
			onClick: () => {
				onNav( 'security' );
				showToast( 'Firewall Rules tab opened', 'info' );
			},
			dividerBefore: true,
		},
	];

	return (
		<div className="flex flex-col gap-6">
			<div className="grid grid-cols-4 gap-4">
				<StatCard
					icon={ Key }
					label="Active Licenses"
					value="8,432"
					trend="▲ +124 this month"
					trendUp
					actions={ licenseActions }
				/>
				<StatCard
					icon={ CreditCard }
					label="Monthly Recurring Revenue"
					value="$44,600"
					trend="▲ +8.3% MoM"
					trendUp
					actions={ mrrActions }
				/>
				<StatCard
					icon={ Download }
					label="Downloads This Month"
					value="12,847"
					trend="▲ +2,104 vs last"
					trendUp
					actions={ downloadsActions }
				/>
				<StatCard
					icon={ AlertCircle }
					label="Expiring Soon (30d)"
					value="187"
					trend="▼ needs attention"
					trendUp={ false }
					warning
					actions={ expiringActions }
				/>
			</div>

			<div className="grid grid-cols-4 gap-4">
				<StatCard
					icon={ Repeat }
					label="Active Subscriptions"
					value="5,241"
					trend="▲ +141 this month"
					trendUp
					actions={ subscriptionsActions }
				/>
				<StatCard
					icon={ Users }
					label="Active Affiliates"
					value="6"
					trend="▲ +1 this month"
					trendUp
					actions={ affiliatesActions }
				/>
				<StatCard
					icon={ ShoppingCart }
					label="Abandoned Carts (30d)"
					value="1,340"
					trend="▼ +4.7% vs last"
					trendUp={ false }
					actions={ abandonedCartActions }
				/>
				<StatCard
					icon={ Shield }
					label="Security Threats Blocked"
					value="8"
					trend="▲ +3 today"
					trendUp={ false }
					warning
					actions={ securityActions }
				/>
			</div>

			<div
				className="grid gap-4"
				style={ { gridTemplateColumns: '3fr 2fr' } }
			>
				<Card className="p-5">
					<SectionTitle>MRR &amp; ARR Trend — 12 months</SectionTitle>
					<ResponsiveContainer width="100%" height={ 220 }>
						<LineChart data={ mrrData }>
							<CartesianGrid
								strokeDasharray="3 3"
								stroke={ M3.outlineVariant }
							/>
							<XAxis
								dataKey="month"
								tick={ {
									fontSize: 11,
									fill: M3.onSurfaceVariant,
								} }
							/>
							<YAxis
								tick={ {
									fontSize: 11,
									fill: M3.onSurfaceVariant,
								} }
								tickFormatter={ ( v ) =>
									`$${ ( v / 1000 ).toFixed( 0 ) }k`
								}
							/>
							<Tooltip
								formatter={ ( v: number ) =>
									`$${ v.toLocaleString() }`
								}
								contentStyle={ {
									borderRadius: 8,
									border: `1px solid ${ M3.outlineVariant }`,
									fontFamily: 'Roboto, sans-serif',
								} }
							/>
							<Legend
								wrapperStyle={ {
									fontSize: 11,
									fontFamily: 'Roboto, sans-serif',
								} }
							/>
							<Line
								type="monotone"
								dataKey="mrr"
								name="MRR"
								stroke={ M3.primary }
								strokeWidth={ 2 }
								dot={ false }
							/>
							<Line
								type="monotone"
								dataKey="arr"
								name="ARR"
								stroke={ M3.secondary }
								strokeWidth={ 2 }
								dot={ false }
								strokeDasharray="5 3"
							/>
						</LineChart>
					</ResponsiveContainer>
				</Card>

				<Card className="p-5">
					<SectionTitle>License Status</SectionTitle>
					<ResponsiveContainer width="100%" height={ 180 }>
						<PieChart>
							<Pie
								data={ licenseStatusData }
								cx="50%"
								cy="50%"
								innerRadius={ 50 }
								outerRadius={ 80 }
								dataKey="value"
								paddingAngle={ 2 }
							>
								{ licenseStatusData.map( ( entry, i ) => (
									<Cell key={ i } fill={ entry.color } />
								) ) }
							</Pie>
							<Tooltip
								contentStyle={ {
									borderRadius: 8,
									border: `1px solid ${ M3.outlineVariant }`,
									fontFamily: 'Roboto, sans-serif',
								} }
							/>
						</PieChart>
					</ResponsiveContainer>
					<div className="flex flex-col gap-1 mt-2">
						{ licenseStatusData.map( ( d ) => (
							<div
								key={ d.name }
								className="flex items-center justify-between text-xs"
								style={ { fontFamily: 'Roboto, sans-serif' } }
							>
								<div className="flex items-center gap-2">
									<div
										className="w-2.5 h-2.5 rounded-full"
										style={ { backgroundColor: d.color } }
									/>
									<span
										style={ { color: M3.onSurfaceVariant } }
									>
										{ d.name }
									</span>
								</div>
								<span
									className="font-medium"
									style={ { color: M3.onSurface } }
								>
									{ d.value.toLocaleString() }
								</span>
							</div>
						) ) }
					</div>
				</Card>
			</div>

			<div className="grid grid-cols-3 gap-4">
				<Card className="p-4">
					<div className="flex items-center justify-between mb-3">
						<span
							className="font-medium text-sm"
							style={ {
								color: M3.onSurface,
								fontFamily: 'Roboto, sans-serif',
							} }
						>
							Recent Licenses
						</span>
						<TextButton onClick={ () => onNav( 'licenses' ) }>
							View all
						</TextButton>
					</div>
					<div className="flex flex-col gap-1">
						{ recentLicenses.map( ( l ) => (
							<div
								key={ l.key }
								className="flex items-center gap-2 py-1.5 px-2 rounded-lg transition-all"
								style={ { cursor: 'pointer' } }
								onMouseEnter={ ( e ) => {
									(
										e.currentTarget as HTMLElement
									 ).style.backgroundColor =
										M3.surfaceContainerLow;
								} }
								onMouseLeave={ ( e ) => {
									(
										e.currentTarget as HTMLElement
									 ).style.backgroundColor = 'transparent';
								} }
							>
								<StatusBadge status={ l.status } />
								<div className="flex-1 min-w-0">
									<div
										className="text-xs font-medium truncate"
										style={ {
											color: M3.onSurface,
											fontFamily:
												'Roboto Mono, monospace',
										} }
									>
										{ l.key }
									</div>
									<div
										className="text-xs truncate"
										style={ {
											color: M3.onSurfaceVariant,
											fontFamily: 'Roboto, sans-serif',
										} }
									>
										{ l.product }
									</div>
								</div>
								<span
									className="text-xs flex-shrink-0"
									style={ {
										color: M3.onSurfaceVariant,
										fontFamily: 'Roboto, sans-serif',
									} }
								>
									{ l.date }
								</span>
							</div>
						) ) }
					</div>
				</Card>

				<Card className="p-4">
					<div className="flex items-center justify-between mb-3">
						<span
							className="font-medium text-sm"
							style={ {
								color: M3.onSurface,
								fontFamily: 'Roboto, sans-serif',
							} }
						>
							Recent Downloads
						</span>
						<TextButton onClick={ () => onNav( 'downloads' ) }>
							View all
						</TextButton>
					</div>
					<div className="flex flex-col gap-1">
						{ recentDownloads.map( ( d, i ) => (
							<div
								key={ i }
								className="flex items-center gap-2 py-1.5 px-2 rounded-lg"
							>
								<span className="text-base leading-none">
									{ d.country }
								</span>
								<div className="flex-1 min-w-0">
									<div
										className="text-xs font-medium truncate"
										style={ {
											color: M3.onSurface,
											fontFamily: 'Roboto, sans-serif',
										} }
									>
										{ d.product }
									</div>
									<div
										className="text-xs truncate"
										style={ {
											color: M3.onSurfaceVariant,
											fontFamily:
												'Roboto Mono, monospace',
										} }
									>
										{ d.ip }
									</div>
								</div>
								<span
									className="text-xs flex-shrink-0"
									style={ {
										color: M3.onSurfaceVariant,
										fontFamily: 'Roboto, sans-serif',
									} }
								>
									{ d.time }
								</span>
							</div>
						) ) }
					</div>
				</Card>

				<Card className="p-4">
					<div className="flex items-center justify-between mb-3">
						<span
							className="font-medium text-sm"
							style={ {
								color: M3.onSurface,
								fontFamily: 'Roboto, sans-serif',
							} }
						>
							Expiring Soon
						</span>
						<TextButton onClick={ () => onNav( 'licenses' ) }>
							View all
						</TextButton>
					</div>
					<div className="flex flex-col gap-1">
						{ expiringLicenses.map( ( l ) => (
							<div
								key={ l.key }
								className="flex items-center gap-2 py-1.5 px-2 rounded-lg"
							>
								<div
									className="flex items-center justify-center w-7 h-7 rounded-full flex-shrink-0 text-xs font-bold"
									style={ {
										backgroundColor: M3.warningContainer,
										color: M3.warning,
										fontFamily: 'Roboto, sans-serif',
									} }
								>
									{ l.expiresIn.split( ' ' )[ 0 ] }
								</div>
								<div className="flex-1 min-w-0">
									<div
										className="text-xs font-medium truncate"
										style={ {
											color: M3.onSurface,
											fontFamily: 'Roboto, sans-serif',
										} }
									>
										{ l.customer }
									</div>
									<div
										className="text-xs truncate"
										style={ {
											color: M3.onSurfaceVariant,
											fontFamily: 'Roboto, sans-serif',
										} }
									>
										{ l.product }
									</div>
								</div>
								<TextButton
									small
									onClick={ () =>
										showToast(
											`Reminder sent to ${ l.customer }`,
											'success'
										)
									}
								>
									Remind
								</TextButton>
							</div>
						) ) }
					</div>
				</Card>
			</div>
			<Toast
				message={ toast.message }
				type={ toast.type }
				visible={ toast.visible }
			/>
		</div>
	);
}
