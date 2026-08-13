<?php
/**
 * Database store for wp_purecart_subscription_linked_entities.
 *
 * @package PureCart\Store
 */

declare( strict_types=1 );

namespace PureCart\Store;

defined( 'ABSPATH' ) || exit;

/**
 * Creates and maintains the delivery-type linked entities table.
 *
 * Holds membership, download, course, and service delivery metadata
 * that doesn't belong on the core subscriptions row.
 *
 * @since 1.0.0
 */
class SubscriptionLinkedEntities extends PureCartStore {

	/**
	 * @since 1.0.0
	 * @param string $charset
	 * @return string
	 */
	protected function schema( string $charset ): string {
		global $wpdb;

		return "CREATE TABLE {$wpdb->prefix}purecart_subscription_linked_entities (
            id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            subscription_id         BIGINT UNSIGNED NOT NULL,
            delivery_type           VARCHAR(32) NOT NULL,
            membership_tier         VARCHAR(100) NULL,
            assigned_role           VARCHAR(100) NULL,
            content_access_label    VARCHAR(255) NULL,
            grace_ends_at           DATETIME NULL,
            downloads_this_cycle    INT UNSIGNED DEFAULT 0,
            download_limit          INT UNSIGNED NULL,
            next_drip_date          DATETIME NULL,
            lms_enrollment_id       VARCHAR(255) NULL,
            enrolled_course_ids     TEXT NULL,
            course_access_until     DATETIME NULL,
            deliverable_notes       TEXT NULL,
            next_deliverable_due    DATETIME NULL,
            last_deliverable_at     DATETIME NULL,
            extra_data              LONGTEXT NULL,
            created_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY  (id),
            UNIQUE KEY  uniq_subscription (subscription_id),
            KEY idx_delivery_type (delivery_type),
            KEY idx_next_drip (next_drip_date),
            KEY idx_course_access (course_access_until),
            KEY idx_grace_ends (grace_ends_at)
        ) $charset;";
	}
}
