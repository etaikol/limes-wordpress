<?php
/**
 * Cart Add-on Display Handler
 *
 * @package Limes
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Cart add-on display handler class
 */
class Limes_Cart_Addon_Display {

    /**
     * Initialize cart add-on display handling
     */
    public static function init() {
        // Remove duplicate dimension fields first (higher priority = runs earlier)
        add_filter('woocommerce_get_item_data', array(__CLASS__, 'remove_duplicate_dimensions'), 20, 2);
        
        // Then modify addon display
        add_filter('woocommerce_get_item_data', array(__CLASS__, 'modify_addon_display'), 30, 2);
        
        // Add a final filter with very high priority to remove addon price display
        add_filter('woocommerce_get_item_data', array(__CLASS__, 'remove_addon_prices_final'), 999, 2);
    }

    /**
     * Modify addon display in cart
     *
     * @param array $item_data Item data
     * @param array $cart_item Cart item
     * @return array Modified item data
     */
    public static function modify_addon_display($item_data, $cart_item) {
        // Only process if we have addons
        if (empty($cart_item['addons'])) {
            return $item_data;
        }
        
        // Calculate dimensions and factors
        $dimensions = Limes_Cart_Data_Handler::get_cart_item_dimensions($cart_item);
        $calculation_data = Limes_Cart_Data_Handler::get_calculation_data($cart_item);
        
        // Calculate dimensional factor
        $dimensional_factor = 1;
        if ($calculation_data['product_type'] === 'sqm' && $dimensions['width'] > 0 && $dimensions['height'] > 0) {
            $area_m2 = ($dimensions['width'] / 100) * ($dimensions['height'] / 100);
            $settings = limes_get_product_type_settings('sqm');
            if ($area_m2 < $settings['min_area']) {
                $area_m2 = $settings['min_area'];
            }
            $dimensional_factor = $area_m2;
        } elseif ($calculation_data['product_type'] === 'rm' && $dimensions['width'] > 0) {
            $dimensional_factor = $dimensions['width'] / 100;
        } elseif ($calculation_data['product_type'] === 'roll' && $dimensions['rolls_needed'] > 0) {
            $dimensional_factor = $dimensions['rolls_needed'];
        }
        
        // Get base price for calculations
        $base_price = isset($cart_item['base_price']) ? (float) $cart_item['base_price'] : 0;
        $dimensional_price = $base_price * $dimensional_factor;
        
        // Debug log for admin
        if (current_user_can('manage_options') && isset($_GET['debug_cart'])) {
            error_log('Cart Addon Display Debug:');
            error_log('Base price: ' . $base_price);
            error_log('Dimensional factor: ' . $dimensional_factor);
            error_log('Dimensional price: ' . $dimensional_price);
            error_log('Cart item addons: ' . print_r($cart_item['addons'], true));
            error_log('Item data before processing: ' . print_r($item_data, true));
        }
        
        // Process each addon line in item_data
        $items_to_remove = array();
        
        foreach ($item_data as $key => &$data) {
            // Skip if not an addon
            if (!isset($data['key']) || strpos($data['key'], 'תוספות') === false) {
                continue;
            }
            
            // Mark addon items for removal
            $items_to_remove[] = $key;
            
            // Try to find matching addon data
            $addon_name = isset($data['value']) ? $data['value'] : '';
            $matching_addon = null;
            
            // Clean up addon name for matching
            $clean_addon_name = preg_replace('/\s*\([^)]*\)\s*$/', '', $addon_name);
            $clean_addon_name = trim($clean_addon_name);
            
            // Find the addon in cart_item addons array
            foreach ($cart_item['addons'] as $addon) {
                if (!isset($addon['name'])) continue;
                
                // Try multiple matching strategies
                $addon_base_name = $addon['name'];
                
                // Strategy 1: Exact match
                if ($addon_name === $addon_base_name || $clean_addon_name === $addon_base_name) {
                    $matching_addon = $addon;
                    break;
                }
                
                // Strategy 2: Addon name contains clean name (e.g., "ידית" in "ידית + 20% למחיר")
                if (strpos($addon_base_name, $clean_addon_name) === 0) {
                    $matching_addon = $addon;
                    break;
                }
                
                // Strategy 3: Clean name contains addon value (for shortened display names)
                if (isset($addon['value']) && ($clean_addon_name === $addon['value'] || strpos($addon['value'], $clean_addon_name) !== false)) {
                    $matching_addon = $addon;
                    break;
                }
            }
            
            if ($matching_addon) {
                $addon_price = (float) $matching_addon['price'];
                $calculated_price = 0;
                
                // Apply price type logic
                if ($matching_addon['price_type'] === 'percentage_based') {
                    // For "roll" products, percentage is of single roll price, then multiplied by number of rolls
                    if ($calculation_data['product_type'] === 'roll') {
                        $single_roll_addon_price = $base_price * ($addon_price / 100);
                        $calculated_price = $single_roll_addon_price * $dimensions['rolls_needed'];
                    } else {
                        // For other product types, it's a percentage of the total dimensional price
                        $calculated_price = $dimensional_price * ($addon_price / 100);
                    }
                } elseif ($matching_addon['price_type'] === 'flat_fee') {
                    // Check if it's per meter/roll
                    if (mb_strpos($matching_addon['name'], 'למטר') !== false || mb_strpos($matching_addon['name'], 'לגליל') !== false) {
                        $calculated_price = $addon_price * $dimensional_factor;
                    } else {
                        $calculated_price = $addon_price;
                    }
                } else {
                    // Default calculation for other types
                    $calculated_price = $addon_price;
                }
                
                // Update the display with correct price
                $clean_name = preg_replace('/\s*\([^)]*\)\s*$/', '', $addon_name);
                // For percentage-based addons, just show the name without price if matching fails
                if (!$matching_addon || ($matching_addon && $matching_addon['price_type'] === 'percentage_based')) {
                    $data['display'] = $clean_name;
                    $data['value'] = $clean_name;
                } else {
                    $data['display'] = $clean_name . ' (' . wc_price($calculated_price) . ')';
                    $data['value'] = $clean_name . ' (' . wc_price($calculated_price) . ')';
                }
            }
        }
        
        // Remove all addon items from display
        foreach ($items_to_remove as $key_to_remove) {
            unset($item_data[$key_to_remove]);
        }
        
        return $item_data;
    }

    /**
     * Remove duplicate dimension fields
     *
     * @param array $item_data Item data
     * @param array $cart_item Cart item
     * @return array Modified item data
     */
    public static function remove_duplicate_dimensions($item_data, $cart_item) {
        $fields_to_remove = array();
        $has_width_with_vilon = false;
        $has_height_with_vilon = false;
        
        // Debug for admin users
        if (current_user_can('manage_options') && isset($_GET['debug_cart'])) {
            echo '<pre style="background:#f0f0f0; padding:10px; margin:10px 0;">BEFORE filtering:<br>';
            foreach ($item_data as $key => $data) {
                echo "Key: $key | Label: " . (isset($data['key']) ? $data['key'] : 'N/A') . " | Value: " . (isset($data['value']) ? $data['value'] : 'N/A') . "<br>";
            }
            echo '</pre>';
        }
        
        // First pass: check if we have the fields with "הוילון"
        foreach ($item_data as $key => $data) {
            if (isset($data['key'])) {
                $label = $data['key'];
                if (strpos($label, 'רוחב') !== false && strpos($label, 'הוילון') !== false) {
                    $has_width_with_vilon = true;
                }
                if (strpos($label, 'גובה') !== false && strpos($label, 'הוילון') !== false) {
                    $has_height_with_vilon = true;
                }
            }
        }
        
        // Second pass: remove duplicates
        foreach ($item_data as $key => $data) {
            if (isset($data['key'])) {
                $label = $data['key'];
                
                // Remove variation attributes that match our custom fields
                // These are typically added by Product Add-Ons as "variation-"
                if (strpos($key, 'variation-') === 0) {
                    // Check if this is a duplicate of our custom dimension fields
                    if (($label === 'רוחב:' || $label === 'רוחב') && $has_width_with_vilon) {
                        $fields_to_remove[] = $key;
                        continue;
                    }
                    if (($label === 'גובה:' || $label === 'גובה') && $has_height_with_vilon) {
                        $fields_to_remove[] = $key;
                        continue;
                    }
                }
                
                // If we have width with "הוילון", remove width without it
                if ($has_width_with_vilon && strpos($label, 'רוחב') !== false && strpos($label, 'הוילון') === false) {
                    $fields_to_remove[] = $key;
                    continue;
                }
                
                // If we have height with "הוילון", remove height without it
                if ($has_height_with_vilon && strpos($label, 'גובה') !== false && strpos($label, 'הוילון') === false) {
                    $fields_to_remove[] = $key;
                    continue;
                }
                
                // Remove English dimension fields
                if (in_array(strtolower($label), array('width', 'height', 'dimensions'))) {
                    $fields_to_remove[] = $key;
                    continue;
                }
                
                // Remove fields that are just "רוחב:" or "גובה:" (with or without colon)
                if (in_array($label, array('רוחב:', 'גובה:', 'רוחב', 'גובה')) && !strpos($label, 'הוילון')) {
                    $fields_to_remove[] = $key;
                    continue;
                }
            }
        }
        
        // Remove the duplicate fields
        foreach ($fields_to_remove as $key) {
            unset($item_data[$key]);
        }
        
        // Debug for admin users
        if (current_user_can('manage_options') && isset($_GET['debug_cart'])) {
            echo '<pre style="background:#e0ffe0; padding:10px; margin:10px 0;">AFTER filtering:<br>';
            foreach ($item_data as $key => $data) {
                echo "Key: $key | Label: " . (isset($data['key']) ? $data['key'] : 'N/A') . " | Value: " . (isset($data['value']) ? $data['value'] : 'N/A') . "<br>";
            }
            echo '</pre>';
        }
        
        return $item_data;
    }
    
    /**
     * Final pass to remove addon prices from display
     * Runs with very high priority to ensure it runs after all other filters
     *
     * @param array $item_data Item data
     * @param array $cart_item Cart item
     * @return array Modified item data
     */
    public static function remove_addon_prices_final($item_data, $cart_item) {
        $filtered_data = array();
        
        foreach ($item_data as $key => $data) {
            // Check if this is an addon item
            $is_addon = false;
            
            // Check the key (label)
            if (isset($data['key']) && strpos($data['key'], 'תוספות') !== false) {
                $is_addon = true;
            }
            
            // Also check if the key contains a price pattern
            if (isset($data['key']) && preg_match('/\([^)]*₪[^)]*\)/', $data['key'])) {
                $is_addon = true;
            }
            
            // Skip addon items completely
            if (!$is_addon) {
                $filtered_data[] = $data;
            }
        }
        
        return $filtered_data;
    }
}

// Initialize the cart add-on display handler
Limes_Cart_Addon_Display::init();
