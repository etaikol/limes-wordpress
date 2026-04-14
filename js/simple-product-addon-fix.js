/**
 * Simple Product Addon Fix
 * Removes addon totals display and fixes add to cart for simple products
 */
jQuery(document).ready(function($) {
    // Only run on simple product pages
    if (!$('body').hasClass('product-type-simple')) {
        return;
    }
    
    console.log('Simple Product Addon Fix - Initializing');
    
    // Remove any existing limes-custom-addon-totals
    $('#limes-custom-addon-totals').remove();
    
    // Also prevent it from being added later
    $(window).on('load', function() {
        setTimeout(function() {
            $('#limes-custom-addon-totals').remove();
            
            // Create a mutation observer to remove it if it gets added
            var observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.id === 'limes-custom-addon-totals' || 
                            (node.querySelector && node.querySelector('#limes-custom-addon-totals'))) {
                            console.log('Simple Product Addon Fix - Removing dynamically added addon totals');
                            $('#limes-custom-addon-totals').remove();
                        }
                    });
                });
            });
            
            // Observe the form for additions
            var $form = $('form.cart');
            if ($form.length) {
                observer.observe($form[0], { childList: true, subtree: true });
            }
            
            // Also observe body for additions
            observer.observe(document.body, { childList: true, subtree: true });
            
            // Fix add to cart button
            fixAddToCartButton();
        }, 100);
    });
    
    /**
     * Fix the add to cart button for simple products
     */
    function fixAddToCartButton() {
        console.log('Simple Product Addon Fix - Fixing add to cart button');
        
        // Remove all existing click handlers from the button
        $('.add_to_cart_trigger_btn, .single_add_to_cart_button').off('click');
        
        // Add a direct submit handler
        $(document).off('click.simple-fix').on('click.simple-fix', '.add_to_cart_trigger_btn, .single_add_to_cart_button', function(e) {
            var $button = $(this);
            var $form = $button.closest('form.cart');
            
            console.log('Simple Product - Button clicked, form found:', $form.length > 0);
            
            if ($form.length > 0 && !$form.hasClass('variations_form')) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                
                // Ensure button is not disabled
                $button.prop('disabled', false).removeClass('disabled');
                
                // Log form data
                console.log('Simple Product - Submitting form with data:', {
                    action: $form.attr('action'),
                    method: $form.attr('method'),
                    'add-to-cart': $button.attr('value'),
                    quantity: $form.find('input[name="quantity"]').val()
                });
                
                // Submit the form directly
                $form.submit();
                
                return false;
            }
        });
        
        // Ensure the button is enabled
        $('.add_to_cart_trigger_btn, .single_add_to_cart_button')
            .prop('disabled', false)
            .removeClass('disabled');
    }
    
    // Run fix on initial load too
    setTimeout(fixAddToCartButton, 500);
});