/**
 * SubServiceSection - Settings → Subscriptions → Service / Retainer
 * (conditional, visible only when a service-type subscription exists).
 *
 * @file
 * @since 1.0.0
 */
import { M3 } from '../../../utils/static-data';
import { SettingsField, SettingsToggleField, SettingsTextareaField } from '../../Subscriptions/shared';
import type { SettingsSectionProps } from '../settingsSectionTypes';

/**
 * Renders the Service / Retainer settings section.
 *
 * @since 1.0.0
 *
 * @param {SettingsSectionProps} props Component props.
 *
 * @return {JSX.Element} The Service / Retainer section fields.
 */
export function SubServiceSection( { settings, update }: SettingsSectionProps ) {
	return (
		<>
			<div className="flex items-center justify-between gap-4 py-2.5">
				<span className="text-sm" style={ { color: M3.onSurface, fontFamily: 'Roboto, sans-serif' } }>Default invoicing mode</span>
				<div className="flex gap-2">
					{ ( [ 'manual', 'auto' ] as const ).map( ( mode ) => (
						<button
							key={ mode }
							onClick={ () => update( 'defaultInvoicingMode', mode ) }
							className="px-3 py-1.5 rounded-full text-xs"
							style={ {
								backgroundColor: settings.defaultInvoicingMode === mode ? M3.primary : M3.surfaceContainerHigh,
								color: settings.defaultInvoicingMode === mode ? M3.onPrimary : M3.onSurfaceVariant,
								border: 'none', cursor: 'pointer', fontFamily: 'Roboto, sans-serif',
							} }
						>
							{ mode === 'manual' ? 'Manual' : 'Auto' }
						</button>
					) ) }
				</div>
			</div>
			<SettingsField label="Invoice due days (after renewal)" type="number" value={ settings.invoiceDueDays } onChange={ ( v ) => update( 'invoiceDueDays', parseInt( v, 10 ) || 0 ) } />
			<SettingsToggleField label="Enable deliverable tracking" checked={ settings.enableDeliverableTracking } onChange={ ( v ) => update( 'enableDeliverableTracking', v ) } />
			<SettingsTextareaField label="Default deliverable notes template" value={ settings.defaultDeliverableTemplate } onChange={ ( v ) => update( 'defaultDeliverableTemplate', v ) } />
		</>
	);
}
