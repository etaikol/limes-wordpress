<?php
/**
 * Limes Theme Functions
 *
 * @link https://developer.wordpress.org/themes/basics/theme-functions/
 * @package Limes
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define theme constants
$upload_dir = wp_upload_dir();
$upload_dir = $upload_dir['basedir'] . '/';
define('LOG_DIR', $upload_dir);

if (!defined('_S_VERSION')) {
    define('_S_VERSION', '1.0.0');
}

/**
 * Load Core Theme Files
 */
require_once get_template_directory() . '/inc/core/theme-setup.php';
require_once get_template_directory() . '/inc/core/enqueue-scripts.php';
require_once get_template_directory() . '/inc/core/image-sizes.php';
require_once get_template_directory() . '/inc/core/menus.php';
require_once get_template_directory() . '/inc/core/post-types.php';
require_once get_template_directory() . '/inc/core/taxonomies.php';
require_once get_template_directory() . '/inc/core/utilities.php';
require_once get_template_directory() . '/inc/core/admin.php';

/**
 * Load Template Functions
 */
require_once get_template_directory() . '/inc/templates/product-templates.php';
require_once get_template_directory() . '/inc/templates/post-templates.php';
require_once get_template_directory() . '/inc/templates/blog-templates.php';

/**
 * Load Feature Files
 */
require_once get_template_directory() . '/inc/features/breadcrumbs.php';
require_once get_template_directory() . '/inc/features/category-mechanism-toggle.php';

/**
 * Load WooCommerce Integration
 */
if (class_exists('WooCommerce')) {
    // Load product control logic FIRST
    require_once get_template_directory() . '/inc/woo-product-control.php';
    
    // Load new modular WooCommerce system
    require_once get_template_directory() . '/inc/woocommerce/woocommerce-integration.php';
    
    // Load legacy files for backward compatibility (will be phased out)
    require_once get_template_directory() . '/inc/woocommerce.php';
    require_once get_template_directory() . '/inc/woo-product-page.php';
    require_once get_template_directory() . '/inc/woo-cart-calculations.php';
    require_once get_template_directory() . '/inc/woo-simple-product-customization.php';
    require_once get_template_directory() . '/inc/woo-final-price-display.php';
    // Note: woo-cart-order-display.php is now replaced by modular system
    
    // REMOVED: Custom AJAX handler - using WooCommerce's built-in AJAX instead
    // require_once get_template_directory() . '/inc/woocommerce/ajax-add-to-cart-handler.php';
    
    // REMOVED: woo-simple-product-debug.php - No longer needed
    // REMOVED: woo-simple-product-form-fix.php - No longer needed
    
    // Ensure form handler is loaded
    require_once get_template_directory() . '/inc/woo-ensure-form-handler.php';
}

/**
 * Load Legacy Files (to be refactored)
 */
require_once get_template_directory() . '/functions-loaders.php';

/**
 * Backward Compatibility
 * 
 * These functions are kept for backward compatibility
 * and will be moved to appropriate modules in future updates
 */

// Keep the old function names as aliases for backward compatibility
if (!function_exists('add_theme_scripts')) {
    function add_theme_scripts() {
        // This function is now handled by limes_enqueue_scripts() in inc/core/enqueue-scripts.php
        // Keeping this empty function to prevent errors if called directly
    }
}

if (!function_exists('load_admin_style')) {
    function load_admin_style() {
        // This function is now handled by limes_admin_styles() in inc/core/enqueue-scripts.php
        // Keeping this empty function to prevent errors if called directly
    }
}








add_filter('woocommerce_dropdown_variation_attribute_options_args', 'setSelectDefaultVariableOption', 10, 1);
function setSelectDefaultVariableOption($args)
{
    $default = $args['product']->get_default_attributes();
    if (count($args['options']) > 0 && empty($default)) {
        $args['selected'] = $args['options'][0];
    }
    return $args;
}


add_filter( 'woocommerce_product_addons_option_price', '__return_empty_string' );

/**
 * Hide all option prices printed by WooCommerce Product Add-Ons.
 * Works for every field type (checkbox, radio, select, etc.).
 * Put this in functions.php or a small site-specific plugin.
 */
add_filter( 'woocommerce_product_addons_option_price', 'my_pao_hide_option_prices', 10, 4 );

function my_pao_hide_option_prices( $price_html, $option, $index, $type ) {
	return '';          // strip the “(60.00 ₪)” part completely
}
// Commented out: This was preventing addon data from being saved to cart
// add_filter( 'woocommerce_product_addons_update_totals', '__return_false' );

/**
 * Suppress WooCommerce's default "X added to cart" banner.
 * The side-cart drawer (header.php + js/woocommerce/side-cart.js) is the
 * confirmation surface — no need for the brown banner on top of the page.
 * Returning empty stops wc_add_notice() from being called server-side.
 */
add_filter( 'woocommerce_add_to_cart_message_html', '__return_empty_string' );

/**
 * Style the mini-cart "×" remove glyph as a small red X.
 * The CSS in css/edits.css turns this into a red round button.
 * (We previously tried "הסרה" text — too noisy in a small drawer cell.)
 */

/**
 * Show the LINE TOTAL in the mini-cart row (e.g. "1 × ₪4400") instead of
 * WooCommerce's default "qty × unit_price" which on this site shows the
 * raw base price (₪400) and ignores dimensional/roll calculations.
 *
 * `line_subtotal` is what WC actually uses for the cart subtotal, so this
 * matches what the user pays.
 */
add_filter( 'woocommerce_widget_cart_item_quantity', 'limes_mini_cart_line_total', 10, 3 );
function limes_mini_cart_line_total( $html, $cart_item, $cart_item_key ) {
	$qty           = $cart_item['quantity'];
	$line_subtotal = isset( $cart_item['line_subtotal'] ) ? (float) $cart_item['line_subtotal'] : 0;

	return '<span class="quantity">' . sprintf(
		/* translators: 1: quantity, 2: line subtotal */
		'%1$s &times; %2$s',
		esc_html( $qty ),
		wc_price( $line_subtotal )
	) . '</span>';
}




// add_action( 'wp_head', function() {
//     if ( is_product_category() ) {
//         $term = get_queried_object();
//         $term_link = get_term_link( $term );
//         $term_name = $term->name;

//         // Build a minimal JSON-LD
//         $schema = [
//             "@context" => "https://schema.org",
//             "@type" => "CollectionPage",
//             "name" => $term_name,
//             "url" => $term_link,
//             "mainEntity" => [
//                 "@type" => "ItemList",
//                 "itemListElement" => [],
//             ],
//         ];

//         // Query products in this category
//         $products = wc_get_products( [
//             'limit' => -1,
//             'status' => 'publish',
//             'category' => [ $term->slug ],
//         ] );

//         foreach ( $products as $index => $product ) {
//             // Build a ListItem for each product
//             $schema['mainEntity']['itemListElement'][] = [
//                 "@type" => "ListItem",
//                 "position" => $index + 1,
//                 "url" => $product->get_permalink(),
//                 "item" => [
//                     "@type" => "Product",
//                     "name" => $product->get_name(),
//                     "image" => wp_get_attachment_url( $product->get_image_id() ),
//                     "sku" => $product->get_sku(),
//                     "offers" => [
//                         "@type" => "Offer",
//                         "price" => $product->get_price(),
//                         "priceCurrency" => get_woocommerce_currency(),
//                         "availability" => $product->is_in_stock() ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
//                         "url" => $product->get_permalink(),
//                     ],
//                 ],
//             ];
//         }

//         echo '<script type="application/ld+json">' . wp_json_encode( $schema, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) . '</script>';
//     }
// });



