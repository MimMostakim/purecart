/**
 * CardExpiryWarning component.
 *
 * Renders an amber banner warning that a subscription's payment card is
 * expiring soon, with a clickable "send an update link" phrase. Contains no
 * confirm-dialog logic itself - the caller decides the confirmation UX and
 * wires it via onSendUpdateLink.
 *
 * @file
 * @since 1.0.0
 */
import { M3 } from '../../../utils/static-data';

/**
 * Renders an amber card-expiry warning banner.
 *
 * @since 1.0.0
 *
 * @param {Object}   props                  Component props.
 * @param {string}   props.expiryDate       Card expiry in 'MM/YYYY' form.
 * @param {Function} props.onSendUpdateLink Callback invoked when the "send an update link" phrase is clicked.
 *
 * @return {JSX.Element} The warning banner element.
 */
export function CardExpiryWarning( {
	expiryDate,
	onSendUpdateLink,
}: {
	expiryDate: string;
	onSendUpdateLink: () => void;
} ) {
	return (
		<div
			className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs"
			style={ {
				backgroundColor: M3.warningContainer,
				color: M3.warning,
				fontFamily: 'Roboto, sans-serif',
			} }
		>
			<span>⚠ Payment card expires { expiryDate } —</span>
			<button
				onClick={ onSendUpdateLink }
				className="underline"
				style={ {
					background: 'none',
					border: 'none',
					cursor: 'pointer',
					color: M3.warning,
					fontFamily: 'Roboto, sans-serif',
					fontSize: 'inherit',
					padding: 0,
				} }
			>
				send an update link
			</button>
		</div>
	);
}
