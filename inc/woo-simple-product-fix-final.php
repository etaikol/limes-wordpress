<?php
/**
 * Final comprehensive fix for simple product add-to-cart
 */

// Priority 1: Ensure WooCommerce form handler is properly initialized
add_action('init', function() {
    // Make sure WooCommerce's form handler class is loaded
    if (!class_exists('WC_Form_Handler')) {
        return;
    }
    
    // Ensure the add_to_cart_action is hooked
    if (!has_action('wp_loaded', array('WC_Form_Handler', 'add_to_cart_action'))) {
        add_action('wp_loaded', array('WC_Form_Handler', 'add_to_cart_action'), 20);
    }
}, 1);

// Priority 2: Remove all interfering handlers for simple products
add_action('template_redirect', function() {
    if (!is_product()) {
        return;
    }
    
    global $product;
    if (!$product || !$product->is_type('simple')) {
        return;
    }
    
    // Remove any custom AJAX handlers
    remove_all_actions('wp_ajax_woocommerce_add_to_cart');
    remove_all_actions('wp_ajax_nopriv_woocommerce_add_to_cart');
    
    // Add a inline script to ensure form submits normally
    add_action('wp_footer', function() {
        ?>
        <script type="text/javascript">
        jQuery(document).ready(function($) {
            // Force simple product forms to submit normally
            var $form = $('form.cart');
            if ($form.length && !$form.hasClass('variations_form')) {
                // Remove all submit handlers
                $form.off('submit');
                $(document).off('submit', 'form.cart');
                
                // Remove click handlers from buttons
                $('.single_add_to_cart_button, .add_to_cart_trigger_btn').off('click');
                
                // Handle button clicks directly
                $(document).on('click', '.single_add_to_cart_button, .add_to_cart_trigger_btn', function(e) {
                    var $button = $(this);
                    var $form = $button.closest('form.cart');
                    
                    if ($form.length && !$form.hasClass('variations_form')) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        
                        // Ensure the button value is set
                        if ($button.attr('name') === 'add-to-cart' && $button.attr('value')) {
                            // Button already has the right attributes
                        } else {
                            // Create a hidden input with the product ID
                            var productId = $form.find('[name="add-to-cart"]').val() || 
                                          $button.attr('value') || 
                                          '<?php echo get_the_ID(); ?>';
                            
                            if (!$form.find('input[name="add-to-cart"]').length) {
                                $form.append('<input type="hidden" name="add-to-cart" value="' + productId + '">');
                            }
                        }
                        
                        // Submit the form
                        $form.get(0).submit();
                        return false;
                    }
                });
            }
        });
        </script>
        <?php
    }, 999);
}, 10);

// Priority 3: Handle the form submission server-side
add_action('wp_loaded', function() {
    // Check if this is a simple product add-to-cart request
    if (empty($_REQUEST['add-to-cart']) || empty($_POST)) {
        return;
    }
    
    $product_id = absint($_REQUEST['add-to-cart']);
    $product = wc_get_product($product_id);
    
    if (!$product || !$product->is_type('simple')) {
        return;
    }
    
    // Let WooCommerce handle it naturally
    if (class_exists('WC_Form_Handler') && !did_action('woocommerce_add_to_cart')) {
        WC_Form_Handler::add_to_cart_action();
    }
}, 15);

// Priority 4: Ensure cart item data is properly handled
add_filter('woocommerce_add_cart_item_data', function($cart_item_data, $product_id) {
    $product = wc_get_product($product_id);
    
    // For simple products, ensure clean cart item data
    if ($product && $product->is_type('simple')) {
        // Remove any custom data that might interfere
        unset($cart_item_data['custom_dimensions']);
        unset($cart_item_data['custom_installs']);
        unset($cart_item_data['installation_mechanism']);
    }
    
    return $cart_item_data;
}, 1, 2);

// Priority 5: Debug logging
add_action('init', function() {
    if (isset($_POST['add-to-cart'])) {
        error_log('Simple Product Add to Cart Debug:');
        error_log('Product ID: ' . $_POST['add-to-cart']);
        error_log('Request Method: ' . $_SERVER['REQUEST_METHOD']);
        error_log('POST data: ' . print_r($_POST, true));
    }
}, 999);