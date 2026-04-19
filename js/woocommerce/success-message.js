/**
 * Fix for WooCommerce Success Messages
 * Ensures success messages appear consistently for all users
 */
(function($) {
    'use strict';

    $(document).ready(function() {
        // Check if we have the added-to-cart parameter in URL
        var urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('added-to-cart') || urlParams.has('ajax-added-to-cart')) {
            // Ensure the success message is visible
            var $noticeWrapper = $('.woocommerce-notices-wrapper');
            
            // If we have ajax-added-to-cart but no message, create one
            if (urlParams.has('ajax-added-to-cart') && $noticeWrapper.find('.woocommerce-message').length === 0) {
                if ($noticeWrapper.length === 0) {
                    $noticeWrapper = $('<div class="woocommerce-notices-wrapper"></div>');
                    $('.product .section-inner').prepend($noticeWrapper);
                }
                
                var productTitle = $('.product-title').text() || 'המוצר';
                var cartUrl = (typeof wc_add_to_cart_params !== 'undefined') ? wc_add_to_cart_params.cart_url : '/cart/';
                var message = '<div class="woocommerce-message" role="alert">' +
                             '"' + productTitle + '" נוסף לסל הקניות. ' +
                             '<a href="' + cartUrl + '" class="button wc-forward">מעבר לסל הקניות</a>' +
                             '</div>';
                
                $noticeWrapper.html(message);
            }
            
            if ($noticeWrapper.length > 0 && $noticeWrapper.find('.woocommerce-message').length > 0) {
                // Scroll to the notice
                $('html, body').animate({
                    scrollTop: $noticeWrapper.offset().top - 100
                }, 300);
                
                // Highlight the message
                $noticeWrapper.find('.woocommerce-message').addClass('highlighted');
            }
        }
        
        // added_to_cart feedback is handled by the side-cart drawer + toast in side-cart.js
    });

})(jQuery);