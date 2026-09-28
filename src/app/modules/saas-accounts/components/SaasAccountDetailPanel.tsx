/**
 * SaasAccountDetailPanel component.
 *
 * A right-hand slide-over showing one SaaS account in full, plus the same
 * mutation actions the table's ⋮ menu offers (passed in from
 * useSaasAccountActions, so there is exactly one implementation of each).
 *
 * A slide-over rather than its own route: this module has no per-account
 * sub-resources to page through — no activations, no payment log — so the
 * heavier detail *page* the Subscriptions and Licenses modules needed would
 * be a route and a skeleton for six fields.
 *
 * @file
 * @since 1.0.0
 */
import { useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { __, sprintf } from '@wordpress/i18n';
import { M3 } from '@/theme';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { OutlinedButton } from '@/shared/ui/OutlinedButton';
import type { ActionItem } from '@/shared/ui';
import { getAdminConfig } from '@/shared/wp';
import { saasPlanLabel, formatProvisionedAt } from '../constants';
import type { SaasAccountRecord } from '../types';

interface SaasAccountDetailPanelProps {
	account: SaasAccountRecord | null;
	onClose: () => void;
	actions: ActionItem[];
}

/**
 * Renders the account detail slide-over, or nothing when no row is selected.
 *
 * @since 1.0.0
 *
 * @param {SaasAccountDetailPanelProps} props Component props.
 * @return {JSX.Element|null} The panel, or null when closed.
 */
export function SaasAccountDetailPanel( { account, onClose, actions }: SaasAccountDetailPanelProps ) {
	useEffect( () => {
		if ( ! account ) {
			return;
		}
		const handleKeyDown = ( e: KeyboardEvent ) => {
			if ( 'Escape' === e.key ) {
				onClose();
			}
		};
		window.addEventListener( 'keydown', handleKeyDown );
		return () => window.removeEventListener( 'keydown', handleKeyDown );
	}, [ account, onClose ] );

	if ( ! account ) {
		return null;
	}

	const adminUrl = getAdminConfig().adminUrl;
	const orderUrl = adminUrl ? `${ adminUrl }post.php?post=${ account.orderId }&action=edit` : null;

	return (
		<div
			className="fixed z-50 flex justify-end"
			style={ {
				// Starts below the WP admin bar rather than at the viewport
				// top: #wpadminbar sits at z-index 99999, so an overlay
				// pinned to `top: 0` renders *under* it and loses its first
				// 32px — the panel header and close button included. WP sets
				// this custom property itself (46px on narrow screens); the
				// fallback covers older cores that don't.
				top: 'var(--wp-admin--admin-bar--height, 32px)',
				left: 0,
				right: 0,
				bottom: 0,
				backgroundColor: 'rgba(0,0,0,0.40)',
			} }
			onClick={ ( e ) => {
				if ( e.target === e.currentTarget ) {
					onClose();
				}
			} }
		>
			<aside
				className="flex flex-col h-full overflow-hidden"
				style={ {
					width: 'min(420px, 100%)',
					backgroundColor: M3.surface,
					boxShadow: '-8px 0 32px rgba(0,0,0,0.20)',
				} }
			>
				<header
					className="flex items-start justify-between gap-3 px-6 py-5 flex-shrink-0"
					style={ {
						backgroundColor: M3.surfaceContainerLow,
						borderBottom: `1px solid ${ M3.outlineVariant }`,
					} }
				>
					<div>
						<h2 style={ { margin: 0, fontSize: '16px', fontWeight: 500, color: M3.onSurface } }>
							{ account.customerName ||
								/* translators: %s: WooCommerce order number */
								sprintf( __( 'Order #%s', 'purecart' ), account.orderNumber ) }
						</h2>
						<p style={ { margin: '4px 0 0', fontSize: '13px', color: M3.onSurfaceVariant } }>
							{ account.customerEmail }
						</p>
					</div>
					<button
						onClick={ onClose }
						aria-label={ __( 'Close panel', 'purecart' ) }
						style={ {
							background: 'none',
							border: 'none',
							cursor: 'pointer',
							padding: '4px',
							color: M3.onSurfaceVariant,
						} }
					>
						<X size={ 20 } />
					</button>
				</header>

				{ /* The one scrolling region: header and action footer stay
				     put, only the detail list moves. A `mt-auto` footer
				     inside a single scrolling column looked fine on a tall
				     window but sized the content to exactly the panel
				     height, so a short window simply clipped rows with no
				     scrollbar to reach them. */ }
				<div className="flex-1 overflow-y-auto px-6 py-4">
					<DetailRow label={ __( 'Status', 'purecart' ) }>
						<StatusBadge status={ account.status } />
					</DetailRow>
					<DetailRow label={ __( 'Plan', 'purecart' ) }>{ saasPlanLabel( account.plan ) }</DetailRow>
					<DetailRow label={ __( 'Product', 'purecart' ) }>{ account.productName }</DetailRow>
					<DetailRow label={ __( 'Order', 'purecart' ) }>
						{ orderUrl ? (
							<a
								href={ orderUrl }
								target="_blank"
								rel="noreferrer"
								className="inline-flex items-center gap-1"
								style={ { color: M3.primary, textDecoration: 'none' } }
							>
								{
									/* translators: %s: WooCommerce order number */
									sprintf( __( '#%s', 'purecart' ), account.orderNumber )
								}
								<ExternalLink size={ 13 } />
							</a>
						) : (
							`#${ account.orderNumber }`
						) }
					</DetailRow>
					<DetailRow label={ __( 'API Key', 'purecart' ) }>
						<span style={ { fontFamily: 'Roboto Mono, monospace', fontSize: '12px' } }>
							{ account.apiKeyMasked }
						</span>
					</DetailRow>
					<DetailRow label={ __( 'Provisioned', 'purecart' ) }>
						{ formatProvisionedAt( account.provisionedAt ) }
					</DetailRow>
					<DetailRow label={ __( 'Account ID', 'purecart' ) }>{ String( account.id ) }</DetailRow>

					<p
						className="pt-4"
						style={ { fontSize: '12px', color: M3.onSurfaceVariant, margin: 0, lineHeight: 1.6 } }
					>
						{ __(
							'Only the last 8 characters of the API key are ever shown here — the full key went to the customer when the account was provisioned.',
							'purecart'
						) }
					</p>
				</div>

				<div
					className="flex flex-col gap-2 px-6 py-4 flex-shrink-0"
					style={ {
						backgroundColor: M3.surface,
						borderTop: `1px solid ${ M3.outlineVariant }`,
					} }
				>
					{ actions.map( ( action ) => (
						<OutlinedButton key={ action.label } onClick={ action.onClick } danger={ action.danger }>
							<action.icon size={ 15 } />
							{ action.label }
						</OutlinedButton>
					) ) }
				</div>
			</aside>
		</div>
	);
}

/** One label/value line in the panel's detail list. */
function DetailRow( { label, children }: { label: string; children: React.ReactNode } ) {
	return (
		<div
			className="flex items-center justify-between gap-4 py-3"
			style={ { borderBottom: `1px solid ${ M3.outlineVariant }` } }
		>
			<span style={ { fontSize: '12px', color: M3.onSurfaceVariant, fontWeight: 500 } }>{ label }</span>
			<span style={ { fontSize: '13px', color: M3.onSurface, textAlign: 'right' } }>{ children }</span>
		</div>
	);
}
