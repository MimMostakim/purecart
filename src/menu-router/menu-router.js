/**
 * Admin menu router.
 *
 * Intercepts clicks on WP admin sidebar links that point to a PureCart
 * page and routes them through the React HashRouter instead of forcing
 * a full page reload.
 *
 * @param {Object.<string, string>} slugToPath Map of WP page slugs
 *   (e.g. "purecart-orders") to SPA routes (e.g. "/orders").
 *   Injected via wp_localize_script as window.purecartMenuMap.
 */
( function ( slugToPath ) {
	'use strict';

	var PAGE_SLUG_PATTERN = /[?&]page=(purecart-[\w-]+)/;

	function init() {
		var menuLinks = document.querySelectorAll( '#adminmenu a[href]' );

		menuLinks.forEach( function ( link ) {
			var route = getRouteForLink( link );
			if ( route ) {
				link.addEventListener( 'click', function ( event ) {
					handleMenuClick( event, link, route );
				} );
			}
		} );
	}

	/**
	 * Resolves the SPA route for a sidebar link, if any.
	 *
	 * @param {HTMLAnchorElement} link
	 * @return {string|null}
	 */
	function getRouteForLink( link ) {
		var match = ( link.getAttribute( 'href' ) || '' ).match( PAGE_SLUG_PATTERN );
		if ( ! match ) {
			return null;
		}
		return slugToPath[ match[ 1 ] ] || null;
	}

	/**
	 * Navigates the SPA instead of letting the browser reload the page.
	 *
	 * @param {MouseEvent}         event
	 * @param {HTMLAnchorElement}  link
	 * @param {string}             route
	 */
	function handleMenuClick( event, link, route ) {
		event.preventDefault();

		// 1. Update the hash — HashRouter listens for "hashchange" and navigates.
		window.location.hash = route;

		// 2. Restore the original ?page= URL (minus the reload) so the address
		//    bar stays correct for refreshes and for the WP menu highlighter.
		var baseUrl = link.href.split( '#' )[ 0 ];
		window.history.replaceState( null, '', baseUrl + '#' + route );

		setActiveMenuItem( link );
	}

	/**
	 * Mirrors WordPress's own "current page" sidebar highlighting, since we
	 * bypassed the normal page load that would otherwise set it.
	 *
	 * @param {HTMLAnchorElement} link
	 */
	function setActiveMenuItem( link ) {
		document
			.querySelectorAll( '#adminmenu .current, .wp-has-current-submenu' )
			.forEach( function ( el ) {
				el.classList.remove( 'current', 'wp-has-current-submenu' );
			} );

		var menuItem = link.closest( 'li' );
		if ( ! menuItem ) {
			return;
		}
		menuItem.classList.add( 'current' );

		var submenu = menuItem.parentElement;
		if ( submenu && submenu.classList.contains( 'wp-submenu' ) ) {
			var parentMenuItem = submenu.closest( 'li' );
			if ( parentMenuItem ) {
				parentMenuItem.classList.add( 'wp-has-current-submenu', 'current' );
			}
		}
	}

	if ( 'loading' === document.readyState ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}
} )( window.purecartMenuMap || {} );