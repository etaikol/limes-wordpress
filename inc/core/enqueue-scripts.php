<?php
/**
 * Script and Style Enqueuing
 *
 * @package Limes
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Enqueue theme scripts and styles
 */
function limes_enqueue_scripts() {
    // jQuery and plugins
    wp_enqueue_script('jquery-3', get_template_directory_uri() . '/js/jquery-3.2.0.min.js', array(), null, false);
    wp_enqueue_script('jquery-ui', get_template_directory_uri() . '/plugins/jquery-ui/jquery-ui.js', array(), null, false);
    wp_enqueue_script('mobilemenu', get_template_directory_uri() . '/plugins/mmenu/jquery-simple-mobilemenu.js', array(), null, false);
    wp_enqueue_script('fancybox', get_template_directory_uri() . '/plugins/fancybox/jquery.fancybox.js', array(), null, false);
    wp_enqueue_script('swiper', get_template_directory_uri() . '/plugins/swiper/swiper.js', array(), null, false);
    wp_enqueue_script('inview-js', get_template_directory_uri() . '/js/jquery.inview.js', array(), null, false);
    wp_enqueue_script('main', get_template_directory_uri() . '/js/main.js', array(), '1.0.0.1', false);
    
    // WooCommerce scripts
    if (class_exists('WooCommerce')) {
        // Always load jQuery BlockUI if WooCommerce is active
        // This is needed for cart updates, AJAX operations, etc.
        wp_enqueue_script('jquery-blockui');
        
        // Load our BlockUI fix to ensure compatibility
        wp_enqueue_script('woocommerce-blockui-fix', get_template_directory_uri() . '/js/woocommerce-blockui-fix.js', array('jquery'), '1.0.0', true);
        
        // Load cart fragments on all pages to ensure cart count is always synced
        wp_enqueue_script('wc-cart-fragments');
        
        // Load our cart count sync script
        wp_enqueue_script('limes-cart-count-sync', get_template_directory_uri() . '/js/woocommerce/cart-count-sync.js', array('jquery', 'wc-cart-fragments'), '1.0.0', true);
        
        // Load cart scripts on cart and checkout pages
        if (function_exists('is_cart') && (is_cart() || is_checkout())) {
            wp_enqueue_script('wc-cart');
        }

        // Click-to-enlarge image lightbox (zoom + pan). Loops: product cards. Product page: color-swatch tooltip.
        if (function_exists('is_shop') && (is_shop() || is_product_category() || is_product_tag() || is_product())) {
            wp_enqueue_script('limes-product-card-lightbox', get_template_directory_uri() . '/js/product-card-lightbox.js', array('jquery'), '2.1.0', true);
        }
    }
    
    // Product-specific scripts
    if (is_product()) {
        // Get the product object
        global $product;
        if (!is_object($product)) {
            $product = wc_get_product(get_the_ID());
        }
        
        // IMPORTANT: Check if we should customize this product
        $should_customize = limes_should_customize_product($product);
        
        // Only load customization scripts for variable products
        if ($should_customize) {
            // Central Calculation Controller - MUST LOAD FIRST
            wp_enqueue_script('limes-calculation-controller', get_template_directory_uri() . '/js/woocommerce/calculation-controller.js', array('jquery'), '1.0.0', true);
            
            // New modular WooCommerce price calculator - DISABLED as we're using custom-addon-totals.js instead
            // wp_enqueue_script('limes-price-calculator', get_template_directory_uri() . '/js/woocommerce/core/price-calculator.js', array('jquery'), '1.0.0', true);
            
            // DISABLED: Safe addon section controller - causes loops with custom-addon-totals.js
            // wp_enqueue_script('limes-addon-controller', get_template_directory_uri() . '/js/woocommerce/addon-section-controller-safe.js', array('jquery'), '1.0.0', true);
            
            // Addon integration for WooCommerce Product Addons - Updated dependencies
            wp_enqueue_script('limes-addon-integration', get_template_directory_uri() . '/js/woocommerce/addon-integration.js', array('jquery', 'limes-calculation-controller'), '1.0.0', true);
            
            // Custom Addon Totals - displays our own addon totals table with custom calculations
            wp_enqueue_script('custom-addon-totals', get_template_directory_uri() . '/js/woocommerce/custom-addon-totals.js', array('jquery', 'wc-add-to-cart-variation', 'limes-calculation-controller'), '1.0.0', true);
        }
        
        // DISABLED: Previous attempts that caused loops
        // wp_enqueue_script('addon-control-fix', get_template_directory_uri() . '/js/woocommerce/addon-control-fix.js', array('jquery', 'limes-addon-integration'), '1.0.0', true);
        // wp_enqueue_script('addon-stabilizer', get_template_directory_uri() . '/js/woocommerce/addon-stabilizer.js', array('jquery', 'addon-control-fix'), '1.0.0', true);
        // wp_enqueue_script('addon-init', get_template_directory_uri() . '/js/woocommerce/addon-init.js', array('jquery'), '1.0.0', true);
        // wp_enqueue_script('addon-totals-fix', get_template_directory_uri() . '/js/woocommerce/addon-totals-fix.js', array('jquery', 'wc-add-to-cart-variation'), '1.0.0', true);
        
        // Scripts that should load ONLY for variable products with customizations
        if ($should_customize) {
            // Progressive field control - must load before other validation scripts
            wp_enqueue_script('progressive-field-control', get_template_directory_uri() . '/js/progressive-field-control.js', array('jquery'), '1.0.2', true);
            
            // Color selection fix - must load after variation form
            wp_enqueue_script('color-selection-fix', get_template_directory_uri() . '/js/color-selection-fix.js', array('jquery', 'wc-add-to-cart-variation'), '1.0.0', true);
            
            // Legacy scripts (for backward compatibility)
            wp_enqueue_script('product-addons-integration', get_template_directory_uri() . '/js/product-addons-integration.js', array('jquery'), '1.0.0', true);
            wp_enqueue_script('woocommerce-validation-fix', get_template_directory_uri() . '/js/woocommerce-validation-fix.js', array('jquery', 'wc-add-to-cart-variation'), '1.0.0', true);
            
            // Roll price fix - must run after all other scripts
            wp_enqueue_script('roll-price-fix', get_template_directory_uri() . '/js/woocommerce/roll-price-fix.js', array('jquery', 'product-addons-integration'), '1.0.0', true);
        }
        
        // Styles and scripts that load ONLY for variable products
        if ($should_customize) {
            // Universal addon section styles
            wp_enqueue_style('universal-addon-section', get_template_directory_uri() . '/css/universal-addon-section.css', array(), '1.0.0', false);
            
            // Final price styling for addon section
            wp_enqueue_style('addon-final-price', get_template_directory_uri() . '/css/addon-final-price.css', array(), '1.0.0', false);
            
            // Addon visibility fix - ensures addon containers stay visible
            wp_enqueue_style('addon-visibility-fix', get_template_directory_uri() . '/css/addon-visibility-fix.css', array(), '1.0.0', false);
            
            // Addon checkbox to dropdown conversion
            wp_enqueue_script('addon-checkbox-to-dropdown', get_template_directory_uri() . '/js/addon-checkbox-to-dropdown.js', array('jquery'), '1.0.0', true);
            wp_enqueue_style('addon-dropdown-styles', get_template_directory_uri() . '/css/addon-dropdown-styles.css', array(), '1.0.0', false);
        }
        
        // Product sticky scroll functionality - loads for all products
        wp_enqueue_script('product-sticky-scroll', get_template_directory_uri() . '/js/product-sticky-scroll.js', array('jquery'), '1.0.0', true);
        wp_enqueue_style('product-sticky-scroll', get_template_directory_uri() . '/css/product-sticky-scroll.css', array(), '1.0.0', false);
        
        // Success message handler - loads for all products
        wp_enqueue_script('limes-success-message', get_template_directory_uri() . '/js/woocommerce/success-message.js', array('jquery'), '1.0.0', true);
        
        // AJAX add to cart for variable products
        if ($product && !$product->is_type('simple')) {
            wp_enqueue_script('limes-ajax-add-to-cart', get_template_directory_uri() . '/js/woocommerce/ajax-add-to-cart.js', array('jquery', 'wc-add-to-cart'), '1.0.0', true);
        }
        
        // REMOVED: Simple product fixes - no longer needed as simple products use default WooCommerce
        
        // Add default styles for simple products to ensure they use WooCommerce defaults
        if ($product && is_object($product) && $product->is_type('simple')) {
            wp_enqueue_style('simple-product-default', get_template_directory_uri() . '/css/simple-product-default.css', array(), '1.0.0', false);
        }
    }
    

    // Styles
    wp_enqueue_style('awesome', get_template_directory_uri() . '/fonts/font-awesome.min.css', array(), null, false);
    wp_enqueue_style('swiper', get_template_directory_uri() . '/plugins/swiper/swiper.css', array(), null, false);
    wp_enqueue_style('fancybox', get_template_directory_uri() . '/plugins/fancybox/jquery.fancybox.css', array(), null, false);
    wp_enqueue_style('mobilemenu', get_template_directory_uri() . '/plugins/mmenu/styles/jquery-simple-mobilemenu-slide.css', array(), null, false);
    wp_enqueue_style('style', get_template_directory_uri() . '/css/style.css', array(), null, false);
    wp_enqueue_style('ys-style', get_template_directory_uri() . '/css/ys-style.css', array(), null, false);
}
add_action('wp_enqueue_scripts', 'limes_enqueue_scripts');

/**
 * Enqueue default theme scripts
 */
function limes_default_scripts() {
    wp_enqueue_style('limes-style', get_stylesheet_uri(), array(), _S_VERSION);
    wp_style_add_data('limes-style', 'rtl', 'replace');

    wp_enqueue_script('limes-navigation', get_template_directory_uri() . '/js/navigation.js', array(), _S_VERSION, true);

    if (is_singular() && comments_open() && get_option('thread_comments')) {
        wp_enqueue_script('comment-reply');
    }
}
add_action('wp_enqueue_scripts', 'limes_default_scripts');

/**
 * Enqueue admin styles
 */
function limes_admin_styles() {
    wp_enqueue_style('admin_css', get_template_directory_uri() . '/admin-style.css', false, '1.0.0');
}
add_action('admin_enqueue_scripts', 'limes_admin_styles');

/**
 * Enqueue and create dynamic CSS files
 */
function limes_dynamic_css() {
    $theme_directory = get_template_directory();
    $css_directory   = $theme_directory . '/css';
    $edits_css_path  = $css_directory . '/edits.css';
    $admin_css_path  = $css_directory . '/admin-edits.css';

    // Check if the CSS directory exists; if not, create it.
    if (!file_exists($css_directory)) {
        wp_mkdir_p($css_directory);
    }

    // Check if edits.css exists; if not, create it.
    if (!file_exists($edits_css_path)) {
        $file_handle = fopen($edits_css_path, 'w');
        if ($file_handle) {
            fwrite($file_handle, "/* Custom Edits CSS */\n");
            fclose($file_handle);
        }
    }

    // Check if admin-edits.css exists; if not, create it.
    if (!file_exists($admin_css_path)) {
        $file_handle = fopen($admin_css_path, 'w');
        if ($file_handle) {
            fwrite($file_handle, "/* Admin-only Custom Edits CSS */\n");
            fclose($file_handle);
        }
    }

    // URLs to the CSS files
    $edits_css_url = get_template_directory_uri() . '/css/edits.css';
    $admin_css_url = get_template_directory_uri() . '/css/admin-edits.css';
    $version = '1.0.1';

    // Enqueue the main stylesheet for all users
    wp_enqueue_style('theme-edits-css', $edits_css_url, array(), $version);

    // Enqueue the admin-only stylesheet only for logged-in admin users
    if (current_user_can('administrator')) {
        wp_enqueue_style('admin-theme-edits-css', $admin_css_url, array(), $version);
    }
}
add_action('wp_enqueue_scripts', 'limes_dynamic_css');

/**
 * Custom admin styles
 */
function limes_admin_head_styles() {
    echo '<style>
    .select2-container--default .select2-results__option[aria-selected=true], 
    .select2-container--default .select2-results__option[data-selected=true] {
        background-color: #ddd;
    }
    </style>';
}
add_action('admin_head', 'limes_admin_head_styles');
