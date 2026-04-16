/**
 * Cart Count Synchronization
 * Ensures cart count is properly synced across all pages
 */
(function($) {
    'use strict';

    /**
     * Update all cart count displays on the page
     */
    function updateCartCounts() {
        // Get cart count from WooCommerce
        if (typeof wc_cart_fragments_params === 'undefined') {
            return;
        }

        // Listen for cart updates
        $(document.body).on('wc_fragments_refreshed', function() {
            // Force update all cart count spans that might not have been updated
            var $firstCartCount = $('.cart-contents span').first();
            if ($firstCartCount.length) {
                var count = $firstCartCount.text();
                $('.cart-contents span').each(function() {
                    $(this).text(count);
                });
            }
        });

        // Also listen for added_to_cart event
        $(document.body).on('added_to_cart', function(event, fragments) {
            // Update cart counts from fragments
            if (fragments && fragments['a.cart-contents']) {
                var $fragment = $(fragments['a.cart-contents']);
                var count = $fragment.find('span').text();
                
                // Update all cart count displays
                $('.cart-contents span').each(function() {
                    $(this).text(count);
                });
            }
        });
    }

    /**
     * Initialize on DOM ready
     */
    $(document).ready(function() {
        updateCartCounts();
        
        // Also refresh fragments on page load to ensure consistency
        if (typeof wc_cart_fragments_params !== 'undefined') {
            // Trigger fragment refresh to ensure cart is up to date
            $(document.body).trigger('wc_fragment_refresh');
        }
    });

})(jQuery);