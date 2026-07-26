/**
 * PostCSS configuration for PureCart for WooCommerce.
 *
 * Uses @tailwindcss/postcss (Tailwind CSS v4) which handles @import,
 * source scanning, and autoprefixing internally — no separate plugins needed.
 * This file overrides the default postcss config from @wordpress/scripts so
 * that postcss-import does not try to resolve `@import 'tailwindcss'` as a
 * plain CSS file before Tailwind gets to process it.
 */
module.exports = {
	plugins: {
		'@tailwindcss/postcss': {},
	},
};
