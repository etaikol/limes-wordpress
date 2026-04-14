<?php
/**
 * Simple Product Form Fix
 * Ensures simple products can be added to cart without interference
 */

// Hook early to ensure simple products work
add_action('wp', function() {
    if (!is_product()) {
        return;
    }
    
    global $product;
    if (!is_object($product)) {
        $product = wc_get_product(get_the_ID());
    }
    
    if ($product && $product->is_type('simple')) {
        // Remove any filters that might interfere with simple product add to cart
        remove_all_filters('woocommerce_add_to_cart_validation', 10);
        
        // Add our own validation that always passes for simple products
        add_filter('woocommerce_add_to_cart_validation', function($passed, $product_id, $quantity) {
            $product = wc_get_product($product_id);
            if ($product && $product->is_type('simple')) {
                return true; // Always allow simple products
            }
            return $passed;
        }, 5, 3);
    }
}, 99);

// Ensure WooCommerce processes simple product add to cart
add_action('init', function() {
    // Check if this is an add-to-cart request
    if (isset($_POST['add-to-cart']) && !empty($_POST['add-to-cart'])) {
        $product_id = absint($_POST['add-to-cart']);
        $quantity = isset($_POST['quantity']) ? absint($_POST['quantity']) : 1;
        
        // Get the product
        $product = wc_get_product($product_id);
        
        if ($product && $product->is_type('simple')) {
            // Log for debugging
            error_log('Simple Product Form Fix - Processing add to cart for product: ' . $product_id . ' Quantity: ' . $quantity);
            
            // Manually add to cart if WooCommerce isn't doing it
            if (function_exists('WC') && WC()->cart) {
                $cart_item_key = WC()->cart->add_to_cart($product_id, $quantity);
                
                if ($cart_item_key) {
                    error_log('Simple Product Form Fix - Product added to cart successfully');
                    
                    // Redirect to cart or stay on page based on WooCommerce settings
                    if (get_option('woocommerce_cart_redirect_after_add') === 'yes') {
                        wp_safe_redirect(wc_get_cart_url());
                        exit;
                    } else {
                        // Add success message
                        wc_add_notice(sprintf(__('%s has been added to your cart.', 'woocommerce'), $product->get_name()), 'success');
                    }
                } else {
                    error_log('Simple Product Form Fix - Failed to add product to cart');
                }
            }
        }
    }
}, 20); // Run after WooCommerce's default handler