<?php
/**
 * Product Control Functions
 * 
 * This file contains the master control logic for determining
 * which products should use custom forms vs standard WooCommerce forms.
 * 
 * @package Limes
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Master control function to determine if a product should use custom forms
 * 
 * @param WC_Product|null $product Product object to check
 * @return bool True if product should use custom forms, false for standard WooCommerce
 */
function limes_should_customize_product($product = null) {
    // Get product if not provided
    if (!$product) {
        global $product;
    }
    
    // Ensure we have a valid product object
    if (!$product || !is_object($product) || !($product instanceof WC_Product)) {
        return false;
    }
    
    // IMPORTANT: Never customize simple products - use standard WooCommerce
    if ($product->is_type('simple')) {
        return false;
    }
    
    // Variable products always get customizations
    if ($product->is_type('variable')) {
        return true;
    }
    
    // For any other product types (grouped, external, etc), use standard WooCommerce
    return false;
}

/**
 * Check if product has dimension fields (for variable products)
 * 
 * @param int $product_id Product ID to check
 * @return bool True if product has dimension fields
 */
function limes_product_has_dimensions($product_id) {
    $product_type_dimensions = get_field('product_type_dimensions', $product_id);
    return !empty($product_type_dimensions);
}

/**
 * Check if product has custom attributes that need special handling
 * 
 * @param WC_Product $product Product object to check
 * @return bool True if product has custom attributes
 */
function limes_product_has_custom_attributes($product) {
    if (!$product || !($product instanceof WC_Product)) {
        return false;
    }
    
    // Check for color attribute
    $attributes = $product->get_attributes();
    if (isset($attributes['pa_color'])) {
        return true;
    }
    
    return false;
}

/**
 * Restore default WooCommerce simple product behavior
 */
add_action('init', 'limes_restore_simple_product_defaults', 999);
function limes_restore_simple_product_defaults() {
    // Remove any custom simple product add to cart actions
    if (has_action('woocommerce_simple_add_to_cart', 'limes_custom_simple_add_to_cart')) {
        remove_action('woocommerce_simple_add_to_cart', 'limes_custom_simple_add_to_cart', 30);
    }
    
    // Ensure default WooCommerce action is present
    if (!has_action('woocommerce_simple_add_to_cart', 'woocommerce_simple_add_to_cart')) {
        add_action('woocommerce_simple_add_to_cart', 'woocommerce_simple_add_to_cart', 30);
    }
}