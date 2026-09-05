<?php
/**
 * Sends a protected file's bytes to the browser.
 *
 * @package PureCart\Downloads
 */

declare( strict_types=1 );

namespace PureCart\Downloads;

use PureCart\Settings\OptionKeys;
use PureCart\Settings\Settings;

defined( 'ABSPATH' ) || exit;

/**
 * Streams a file in chunks, with HTTP Range support.
 *
 * Chunked rather than readfile(): a 500 MB package read in one call has to fit
 * in PHP's memory limit, and a shared host with memory_limit = 256M simply
 * fails on it. Reading a fixed window at a time keeps memory flat regardless
 * of file size.
 *
 * Range support is what makes a large download resumable — without it, a
 * dropped connection at 90% means starting again from zero, and download
 * managers cannot parallelise at all.
 *
 * @since 1.0.0
 */
class DownloadDelivery {

	/**
	 * Bytes read and flushed per iteration. Large enough that the loop
	 * overhead is negligible on a big file, small enough to stay well clear of
	 * any sane memory limit.
	 *
	 * @var int
	 */
	private const CHUNK_SIZE = 262144; // 256 KB.

	/**
	 * Send a file and terminate the request.
	 *
	 * @since  1.0.0
	 * @param  string $path     Absolute server path to the file.
	 * @param  string $filename Name the browser should save it as.
	 * @param  string $mime     MIME type; detected from the file when empty.
	 * @return void
	 */
	public function serve( string $path, string $filename, string $mime = '' ): void {
		$size = (int) filesize( $path );
		$mime = '' !== $mime ? $mime : $this->detect_mime( $path );

		$method = (string) Settings::get( OptionKeys::DOWNLOAD_DELIVERY, 'streaming' );

		/**
		 * Lets an alternative delivery method take over before streaming begins.
		 *
		 * Phase 2 adds X-Sendfile, X-Accel-Redirect and S3/R2 presigned
		 * redirects on top of this hook; a handler that has sent the response
		 * itself returns true, and everything else falls through to streaming,
		 * which works on any host.
		 *
		 * @since 1.0.0
		 * @param bool   $handled  Whether the file has already been delivered.
		 * @param string $method   Configured delivery method.
		 * @param string $path     Absolute path to the file.
		 * @param string $filename Name the browser should save it as.
		 */
		if ( (bool) apply_filters( 'purecart_download_pre_deliver', false, $method, $path, $filename ) ) {
			exit;
		}

		$range = $this->parse_range( $size );

		$this->prepare_output();
		$this->send_headers( $filename, $mime );

		if ( false === $range ) {
			header( 'Content-Range: bytes */' . $size );
			status_header( 416 );
			exit;
		}

		if ( null === $range ) {
			$start  = 0;
			$length = $size;
			header( 'Content-Length: ' . $size );
		} else {
			list( $start, $end ) = $range;
			$length              = $end - $start + 1;

			status_header( 206 );
			header( 'Content-Range: bytes ' . $start . '-' . $end . '/' . $size );
			header( 'Content-Length: ' . $length );
		}

		$this->stream( $path, $start, $length );
		exit;
	}

	// -----------------------------------------------------------------------
	// Internals
	// -----------------------------------------------------------------------

	/**
	 * Clear and disable anything that would buffer or rewrite the body.
	 *
	 * @since  1.0.0
	 * @return void
	 */
	private function prepare_output(): void {
		while ( ob_get_level() ) {
			ob_end_clean();
		}

		// A gzip layer would recompress an already-compressed archive for no
		// gain, and — worse — invalidate the Content-Length we are about to
		// send, which breaks resumable transfers.
		if ( function_exists( 'ini_set' ) ) {
			@ini_set( 'zlib.output_compression', 'Off' ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged, WordPress.PHP.IniSet.Risky -- Silenced because hardened hosts disable ini_set(); streaming still works without the change.
		}

		if ( function_exists( 'set_time_limit' ) ) {
			@set_time_limit( 0 ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- Disabled in safe-mode-like configurations; a slow large download is the only cost.
		}
	}

	/**
	 * Send the response headers common to every delivery.
	 *
	 * @since  1.0.0
	 * @param  string $filename Name the browser should save it as.
	 * @param  string $mime     MIME type.
	 * @return void
	 */
	private function send_headers( string $filename, string $mime ): void {
		nocache_headers();
		header( 'Content-Type: ' . $mime );
		header( 'Content-Disposition: ' . $this->content_disposition( $filename ) );
		header( 'Accept-Ranges: bytes' );
		header( 'X-Robots-Tag: noindex, nofollow' );
		header( 'X-Content-Type-Options: nosniff' );
	}

	/**
	 * Build a Content-Disposition value that survives non-ASCII filenames.
	 *
	 * The bare `filename=` parameter is ASCII-only, so a Bangla or accented
	 * name arrives mangled. RFC 5987's `filename*` carries the real name for
	 * every current browser, with the ASCII fallback left in place for
	 * anything that does not understand it.
	 *
	 * @since  1.0.0
	 * @param  string $filename Name the browser should save it as.
	 * @return string
	 */
	private function content_disposition( string $filename ): string {
		$filename = str_replace( array( '"', "\r", "\n" ), '', $filename );
		$ascii    = remove_accents( $filename );
		$ascii    = preg_replace( '/[^\x20-\x7E]/', '_', $ascii );

		return sprintf(
			'attachment; filename="%s"; filename*=UTF-8\'\'%s',
			$ascii,
			rawurlencode( $filename )
		);
	}

	/**
	 * Interpret the request's Range header.
	 *
	 * @since  1.0.0
	 * @param  int $size File size in bytes.
	 * @return array{0:int,1:int}|null|false Byte range, null when the whole file
	 *                                       was requested, false when the range
	 *                                       cannot be satisfied.
	 */
	private function parse_range( int $size ) {
		$header = sanitize_text_field( wp_unslash( (string) ( $_SERVER['HTTP_RANGE'] ?? '' ) ) );

		if ( '' === $header || 0 === $size ) {
			return null;
		}

		// Only a single byte range is supported. Multipart ranges are rare and
		// every client falls back to a normal request when they are refused.
		if ( ! preg_match( '/^bytes=(\d*)-(\d*)$/', $header, $m ) ) {
			return null;
		}

		$first = $m[1];
		$last  = $m[2];

		if ( '' === $first && '' === $last ) {
			return null;
		}

		if ( '' === $first ) {
			// "bytes=-500" — the final 500 bytes.
			$length = (int) $last;
			if ( $length <= 0 ) {
				return false;
			}
			$start = max( 0, $size - $length );
			$end   = $size - 1;
		} else {
			$start = (int) $first;
			$end   = '' === $last ? $size - 1 : (int) $last;
		}

		if ( $start > $end || $start >= $size ) {
			return false;
		}

		return array( $start, min( $end, $size - 1 ) );
	}

	/**
	 * Read the requested window from disk and flush it out chunk by chunk.
	 *
	 * @since  1.0.0
	 * @param  string $path   Absolute path to the file.
	 * @param  int    $start  First byte to send.
	 * @param  int    $length Number of bytes to send.
	 * @return void
	 */
	private function stream( string $path, int $start, int $length ): void {
		// phpcs:disable WordPress.WP.AlternativeFunctions.file_system_operations_fopen, WordPress.WP.AlternativeFunctions.file_system_operations_fread, WordPress.WP.AlternativeFunctions.file_system_operations_fclose -- WP_Filesystem reads a whole file into memory; streaming a large package requires direct handles.
		$handle = fopen( $path, 'rb' );

		if ( ! $handle ) {
			return;
		}

		if ( $start > 0 ) {
			fseek( $handle, $start );
		}

		$remaining = $length;

		while ( $remaining > 0 && ! feof( $handle ) ) {
			$chunk = fread( $handle, (int) min( self::CHUNK_SIZE, $remaining ) );

			if ( false === $chunk || '' === $chunk ) {
				break;
			}

			echo $chunk; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Raw file bytes; escaping would corrupt the download.

			$remaining -= strlen( $chunk );

			flush();

			// The visitor closed the tab or the transfer died — stop reading
			// rather than pushing the rest of a large file into a dead socket.
			if ( connection_aborted() ) {
				break;
			}
		}

		fclose( $handle );
		// phpcs:enable WordPress.WP.AlternativeFunctions.file_system_operations_fopen, WordPress.WP.AlternativeFunctions.file_system_operations_fread, WordPress.WP.AlternativeFunctions.file_system_operations_fclose
	}

	/**
	 * Best-effort MIME detection.
	 *
	 * @since  1.0.0
	 * @param  string $path Absolute path to the file.
	 * @return string
	 */
	private function detect_mime( string $path ): string {
		$checked = wp_check_filetype( basename( $path ) );

		if ( ! empty( $checked['type'] ) ) {
			return (string) $checked['type'];
		}

		if ( function_exists( 'mime_content_type' ) ) {
			$detected = mime_content_type( $path );
			if ( $detected ) {
				return $detected;
			}
		}

		return 'application/octet-stream';
	}
}
