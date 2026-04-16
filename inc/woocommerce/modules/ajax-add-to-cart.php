<?php
/**
 * Add to Cart Redirect Handler
 * 
 * Prevents form resubmission issues by implementing POST-redirect-GET pattern
 * for standard WooCommerce add-to-cart submissions
 *
 * @package Limes
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class Limes_Add_To_Cart_Redirect {
    
    /**
     * Constructor
     */
    public function __construct() {
        // Implement POST-redirect-GET pattern to prevent form resubmission issues
        add_filter('woocommerce_add_to_cart_redirect', array($this, 'redirect_after_add_to_cart'), 10, 2);
    }
    
    /**
     * Implement POST-redirect-GET pattern to prevent form resubmission
     */
    public function redirect_after_add_to_cart($url, $product = null) {
        try {
            // If cart redirect is enabled, use that
            if (get_option('woocommerce_cart_redirect_after_add') === 'yes') {
                return wc_get_cart_url();
            }
            
            // Validate product object - be extra defensive
            if (empty($product) || !is_object($product) || !($product instanceof WC_Product)) {
                // If product is invalid, return original URL or cart as fallback
                return !empty($url) ? $url : wc_get_cart_url();
            }
            
            // Double check the product has the required methods
            if (!method_exists($product, 'get_permalink') || !method_exists($product, 'get_id')) {
                return !empty($url) ? $url : wc_get_cart_url();
            }
            
            // Get product URL safely
            $product_url = $product->get_permalink();
            if (empty($product_url)) {
                return !empty($url) ? $url : wc_get_cart_url();
            }
            
            // Add success parameter to show notification
            $product_id = $product->get_id();
            if (!empty($product_id)) {
                $product_url = add_query_arg('added-to-cart', $product_id, $product_url);
            }
            
            return $product_url;
            
        } catch (Exception $e) {
            // Log error and return safe fallback
            error_log('Limes AJAX Add to Cart redirect error: ' . $e->getMessage());
            return !empty($url) ? $url : wc_get_cart_url();
        }
    }
}

// Initialize
new Limes_Add_To_Cart_Redirect();