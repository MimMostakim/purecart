/**
 * SubCoursesSection - Settings → Subscriptions → Courses / LMS (conditional,
 * visible only when a course-type subscription exists).
 *
 * @file
 * @since 1.0.0
 */
import { SettingsSelectField, SettingsField, SettingsToggleField } from '../../Subscriptions/shared';
import type { SettingsSectionProps } from '../settingsSectionTypes';

const LMS_OPTIONS = [
	{ label: 'None', value: 'none' },
	{ label: 'LearnDash', value: 'learndash' },
	{ label: 'LifterLMS', value: 'lifterlms' },
	{ label: 'Tutor LMS', value: 'tutorlms' },
];

/**
 * Renders the Courses / LMS settings section.
 *
 * @since 1.0.0
 *
 * @param {SettingsSectionProps} props Component props.
 *
 * @return {JSX.Element} The Courses / LMS section fields.
 */
export function SubCoursesSection( { settings, update }: SettingsSectionProps ) {
	return (
		<>
			<SettingsSelectField
				label="LMS integration"
				value={ settings.lmsIntegration }
				options={ LMS_OPTIONS }
				onChange={ ( v ) => update( 'lmsIntegration', v as typeof settings.lmsIntegration ) }
			/>
			<SettingsField label="LMS API key" type="text" value={ settings.lmsApiKey } onChange={ ( v ) => update( 'lmsApiKey', v ) } />
			<SettingsField label="Default course access duration" suffix="months" type="number" value={ settings.defaultCourseAccessMonths } onChange={ ( v ) => update( 'defaultCourseAccessMonths', parseInt( v, 10 ) || 0 ) } />
			<SettingsToggleField label="Enroll on trial start" checked={ settings.enrollOnTrialStart } onChange={ ( v ) => update( 'enrollOnTrialStart', v ) } />
			<SettingsToggleField label="Revoke enrollment on cancellation" checked={ settings.revokeEnrollmentOnCancel } onChange={ ( v ) => update( 'revokeEnrollmentOnCancel', v ) } />
		</>
	);
}
