/**
 * WordPress dependencies
 */
const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );

/**
 * External dependencies
 */
const RemoveEmptyScriptsPlugin = require( 'webpack-remove-empty-scripts' );
const path = require('path');

/* PureCart for WooCommerce — webpack configuration.
 *
 * Extends the default @wordpress/scripts webpack config with two entry points:
 *
 *  1. JS bundle  — src/main.jsx         → assets/js/admin.js
 *  2. CSS bundle — src/styles/main.scss → assets/css/admin.css
 *
 * Source structure:
 *   src/
 *   ├── main.jsx                ← React app entry — mounts into #purecart-admin-root
 *   ├── App.jsx
 *   ├── context/
 *   ├── hooks/
 *   ├── pages/
 *   ├── components/
 *   ├── styles/
 *   │   └── main.scss
 *   └── utils/
 *
 * PHP enqueue (includes/Admin/Admin.php):
 *   wp_enqueue_script( 'purecart-admin', PURECART_URL . 'assets/js/admin.js',  $deps, PURECART_VERSION, true );
 *   wp_enqueue_style(  'purecart-admin', PURECART_URL . 'assets/css/admin.css', [],   PURECART_VERSION );
 */

const rootDir = process.cwd();

module.exports = {
	...defaultConfig,

	devtool: false,

	entry: {
		'build/admin/admin':  path.resolve( rootDir, 'src/app/main.tsx' ),
	},

	output: {
		...defaultConfig.output,
		path:  path.resolve( rootDir ),
		clean: false,
	},

	optimization: {
		...defaultConfig.optimization,
		splitChunks:  false,
		runtimeChunk: false,
	},

	plugins: [
		...defaultConfig.plugins,
		// Run after @wordpress/scripts has
		// already written the *.asset.php dependency files.
		new RemoveEmptyScriptsPlugin( {
			stage: RemoveEmptyScriptsPlugin.STAGE_AFTER_PROCESS_PLUGINS,
		} ),
	],
};
