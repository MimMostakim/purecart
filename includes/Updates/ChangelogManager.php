<?php
/**
 * Assembles per-version changelogs into the combined view WordPress shows.
 *
 * @package PureCart\Updates
 */

declare( strict_types=1 );

namespace PureCart\Updates;

defined( 'ABSPATH' ) || exit;

/**
 * Each package row carries its own `changelog` (RND-auto-updates.md §
 * "Key Design Decisions" 8 — the changelog lives in the DB, not inside the
 * package, so it can be corrected without re-uploading a release). What
 * WordPress's "View details → Changelog" tab wants, though, is one HTML
 * document covering the recent history. This class is that assembly.
 *
 * @since 1.0.0
 */
class ChangelogManager {

	/** How many versions the combined changelog covers by default. */
	private const DEFAULT_LIMIT = 20;

	/** @var PackageRepository */
	private PackageRepository $packages;

	/**
	 * @since 1.0.0
	 */
	public function __construct() {
		$this->packages = new PackageRepository();
	}

	/**
	 * Changelog entries for a product, newest version first.
	 *
	 * Defaults to `stable` only. The changelog endpoint is public, and beta
	 * or nightly rows would otherwise disclose unreleased version numbers and
	 * in-progress feature names to anyone who asked — a channel the caller
	 * has not been granted should not be readable just because this response
	 * needs no licence.
	 *
	 * @since 1.0.0
	 * @param int    $product_id WooCommerce product ID.
	 * @param string $channel    Channel to include (stable|beta|nightly).
	 * @param int    $limit      Maximum entries.
	 * @return array<int, array<string, string>> Rows of { version, channel, released_at, changelog, release_notes }.
	 */
	public function entries( int $product_id, string $channel = 'stable', int $limit = self::DEFAULT_LIMIT ): array {
		$rows = $this->packages->version_sort( $this->visible_packages( $product_id, $channel ) );

		$entries = array();
		$seen    = array();

		foreach ( $rows as $row ) {
			// A product with per-platform builds has one row per platform for
			// the same version; the changelog is about the release, not the
			// build, so collapse them.
			$version = (string) $row->version;
			if ( isset( $seen[ $version ] ) ) {
				continue;
			}
			$seen[ $version ] = true;

			$entries[] = array(
				'version'       => $version,
				'channel'       => (string) $row->channel,
				'released_at'   => (string) $row->released_at,
				'changelog'     => (string) $row->changelog,
				'release_notes' => (string) $row->release_notes,
			);

			if ( count( $entries ) >= max( 1, $limit ) ) {
				break;
			}
		}

		return $entries;
	}

	/**
	 * Active packages for a product within the channels $channel can see.
	 *
	 * @since 1.0.0
	 * @param int    $product_id WooCommerce product ID.
	 * @param string $channel    Requested channel.
	 * @return array<int, object>
	 */
	private function visible_packages( int $product_id, string $channel ): array {
		$visible = array( 'stable' );

		if ( 'beta' === $channel ) {
			$visible = array( 'stable', 'beta' );
		} elseif ( 'nightly' === $channel ) {
			$visible = PackageRepository::CHANNELS;
		}

		return array_values(
			array_filter(
				$this->packages->find_by_product( $product_id, true ),
				static function ( $row ) use ( $visible ) {
					return in_array( (string) $row->channel, $visible, true );
				}
			)
		);
	}

	/**
	 * Render the combined changelog as the HTML WordPress's modal expects:
	 * an `<h4>` per version followed by that version's own markup.
	 *
	 * @since 1.0.0
	 * @param int    $product_id WooCommerce product ID.
	 * @param string $channel    Channel to include.
	 * @param int    $limit      Maximum versions.
	 * @return string
	 */
	public function render( int $product_id, string $channel = 'stable', int $limit = self::DEFAULT_LIMIT ): string {
		$entries = $this->entries( $product_id, $channel, $limit );

		if ( ! $entries ) {
			return '';
		}

		$html = '';

		foreach ( $entries as $entry ) {
			$heading = $entry['version'];

			if ( 'stable' !== $entry['channel'] ) {
				$heading .= ' (' . $entry['channel'] . ')';
			}

			if ( '' !== $entry['released_at'] ) {
				$timestamp = strtotime( $entry['released_at'] );
				if ( false !== $timestamp ) {
					$heading .= ' — ' . gmdate( 'Y-m-d', $timestamp );
				}
			}

			$html .= '<h4>' . esc_html( $heading ) . '</h4>';

			$body = '' !== $entry['changelog']
				? $entry['changelog']
				// Non-WP products fill release_notes instead; it is plain text,
				// so it has to be escaped and line-broken rather than trusted
				// as markup the way changelog is.
				: wpautop( esc_html( $entry['release_notes'] ) );

			// Re-filtered on output as well as on save: a row written before
			// this module existed, or edited directly in the database, has
			// never been through wp_kses_post().
			$html .= wp_kses_post( $body );
		}

		/**
		 * Filters the rendered changelog HTML.
		 *
		 * @since 1.0.0
		 * @param string $html       Rendered changelog.
		 * @param int    $product_id WooCommerce product ID.
		 * @param string $channel    Channel rendered.
		 */
		return (string) apply_filters( 'purecart_update_changelog_html', $html, $product_id, $channel );
	}
}
