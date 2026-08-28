<?php
/**
 * Upload, store, version and manage update package files.
 *
 * @package PureCart\Updates
 */

declare( strict_types=1 );

namespace PureCart\Updates;

defined( 'ABSPATH' ) || exit;

/**
 * Owns everything about a package *file*: where it lives on disk, its
 * checksum, and the lifecycle operations (publish / withdraw / delete) that
 * touch both the file and its DB row together.
 *
 * PackageRepository is the data layer underneath; this class is the business
 * layer above it. Callers pass already-validated arguments — capability and
 * nonce checks belong to the REST/admin layer that invokes this, matching how
 * the Subscriptions module separates SubscriptionManager from RestController.
 *
 * @since 1.0.0
 */
class UpdatePackageManager {

	/**
	 * Extensions a package may have.
	 *
	 * An allow-list, not a deny-list: a deny-list of dangerous extensions is
	 * impossible to keep complete (`.php5`, `.phtml`, `.pht`, handler
	 * mappings that vary per host), whereas this enumerates exactly the file
	 * kinds RND-auto-updates.md § "Supported Product Types" describes.
	 *
	 * @var string[]
	 */
	private const ALLOWED_EXTENSIONS = array(
		'zip', 'tar', 'gz', 'tgz', 'bz2', 'xz',
		'dmg', 'pkg', 'exe', 'msi', 'deb', 'rpm', 'appimage',
		'apk', 'ipa', 'jar', 'bin', 'run',
	);

	/** Directory inside wp-content/uploads where packages are stored. */
	private const STORAGE_DIR = 'purecart-packages';

	/** @var PackageRepository */
	private PackageRepository $packages;

	/**
	 * @since 1.0.0
	 */
	public function __construct() {
		$this->packages = new PackageRepository();
	}

	// -----------------------------------------------------------------------
	// Storage
	// -----------------------------------------------------------------------

	/**
	 * Absolute path to the package storage directory, created and protected
	 * on first use.
	 *
	 * @since 1.0.0
	 * @return string Absolute path with no trailing slash, or '' if unwritable.
	 */
	public function storage_dir(): string {
		$uploads = wp_upload_dir();

		if ( ! empty( $uploads['error'] ) ) {
			return '';
		}

		$dir = trailingslashit( $uploads['basedir'] ) . self::STORAGE_DIR;

		if ( ! is_dir( $dir ) && ! wp_mkdir_p( $dir ) ) {
			return '';
		}

		$this->protect_storage_dir( $dir );

		return untrailingslashit( $dir );
	}

	/**
	 * Drop the standard guards into the storage directory.
	 *
	 * Two of the three work everywhere; the `.htaccess` only applies on
	 * Apache. **On nginx there is no per-directory config**, so a site served
	 * by nginx must add its own `location` deny rule for this directory —
	 * documented rather than silently assumed, because assuming otherwise
	 * would leave packages fetchable by direct URL. The randomised filename
	 * (see build_filename()) is a second layer that does not depend on server
	 * configuration at all.
	 *
	 * @since 1.0.0
	 * @param string $dir Absolute directory path.
	 * @return void
	 */
	private function protect_storage_dir( string $dir ): void {
		$htaccess = trailingslashit( $dir ) . '.htaccess';
		if ( ! file_exists( $htaccess ) ) {
			// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents -- Writing a protection file during setup; WP_Filesystem needs credentials that are not available in every context this runs from.
			@file_put_contents( $htaccess, "Order Deny,Allow\nDeny from all\n" );
		}

		$index = trailingslashit( $dir ) . 'index.php';
		if ( ! file_exists( $index ) ) {
			// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents -- As above.
			@file_put_contents( $index, "<?php\n// Silence is golden.\n" );
		}
	}

	/**
	 * Build the on-disk filename for a package.
	 *
	 * Prefixed with 16 random hex characters so the path is not derivable from
	 * the product slug and version. This matters because a store on nginx (or
	 * any host where the `.htaccess` above is ignored) would otherwise serve
	 * `.../purecart-packages/my-plugin-1.3.0.zip` to anyone who guessed it,
	 * bypassing the entire license gate and signed-token system.
	 *
	 * @since 1.0.0
	 * @param int    $product_id WooCommerce product ID.
	 * @param string $version    Version string.
	 * @param string $extension  File extension, without the dot.
	 * @return string
	 */
	private function build_filename( int $product_id, string $version, string $extension ): string {
		return sprintf(
			'%s-%d-%s.%s',
			bin2hex( random_bytes( 8 ) ),
			$product_id,
			sanitize_file_name( $version ),
			$extension
		);
	}

	// -----------------------------------------------------------------------
	// Adding packages
	// -----------------------------------------------------------------------

	/**
	 * Register a new package from a file already on the server.
	 *
	 * This is the core entry point — the $_FILES upload path (add_from_upload)
	 * and any future WP-CLI / GitHub importer all funnel through here, so
	 * checksum, validation and DB insertion have exactly one implementation.
	 *
	 * @since 1.0.0
	 * @param int                  $product_id  WooCommerce product ID.
	 * @param string               $source_path Absolute path to the package file.
	 * @param array<string, mixed> $args        version, channel, platform, requires_wp, tested_wp, requires_php, changelog, release_notes, created_by.
	 * @param bool                 $move        True to move the file (uploads), false to copy it (leave the source in place).
	 * @return object|\WP_Error The created package row, or an error.
	 */
	public function add( int $product_id, string $source_path, array $args = array(), bool $move = false ) {
		if ( $product_id <= 0 ) {
			return new \WP_Error( 'purecart_invalid_product', __( 'A valid product is required.', 'purecart' ) );
		}

		if ( ! is_readable( $source_path ) || ! is_file( $source_path ) ) {
			return new \WP_Error( 'purecart_file_missing', __( 'The package file could not be read.', 'purecart' ) );
		}

		$extension = strtolower( (string) pathinfo( $source_path, PATHINFO_EXTENSION ) );
		if ( ! in_array( $extension, self::ALLOWED_EXTENSIONS, true ) ) {
			return new \WP_Error(
				'purecart_bad_extension',
				sprintf(
					/* translators: %s: file extension */
					__( '"%s" is not an allowed package type.', 'purecart' ),
					$extension
				)
			);
		}

		// Version: explicit argument wins; otherwise try to read it out of the
		// package itself, which is what an admin uploading a WP plugin ZIP
		// expects to happen.
		$version = isset( $args['version'] ) ? $this->clean_version( (string) $args['version'] ) : '';
		if ( '' === $version ) {
			$version = $this->extract_version_from_zip( $source_path );
		}

		if ( '' === $version ) {
			return new \WP_Error(
				'purecart_no_version',
				__( 'No version was supplied and none could be read from the package.', 'purecart' )
			);
		}

		// Compatibility headers: an explicit form value always wins, but a
		// blank one falls back to what the package itself declares rather
		// than shipping empty and letting WordPress assume the update is
		// safe to install anywhere.
		$zip_headers = $this->extract_headers_from_zip( $source_path );

		foreach ( array( 'requires_wp', 'tested_wp', 'requires_php' ) as $header ) {
			if ( '' === trim( (string) ( $args[ $header ] ?? '' ) ) && '' !== $zip_headers[ $header ] ) {
				$args[ $header ] = $zip_headers[ $header ];
			}
		}

		$platform = isset( $args['platform'] ) && '' !== $args['platform'] ? sanitize_text_field( (string) $args['platform'] ) : 'all';
		$channel  = isset( $args['channel'] ) && in_array( $args['channel'], PackageRepository::CHANNELS, true ) ? (string) $args['channel'] : 'stable';

		if ( $this->packages->find_version( $product_id, $version, $platform ) ) {
			return new \WP_Error(
				'purecart_duplicate_version',
				sprintf(
					/* translators: 1: version, 2: platform */
					__( 'Version %1$s already exists for platform "%2$s".', 'purecart' ),
					$version,
					$platform
				)
			);
		}

		$storage = $this->storage_dir();
		if ( '' === $storage ) {
			return new \WP_Error( 'purecart_storage_unwritable', __( 'The package storage directory is not writable.', 'purecart' ) );
		}

		$destination = trailingslashit( $storage ) . $this->build_filename( $product_id, $version, $extension );

		$stored = $move
			// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_rename -- Moving an uploaded temp file; WP_Filesystem offers no equivalent that preserves the atomicity of rename().
			? @rename( $source_path, $destination )
			// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_copy -- Importing a file the caller keeps ownership of.
			: @copy( $source_path, $destination );

		if ( ! $stored ) {
			return new \WP_Error( 'purecart_store_failed', __( 'The package file could not be saved.', 'purecart' ) );
		}

		// Checksum is computed from the *stored* file, not the source — so it
		// describes exactly the bytes that will later be served, even if the
		// copy were truncated by a full disk.
		$checksum = hash_file( 'sha256', $destination );

		$package = $this->packages->create(
			array(
				'product_id'      => $product_id,
				'version'         => $version,
				'platform'        => $platform,
				'channel'         => $channel,
				'file_path'       => $destination,
				'file_size'       => (int) filesize( $destination ),
				'checksum_sha256' => (string) $checksum,
				'requires_wp'     => sanitize_text_field( (string) ( $args['requires_wp'] ?? '' ) ),
				'tested_wp'       => sanitize_text_field( (string) ( $args['tested_wp'] ?? '' ) ),
				'requires_php'    => sanitize_text_field( (string) ( $args['requires_php'] ?? '' ) ),
				'changelog'       => wp_kses_post( (string) ( $args['changelog'] ?? '' ) ),
				'release_notes'   => sanitize_textarea_field( (string) ( $args['release_notes'] ?? '' ) ),
				'is_active'       => 1,
				'created_by'      => (int) ( $args['created_by'] ?? get_current_user_id() ),
			)
		);

		if ( ! $package ) {
			// Don't leave an orphaned file behind if the row failed to insert.
			// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_unlink -- Cleaning up a file this method just created.
			@unlink( $destination );
			return new \WP_Error( 'purecart_db_failed', __( 'The package could not be recorded.', 'purecart' ) );
		}

		/**
		 * Fires after a new package version is published.
		 *
		 * UpdateNotifier (Step 8) listens here to email active license holders.
		 *
		 * @since 1.0.0
		 * @param int    $package_id Package row ID.
		 * @param int    $product_id WooCommerce product ID.
		 * @param string $version    Version string.
		 */
		do_action( 'purecart_update_package_published', (int) $package->id, $product_id, $version );

		return $package;
	}

	/**
	 * Register a package from a `$_FILES` entry.
	 *
	 * @since 1.0.0
	 * @param int                  $product_id WooCommerce product ID.
	 * @param array<string, mixed> $file       One `$_FILES` entry.
	 * @param array<string, mixed> $args       Same as add().
	 * @return object|\WP_Error
	 */
	public function add_from_upload( int $product_id, array $file, array $args = array() ) {
		if ( ! isset( $file['tmp_name'], $file['name'] ) || UPLOAD_ERR_OK !== (int) ( $file['error'] ?? UPLOAD_ERR_NO_FILE ) ) {
			return new \WP_Error( 'purecart_upload_failed', __( 'The file was not uploaded successfully.', 'purecart' ) );
		}

		if ( ! is_uploaded_file( (string) $file['tmp_name'] ) ) {
			return new \WP_Error( 'purecart_not_uploaded', __( 'The file is not a valid upload.', 'purecart' ) );
		}

		// The temp file has no extension, so validation has to see the
		// *submitted* name. Rebuild a temp path carrying that extension rather
		// than trusting the client name for anything else about the file.
		$extension = strtolower( (string) pathinfo( sanitize_file_name( (string) $file['name'] ), PATHINFO_EXTENSION ) );
		$staged    = (string) $file['tmp_name'] . '.' . $extension;

		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_rename -- Renaming PHP's own upload temp file in place.
		if ( ! @rename( (string) $file['tmp_name'], $staged ) ) {
			$staged = (string) $file['tmp_name'];
		}

		return $this->add( $product_id, $staged, $args, true );
	}

	// -----------------------------------------------------------------------
	// Lifecycle
	// -----------------------------------------------------------------------

	/**
	 * Withdraw or restore a version without deleting it.
	 *
	 * @since 1.0.0
	 * @param int  $package_id Package row ID.
	 * @param bool $active     True to serve it, false to withdraw it.
	 * @return bool
	 */
	public function set_active( int $package_id, bool $active ): bool {
		return $this->packages->update( $package_id, array( 'is_active' => $active ? 1 : 0 ) );
	}

	/**
	 * Delete a package row and its file.
	 *
	 * @since 1.0.0
	 * @param int $package_id Package row ID.
	 * @return bool
	 */
	public function delete( int $package_id ): bool {
		$package = $this->packages->find( $package_id );
		if ( ! $package ) {
			return false;
		}

		$deleted = $this->packages->delete( $package_id );

		// Only remove the file once the row is gone, and only if it really
		// sits inside our own storage directory — a row whose file_path was
		// tampered with must never make this delete something else.
		if ( $deleted && $this->is_inside_storage( (string) $package->file_path ) && file_exists( (string) $package->file_path ) ) {
			// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_unlink -- Removing a package file this module created.
			@unlink( (string) $package->file_path );
		}

		return $deleted;
	}

	/**
	 * Whether a path really resides inside the package storage directory.
	 *
	 * Compares canonicalised paths, so `.../purecart-packages/../../wp-config.php`
	 * cannot pass a naive string prefix check.
	 *
	 * Both sides go through wp_normalize_path() first. On Windows realpath()
	 * returns backslash separators while trailingslashit() appends a forward
	 * slash, so comparing them raw never matches — which made this return
	 * false for files that genuinely were inside storage, and left delete()
	 * silently orphaning every package file it should have removed.
	 *
	 * @since 1.0.0
	 * @param string $path Absolute path to test.
	 * @return bool
	 */
	public function is_inside_storage( string $path ): bool {
		$storage = $this->storage_dir();
		if ( '' === $storage ) {
			return false;
		}

		$real_storage = realpath( $storage );
		$real_path    = realpath( $path );

		if ( false === $real_storage || false === $real_path ) {
			return false;
		}

		$real_storage = trailingslashit( wp_normalize_path( $real_storage ) );
		$real_path    = wp_normalize_path( $real_path );

		return 0 === strpos( $real_path, $real_storage );
	}

	// -----------------------------------------------------------------------
	// Version detection
	// -----------------------------------------------------------------------

	/**
	 * Read the version out of a WordPress plugin/theme ZIP.
	 *
	 * Looks for `readme.txt`'s `Stable tag:` header first (the WordPress.org
	 * convention), then falls back to a `Version:` header in any PHP file or
	 * `style.css` — a theme has no readme.txt but always has style.css.
	 *
	 * @since 1.0.0
	 * @param string $zip_path Absolute path to the ZIP.
	 * @return string Version string, or '' if none could be read.
	 */
	public function extract_version_from_zip( string $zip_path ): string {
		if ( ! class_exists( '\ZipArchive' ) || 'zip' !== strtolower( (string) pathinfo( $zip_path, PATHINFO_EXTENSION ) ) ) {
			return '';
		}

		$zip = new \ZipArchive();
		if ( true !== $zip->open( $zip_path ) ) {
			return '';
		}

		$version = '';

		for ( $i = 0; $i < $zip->numFiles; $i++ ) {
			$name = (string) $zip->getNameIndex( $i );
			$base = strtolower( basename( $name ) );

			// Only look at top-level or one-directory-deep files — a plugin ZIP
			// is `my-plugin/readme.txt`, and scanning vendor/ trees would both
			// waste time and risk matching a dependency's version header.
			if ( substr_count( trim( $name, '/' ), '/' ) > 1 ) {
				continue;
			}

			if ( 'readme.txt' === $base ) {
				$contents = (string) $zip->getFromIndex( $i );
				if ( preg_match( '/^\s*Stable tag:\s*(.+)$/im', $contents, $m ) ) {
					$candidate = $this->clean_version( $m[1] );
					// "trunk" is a valid Stable tag on WordPress.org but is not
					// a version number.
					if ( '' !== $candidate && 0 !== strcasecmp( $candidate, 'trunk' ) ) {
						$zip->close();
						return $candidate;
					}
				}
			}

			if ( '' === $version && ( 'style.css' === $base || '.php' === substr( $base, -4 ) ) ) {
				$contents = (string) $zip->getFromIndex( $i );
				if ( preg_match( '/^[ \t\/*#@]*Version:\s*(.+)$/im', $contents, $m ) ) {
					$version = $this->clean_version( $m[1] );
				}
			}
		}

		$zip->close();

		return $version;
	}


	/**
	 * Read the WordPress compatibility headers out of a plugin/theme ZIP.
	 *
	 * Added after live testing showed these arriving empty: a ZIP whose
	 * readme.txt already declared all three still produced `requires: ""`,
	 * because only the version was being parsed.
	 *
	 * That is not cosmetic. WordPress uses `requires` and `requires_php` to
	 * decide whether a site may install an update at all; left blank it assumes
	 * compatibility, so a PHP 8.0-only release installs onto a PHP 7.4 site and
	 * fatals it. Re-typing values that already live inside the package also
	 * invites the form and the readme to drift apart.
	 *
	 * @since 1.0.0
	 * @param string $zip_path Absolute path to the ZIP.
	 * @return array<string, string> Keys: requires_wp, tested_wp, requires_php.
	 */
	public function extract_headers_from_zip( string $zip_path ): array {
		$headers = array(
			'requires_wp'  => '',
			'tested_wp'    => '',
			'requires_php' => '',
		);

		if ( ! class_exists( '\ZipArchive' ) || 'zip' !== strtolower( (string) pathinfo( $zip_path, PATHINFO_EXTENSION ) ) ) {
			return $headers;
		}

		$zip = new \ZipArchive();
		if ( true !== $zip->open( $zip_path ) ) {
			return $headers;
		}

		// readme.txt spells them one way, a plugin/theme file header another;
		// both are matched so a theme carrying only style.css still resolves.
		$patterns = array(
			'requires_wp'  => '/^[ \t\/*#@]*(?:Requires at least|Requires WP):\s*(.+)$/im',
			'tested_wp'    => '/^[ \t\/*#@]*Tested up to:\s*(.+)$/im',
			'requires_php' => '/^[ \t\/*#@]*Requires PHP:\s*(.+)$/im',
		);

		for ( $i = 0; $i < $zip->numFiles; $i++ ) {
			$name = (string) $zip->getNameIndex( $i );
			$base = strtolower( basename( $name ) );

			// Same depth limit as extract_version_from_zip(): a bundled
			// dependency's own headers must not be read as the product's.
			if ( substr_count( trim( $name, '/' ), '/' ) > 1 ) {
				continue;
			}

			if ( 'readme.txt' !== $base && 'style.css' !== $base && '.php' !== substr( $base, -4 ) ) {
				continue;
			}

			$contents = (string) $zip->getFromIndex( $i );

			foreach ( $patterns as $key => $pattern ) {
				if ( '' === $headers[ $key ] && preg_match( $pattern, $contents, $m ) ) {
					$headers[ $key ] = $this->clean_requirement( $m[1] );
				}
			}
		}

		$zip->close();

		return $headers;
	}

	/**
	 * Normalise a version-requirement value, rejecting anything that isn't one.
	 *
	 * @since 1.0.0
	 * @param string $value Raw header value.
	 * @return string
	 */
	private function clean_requirement( string $value ): string {
		$value = trim( $value );

		return preg_match( '/^\d[0-9.]*$/', $value ) ? substr( $value, 0, 10 ) : '';
	}

	/**
	 * Normalise a version string and reject anything that isn't one.
	 *
	 * @since 1.0.0
	 * @param string $version Raw version string.
	 * @return string Cleaned version, or '' if it doesn't look like a version.
	 */
	public function clean_version( string $version ): string {
		$version = trim( $version );
		$version = ltrim( $version, 'vV' );
		$version = trim( $version );

		// Must start with a digit and contain only version-ish characters —
		// this is what keeps a stray "Stable tag: see changelog" or a
		// path-traversal attempt out of the filename built from it.
		if ( ! preg_match( '/^\d[0-9A-Za-z.\-+]*$/', $version ) ) {
			return '';
		}

		return substr( $version, 0, 32 );
	}
}
