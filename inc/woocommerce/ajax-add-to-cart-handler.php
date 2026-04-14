<?php
/**
 * AJAX Add to Cart Handler
 * Handles AJAX requests for adding products to cart
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Handle AJAX add to cart request
 * Using custom action name to avoid conflicts
 */
add_action('wp_ajax_limes_add_to_cart', 'limes_ajax_add_to_cart_handler');
add_action('wp_ajax_nopriv_limes_add_to_cart', 'limes_ajax_add_to_cart_handler');

function limes_ajax_add_to_cart_handler() {
    // Prevent any output before JSON
    ob_clean();
    
    // Set proper headers for JSON response
    @header('Content-Type: application/json; charset=' . get_option('blog_charset'));
    @header('X-Robots-Tag: noindex');
    send_nosniff_header();
    nocache_headers();
    
    // Debug: Check if handler is called
    error_log('LIMES AJAX HANDLER CALLED');
    
    // Check if WooCommerce is active
    if (!class_exists('WC_AJAX')) {
        wp_send_json_error('WooCommerce not initialized');
        return;
    }
    
    // Initialize WooCommerce session for guest users
    if (WC()->session && !WC()->session->has_session()) {
        WC()->session->set_customer_session_cookie(true);
    }
    
    // Check if product_id is set
    if (!isset($_POST['product_id'])) {
        wp_send_json_error('Product ID not provided');
        return;
    }
    
    // Verify nonce if needed
    $product_id = apply_filters('woocommerce_add_to_cart_product_id', absint($_POST['product_id']));
    $quantity = empty($_POST['quantity']) ? 1 : wc_stock_amount($_POST['quantity']);
    $variation_id = isset($_POST['variation_id']) ? absint($_POST['variation_id']) : 0;
    $variation = array();
    
    // Get the product to check its type
    $product = wc_get_product($product_id);
    
    // Don't process simple products via AJAX - let standard form submission handle them
    if ($product && $product->is_type('simple')) {
        wp_die();
    }
    
    // Handle variations
    if ($variation_id) {
        foreach ($_POST as $key => $value) {
            if (strpos($key, 'attribute_') === 0) {
                $variation[sanitize_title(str_replace('attribute_', '', $key))] = $value;
            }
        }
    }
    
    // Use the actual product ID for the add to cart
    $product_id_to_add = $variation_id ? $variation_id : $product_id;
    
    // Validate the add to cart - this will run all validation filters
    $passed_validation = apply_filters('woocommerce_add_to_cart_validation', true, $product_id, $quantity, $variation_id, $variation);
    
    if ($passed_validation) {
        // Add to cart - this will handle all our custom fields via existing filters
        $cart_item_key = WC()->cart->add_to_cart($product_id, $quantity, $variation_id, $variation);
        
        if ($cart_item_key) {
            do_action('woocommerce_ajax_added_to_cart', $product_id);
            
            // Get cart fragments - this sends JSON response and exits
            WC_AJAX::get_refreshed_fragments();
            // No code should run after this
        } else {
            // If there was an error adding to cart
            $data = array(
                'error' => true,
                'product_url' => apply_filters('woocommerce_cart_redirect_after_error', get_permalink($product_id), $product_id)
            );
            
            wp_send_json($data);
        }
    } else {
        // If validation failed, return the errors
        $data = array(
            'error' => true,
            'product_url' => apply_filters('woocommerce_cart_redirect_after_error', get_permalink($product_id), $product_id)
        );
        
        wp_send_json($data);
    }
}

/**
 * Enqueue AJAX add to cart script
 */
add_action('wp_enqueue_scripts', 'limes_enqueue_ajax_add_to_cart', 20);

function limes_enqueue_ajax_add_to_cart() {
    if (is_product()) {
        global $product;
        
        // Only load AJAX script for variable products
        if (!$product || !$product->is_type('simple')) {
            wp_enqueue_script(
                'limes-ajax-add-to-cart',
                get_template_directory_uri() . '/js/woocommerce/ajax-add-to-cart.js',
                array('jquery', 'wc-add-to-cart'),
                '1.0.0',
                true
            );
            
            // Ensure wc_add_to_cart_params is available
            wp_localize_script('limes-ajax-add-to-cart', 'limes_ajax_params', array(
                'ajax_url' => admin_url('admin-ajax.php'),
                'wc_ajax_url' => WC_AJAX::get_endpoint("%%endpoint%%"),
                'i18n_view_cart' => esc_attr__('View cart', 'woocommerce'),
                'cart_url' => apply_filters('woocommerce_add_to_cart_redirect', wc_get_cart_url(), null),
                'is_cart' => is_cart(),
                'cart_redirect_after_add' => get_option('woocommerce_cart_redirect_after_add')
            ));
        }
    }
}