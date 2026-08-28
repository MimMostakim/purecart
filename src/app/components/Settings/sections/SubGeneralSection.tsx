/**
 * SubGeneralSection - Settings → Subscriptions → General.
 *
 * @file
 * @since 1.0.0
 */
import { SettingsToggleField, SettingsField } from '../../Subscriptions/shared';
import type { SettingsSectionProps } from '../settingsSectionTypes';

/**
 * Renders the General settings section.
 *
 * @since 1.0.0
 *
 * @param {SettingsSectionProps} props Component props.
 *
 * @return {JSX.Element} The General section fields.
 */
export function SubGeneralSection( { settings, update }: SettingsSectionProps ) {
	return (
		<>
			<SettingsToggleField label="Enable subscriptions module" checked={ settings.enableSubscriptions } onChange={ ( v ) => update( 'enableSubscriptions', v ) } />
			<SettingsToggleField label="Enable auto-renewal" checked={ settings.enableAutoRenewal } onChange={ ( v ) => update( 'enableAutoRenewal', v ) } />
			<SettingsToggleField label="Allow mixed cart" checked={ settings.allowMixedCart } onChange={ ( v ) => update( 'allowMixedCart', v ) } helpText="Subscription + one-time products in the same checkout" />
			<SettingsToggleField label="One trial per customer" checked={ settings.oneTrialPerCustomer } onChange={ ( v ) => update( 'oneTrialPerCustomer', v ) } />
			<SettingsField label="Average lifetime months (LTV)" type="number" value={ settings.avgLifetimeMonths } onChange={ ( v ) => update( 'avgLifetimeMonths', parseInt( v, 10 ) || 0 ) } />
		</>
	);
}
