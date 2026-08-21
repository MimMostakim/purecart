/**
 * PureCart for WooCommerce — Admin JS
 */
( function ( $ ) {
    'use strict';

    /**
     * Copy API key to clipboard on click (license keys are masked — see the
     * dedicated reveal/copy handlers below instead).
     */
    $( document ).on( 'click', '.purecart-api-key', function () {
        purecartCopyText( $( this ).text().trim() );
    } );

    /**
     * My Account "My Licenses" tab: reveal a blurred license key.
     */
    $( document ).on( 'click', '.purecart-reveal-key', function () {
        var $btn  = $( this );
        var $code = $btn.siblings( '.purecart-license-key' );

        $code.text( $code.data( 'key' ) ).removeClass( 'purecart-license-key--hidden' );
        $btn.hide();
        $btn.siblings( '.purecart-copy-key' ).show();
    } );

    /**
     * My Account "My Licenses" tab: copy the (already revealed) license key.
     */
    $( document ).on( 'click', '.purecart-copy-key', function () {
        purecartCopyText( $( this ).siblings( '.purecart-license-key' ).data( 'key' ) );
    } );

    /**
     * My Account "My Licenses" tab: manual "Activate on Domain" form.
     */
    $( document ).on( 'submit', '.purecart-activate-license', function ( e ) {
        e.preventDefault();

        var $form   = $( this );
        var $result = $form.find( '.purecart-activate-result' );
        var $button = $form.find( 'button[type="submit"]' );

        $button.prop( 'disabled', true );
        $result.text( '' );

        $.ajax( {
            url: purecartAdmin.apiUrl + 'license/activate',
            method: 'POST',
            data: {
                license_key: $form.data( 'license-key' ),
                domain: $form.find( 'input[name="domain"]' ).val()
            }
        } ).done( function ( response ) {
            $result.text( ( response && response.message ) || 'Activated.' ).css( 'color', 'green' );
        } ).fail( function ( xhr ) {
            var message = ( xhr.responseJSON && xhr.responseJSON.message ) || 'Activation failed.';
            $result.text( message ).css( 'color', '#a94442' );
        } ).always( function () {
            $button.prop( 'disabled', false );
        } );
    } );

    function purecartCopyText( text ) {
        if ( navigator.clipboard ) {
            navigator.clipboard.writeText( text ).then( function () {
                purecartFlash( 'Copied!' );
            } );
        } else {
            var $tmp = $( '<textarea>' ).val( text ).appendTo( 'body' ).select();
            document.execCommand( 'copy' );
            $tmp.remove();
            purecartFlash( 'Copied!' );
        }
    }

    function purecartFlash( msg ) {
        var $notice = $( '<div class="purecart-flash">' + msg + '</div>' );
        $( 'body' ).append( $notice );
        setTimeout( function () {
            $notice.fadeOut( 400, function () { $( this ).remove(); } );
        }, 1500 );
    }

    /**
     * Toggle activation limit field visibility based on license type.
     */
    $( document ).on( 'change', '#purecart_license_type', function () {
        var type = $( this ).val();
        var $row = $( '#purecart_activation_limit' ).closest( 'tr' );

        if ( 'unlimited' === type || 'lifetime' === type ) {
            $row.hide();
        } else {
            $row.show();
        }
    } ).trigger( 'change' );

} )( jQuery );
