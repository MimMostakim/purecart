<?php
/**
 * Shared, timezone-safe date math for billing-cycle calculations.
 *
 * Extracted out of SubscriptionManager during Step 6 so RenewalEngine doesn't
 * duplicate this logic — duplicating it would risk re-introducing the exact
 * strtotime()/gmdate()-vs-current_time('mysql') timezone-mixing bug found and
 * fixed here (see git history / conversation: resume() and resubscribe() both
 * silently drifted subscription dates by the gap between PHP's server default
 * timezone and the site's configured timezone).
 *
 * @package PureCart\Subscriptions
 */

declare( strict_types=1 );

namespace PureCart\Subscriptions;

defined( 'ABSPATH' ) || exit;

/**
 * @since 1.0.0
 */
class BillingClock {

	/**
	 * Parse a `current_time('mysql')`-style plain datetime string into a
	 * DateTimeImmutable anchored to the site's configured timezone.
	 *
	 * Every date value this module reads or writes (paused_at, next_payment_at,
	 * cancelled_at, ...) is produced by `current_time( 'mysql' )`, which returns
	 * *site-local* wall-clock time as a plain string with no timezone marker.
	 * `strtotime()`/`gmdate()` don't know that — they parse/format using PHP's
	 * server default timezone (`date_default_timezone_get()`), which has no
	 * relationship to the WordPress site's configured timezone and, on most
	 * hosts, differs from it. `wp_timezone()` (WP 5.3+) is the site's actual
	 * configured zone — anchoring every DateTimeImmutable to it keeps parsing
	 * and formatting consistent, whatever the server's PHP default is set to.
	 *
	 * @since 1.0.0
	 * @param string $mysql_datetime A `current_time('mysql')`-style datetime string.
	 * @return \DateTimeImmutable
	 */
	public static function to_dt( string $mysql_datetime ): \DateTimeImmutable {
		return new \DateTimeImmutable( $mysql_datetime, wp_timezone() );
	}

	/**
	 * The current site-local time as a DateTimeImmutable — equivalent to
	 * `self::to_dt( current_time( 'mysql' ) )`, provided as a shorthand since
	 * "now, timezone-safe" is needed for every elapsed-time calculation
	 * (grace-period checks, idempotency windows, ...).
	 *
	 * @since 1.0.0
	 * @return \DateTimeImmutable
	 */
	public static function now_dt(): \DateTimeImmutable {
		return self::to_dt( current_time( 'mysql' ) );
	}

	/**
	 * Add a billing interval to a MySQL datetime string.
	 *
	 * Deliberately not plain `strtotime( "+{$count} months" )` — PHP's month
	 * arithmetic overflows past short months (Jan 31 + 1 month = Mar 3, not
	 * Feb 28), which would drift a subscriber's billing date every time it
	 * crosses one. add_months_clamped() below clamps to the last valid day
	 * of the target month instead.
	 *
	 * @since 1.0.0
	 * @param string $datetime A `current_time('mysql')`-style datetime string.
	 * @param int    $count    Number of periods to add.
	 * @param string $unit     One of 'day', 'week', 'month', 'year'.
	 * @return string MySQL datetime string.
	 */
	public static function add_interval( string $datetime, int $count, string $unit ): string {
		$date = self::to_dt( $datetime );

		switch ( $unit ) {
			case 'day':
				return $date->modify( "+{$count} days" )->format( 'Y-m-d H:i:s' );
			case 'week':
				return $date->modify( "+{$count} weeks" )->format( 'Y-m-d H:i:s' );
			case 'year':
				return self::add_months_clamped( $date, $count * 12 )->format( 'Y-m-d H:i:s' );
			case 'month':
			default:
				return self::add_months_clamped( $date, $count )->format( 'Y-m-d H:i:s' );
		}
	}

	/**
	 * Add N calendar months, clamping the day-of-month to the target month's
	 * last day instead of overflowing into the following month.
	 *
	 * @since 1.0.0
	 * @param \DateTimeImmutable $date   Starting date/time.
	 * @param int                $months Number of months to add.
	 * @return \DateTimeImmutable
	 */
	public static function add_months_clamped( \DateTimeImmutable $date, int $months ): \DateTimeImmutable {
		$day           = (int) $date->format( 'j' );
		$first_of_this = $date->modify( 'first day of this month' );
		$target_month  = $first_of_this->modify( "{$months} months" );
		$last_day      = (int) $target_month->format( 't' );

		return $target_month
			->setDate( (int) $target_month->format( 'Y' ), (int) $target_month->format( 'n' ), min( $day, $last_day ) )
			->setTime( (int) $date->format( 'H' ), (int) $date->format( 'i' ), (int) $date->format( 's' ) );
	}
}
