import { useState } from 'react';
import {
	Ban,
	AlertCircle,
	CheckCircle,
	Settings,
	Shield,
	Download,
	Globe,
	Copy,
	Clock,
	XCircle,
	Users,
	RotateCcw,
	ShieldCheck,
	Key,
	Edit3,
	FileText,
	Layers,
	PauseCircle,
	Trash2,
	Search,
	Zap,
	Download as DownloadIcon,
} from 'lucide-react';
import {
	AreaChart,
	Area,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer,
} from 'recharts';
import {
	M3,
	blockedIPsData,
	loginAttemptsData,
	suspiciousDownloadsData,
	firewallRulesData,
	threatTrendData,
	auditLogData,
	SEVERITIES,
	BLOCK_DURATIONS,
	RULE_TYPES,
	RULE_ACTIONS,
} from '../../utils/static-data';
import {
	Card,
	KpiCard,
	SectionTitle,
	FilledButton,
	IconButton,
	TextButton,
	TonalButton,
	Toggle,
	ActionDropdown,
	ConfirmDialog,
	Toast,
	OutlinedButton,
} from '../ui';
import type { ToastProps, ActionItem } from '../ui';

export function SecurityPage() {
	const [ tab, setTab ] = useState<
		'overview' | 'blocklist' | 'logins' | 'downloads' | 'firewall' | 'audit'
	>( 'overview' );
	const [ blockedIPs, setBlockedIPs ] = useState( blockedIPsData );
	const [ loginAttempts, setLoginAttempts ] = useState( loginAttemptsData );
	const [ suspDownloads, setSuspDownloads ] = useState(
		suspiciousDownloadsData
	);
	const [ firewallRules, setFirewallRules ] = useState( firewallRulesData );
	const [ search, setSearch ] = useState( '' );
	const [ toast, setToast ] = useState< ToastProps >( {
		message: '',
		type: 'success',
		visible: false,
	} );
	const [ dialog, setDialog ] = useState< {
		open: boolean;
		title: string;
		body: React.ReactNode;
		confirmLabel: string;
		danger: boolean;
		icon?: React.ElementType;
		onConfirm: () => void;
	} >( {
		open: false,
		title: '',
		body: null,
		confirmLabel: '',
		danger: false,
		onConfirm: () => {},
	} );

	// Block IP form state
	const [ blockIPOpen, setBlockIPOpen ] = useState( false );
	const [ biIP, setBiIP ] = useState( '' );
	const [ biReason, setBiReason ] = useState( '' );
	const [ biSeverity, setBiSeverity ] =
		useState< ( typeof SEVERITIES )[ number ] >( 'high' );
	const [ biDuration, setBiDuration ] =
		useState< ( typeof BLOCK_DURATIONS )[ number ] >( '24 hours' );

	// Add Rule form state
	const [ addRuleOpen, setAddRuleOpen ] = useState( false );
	const [ arName, setArName ] = useState( '' );
	const [ arType, setArType ] =
		useState< ( typeof RULE_TYPES )[ number ] >( 'rate-limit' );
	const [ arTarget, setArTarget ] = useState( '' );
	const [ arLimit, setArLimit ] = useState( '' );
	const [ arAction, setArAction ] =
		useState< ( typeof RULE_ACTIONS )[ number ] >( 'block' );
	const [ arEnabled, setArEnabled ] = useState( true );

	// Edit Rule state
	const [ editRuleRow, setEditRuleRow ] = useState<
		( typeof firewallRulesData )[ 0 ] | null
	>( null );
	const [ erName, setErName ] = useState( '' );
	const [ erLimit, setErLimit ] = useState( '' );

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
	const openDialog = ( opts: typeof dialog ) => setDialog( opts );
	const closeDialog = () => setDialog( ( d ) => ( { ...d, open: false } ) );

	const severityStyle: Record<
		string,
		{ bg: string; text: string; dot: string }
	> = {
		critical: { bg: '#FFDAD6', text: M3.error, dot: M3.error },
		high: { bg: '#FFDEA5', text: '#5C4200', dot: M3.warning },
		medium: {
			bg: M3.primaryContainer,
			text: M3.onPrimaryContainer,
			dot: M3.primary,
		},
		low: {
			bg: M3.surfaceContainerHigh,
			text: M3.onSurfaceVariant,
			dot: M3.outline,
		},
		info: { bg: M3.infoContainer, text: M3.info, dot: M3.info },
	};

	const auditIcon: Record<
		string,
		{ icon: React.ElementType; color: string }
	> = {
		block: { icon: Ban, color: M3.error },
		alert: { icon: AlertCircle, color: M3.warning },
		unblock: { icon: CheckCircle, color: M3.success },
		config: { icon: Settings, color: M3.primary },
		rule: { icon: Shield, color: M3.secondary },
	};

	const tabs = [
		{ id: 'overview' as const, label: 'Overview' },
		{
			id: 'blocklist' as const,
			label: `IP Blocklist (${ blockedIPs.length })`,
		},
		{
			id: 'logins' as const,
			label: `Login Attempts (${ loginAttempts.length })`,
		},
		{
			id: 'downloads' as const,
			label: `Suspicious Downloads (${ suspDownloads.length })`,
		},
		{
			id: 'firewall' as const,
			label: `Firewall Rules (${ firewallRules.length })`,
		},
		{ id: 'audit' as const, label: 'Audit Log' },
	];

	// ── Block IP submit ────────────────────────────────────────────────────────
	const handleBlockIP = () => {
		if ( ! biIP.trim() ) {
			showToast( 'Enter an IP address', 'error' );
			return;
		}
		const newBlock = {
			id: Date.now(),
			ip: biIP.trim(),
			country: 'Unknown',
			flag: '🌐',
			reason: biReason.trim() || 'Manually blocked by admin',
			severity: biSeverity,
			blocked: new Date()
				.toISOString()
				.replace( 'T', ' ' )
				.slice( 0, 16 ),
			expires:
				biDuration === 'Permanent'
					? 'Permanent'
					: new Date(
							Date.now() +
								( biDuration === '24 hours'
									? 864e5
									: biDuration === '7 days'
									? 6048e5
									: 2592e6 )
					  )
							.toISOString()
							.replace( 'T', ' ' )
							.slice( 0, 16 ),
			hits: 0,
		};
		setBlockedIPs( ( d ) => [ newBlock, ...d ] );
		showToast( `${ biIP } blocked (${ biDuration })`, 'error' );
		setBlockIPOpen( false );
		setBiIP( '' );
		setBiReason( '' );
		setBiSeverity( 'high' );
		setBiDuration( '24 hours' );
		setTab( 'blocklist' );
	};

	// ── Add Rule submit ─────────────────────────────────────────────────────────
	const handleAddRule = () => {
		if ( ! arName.trim() || ! arTarget.trim() ) {
			showToast( 'Name and target are required', 'error' );
			return;
		}
		const newRule = {
			id: Date.now(),
			name: arName.trim(),
			type: arType,
			target: arTarget.trim(),
			limit: arLimit.trim() || 'ALL requests',
			action: arAction,
			enabled: arEnabled,
			hits: 0,
		};
		setFirewallRules( ( d ) => [ ...d, newRule ] );
		showToast( `Rule "${ arName }" created`, 'success' );
		setAddRuleOpen( false );
		setArName( '' );
		setArType( 'rate-limit' );
		setArTarget( '' );
		setArLimit( '' );
		setArAction( 'block' );
		setArEnabled( true );
		setTab( 'firewall' );
	};

	/* ── Blocked IP actions ─────────────────────────────── */
	const blockedIPActions = (
		row: ( typeof blockedIPs )[ 0 ]
	): ActionItem[] => [
		{
			label: 'View Download History',
			icon: Download,
			onClick: () =>
				showToast( `Download history for ${ row.ip } opened`, 'info' ),
		},
		{
			label: 'Lookup IP Reputation',
			icon: Globe,
			onClick: () => showToast( `WHOIS for ${ row.ip } opened`, 'info' ),
		},
		{
			label: 'Copy IP Address',
			icon: Copy,
			onClick: () => {
				navigator.clipboard?.writeText( row.ip );
				showToast( 'IP copied', 'info' );
			},
		},
		{
			label: 'Add to Allowlist',
			icon: CheckCircle,
			dividerBefore: true,
			onClick: () =>
				openDialog( {
					open: true,
					danger: false,
					icon: CheckCircle,
					title: 'Add to Allowlist?',
					body: (
						<span>
							Add{ ' ' }
							<strong
								style={ {
									fontFamily: 'Roboto Mono, monospace',
								} }
							>
								{ row.ip }
							</strong>{ ' ' }
							to the permanent allowlist? It will never be
							auto-blocked again.
						</span>
					),
					confirmLabel: 'Add to Allowlist',
					onConfirm: () => {
						setBlockedIPs( ( d ) =>
							d.filter( ( r ) => r.id !== row.id )
						);
						showToast(
							`${ row.ip } added to allowlist`,
							'success'
						);
						closeDialog();
					},
				} ),
		},
		{
			label: 'Extend Block (7 days)',
			icon: Clock,
			onClick: () =>
				openDialog( {
					open: true,
					danger: false,
					icon: Clock,
					title: 'Extend Block?',
					body: (
						<span>
							Extend the block on{ ' ' }
							<strong
								style={ {
									fontFamily: 'Roboto Mono, monospace',
								} }
							>
								{ row.ip }
							</strong>{ ' ' }
							by 7 more days?
						</span>
					),
					confirmLabel: 'Extend 7 Days',
					onConfirm: () => {
						showToast(
							`Block on ${ row.ip } extended by 7 days`,
							'success'
						);
						closeDialog();
					},
				} ),
		},
		{
			label: 'Change to Permanent',
			icon: Ban,
			disabled: row.expires === 'Permanent',
			onClick: () =>
				openDialog( {
					open: true,
					danger: true,
					icon: Ban,
					title: 'Make Block Permanent?',
					body: (
						<span>
							Make the block on{ ' ' }
							<strong
								style={ {
									fontFamily: 'Roboto Mono, monospace',
								} }
							>
								{ row.ip }
							</strong>{ ' ' }
							permanent? It will never expire automatically.
						</span>
					),
					confirmLabel: 'Make Permanent',
					onConfirm: () => {
						setBlockedIPs( ( d ) =>
							d.map( ( r ) =>
								r.id === row.id
									? { ...r, expires: 'Permanent' }
									: r
							)
						);
						showToast( `${ row.ip } permanently blocked`, 'error' );
						closeDialog();
					},
				} ),
		},
		{
			label: 'Unblock IP',
			icon: XCircle,
			danger: true,
			dividerBefore: true,
			onClick: () =>
				openDialog( {
					open: true,
					danger: true,
					icon: XCircle,
					title: 'Unblock IP?',
					body: (
						<span>
							Remove the block on{ ' ' }
							<strong
								style={ {
									fontFamily: 'Roboto Mono, monospace',
								} }
							>
								{ row.ip }
							</strong>
							? This IP had{ ' ' }
							<strong>{ row.hits } recorded hits</strong>.
							Unblocking may allow further attacks.
						</span>
					),
					confirmLabel: 'Unblock IP',
					onConfirm: () => {
						setBlockedIPs( ( d ) =>
							d.filter( ( r ) => r.id !== row.id )
						);
						showToast( `${ row.ip } unblocked`, 'warning' );
						closeDialog();
					},
				} ),
		},
		{
			label: 'Delete Record',
			icon: Trash2,
			danger: true,
			onClick: () =>
				openDialog( {
					open: true,
					danger: true,
					icon: Trash2,
					title: 'Delete Block Record?',
					body: (
						<span>
							Permanently delete the block record for{ ' ' }
							<strong
								style={ {
									fontFamily: 'Roboto Mono, monospace',
								} }
							>
								{ row.ip }
							</strong>
							? The IP will not be blocked after deletion.
						</span>
					),
					confirmLabel: 'Delete Record',
					onConfirm: () => {
						setBlockedIPs( ( d ) =>
							d.filter( ( r ) => r.id !== row.id )
						);
						showToast( `${ row.ip } record deleted`, 'error' );
						closeDialog();
					},
				} ),
		},
	];

	/* ── Login attempt actions ──────────────────────────── */
	const loginActions = (
		row: ( typeof loginAttempts )[ 0 ]
	): ActionItem[] => [
		{
			label: 'View Customer',
			icon: Users,
			onClick: () =>
				showToast(
					`Customer profile for ${ row.email } opened`,
					'info'
				),
		},
		{
			label: 'Copy IP Address',
			icon: Copy,
			onClick: () => {
				navigator.clipboard?.writeText( row.ip );
				showToast( 'IP copied', 'info' );
			},
		},
		{
			label: 'Block IP Now',
			icon: Ban,
			danger: true,
			dividerBefore: true,
			disabled: row.status === 'blocked',
			onClick: () =>
				openDialog( {
					open: true,
					danger: true,
					icon: Ban,
					title: 'Block IP?',
					body: (
						<span>
							Block{ ' ' }
							<strong
								style={ {
									fontFamily: 'Roboto Mono, monospace',
								} }
							>
								{ row.ip }
							</strong>
							? All requests will be rejected immediately.{ ' ' }
							{ row.attempts } failed login attempts recorded.
						</span>
					),
					confirmLabel: 'Block IP',
					onConfirm: () => {
						setLoginAttempts( ( d ) =>
							d.map( ( r ) =>
								r.id === row.id
									? { ...r, status: 'blocked' }
									: r
							)
						);
						showToast( `${ row.ip } blocked`, 'error' );
						closeDialog();
					},
				} ),
		},
		{
			label: 'Force Password Reset',
			icon: RotateCcw,
			onClick: () =>
				openDialog( {
					open: true,
					danger: false,
					icon: RotateCcw,
					title: 'Force Password Reset?',
					body: (
						<span>
							Send a forced password reset link to{ ' ' }
							<strong>{ row.email }</strong>? Their current
							session will be invalidated.
						</span>
					),
					confirmLabel: 'Send Reset',
					onConfirm: () => {
						showToast(
							`Password reset sent to ${ row.email }`,
							'success'
						);
						closeDialog();
					},
				} ),
		},
		{
			label: 'Whitelist IP',
			icon: ShieldCheck,
			onClick: () =>
				openDialog( {
					open: true,
					danger: false,
					icon: ShieldCheck,
					title: 'Whitelist IP?',
					body: (
						<span>
							Add{ ' ' }
							<strong
								style={ {
									fontFamily: 'Roboto Mono, monospace',
								} }
							>
								{ row.ip }
							</strong>{ ' ' }
							to the permanent allowlist? It will never be
							auto-blocked.
						</span>
					),
					confirmLabel: 'Whitelist IP',
					onConfirm: () => {
						setLoginAttempts( ( d ) =>
							d.filter( ( r ) => r.id !== row.id )
						);
						showToast( `${ row.ip } whitelisted`, 'success' );
						closeDialog();
					},
				} ),
		},
		{
			label: 'Dismiss Alert',
			icon: XCircle,
			onClick: () =>
				openDialog( {
					open: true,
					danger: false,
					icon: XCircle,
					title: 'Dismiss Alert?',
					body: (
						<span>
							Dismiss the login alert for{ ' ' }
							<strong
								style={ {
									fontFamily: 'Roboto Mono, monospace',
								} }
							>
								{ row.ip }
							</strong>
							? It will be removed from the monitoring list.
						</span>
					),
					confirmLabel: 'Dismiss',
					onConfirm: () => {
						setLoginAttempts( ( d ) =>
							d.filter( ( r ) => r.id !== row.id )
						);
						showToast( 'Alert dismissed', 'info' );
						closeDialog();
					},
				} ),
		},
	];

	/* ── Suspicious download actions ────────────────────── */
	const suspDownloadActions = (
		row: ( typeof suspDownloads )[ 0 ]
	): ActionItem[] => [
		{
			label: 'View License Detail',
			icon: Key,
			onClick: () =>
				showToast( `License ${ row.license } opened`, 'info' ),
		},
		{
			label: 'View Customer',
			icon: Users,
			onClick: () => showToast( `Viewing ${ row.customer }`, 'info' ),
			disabled: row.customer === 'Unknown',
		},
		{
			label: 'Copy IP Address',
			icon: Copy,
			onClick: () => {
				navigator.clipboard?.writeText( row.ip );
				showToast( 'IP copied', 'info' );
			},
		},
		{
			label: 'Mark as Safe',
			icon: ShieldCheck,
			dividerBefore: true,
			onClick: () =>
				openDialog( {
					open: true,
					danger: false,
					icon: ShieldCheck,
					title: 'Mark as Safe?',
					body: (
						<span>
							Clear the suspicious flag on this download by{ ' ' }
							<strong>{ row.customer }</strong>? It will be
							removed from the suspicious list.
						</span>
					),
					confirmLabel: 'Mark Safe',
					onConfirm: () => {
						setSuspDownloads( ( d ) =>
							d.filter( ( r ) => r.id !== row.id )
						);
						showToast(
							'Download marked safe & dismissed',
							'success'
						);
						closeDialog();
					},
				} ),
		},
		{
			label: 'Block IP',
			icon: Ban,
			danger: true,
			onClick: () =>
				openDialog( {
					open: true,
					danger: true,
					icon: Ban,
					title: 'Block IP?',
					body: (
						<span>
							Block{ ' ' }
							<strong
								style={ {
									fontFamily: 'Roboto Mono, monospace',
								} }
							>
								{ row.ip }
							</strong>{ ' ' }
							({ row.country }) from all endpoints?
						</span>
					),
					confirmLabel: 'Block IP',
					onConfirm: () => {
						setBlockedIPs( ( d ) => [
							{
								id: Date.now(),
								ip: row.ip,
								country: row.country,
								flag: row.flag,
								reason: row.reason,
								severity: row.severity as any,
								blocked: new Date()
									.toISOString()
									.slice( 0, 16 )
									.replace( 'T', ' ' ),
								expires: '24 hours',
								hits: 1,
							},
							...d,
						] );
						showToast( `${ row.ip } blocked`, 'error' );
						closeDialog();
					},
				} ),
		},
		{
			label: 'Revoke License',
			icon: XCircle,
			danger: true,
			onClick: () =>
				openDialog( {
					open: true,
					danger: true,
					icon: XCircle,
					title: 'Revoke License?',
					body: (
						<span>
							Revoke{ ' ' }
							<strong
								style={ {
									fontFamily: 'Roboto Mono, monospace',
								} }
							>
								{ row.license }
							</strong>
							? All site activations will be immediately
							invalidated.
						</span>
					),
					confirmLabel: 'Revoke License',
					onConfirm: () => {
						setSuspDownloads( ( d ) =>
							d.filter( ( r ) => r.id !== row.id )
						);
						showToast(
							`License ${ row.license } revoked`,
							'error'
						);
						closeDialog();
					},
				} ),
		},
		{
			label: 'Delete Record',
			icon: Trash2,
			danger: true,
			dividerBefore: true,
			onClick: () =>
				openDialog( {
					open: true,
					danger: true,
					icon: Trash2,
					title: 'Delete Record?',
					body: (
						<span>
							Permanently delete this suspicious download record
							for <strong>{ row.customer }</strong>? This cannot
							be undone.
						</span>
					),
					confirmLabel: 'Delete Record',
					onConfirm: () => {
						setSuspDownloads( ( d ) =>
							d.filter( ( r ) => r.id !== row.id )
						);
						showToast( 'Record deleted', 'error' );
						closeDialog();
					},
				} ),
		},
	];

	/* ── Firewall rule actions ──────────────────────────── */
	const firewallActions = (
		row: ( typeof firewallRules )[ 0 ]
	): ActionItem[] => [
		{
			label: 'Edit Rule',
			icon: Edit3,
			onClick: () => {
				setErName( row.name );
				setErLimit( row.limit );
				setEditRuleRow( row );
			},
		},
		{
			label: 'View Hit Logs',
			icon: FileText,
			onClick: () =>
				showToast( `Hit log for "${ row.name }" opened`, 'info' ),
		},
		{
			label: 'Duplicate Rule',
			icon: Layers,
			onClick: () =>
				openDialog( {
					open: true,
					danger: false,
					icon: Layers,
					title: 'Duplicate Rule?',
					body: (
						<span>
							Create a copy of <strong>"{ row.name }"</strong>?
							The duplicate will be disabled by default.
						</span>
					),
					confirmLabel: 'Duplicate',
					onConfirm: () => {
						setFirewallRules( ( d ) => [
							...d,
							{
								...row,
								id: Date.now(),
								name: `${ row.name } (copy)`,
								hits: 0,
								enabled: false,
							},
						] );
						showToast( 'Rule duplicated', 'success' );
						closeDialog();
					},
				} ),
		},
		{
			label: row.enabled ? 'Disable Rule' : 'Enable Rule',
			icon: row.enabled ? PauseCircle : CheckCircle,
			dividerBefore: true,
			onClick: () =>
				openDialog( {
					open: true,
					danger: row.enabled,
					icon: row.enabled ? PauseCircle : CheckCircle,
					title: row.enabled ? 'Disable Rule?' : 'Enable Rule?',
					body: row.enabled ? (
						<span>
							Disable <strong>"{ row.name }"</strong>? Threats
							matching this rule will no longer be blocked.
						</span>
					) : (
						<span>
							Enable <strong>"{ row.name }"</strong>? It will
							begin blocking/throttling matching traffic
							immediately.
						</span>
					),
					confirmLabel: row.enabled ? 'Disable Rule' : 'Enable Rule',
					onConfirm: () => {
						setFirewallRules( ( d ) =>
							d.map( ( r ) =>
								r.id === row.id
									? { ...r, enabled: ! r.enabled }
									: r
							)
						);
						showToast(
							`Rule ${ row.enabled ? 'disabled' : 'enabled' }`,
							row.enabled ? 'warning' : 'success'
						);
						closeDialog();
					},
				} ),
		},
		{
			label: 'Delete Rule',
			icon: Trash2,
			danger: true,
			onClick: () =>
				openDialog( {
					open: true,
					danger: true,
					icon: Trash2,
					title: 'Delete Rule?',
					body: (
						<span>
							Permanently delete <strong>"{ row.name }"</strong>?
							Traffic this rule was blocking will go unchecked
							immediately.
						</span>
					),
					confirmLabel: 'Delete Rule',
					onConfirm: () => {
						setFirewallRules( ( d ) =>
							d.filter( ( r ) => r.id !== row.id )
						);
						showToast( `"${ row.name }" deleted`, 'error' );
						closeDialog();
					},
				} ),
		},
	];

	/* ── Rule type badge ────────────────────────────────── */
	const ruleTypeStyle: Record< string, { bg: string; text: string } > = {
		'rate-limit': { bg: M3.primaryContainer, text: M3.onPrimaryContainer },
		'geo-block': { bg: '#FFDEA5', text: '#5C4200' },
		'ip-list': { bg: M3.secondaryContainer, text: M3.onSecondaryContainer },
		signature: { bg: M3.successContainer, text: M3.success },
		validation: { bg: M3.infoContainer, text: M3.info },
	};

	const securityScore = 84;
	const scoreColor =
		securityScore >= 80
			? M3.success
			: securityScore >= 60
			? M3.warning
			: M3.error;

	return (
		<div className="flex flex-col gap-5">
			{ /* ── KPI strip ─────────────────────────────────────── */ }
			<div className="grid grid-cols-4 gap-4">
				{ /* Security score card */ }
				<Card className="p-5 flex flex-col gap-2 col-span-1">
					<div
						className="text-xs font-medium"
						style={ {
							color: M3.onSurfaceVariant,
							fontFamily: 'Roboto, sans-serif',
							textTransform: 'uppercase',
							letterSpacing: '0.5px',
						} }
					>
						Security Score
					</div>
					<div className="flex items-end gap-3">
						<div
							className="text-5xl font-light leading-none"
							style={ {
								color: scoreColor,
								fontFamily: 'Roboto, sans-serif',
							} }
						>
							{ securityScore }
						</div>
						<div
							className="text-sm pb-1"
							style={ {
								color: M3.onSurfaceVariant,
								fontFamily: 'Roboto, sans-serif',
							} }
						>
							/100
						</div>
					</div>
					<div
						className="h-2 rounded-full overflow-hidden"
						style={ { backgroundColor: M3.outlineVariant } }
					>
						<div
							className="h-full rounded-full"
							style={ {
								width: `${ securityScore }%`,
								backgroundColor: scoreColor,
								transition: 'width 0.5s ease',
							} }
						/>
					</div>
					<div
						className="text-xs"
						style={ {
							color: scoreColor,
							fontFamily: 'Roboto, sans-serif',
						} }
					>
						Good — 2 issues need attention
					</div>
				</Card>

				<KpiCard
					label="IPs Blocked (24h)"
					value={ String(
						blockedIPs.filter(
							( r ) =>
								r.severity === 'critical' ||
								r.severity === 'high'
						).length
					) }
					trend="▲ +3 today"
					trendUp={ false }
					icon={ Ban }
				/>
				<KpiCard
					label="Login Threats (24h)"
					value={ String(
						loginAttempts.reduce( ( a, r ) => a + r.attempts, 0 )
					) }
					trend="▲ +18%"
					trendUp={ false }
					icon={ AlertCircle }
				/>
				<KpiCard
					label="Suspicious Downloads"
					value={ String( suspDownloads.length ) }
					trend="▲ +2 today"
					trendUp={ false }
					icon={ ShieldCheck }
				/>
			</div>

			{ /* ── Threat activity chart ──────────────────────────── */ }
			<Card className="p-5">
				<SectionTitle>Threat Activity — Last 7 days</SectionTitle>
				<ResponsiveContainer width="100%" height={ 180 }>
					<AreaChart data={ threatTrendData }>
						<defs>
							<linearGradient
								id="blockGrad"
								x1="0"
								y1="0"
								x2="0"
								y2="1"
							>
								<stop
									offset="5%"
									stopColor={ M3.error }
									stopOpacity={ 0.18 }
								/>
								<stop
									offset="95%"
									stopColor={ M3.error }
									stopOpacity={ 0 }
								/>
							</linearGradient>
							<linearGradient
								id="loginGrad"
								x1="0"
								y1="0"
								x2="0"
								y2="1"
							>
								<stop
									offset="5%"
									stopColor={ M3.warning }
									stopOpacity={ 0.18 }
								/>
								<stop
									offset="95%"
									stopColor={ M3.warning }
									stopOpacity={ 0 }
								/>
							</linearGradient>
						</defs>
						<CartesianGrid
							strokeDasharray="3 3"
							stroke={ M3.outlineVariant }
						/>
						<XAxis
							dataKey="day"
							tick={ { fontSize: 11, fill: M3.onSurfaceVariant } }
						/>
						<YAxis
							tick={ { fontSize: 11, fill: M3.onSurfaceVariant } }
						/>
						<Tooltip
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
						<Area
							type="monotone"
							dataKey="logins"
							name="Login Attempts"
							stroke={ M3.warning }
							fill="url(#loginGrad)"
							strokeWidth={ 2 }
						/>
						<Area
							type="monotone"
							dataKey="blocked"
							name="IPs Blocked"
							stroke={ M3.error }
							fill="url(#blockGrad)"
							strokeWidth={ 2 }
						/>
						<Line
							type="monotone"
							dataKey="alerts"
							name="Alerts"
							stroke={ M3.primary }
							strokeWidth={ 2 }
							dot={ false }
							strokeDasharray="4 2"
						/>
					</AreaChart>
				</ResponsiveContainer>
			</Card>

			{ /* ── Tabs ──────────────────────────────────────────── */ }
			<Card className="flex flex-col" style={ { overflow: 'visible' } }>
				{ /* Tab bar */ }
				<div
					className="flex overflow-x-auto"
					style={ {
						borderBottom: `1px solid ${ M3.outlineVariant }`,
					} }
				>
					{ tabs.map( ( t ) => (
						<button
							key={ t.id }
							onClick={ () => {
								setTab( t.id );
								setSearch( '' );
							} }
							className="px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-all flex-shrink-0"
							style={ {
								color:
									tab === t.id
										? M3.primary
										: M3.onSurfaceVariant,
								borderBottom:
									tab === t.id
										? `2px solid ${ M3.primary }`
										: '2px solid transparent',
								background: 'none',
								border: 'none',
								borderBottom:
									tab === t.id
										? `2px solid ${ M3.primary }`
										: '2px solid transparent',
								cursor: 'pointer',
								fontFamily: 'Roboto, sans-serif',
							} }
						>
							{ t.label }
						</button>
					) ) }
				</div>

				{ /* ── Search bar (shared across table tabs) ─────── */ }
				{ tab !== 'overview' && tab !== 'audit' && (
					<div
						className="flex items-center gap-2 px-4 py-3"
						style={ {
							borderBottom: `1px solid ${ M3.outlineVariant }`,
						} }
					>
						<div
							className="flex items-center gap-2 flex-1 max-w-sm px-3 py-2 rounded-lg"
							style={ {
								backgroundColor: M3.surfaceContainerHigh,
								border: `1px solid ${ M3.outlineVariant }`,
							} }
						>
							<Search size={ 15 } color={ M3.onSurfaceVariant } />
							<input
								type="text"
								placeholder="Search…"
								value={ search }
								onChange={ ( e ) =>
									setSearch( e.target.value )
								}
								className="flex-1 bg-transparent outline-none text-sm"
								style={ {
									color: M3.onSurface,
									fontFamily: 'Roboto, sans-serif',
									border: 'none',
								} }
							/>
						</div>
						{ tab === 'blocklist' && (
							<div className="ml-auto">
								<FilledButton
									small
									onClick={ () => {
										setBlockIPOpen( ( o ) => ! o );
										setAddRuleOpen( false );
									} }
								>
									<Ban size={ 14 } /> Block IP
								</FilledButton>
							</div>
						) }
						{ tab === 'firewall' && (
							<div className="ml-auto">
								<FilledButton
									small
									onClick={ () => {
										setAddRuleOpen( ( o ) => ! o );
										setBlockIPOpen( false );
										setEditRuleRow( null );
									} }
								>
									<Shield size={ 14 } /> Add Rule
								</FilledButton>
							</div>
						) }
					</div>
				) }

				{ /* ── Block IP form panel ── */ }
				{ blockIPOpen && (
					<div
						className="mx-0"
						style={ { borderBottom: `2px solid ${ M3.error }` } }
					>
						<div
							className="flex items-center justify-between px-6 py-4"
							style={ { backgroundColor: '#FFDAD6' } }
						>
							<div className="flex items-center gap-3">
								<div
									className="w-8 h-8 rounded-lg flex items-center justify-center"
									style={ { backgroundColor: M3.error } }
								>
									<Ban size={ 16 } color="#fff" />
								</div>
								<div>
									<div
										className="font-medium text-sm"
										style={ {
											color: M3.error,
											fontFamily: 'Roboto, sans-serif',
										} }
									>
										Block IP Address
									</div>
									<div
										className="text-xs"
										style={ {
											color: M3.error,
											opacity: 0.8,
											fontFamily: 'Roboto, sans-serif',
										} }
									>
										The IP will be added to the blocklist
										immediately and all requests rejected.
									</div>
								</div>
							</div>
							<IconButton
								icon={ XCircle }
								onClick={ () => setBlockIPOpen( false ) }
							/>
						</div>
						<div
							className="p-6 grid gap-4"
							style={ { gridTemplateColumns: '1fr 1fr 1fr' } }
						>
							{ /* IP Address */ }
							<div className="col-span-1">
								<div
									className="text-xs font-medium mb-1.5"
									style={ {
										color: M3.onSurfaceVariant,
										fontFamily: 'Roboto, sans-serif',
										textTransform: 'uppercase',
										letterSpacing: '0.5px',
									} }
								>
									IP Address / CIDR *
								</div>
								<input
									type="text"
									placeholder="e.g. 192.168.1.1 or 10.0.0.0/24"
									value={ biIP }
									onChange={ ( e ) =>
										setBiIP( e.target.value )
									}
									className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
									style={ {
										backgroundColor: M3.surfaceContainerLow,
										border: `1px solid ${
											biIP ? M3.error : M3.outlineVariant
										}`,
										color: M3.onSurface,
										fontFamily: 'Roboto Mono, monospace',
									} }
								/>
							</div>
							{ /* Reason */ }
							<div className="col-span-2">
								<div
									className="text-xs font-medium mb-1.5"
									style={ {
										color: M3.onSurfaceVariant,
										fontFamily: 'Roboto, sans-serif',
										textTransform: 'uppercase',
										letterSpacing: '0.5px',
									} }
								>
									Reason
								</div>
								<input
									type="text"
									placeholder="e.g. Brute force attempt, credential stuffing…"
									value={ biReason }
									onChange={ ( e ) =>
										setBiReason( e.target.value )
									}
									className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
									style={ {
										backgroundColor: M3.surfaceContainerLow,
										border: `1px solid ${ M3.outlineVariant }`,
										color: M3.onSurface,
										fontFamily: 'Roboto, sans-serif',
									} }
								/>
							</div>
							{ /* Severity */ }
							<div>
								<div
									className="text-xs font-medium mb-1.5"
									style={ {
										color: M3.onSurfaceVariant,
										fontFamily: 'Roboto, sans-serif',
										textTransform: 'uppercase',
										letterSpacing: '0.5px',
									} }
								>
									Severity
								</div>
								<div className="flex gap-1.5">
									{ SEVERITIES.map( ( s ) => {
										const sev = {
											low: {
												bg: M3.surfaceContainerHigh,
												text: M3.onSurfaceVariant,
											},
											medium: {
												bg: M3.primaryContainer,
												text: M3.onPrimaryContainer,
											},
											high: {
												bg: '#FFDEA5',
												text: '#5C4200',
											},
											critical: {
												bg: '#FFDAD6',
												text: M3.error,
											},
										}[ s ];
										return (
											<button
												key={ s }
												onClick={ () =>
													setBiSeverity( s )
												}
												className="flex-1 py-2 rounded-lg text-xs capitalize transition-all"
												style={ {
													backgroundColor:
														biSeverity === s
															? sev.bg
															: M3.surfaceContainerLow,
													color:
														biSeverity === s
															? sev.text
															: M3.onSurfaceVariant,
													border: `1.5px solid ${
														biSeverity === s
															? sev.text
															: M3.outlineVariant
													}`,
													cursor: 'pointer',
													fontFamily:
														'Roboto, sans-serif',
													fontWeight:
														biSeverity === s
															? 500
															: 400,
												} }
											>
												{ s }
											</button>
										);
									} ) }
								</div>
							</div>
							{ /* Duration */ }
							<div className="col-span-2">
								<div
									className="text-xs font-medium mb-1.5"
									style={ {
										color: M3.onSurfaceVariant,
										fontFamily: 'Roboto, sans-serif',
										textTransform: 'uppercase',
										letterSpacing: '0.5px',
									} }
								>
									Block Duration
								</div>
								<div className="flex gap-2">
									{ BLOCK_DURATIONS.map( ( d ) => (
										<button
											key={ d }
											onClick={ () => setBiDuration( d ) }
											className="flex-1 py-2.5 rounded-xl text-sm transition-all"
											style={ {
												backgroundColor:
													biDuration === d
														? M3.error
														: M3.surfaceContainerLow,
												color:
													biDuration === d
														? '#fff'
														: M3.onSurfaceVariant,
												border: `1.5px solid ${
													biDuration === d
														? M3.error
														: M3.outlineVariant
												}`,
												cursor: 'pointer',
												fontFamily:
													'Roboto, sans-serif',
												fontWeight:
													biDuration === d
														? 500
														: 400,
											} }
										>
											{ d }
										</button>
									) ) }
								</div>
							</div>
						</div>
						<div
							className="flex items-center justify-end gap-2 px-6 py-4"
							style={ {
								borderTop: `1px solid ${ M3.outlineVariant }`,
								backgroundColor: M3.surfaceContainerLow,
							} }
						>
							<TextButton
								onClick={ () => setBlockIPOpen( false ) }
							>
								Cancel
							</TextButton>
							<FilledButton
								small
								danger
								onClick={ handleBlockIP }
							>
								<Ban size={ 14 } /> Block IP Now
							</FilledButton>
						</div>
					</div>
				) }

				{ /* ── Add Rule form panel ── */ }
				{ addRuleOpen && (
					<div
						className="mx-0"
						style={ { borderBottom: `2px solid ${ M3.primary }` } }
					>
						<div
							className="flex items-center justify-between px-6 py-4"
							style={ { backgroundColor: M3.primaryContainer } }
						>
							<div className="flex items-center gap-3">
								<div
									className="w-8 h-8 rounded-lg flex items-center justify-center"
									style={ { backgroundColor: M3.primary } }
								>
									<Shield size={ 16 } color="#fff" />
								</div>
								<div>
									<div
										className="font-medium text-sm"
										style={ {
											color: M3.onPrimaryContainer,
											fontFamily: 'Roboto, sans-serif',
										} }
									>
										Create Firewall Rule
									</div>
									<div
										className="text-xs"
										style={ {
											color: M3.onPrimaryContainer,
											opacity: 0.7,
											fontFamily: 'Roboto, sans-serif',
										} }
									>
										Rules are evaluated in order. Enabled
										rules apply immediately.
									</div>
								</div>
							</div>
							<IconButton
								icon={ XCircle }
								onClick={ () => setAddRuleOpen( false ) }
							/>
						</div>
						<div
							className="p-6 grid gap-5"
							style={ { gridTemplateColumns: '1fr 1fr' } }
						>
							{ /* Name */ }
							<div className="col-span-2">
								<div
									className="text-xs font-medium mb-1.5"
									style={ {
										color: M3.onSurfaceVariant,
										fontFamily: 'Roboto, sans-serif',
										textTransform: 'uppercase',
										letterSpacing: '0.5px',
									} }
								>
									Rule Name *
								</div>
								<input
									type="text"
									placeholder="e.g. Rate Limit — License Validation"
									value={ arName }
									onChange={ ( e ) =>
										setArName( e.target.value )
									}
									className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
									style={ {
										backgroundColor: M3.surfaceContainerLow,
										border: `1px solid ${
											arName
												? M3.primary
												: M3.outlineVariant
										}`,
										color: M3.onSurface,
										fontFamily: 'Roboto, sans-serif',
									} }
								/>
							</div>
							{ /* Rule type */ }
							<div>
								<div
									className="text-xs font-medium mb-1.5"
									style={ {
										color: M3.onSurfaceVariant,
										fontFamily: 'Roboto, sans-serif',
										textTransform: 'uppercase',
										letterSpacing: '0.5px',
									} }
								>
									Rule Type
								</div>
								<div className="flex flex-col gap-1.5">
									{ RULE_TYPES.map( ( t ) => {
										const ruleTypeStyle: Record<
											string,
											{ bg: string; text: string }
										> = {
											'rate-limit': {
												bg: M3.primaryContainer,
												text: M3.onPrimaryContainer,
											},
											'geo-block': {
												bg: '#FFDEA5',
												text: '#5C4200',
											},
											'ip-list': {
												bg: M3.secondaryContainer,
												text: M3.onSecondaryContainer,
											},
											signature: {
												bg: M3.successContainer,
												text: M3.success,
											},
											validation: {
												bg: M3.infoContainer,
												text: M3.info,
											},
										};
										const s = ruleTypeStyle[ t ];
										return (
											<button
												key={ t }
												onClick={ () => setArType( t ) }
												className="px-3 py-2 rounded-lg text-xs text-left capitalize transition-all"
												style={ {
													backgroundColor:
														arType === t
															? s.bg
															: M3.surfaceContainerLow,
													color:
														arType === t
															? s.text
															: M3.onSurfaceVariant,
													border: `1.5px solid ${
														arType === t
															? s.text
															: M3.outlineVariant
													}`,
													cursor: 'pointer',
													fontFamily:
														'Roboto, sans-serif',
													fontWeight:
														arType === t
															? 500
															: 400,
												} }
											>
												{ t.replace( '-', ' ' ) }
											</button>
										);
									} ) }
								</div>
							</div>
							{ /* Right column fields */ }
							<div className="flex flex-col gap-4">
								<div>
									<div
										className="text-xs font-medium mb-1.5"
										style={ {
											color: M3.onSurfaceVariant,
											fontFamily: 'Roboto, sans-serif',
											textTransform: 'uppercase',
											letterSpacing: '0.5px',
										} }
									>
										Target Endpoint *
									</div>
									<input
										type="text"
										placeholder="e.g. /api/v1/licenses/validate"
										value={ arTarget }
										onChange={ ( e ) =>
											setArTarget( e.target.value )
										}
										className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
										style={ {
											backgroundColor:
												M3.surfaceContainerLow,
											border: `1px solid ${
												arTarget
													? M3.primary
													: M3.outlineVariant
											}`,
											color: M3.onSurface,
											fontFamily:
												'Roboto Mono, monospace',
										} }
									/>
								</div>
								<div>
									<div
										className="text-xs font-medium mb-1.5"
										style={ {
											color: M3.onSurfaceVariant,
											fontFamily: 'Roboto, sans-serif',
											textTransform: 'uppercase',
											letterSpacing: '0.5px',
										} }
									>
										Limit / Logic
									</div>
									<input
										type="text"
										placeholder="e.g. 60 req/min, BY COUNTRY, IP reputation"
										value={ arLimit }
										onChange={ ( e ) =>
											setArLimit( e.target.value )
										}
										className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
										style={ {
											backgroundColor:
												M3.surfaceContainerLow,
											border: `1px solid ${ M3.outlineVariant }`,
											color: M3.onSurface,
											fontFamily:
												'Roboto Mono, monospace',
										} }
									/>
								</div>
								<div>
									<div
										className="text-xs font-medium mb-1.5"
										style={ {
											color: M3.onSurfaceVariant,
											fontFamily: 'Roboto, sans-serif',
											textTransform: 'uppercase',
											letterSpacing: '0.5px',
										} }
									>
										Action on Match
									</div>
									<div className="flex gap-2">
										{ RULE_ACTIONS.map( ( a ) => {
											const c =
												{
													block: M3.error,
													throttle: M3.warning,
													challenge: M3.primary,
													reject: '#B3261E',
												}[ a ] ?? M3.primary;
											return (
												<button
													key={ a }
													onClick={ () =>
														setArAction( a )
													}
													className="flex-1 py-2 rounded-lg text-xs capitalize transition-all"
													style={ {
														backgroundColor:
															arAction === a
																? `${ c }20`
																: M3.surfaceContainerLow,
														color:
															arAction === a
																? c
																: M3.onSurfaceVariant,
														border: `1.5px solid ${
															arAction === a
																? c
																: M3.outlineVariant
														}`,
														cursor: 'pointer',
														fontFamily:
															'Roboto, sans-serif',
														fontWeight:
															arAction === a
																? 600
																: 400,
													} }
												>
													{ a }
												</button>
											);
										} ) }
									</div>
								</div>
								<div className="flex items-center justify-between">
									<div>
										<div
											className="text-sm"
											style={ {
												color: M3.onSurface,
												fontFamily:
													'Roboto, sans-serif',
											} }
										>
											Enable immediately
										</div>
										<div
											className="text-xs"
											style={ {
												color: M3.onSurfaceVariant,
												fontFamily:
													'Roboto, sans-serif',
											} }
										>
											Rule activates as soon as saved.
										</div>
									</div>
									<Toggle
										on={ arEnabled }
										onChange={ setArEnabled }
									/>
								</div>
							</div>
						</div>
						<div
							className="flex items-center justify-end gap-2 px-6 py-4"
							style={ {
								borderTop: `1px solid ${ M3.outlineVariant }`,
								backgroundColor: M3.surfaceContainerLow,
							} }
						>
							<TextButton
								onClick={ () => setAddRuleOpen( false ) }
							>
								Cancel
							</TextButton>
							<FilledButton small onClick={ handleAddRule }>
								<Shield size={ 14 } /> Create Rule
							</FilledButton>
						</div>
					</div>
				) }

				{ /* ── Edit Rule inline panel ── */ }
				{ editRuleRow && (
					<div
						className="px-6 py-4 flex items-center gap-4"
						style={ {
							backgroundColor: M3.secondaryContainer,
							borderBottom: `2px solid ${ M3.secondary }`,
						} }
					>
						<div
							className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
							style={ { backgroundColor: M3.secondary } }
						>
							<Edit3 size={ 16 } color={ M3.onSecondary } />
						</div>
						<div className="flex-1 min-w-0">
							<div
								className="text-sm font-medium mb-0.5"
								style={ {
									color: M3.onSecondaryContainer,
									fontFamily: 'Roboto, sans-serif',
								} }
							>
								Editing:{ ' ' }
								<span
									style={ {
										fontFamily: 'Roboto Mono, monospace',
									} }
								>
									{ editRuleRow.name }
								</span>
							</div>
							<div className="flex items-center gap-3">
								<div className="flex-1">
									<div
										className="text-xs mb-1"
										style={ {
											color: M3.onSecondaryContainer,
											opacity: 0.7,
											fontFamily: 'Roboto, sans-serif',
										} }
									>
										Rule Name
									</div>
									<input
										value={ erName }
										onChange={ ( e ) =>
											setErName( e.target.value )
										}
										className="w-full px-2 py-1.5 rounded-lg text-sm outline-none"
										style={ {
											backgroundColor: M3.surface,
											border: `1px solid ${ M3.outline }`,
											color: M3.onSurface,
											fontFamily: 'Roboto, sans-serif',
										} }
									/>
								</div>
								<div style={ { width: 180 } }>
									<div
										className="text-xs mb-1"
										style={ {
											color: M3.onSecondaryContainer,
											opacity: 0.7,
											fontFamily: 'Roboto, sans-serif',
										} }
									>
										Limit / Logic
									</div>
									<input
										value={ erLimit }
										onChange={ ( e ) =>
											setErLimit( e.target.value )
										}
										className="w-full px-2 py-1.5 rounded-lg text-sm outline-none"
										style={ {
											backgroundColor: M3.surface,
											border: `1px solid ${ M3.outline }`,
											color: M3.onSurface,
											fontFamily:
												'Roboto Mono, monospace',
										} }
									/>
								</div>
							</div>
						</div>
						<div className="flex gap-2 flex-shrink-0">
							<TextButton
								onClick={ () => setEditRuleRow( null ) }
							>
								Cancel
							</TextButton>
							<TonalButton
								small
								onClick={ () => {
									setFirewallRules( ( d ) =>
										d.map( ( r ) =>
											r.id === editRuleRow.id
												? {
														...r,
														name: erName,
														limit: erLimit,
												  }
												: r
										)
									);
									showToast(
										`Rule "${ erName }" updated`,
										'success'
									);
									setEditRuleRow( null );
								} }
							>
								Save Changes
							</TonalButton>
						</div>
					</div>
				) }

				{ /* ════════════════ OVERVIEW TAB ════════════════ */ }
				{ tab === 'overview' && (
					<div
						className="p-5 grid gap-5"
						style={ { gridTemplateColumns: '1fr 1fr' } }
					>
						{ /* Active threats */ }
						<div>
							<div
								className="font-medium text-sm mb-3"
								style={ {
									color: M3.onSurface,
									fontFamily: 'Roboto, sans-serif',
								} }
							>
								Active Threats
							</div>
							<div className="flex flex-col gap-2">
								{ [
									{
										label: 'Critical IPs Blocked',
										count: blockedIPs.filter(
											( r ) => r.severity === 'critical'
										).length,
										color: M3.error,
										bg: '#FFDAD6',
									},
									{
										label: 'High-severity Login Attacks',
										count: loginAttempts.filter(
											( r ) => r.attempts >= 10
										).length,
										color: M3.warning,
										bg: M3.warningContainer,
									},
									{
										label: 'Suspicious Download Flags',
										count: suspDownloads.filter(
											( r ) => r.severity === 'critical'
										).length,
										color: M3.primary,
										bg: M3.primaryContainer,
									},
									{
										label: 'Disabled Firewall Rules',
										count: firewallRules.filter(
											( r ) => ! r.enabled
										).length,
										color: M3.secondary,
										bg: M3.secondaryContainer,
									},
								].map( ( item ) => (
									<div
										key={ item.label }
										className="flex items-center justify-between px-4 py-3 rounded-xl"
										style={ {
											backgroundColor:
												M3.surfaceContainerLow,
										} }
									>
										<div className="flex items-center gap-2">
											<div
												className="w-2 h-2 rounded-full"
												style={ {
													backgroundColor: item.color,
												} }
											/>
											<span
												className="text-sm"
												style={ {
													color: M3.onSurface,
													fontFamily:
														'Roboto, sans-serif',
												} }
											>
												{ item.label }
											</span>
										</div>
										<span
											className="text-sm font-semibold px-2 py-0.5 rounded-full"
											style={ {
												backgroundColor: item.bg,
												color: item.color,
												fontFamily:
													'Roboto Mono, monospace',
											} }
										>
											{ item.count }
										</span>
									</div>
								) ) }
							</div>
						</div>

						{ /* Recent audit events */ }
						<div>
							<div
								className="font-medium text-sm mb-3"
								style={ {
									color: M3.onSurface,
									fontFamily: 'Roboto, sans-serif',
								} }
							>
								Recent Security Events
							</div>
							<div className="flex flex-col gap-0">
								{ auditLogData
									.slice( 0, 6 )
									.map( ( evt, i ) => {
										const meta =
											auditIcon[ evt.type ] ??
											auditIcon.config;
										const Icon = meta.icon;
										const sev =
											severityStyle[ evt.severity ] ??
											severityStyle.info;
										return (
											<div
												key={ evt.id }
												className="flex gap-3"
											>
												<div className="flex flex-col items-center flex-shrink-0">
													<div
														className="w-7 h-7 rounded-full flex items-center justify-center"
														style={ {
															backgroundColor: `${ meta.color }18`,
															flexShrink: 0,
														} }
													>
														<Icon
															size={ 13 }
															color={ meta.color }
														/>
													</div>
													{ i < 5 && (
														<div
															className="w-px flex-1 my-1"
															style={ {
																backgroundColor:
																	M3.outlineVariant,
																minHeight: 12,
															} }
														/>
													) }
												</div>
												<div className="pb-3 flex-1 min-w-0">
													<div className="flex items-start gap-2">
														<div
															className="flex-1 text-xs"
															style={ {
																color: M3.onSurface,
																fontFamily:
																	'Roboto, sans-serif',
																lineHeight: 1.5,
															} }
														>
															{ evt.desc }
														</div>
														<span
															className="text-xs flex-shrink-0 px-1.5 py-0.5 rounded-full"
															style={ {
																backgroundColor:
																	sev.bg,
																color: sev.text,
																fontFamily:
																	'Roboto, sans-serif',
															} }
														>
															{ evt.severity }
														</span>
													</div>
													<div
														className="text-xs mt-0.5"
														style={ {
															color: M3.onSurfaceVariant,
															fontFamily:
																'Roboto, sans-serif',
														} }
													>
														{ evt.time } ·{ ' ' }
														{ evt.actor }
													</div>
												</div>
											</div>
										);
									} ) }
							</div>
						</div>

						{ /* Security recommendations */ }
						<div
							className="col-span-2 pt-1"
							style={ {
								borderTop: `1px solid ${ M3.outlineVariant }`,
							} }
						>
							<div
								className="font-medium text-sm mb-3"
								style={ {
									color: M3.onSurface,
									fontFamily: 'Roboto, sans-serif',
								} }
							>
								Recommendations
							</div>
							<div
								className="grid gap-2"
								style={ { gridTemplateColumns: '1fr 1fr 1fr' } }
							>
								{ [
									{
										icon: Globe,
										title: 'Enable Geo-Blocking',
										desc: 'Block high-risk countries to reduce attack surface.',
										action: 'Enable Rule',
										color: M3.warning,
									},
									{
										icon: Zap,
										title: 'Enable VPN Detection',
										desc: 'Challenge VPN/proxy IPs on download endpoints.',
										action: 'Enable Rule',
										color: M3.primary,
									},
									{
										icon: ShieldCheck,
										title: 'Rotate API Signing Secret',
										desc: 'Your HMAC secret is 142 days old. Rotate it.',
										action: 'Rotate Now',
										color: M3.error,
									},
								].map( ( r ) => (
									<div
										key={ r.title }
										className="p-4 rounded-xl flex flex-col gap-2"
										style={ {
											border: `1px solid ${ M3.outlineVariant }`,
											backgroundColor:
												M3.surfaceContainerLow,
										} }
									>
										<div className="flex items-center gap-2">
											<div
												className="w-7 h-7 rounded-lg flex items-center justify-center"
												style={ {
													backgroundColor: `${ r.color }18`,
												} }
											>
												<r.icon
													size={ 14 }
													color={ r.color }
												/>
											</div>
											<div
												className="text-xs font-medium"
												style={ {
													color: M3.onSurface,
													fontFamily:
														'Roboto, sans-serif',
												} }
											>
												{ r.title }
											</div>
										</div>
										<div
											className="text-xs"
											style={ {
												color: M3.onSurfaceVariant,
												fontFamily:
													'Roboto, sans-serif',
												lineHeight: 1.5,
											} }
										>
											{ r.desc }
										</div>
										<TextButton
											small
											onClick={ () =>
												showToast(
													`${ r.action } triggered`,
													'success'
												)
											}
										>
											{ r.action } →
										</TextButton>
									</div>
								) ) }
							</div>
						</div>
					</div>
				) }

				{ /* ════════════════ BLOCKED IPs TAB ═════════════ */ }
				{ tab === 'blocklist' && (
					<div
						className="overflow-x-auto"
						style={ { overflowY: 'visible' } }
					>
						<table className="w-full">
							<thead>
								<tr
									style={ {
										backgroundColor: M3.surfaceContainerLow,
									} }
								>
									{ [
										'IP Address',
										'Country',
										'Reason',
										'Severity',
										'Blocked At',
										'Expires',
										'Hits',
										'',
									].map( ( h ) => (
										<th
											key={ h }
											className="px-4 py-3 text-left text-xs font-medium"
											style={ {
												color: M3.onSurfaceVariant,
												fontFamily:
													'Roboto, sans-serif',
												letterSpacing: '0.5px',
												textTransform: 'uppercase',
												whiteSpace: 'nowrap',
											} }
										>
											{ h }
										</th>
									) ) }
								</tr>
							</thead>
							<tbody>
								{ blockedIPs
									.filter(
										( r ) =>
											! search ||
											r.ip.includes( search ) ||
											r.country
												.toLowerCase()
												.includes(
													search.toLowerCase()
												) ||
											r.reason
												.toLowerCase()
												.includes(
													search.toLowerCase()
												)
									)
									.map( ( row, idx ) => {
										const sev =
											severityStyle[ row.severity ] ??
											severityStyle.low;
										return (
											<tr
												key={ row.id }
												style={ {
													backgroundColor:
														idx % 2 === 0
															? M3.surface
															: M3.surfaceContainerLow,
												} }
												onMouseEnter={ ( e ) => {
													(
														e.currentTarget as HTMLElement
													 ).style.backgroundColor =
														M3.surfaceContainerHigh;
												} }
												onMouseLeave={ ( e ) => {
													(
														e.currentTarget as HTMLElement
													 ).style.backgroundColor =
														idx % 2 === 0
															? M3.surface
															: M3.surfaceContainerLow;
												} }
											>
												<td
													className="px-4 py-3 text-sm font-medium"
													style={ {
														fontFamily:
															'Roboto Mono, monospace',
														color: M3.onSurface,
													} }
												>
													{ row.ip }
												</td>
												<td className="px-4 py-3">
													<span className="flex items-center gap-1.5">
														{ row.flag }{ ' ' }
														<span
															className="text-xs"
															style={ {
																color: M3.onSurface,
																fontFamily:
																	'Roboto, sans-serif',
															} }
														>
															{ row.country }
														</span>
													</span>
												</td>
												<td
													className="px-4 py-3 text-xs"
													style={ {
														color: M3.onSurface,
														fontFamily:
															'Roboto, sans-serif',
														maxWidth: 240,
													} }
												>
													{ row.reason }
												</td>
												<td className="px-4 py-3">
													<span
														className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full capitalize"
														style={ {
															backgroundColor:
																sev.bg,
															color: sev.text,
															fontFamily:
																'Roboto, sans-serif',
														} }
													>
														<span
															className="w-1.5 h-1.5 rounded-full"
															style={ {
																backgroundColor:
																	sev.dot,
															} }
														/>
														{ row.severity }
													</span>
												</td>
												<td
													className="px-4 py-3 text-xs"
													style={ {
														color: M3.onSurfaceVariant,
														fontFamily:
															'Roboto, sans-serif',
													} }
												>
													{ row.blocked }
												</td>
												<td
													className="px-4 py-3 text-xs font-medium"
													style={ {
														color:
															row.expires ===
															'Permanent'
																? M3.error
																: M3.onSurfaceVariant,
														fontFamily:
															'Roboto, sans-serif',
													} }
												>
													{ row.expires }
												</td>
												<td
													className="px-4 py-3 text-sm font-semibold"
													style={ {
														color:
															row.hits > 100
																? M3.error
																: M3.onSurface,
														fontFamily:
															'Roboto Mono, monospace',
													} }
												>
													{ row.hits.toLocaleString() }
												</td>
												<td
													className="px-4 py-3"
													style={ {
														overflow: 'visible',
													} }
												>
													<ActionDropdown
														actions={ blockedIPActions(
															row
														) }
														hint={ row.ip }
													/>
												</td>
											</tr>
										);
									} ) }
							</tbody>
						</table>
					</div>
				) }

				{ /* ════════════════ LOGIN ATTEMPTS TAB ══════════ */ }
				{ tab === 'logins' && (
					<div
						className="overflow-x-auto"
						style={ { overflowY: 'visible' } }
					>
						<table className="w-full">
							<thead>
								<tr
									style={ {
										backgroundColor: M3.surfaceContainerLow,
									} }
								>
									{ [
										'IP Address',
										'Country',
										'Target Email',
										'Target',
										'Attempts',
										'Last Attempt',
										'Status',
										'',
									].map( ( h ) => (
										<th
											key={ h }
											className="px-4 py-3 text-left text-xs font-medium"
											style={ {
												color: M3.onSurfaceVariant,
												fontFamily:
													'Roboto, sans-serif',
												letterSpacing: '0.5px',
												textTransform: 'uppercase',
												whiteSpace: 'nowrap',
											} }
										>
											{ h }
										</th>
									) ) }
								</tr>
							</thead>
							<tbody>
								{ loginAttempts
									.filter(
										( r ) =>
											! search ||
											r.ip.includes( search ) ||
											r.email
												.toLowerCase()
												.includes(
													search.toLowerCase()
												) ||
											r.country
												.toLowerCase()
												.includes(
													search.toLowerCase()
												)
									)
									.map( ( row, idx ) => {
										const statusStyle: Record<
											string,
											{ bg: string; text: string }
										> = {
											blocked: {
												bg: '#FFDAD6',
												text: M3.error,
											},
											monitoring: {
												bg: M3.warningContainer,
												text: M3.warning,
											},
											allowed: {
												bg: M3.successContainer,
												text: M3.success,
											},
										};
										const s =
											statusStyle[ row.status ] ??
											statusStyle.allowed;
										return (
											<tr
												key={ row.id }
												style={ {
													backgroundColor:
														idx % 2 === 0
															? M3.surface
															: M3.surfaceContainerLow,
												} }
												onMouseEnter={ ( e ) => {
													(
														e.currentTarget as HTMLElement
													 ).style.backgroundColor =
														M3.surfaceContainerHigh;
												} }
												onMouseLeave={ ( e ) => {
													(
														e.currentTarget as HTMLElement
													 ).style.backgroundColor =
														idx % 2 === 0
															? M3.surface
															: M3.surfaceContainerLow;
												} }
											>
												<td
													className="px-4 py-3 text-sm font-medium"
													style={ {
														fontFamily:
															'Roboto Mono, monospace',
														color: M3.onSurface,
													} }
												>
													{ row.ip }
												</td>
												<td className="px-4 py-3">
													<span className="flex items-center gap-1.5">
														{ row.flag }{ ' ' }
														<span
															className="text-xs"
															style={ {
																color: M3.onSurface,
																fontFamily:
																	'Roboto, sans-serif',
															} }
														>
															{ row.country }
														</span>
													</span>
												</td>
												<td
													className="px-4 py-3 text-xs"
													style={ {
														color: M3.onSurface,
														fontFamily:
															'Roboto, sans-serif',
													} }
												>
													{ row.email }
												</td>
												<td className="px-4 py-3">
													<span
														className="text-xs px-2 py-0.5 rounded-full"
														style={ {
															backgroundColor:
																M3.surfaceContainerHigh,
															color: M3.onSurfaceVariant,
															fontFamily:
																'Roboto, sans-serif',
														} }
													>
														{ row.target }
													</span>
												</td>
												<td className="px-4 py-3">
													<div className="flex items-center gap-2">
														<div
															className="h-1.5 rounded-full"
															style={ {
																width: 48,
																backgroundColor:
																	M3.outlineVariant,
															} }
														>
															<div
																className="h-full rounded-full"
																style={ {
																	width: `${ Math.min(
																		100,
																		( row.attempts /
																			50 ) *
																			100
																	) }%`,
																	backgroundColor:
																		row.attempts >=
																		30
																			? M3.error
																			: row.attempts >=
																			  10
																			? M3.warning
																			: M3.success,
																} }
															/>
														</div>
														<span
															className="text-sm font-semibold"
															style={ {
																color:
																	row.attempts >=
																	30
																		? M3.error
																		: row.attempts >=
																		  10
																		? M3.warning
																		: M3.onSurface,
																fontFamily:
																	'Roboto Mono, monospace',
															} }
														>
															{ row.attempts }
														</span>
													</div>
												</td>
												<td
													className="px-4 py-3 text-xs"
													style={ {
														color: M3.onSurfaceVariant,
														fontFamily:
															'Roboto, sans-serif',
													} }
												>
													{ row.lastAttempt }
												</td>
												<td className="px-4 py-3">
													<span
														className="text-xs px-2 py-0.5 rounded-full capitalize"
														style={ {
															backgroundColor:
																s.bg,
															color: s.text,
															fontFamily:
																'Roboto, sans-serif',
														} }
													>
														{ row.status }
													</span>
												</td>
												<td
													className="px-4 py-3"
													style={ {
														overflow: 'visible',
													} }
												>
													<ActionDropdown
														actions={ loginActions(
															row
														) }
														hint={ `${ row.ip } · ${ row.attempts } attempts` }
													/>
												</td>
											</tr>
										);
									} ) }
							</tbody>
						</table>
					</div>
				) }

				{ /* ════════════════ SUSPICIOUS DOWNLOADS TAB ════ */ }
				{ tab === 'downloads' && (
					<div
						className="overflow-x-auto"
						style={ { overflowY: 'visible' } }
					>
						<table className="w-full">
							<thead>
								<tr
									style={ {
										backgroundColor: M3.surfaceContainerLow,
									} }
								>
									{ [
										'IP / Country',
										'Customer',
										'License Key',
										'Product',
										'Reason',
										'Severity',
										'Date',
										'',
									].map( ( h ) => (
										<th
											key={ h }
											className="px-4 py-3 text-left text-xs font-medium"
											style={ {
												color: M3.onSurfaceVariant,
												fontFamily:
													'Roboto, sans-serif',
												letterSpacing: '0.5px',
												textTransform: 'uppercase',
												whiteSpace: 'nowrap',
											} }
										>
											{ h }
										</th>
									) ) }
								</tr>
							</thead>
							<tbody>
								{ suspDownloads
									.filter(
										( r ) =>
											! search ||
											r.ip.includes( search ) ||
											r.customer
												.toLowerCase()
												.includes(
													search.toLowerCase()
												) ||
											r.license
												.toLowerCase()
												.includes(
													search.toLowerCase()
												) ||
											r.product
												.toLowerCase()
												.includes(
													search.toLowerCase()
												)
									)
									.map( ( row, idx ) => {
										const sev =
											severityStyle[ row.severity ] ??
											severityStyle.low;
										return (
											<tr
												key={ row.id }
												style={ {
													backgroundColor:
														idx % 2 === 0
															? M3.surface
															: M3.surfaceContainerLow,
												} }
												onMouseEnter={ ( e ) => {
													(
														e.currentTarget as HTMLElement
													 ).style.backgroundColor =
														M3.surfaceContainerHigh;
												} }
												onMouseLeave={ ( e ) => {
													(
														e.currentTarget as HTMLElement
													 ).style.backgroundColor =
														idx % 2 === 0
															? M3.surface
															: M3.surfaceContainerLow;
												} }
											>
												<td className="px-4 py-3">
													<div
														className="text-xs font-medium"
														style={ {
															fontFamily:
																'Roboto Mono, monospace',
															color: M3.onSurface,
														} }
													>
														{ row.ip }
													</div>
													<div className="text-xs mt-0.5">
														{ row.flag }{ ' ' }
														<span
															style={ {
																color: M3.onSurfaceVariant,
																fontFamily:
																	'Roboto, sans-serif',
															} }
														>
															{ row.country }
														</span>
													</div>
												</td>
												<td
													className="px-4 py-3 text-sm"
													style={ {
														color:
															row.customer ===
															'Unknown'
																? M3.onSurfaceVariant
																: M3.onSurface,
														fontFamily:
															'Roboto, sans-serif',
														fontStyle:
															row.customer ===
															'Unknown'
																? 'italic'
																: 'normal',
													} }
												>
													{ row.customer }
												</td>
												<td
													className="px-4 py-3 text-xs"
													style={ {
														fontFamily:
															'Roboto Mono, monospace',
														color: M3.primary,
													} }
												>
													{ row.license }
												</td>
												<td className="px-4 py-3">
													<div
														className="text-sm"
														style={ {
															color: M3.onSurface,
															fontFamily:
																'Roboto, sans-serif',
														} }
													>
														{ row.product }
													</div>
													<div
														className="text-xs"
														style={ {
															color: M3.onSurfaceVariant,
															fontFamily:
																'Roboto Mono, monospace',
														} }
													>
														{ row.version }
													</div>
												</td>
												<td
													className="px-4 py-3 text-xs"
													style={ {
														color: M3.onSurface,
														fontFamily:
															'Roboto, sans-serif',
														maxWidth: 200,
													} }
												>
													{ row.reason }
												</td>
												<td className="px-4 py-3">
													<span
														className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full capitalize"
														style={ {
															backgroundColor:
																sev.bg,
															color: sev.text,
															fontFamily:
																'Roboto, sans-serif',
														} }
													>
														<span
															className="w-1.5 h-1.5 rounded-full"
															style={ {
																backgroundColor:
																	sev.dot,
															} }
														/>
														{ row.severity }
													</span>
												</td>
												<td
													className="px-4 py-3 text-xs"
													style={ {
														color: M3.onSurfaceVariant,
														fontFamily:
															'Roboto, sans-serif',
													} }
												>
													{ row.date }
												</td>
												<td
													className="px-4 py-3"
													style={ {
														overflow: 'visible',
													} }
												>
													<ActionDropdown
														actions={ suspDownloadActions(
															row
														) }
														hint={ `${ row.ip } · ${ row.product }` }
													/>
												</td>
											</tr>
										);
									} ) }
							</tbody>
						</table>
					</div>
				) }

				{ /* ════════════════ FIREWALL RULES TAB ══════════ */ }
				{ tab === 'firewall' && (
					<div
						className="overflow-x-auto"
						style={ { overflowY: 'visible' } }
					>
						<table className="w-full">
							<thead>
								<tr
									style={ {
										backgroundColor: M3.surfaceContainerLow,
									} }
								>
									{ [
										'Rule Name',
										'Type',
										'Target',
										'Limit / Logic',
										'Action',
										'Hits',
										'Status',
										'',
									].map( ( h ) => (
										<th
											key={ h }
											className="px-4 py-3 text-left text-xs font-medium"
											style={ {
												color: M3.onSurfaceVariant,
												fontFamily:
													'Roboto, sans-serif',
												letterSpacing: '0.5px',
												textTransform: 'uppercase',
												whiteSpace: 'nowrap',
											} }
										>
											{ h }
										</th>
									) ) }
								</tr>
							</thead>
							<tbody>
								{ firewallRules
									.filter(
										( r ) =>
											! search ||
											r.name
												.toLowerCase()
												.includes(
													search.toLowerCase()
												) ||
											r.type
												.toLowerCase()
												.includes(
													search.toLowerCase()
												)
									)
									.map( ( row, idx ) => {
										const rt =
											ruleTypeStyle[ row.type ] ??
											ruleTypeStyle[ 'ip-list' ];
										const actionColor: Record<
											string,
											string
										> = {
											block: M3.error,
											throttle: M3.warning,
											challenge: M3.primary,
											reject: M3.error,
										};
										return (
											<tr
												key={ row.id }
												style={ {
													backgroundColor:
														! row.enabled
															? M3.surfaceContainerLow
															: idx % 2 === 0
															? M3.surface
															: M3.surfaceContainerLow,
													opacity: row.enabled
														? 1
														: 0.55,
												} }
												onMouseEnter={ ( e ) => {
													(
														e.currentTarget as HTMLElement
													 ).style.backgroundColor =
														M3.surfaceContainerHigh;
													(
														e.currentTarget as HTMLElement
													 ).style.opacity = '1';
												} }
												onMouseLeave={ ( e ) => {
													(
														e.currentTarget as HTMLElement
													 ).style.backgroundColor =
														! row.enabled
															? M3.surfaceContainerLow
															: idx % 2 === 0
															? M3.surface
															: M3.surfaceContainerLow;
													(
														e.currentTarget as HTMLElement
													 ).style.opacity =
														row.enabled
															? '1'
															: '0.55';
												} }
											>
												<td className="px-4 py-3">
													<div
														className="text-sm font-medium"
														style={ {
															color: M3.onSurface,
															fontFamily:
																'Roboto, sans-serif',
														} }
													>
														{ row.name }
													</div>
												</td>
												<td className="px-4 py-3">
													<span
														className="text-xs px-2 py-0.5 rounded-full capitalize"
														style={ {
															backgroundColor:
																rt.bg,
															color: rt.text,
															fontFamily:
																'Roboto, sans-serif',
														} }
													>
														{ row.type }
													</span>
												</td>
												<td
													className="px-4 py-3 text-xs"
													style={ {
														fontFamily:
															'Roboto Mono, monospace',
														color: M3.onSurfaceVariant,
													} }
												>
													{ row.target }
												</td>
												<td
													className="px-4 py-3 text-xs font-medium"
													style={ {
														fontFamily:
															'Roboto Mono, monospace',
														color: M3.onSurface,
													} }
												>
													{ row.limit }
												</td>
												<td className="px-4 py-3">
													<span
														className="text-xs font-semibold px-2 py-0.5 rounded-full uppercase"
														style={ {
															backgroundColor: `${
																actionColor[
																	row.action
																] ?? M3.primary
															}18`,
															color:
																actionColor[
																	row.action
																] ?? M3.primary,
															fontFamily:
																'Roboto, sans-serif',
														} }
													>
														{ row.action }
													</span>
												</td>
												<td
													className="px-4 py-3 text-sm font-medium"
													style={ {
														color: M3.onSurface,
														fontFamily:
															'Roboto Mono, monospace',
													} }
												>
													{ row.hits.toLocaleString() }
												</td>
												<td className="px-4 py-3">
													<Toggle
														on={ row.enabled }
														onChange={ () => {
															setFirewallRules(
																( d ) =>
																	d.map(
																		(
																			r
																		) =>
																			r.id ===
																			row.id
																				? {
																						...r,
																						enabled:
																							! r.enabled,
																				  }
																				: r
																	)
															);
															showToast(
																`Rule ${
																	row.enabled
																		? 'disabled'
																		: 'enabled'
																}`,
																row.enabled
																	? 'warning'
																	: 'success'
															);
														} }
													/>
												</td>
												<td
													className="px-4 py-3"
													style={ {
														overflow: 'visible',
													} }
												>
													<ActionDropdown
														actions={ firewallActions(
															row
														) }
														hint={ row.name }
													/>
												</td>
											</tr>
										);
									} ) }
							</tbody>
						</table>
					</div>
				) }

				{ /* ════════════════ AUDIT LOG TAB ═══════════════ */ }
				{ tab === 'audit' && (
					<div className="p-6">
						<div className="flex items-center justify-between mb-5">
							<div
								className="font-medium text-sm"
								style={ {
									color: M3.onSurface,
									fontFamily: 'Roboto, sans-serif',
								} }
							>
								Full Security Audit Log
							</div>
							<OutlinedButton
								small
								onClick={ () =>
									showToast(
										'Audit log exported as CSV',
										'success'
									)
								}
							>
								<DownloadIcon size={ 14 } /> Export Log
							</OutlinedButton>
						</div>
						<div className="flex flex-col">
							{ auditLogData.map( ( evt, i ) => {
								const meta =
									auditIcon[ evt.type ] ?? auditIcon.config;
								const Icon = meta.icon;
								const sev =
									severityStyle[ evt.severity ] ??
									severityStyle.info;
								return (
									<div key={ evt.id } className="flex gap-4">
										<div className="flex flex-col items-center flex-shrink-0">
											<div
												className="w-9 h-9 rounded-full flex items-center justify-center"
												style={ {
													backgroundColor: `${ meta.color }15`,
													border: `1.5px solid ${ meta.color }40`,
												} }
											>
												<Icon
													size={ 15 }
													color={ meta.color }
												/>
											</div>
											{ i < auditLogData.length - 1 && (
												<div
													className="w-px flex-1 my-1.5"
													style={ {
														backgroundColor:
															M3.outlineVariant,
														minHeight: 16,
													} }
												/>
											) }
										</div>
										<div className="flex-1 pb-5 min-w-0">
											<div className="flex items-start gap-3">
												<div className="flex-1">
													<div
														className="text-sm font-medium leading-snug"
														style={ {
															color: M3.onSurface,
															fontFamily:
																'Roboto, sans-serif',
														} }
													>
														{ evt.desc }
													</div>
													<div className="flex items-center gap-2 mt-1">
														<span
															className="text-xs"
															style={ {
																color: M3.onSurfaceVariant,
																fontFamily:
																	'Roboto, sans-serif',
															} }
														>
															{ evt.time }
														</span>
														<span
															className="text-xs"
															style={ {
																color: M3.outlineVariant,
															} }
														>
															·
														</span>
														<span
															className="text-xs font-medium"
															style={ {
																color:
																	evt.actor ===
																	'System'
																		? M3.secondary
																		: M3.primary,
																fontFamily:
																	'Roboto, sans-serif',
															} }
														>
															{ evt.actor }
														</span>
													</div>
												</div>
												<span
													className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 capitalize"
													style={ {
														backgroundColor: sev.bg,
														color: sev.text,
														fontFamily:
															'Roboto, sans-serif',
													} }
												>
													{ evt.severity }
												</span>
											</div>
										</div>
									</div>
								);
							} ) }
						</div>
					</div>
				) }
			</Card>

			<ConfirmDialog
				open={ dialog.open }
				title={ dialog.title }
				body={ dialog.body }
				confirmLabel={ dialog.confirmLabel }
				danger={ dialog.danger }
				icon={ dialog.icon }
				onConfirm={ dialog.onConfirm }
				onCancel={ closeDialog }
			/>
			<Toast
				message={ toast.message }
				type={ toast.type }
				visible={ toast.visible }
			/>
		</div>
	);
}
