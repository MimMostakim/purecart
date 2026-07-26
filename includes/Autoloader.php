<?php
/**
 * PSR-4 autoloader for the PureCart\ namespace.
 *
 * Loaded manually by purecart.php before any other PureCart class is
 * referenced, so it must not rely on the autoloader itself.
 *
 * @package PureCart
 */

declare( strict_types=1 );

namespace PureCart;

defined( 'ABSPATH' ) || exit;

/**
 * Registers a PSR-4 autoloader for the PureCart\ namespace.
 *
 * Maps PureCart\Foo\Bar  →  includes/Foo/Bar.php
 *
 * Works without `composer install` — the plugin is fully self-contained.
 * Composer's vendor/autoload.php is loaded separately (third-party deps only).
 */
class Autoloader {

	/**
	 * Namespace prefix this autoloader handles.
	 *
	 * @var string
	 */
	private const PREFIX = 'PureCart\\';

	/**
	 * Length of the namespace prefix (cached to avoid repeated strlen calls).
	 *
	 * @var int
	 */
	private const PREFIX_LEN = 9;

	/**
	 * Absolute path to the includes/ directory (with trailing slash).
	 *
	 * @var string
	 */
	private static string $base_dir = '';

	/**
	 * Register the autoloader with the SPL autoload stack.
	 *
	 * Must be called once, immediately after PURECART_PATH is defined.
	 *
	 * @since  1.0.0
	 * @param  string $base_dir Absolute path to the includes/ directory.
	 * @return void
	 */
	public static function register( string $base_dir ): void {
		self::$base_dir = rtrim( $base_dir, '/\\' ) . DIRECTORY_SEPARATOR;

		spl_autoload_register( array( static::class, 'load' ) );
	}

	/**
	 * Resolve and require a PureCart\ class file.
	 *
	 * Called by PHP's SPL autoload stack whenever an undefined class is
	 * referenced. Returns immediately for classes outside this namespace.
	 *
	 * @since  1.0.0
	 * @param  string $class Fully-qualified class name.
	 * @return void
	 */
	public static function load( string $class ): void {
		if ( strncmp( $class, self::PREFIX, self::PREFIX_LEN ) !== 0 ) {
			return;
		}

		$relative = substr( $class, self::PREFIX_LEN );
		$file     = self::$base_dir . str_replace( '\\', DIRECTORY_SEPARATOR, $relative ) . '.php';

		if ( file_exists( $file ) ) {
			require_once $file;
		}
	}
}
