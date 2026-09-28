/**
 * useSaasAccountActions hook.
 *
 * Owns every row action, confirmation dialog, and toast used to mutate a
 * SaaS account — factored out of SaasAccountsPage the same way
 * useSubscriptionActions is, so the detail panel drives the exact same
 * actions as the table's ⋮ menu instead of keeping a second, drifting copy.
 *
 * Callers get `rowActions(account)` for the menu, `showToast` for anything
 * page-specific, and one `modals` node to render once near the bottom of
 * the page.
 *
 * @file
 * @since 1.0.0
 */
import { useState } from 'react';
import { applyFilters } from '@wordpress/hooks';
import { __, sprintf } from '@wordpress/i18n';
import { Eye, ExternalLink, PauseCircle, CheckCircle, KeyRound } from 'lucide-react';
import { useAppDispatch } from '@/app/store/hooks';
import { getAdminConfig } from '@/shared/wp';
import { SAAS_ACCOUNT_ACTIONS_FILTER } from '@/shared/wp';
import { ConfirmDialog, Toast } from '@/shared/ui';
import type { ActionItem, ConfirmDialogProps, ToastProps } from '@/shared/ui';
import {
	suspendSaasAccountThunk,
	activateSaasAccountThunk,
	rotateSaasApiKeyThunk,
} from '../store/saas-accounts.slice';
import type { SaasAccountRecord } from '../types';

type DialogState = Omit< ConfirmDialogProps, 'onCancel' > & { open: boolean };

const EMPTY_DIALOG: DialogState = {
	open: false,
	title: '',
	body: null,
	confirmLabel: '',
	danger: false,
	onConfirm: () => {},
};

/**
 * `unwrap()` throws the thunk's `rejectWithValue` payload — already a
 * string message from the slice — but throws a SerializedError for anything
 * the slice didn't catch, so both shapes are handled here rather than
 * letting an object reach a toast as "[object Object]".
 *
 * @param err      Whatever `unwrap()` threw.
 * @param fallback Message to show when the rejection carries none.
 */
function actionErrorMessage( err: unknown, fallback: string ): string {
	if ( 'string' === typeof err && '' !== err ) {
		return err;
	}
	if ( err && 'object' === typeof err && 'message' in err ) {
		const { message } = err as { message: unknown };
		if ( 'string' === typeof message && '' !== message ) {
			return message;
		}
	}
	return fallback;
}

interface UseSaasAccountActionsOptions {
	/** Opens the detail panel for one account — the table and panel share one implementation. */
	onViewDetail?: ( account: SaasAccountRecord ) => void;
}

/**
 * Provides the row-actions builder, toast helper, and dialog/toast tree
 * shared by the SaaS Accounts table and its detail panel.
 *
 * @since 1.0.0
 *
 * @param {UseSaasAccountActionsOptions} options Optional detail-panel opener.
 * @return {Object} `{ rowActions, showToast, modals }`.
 */
export function useSaasAccountActions( { onViewDetail }: UseSaasAccountActionsOptions = {} ) {
	const dispatch = useAppDispatch();

	const [ toast, setToast ] = useState< ToastProps >( { message: '', type: 'success', visible: false } );
	const [ dialog, setDialog ] = useState< DialogState >( EMPTY_DIALOG );

	const showToast = ( message: string, type: ToastProps[ 'type' ] = 'success' ) => {
		setToast( { message, type, visible: true } );
		setTimeout( () => setToast( ( t ) => ( { ...t, visible: false } ) ), 3000 );
	};

	const openDialog = ( opts: Omit< DialogState, 'open' > ) => setDialog( { ...opts, open: true } );
	const closeDialog = () => setDialog( ( d ) => ( { ...d, open: false } ) );

	const openOrder = ( account: SaasAccountRecord ) => {
		const adminUrl = getAdminConfig().adminUrl;
		if ( ! adminUrl ) {
			showToast( __( 'Could not resolve the WooCommerce admin URL.', 'purecart' ), 'error' );
			return;
		}
		window.open( `${ adminUrl }post.php?post=${ account.orderId }&action=edit`, '_blank' );
	};

	const confirmSuspend = ( account: SaasAccountRecord ) =>
		openDialog( {
			danger: true,
			icon: PauseCircle,
			title: __( 'Suspend this SaaS account?', 'purecart' ),
			body: sprintf(
				/* translators: %s: customer name or email */
				__(
					'%s loses access immediately and a "suspend" webhook is sent to your SaaS backend. The account can be reactivated at any time.',
					'purecart'
				),
				account.customerName || account.customerEmail
			),
			confirmLabel: __( 'Suspend account', 'purecart' ),
			onConfirm: async () => {
				closeDialog();
				try {
					await dispatch( suspendSaasAccountThunk( account.id ) ).unwrap();
					showToast( __( 'Account suspended', 'purecart' ), 'success' );
				} catch ( err: unknown ) {
					showToast( actionErrorMessage( err, __( 'Could not suspend this account', 'purecart' ) ), 'error' );
				}
			},
		} );

	const confirmActivate = ( account: SaasAccountRecord ) =>
		openDialog( {
			danger: false,
			icon: CheckCircle,
			title: __( 'Activate this SaaS account?', 'purecart' ),
			body: sprintf(
				/* translators: %s: customer name or email */
				__( 'Restores access for %s and sends an "activate" webhook to your SaaS backend.', 'purecart' ),
				account.customerName || account.customerEmail
			),
			confirmLabel: __( 'Activate account', 'purecart' ),
			onConfirm: async () => {
				closeDialog();
				try {
					await dispatch( activateSaasAccountThunk( account.id ) ).unwrap();
					showToast( __( 'Account activated', 'purecart' ), 'success' );
				} catch ( err: unknown ) {
					showToast( actionErrorMessage( err, __( 'Could not activate this account', 'purecart' ) ), 'error' );
				}
			},
		} );

	const confirmRotateKey = ( account: SaasAccountRecord ) =>
		openDialog( {
			danger: true,
			icon: KeyRound,
			title: __( 'Rotate this API key?', 'purecart' ),
			// Deliberately does not promise the customer gets the new key:
			// ApiKeyManager::rotate() only fires the `purecart_api_key_rotated`
			// action, and nothing in PureCart listens to it today — delivering
			// the replacement key is the merchant's own integration work.
			body: __(
				'The current key stops authenticating the moment this runs, so any live integration using it breaks until the customer has the new one. PureCart never shows a full key in the admin UI — hook `purecart_api_key_rotated` to deliver it.',
				'purecart'
			),
			confirmLabel: __( 'Rotate key', 'purecart' ),
			onConfirm: async () => {
				closeDialog();
				try {
					await dispatch( rotateSaasApiKeyThunk( account.id ) ).unwrap();
					showToast( __( 'API key rotated — the previous key no longer works', 'purecart' ), 'success' );
				} catch ( err: unknown ) {
					showToast( actionErrorMessage( err, __( 'Could not rotate the API key', 'purecart' ) ), 'error' );
				}
			},
		} );

	/**
	 * Builds the ⋮ menu for one account row.
	 *
	 * Suspend is offered only for an active account; Activate for anything
	 * else (suspended, and the `cancelled` status the schema allows) —
	 * API\SaaS's activate route accepts both and answers 409 if the account
	 * is already in that state, which surfaces as an error toast.
	 *
	 * @param {SaasAccountRecord} account                    The row being rendered.
	 * @param {Object}            [options]                  Builder options.
	 * @param {boolean}           [options.includeViewDetail] Drop the "View details" entry — passed
	 *                                                        `false` by the detail panel, which is
	 *                                                        already showing those details.
	 * @return {ActionItem[]} Menu items, after the extension filter runs.
	 */
	const rowActions = (
		account: SaasAccountRecord,
		{ includeViewDetail = true }: { includeViewDetail?: boolean } = {}
	): ActionItem[] => {
		const actions: ActionItem[] = [
			...( includeViewDetail
				? [
						{
							label: __( 'View details', 'purecart' ),
							icon: Eye,
							onClick: () => onViewDetail?.( account ),
						},
				  ]
				: [] ),
			{
				label: __( 'View order', 'purecart' ),
				icon: ExternalLink,
				onClick: () => openOrder( account ),
			},
			'active' === account.status
				? {
						label: __( 'Suspend account', 'purecart' ),
						icon: PauseCircle,
						danger: true,
						dividerBefore: true,
						onClick: () => confirmSuspend( account ),
				  }
				: {
						label: __( 'Activate account', 'purecart' ),
						icon: CheckCircle,
						dividerBefore: true,
						onClick: () => confirmActivate( account ),
				  },
			{
				label: __( 'Rotate API key', 'purecart' ),
				icon: KeyRound,
				danger: true,
				onClick: () => confirmRotateKey( account ),
			},
		];

		return applyFilters( SAAS_ACCOUNT_ACTIONS_FILTER, actions, account ) as ActionItem[];
	};

	const modals = (
		<>
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
			<Toast message={ toast.message } type={ toast.type } visible={ toast.visible } />
		</>
	);

	return { rowActions, showToast, modals };
}
