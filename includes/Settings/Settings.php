<?php
/**
 * Thin wrapper around get_option() / update_option() that enforces the
 * OptionKeys constant pattern — no module reads or writes raw option strings.
 *
 * @package PureCart\Settings
 */

declare( strict_types=1 );

namespace PureCart\Settings;

defined( 'ABSPATH' ) || exit;

/**
 * Plugin settings accessor.
 *
 * All public methods are static so callers don't need to pass or store an
 * instance — these are thin pass-throughs, not a stateful object.
 *
 * @since 1.0.0
 */
class Settings {

	/**
	 * Read a plugin option.
	 *
	 * @since 1.0.0
	 * @param string $key     Option key constant from OptionKeys.
	 * @param mixed  $default Default value if the option has never been set.
	 * @return mixed
	 */
	public static function get( string $key, mixed $default = false ): mixed {
		return get_option( $key, $default );
	}

	/**
	 * Write a plugin option.
	 *
	 * @since 1.0.0
	 * @param string $key   Option key constant from OptionKeys.
	 * @param mixed  $value Value to store.
	 * @return bool True if the option was updated, false if unchanged or failed.
	 */
	public static function set( string $key, mixed $value ): bool {
		return (bool) update_option( $key, $value );
	}
}
