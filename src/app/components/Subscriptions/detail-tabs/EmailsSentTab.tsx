/**
 * EmailsSentTab component.
 *
 * Log of every subscription email sent for this record. opened: null
 * renders as "—" (tracking unavailable), not as a false "not opened".
 *
 * @file
 * @since 1.0.0
 */
import { Check, X, Minus } from 'lucide-react';
import { M3 } from '../../../utils/static-data';
import { Card } from '../../ui/Card';
import type { SubscriptionEmailLogEntry } from '../types';

interface EmailsSentTabProps {
	emails: SubscriptionEmailLogEntry[];
}

/**
 * Renders the Detail page's Emails Sent tab.
 *
 * @since 1.0.0
 *
 * @param {EmailsSentTabProps} props Component props.
 *
 * @return {JSX.Element} The emails sent tab content.
 */
export function EmailsSentTab( { emails }: EmailsSentTabProps ) {
	return (
		<Card className="p-5">
			<div className="text-sm font-semibold mb-4" style={ { color: M3.onSurface, fontFamily: 'Roboto, sans-serif' } }>
				Emails Sent
			</div>
			{ emails.length === 0 ? (
				<div className="text-sm text-center py-6" style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif' } }>
					No emails recorded for this subscription yet.
				</div>
			) : (
				<table className="w-full text-sm">
					<thead>
						<tr style={ { borderBottom: `1px solid ${ M3.outlineVariant }` } }>
							{ [ 'Email Type', 'Sent At', 'To', 'Opened' ].map( ( h ) => (
								<th
									key={ h }
									className="text-left py-2 px-2 text-xs font-medium"
									style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px' } }
								>
									{ h }
								</th>
							) ) }
						</tr>
					</thead>
					<tbody>
						{ emails.map( ( e ) => (
							<tr key={ e.id } style={ { borderBottom: `1px solid ${ M3.outlineVariant }` } }>
								<td className="py-2 px-2" style={ { color: M3.onSurface, fontFamily: 'Roboto, sans-serif' } }>{ e.emailType }</td>
								<td className="py-2 px-2" style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif' } }>{ e.sentAt }</td>
								<td className="py-2 px-2" style={ { color: M3.onSurfaceVariant, fontFamily: 'Roboto, sans-serif' } }>{ e.to }</td>
								<td className="py-2 px-2">
									{ e.opened === null ? (
										<Minus size={ 14 } color={ M3.onSurfaceVariant } />
									) : e.opened ? (
										<Check size={ 14 } color={ M3.success } />
									) : (
										<X size={ 14 } color={ M3.error } />
									) }
								</td>
							</tr>
						) ) }
					</tbody>
				</table>
			) }
		</Card>
	);
}
