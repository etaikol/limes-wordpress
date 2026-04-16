<?php
/**
 * Ensure simple products use standard WooCommerce form submission
 */

// Disable AJAX add to cart for simple products
add_filter('woocommerce_ajax_add_to_cart', function($enabled) {
    if (is_product()) {
        global $product;
        if ($product && $product->is_type('simple')) {
            return false; // Disable AJAX for simple products
        }
    }
    return $enabled;
}, 10);

// Ensure the form action is correct for simple products
add_action('woocommerce_before_single_product_summary', function() {
    global $product;
    if ($product && $product->is_type('simple')) {
        ?>
        <script type="text/javascript">
        jQuery(document).ready(function($) {
            // Ensure simple product forms submit normally
            var $form = $('form.cart');
            if ($form.length && !$form.hasClass('variations_form')) {
                // Remove any AJAX handlers
                $form.off('submit');
                
                // Ensure form has correct action
                if (!$form.attr('action')) {
                    $form.attr('action', '');
                }
                
                // Remove disabled states
                $form.find('.single_add_to_cart_button').prop('disabled', false).removeClass('disabled');
            }
        });
        </script>
        <?php
    }
}, 5);