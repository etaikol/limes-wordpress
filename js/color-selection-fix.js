/**
 * Fix for color selection synchronization
 * Ensures custom radio buttons properly update WooCommerce variation select
 */
jQuery(document).ready(function($) {
    // Only run on product pages
    if (!$('body').hasClass('single-product')) return;
    
    // Initialize immediately and also on window load
    initColorSync();
    $(window).on('load', function() {
        initColorSync();
    });
    
    function initColorSync() {
        var $form = $('form.cart');
        if (!$form.length) return;
        
        var $colorSelect = $('#pa_color');
        if (!$colorSelect.length) return;
        
        // Initializing color sync fix
        
        // Find all color radio buttons
        var $colorRadios = $('.wrap_attrs input[type="radio"][name="attribute_pa_color"]');
        if (!$colorRadios.length) {
            return;
        }
        
        // Create a unique identifier for radios to prevent conflicts
        $colorRadios.each(function(index) {
            var $radio = $(this);
            // Change the name to something unique that won't conflict with WooCommerce
            $radio.attr('name', 'custom_color_selection');
            $radio.attr('data-wc-attribute', 'attribute_pa_color');
            $radio.attr('data-original-value', $radio.val());
        });
        
        // Build mapping between radio values and select options
        function buildColorMap() {
            var map = {};
            var $options = $colorSelect.find('option').not('[value=""]');
            
            // Try to match by value or label
            $options.each(function() {
                var optVal = $(this).val();
                var optText = $(this).text().trim();
                
                $colorRadios.each(function() {
                    var $radio = $(this);
                    var radioVal = $radio.val();
                    var radioText = $radio.closest('label').find('.tooltip span').text().trim();
                    var radioSlug = $radio.data('slug');
                    
                    // Direct value match
                    if (radioVal === optVal) {
                        map[radioVal] = optVal;
                    }
                    // Slug match
                    else if (radioSlug === optVal) {
                        map[radioVal] = optVal;
                    }
                    // Text match
                    else if (radioText === optText) {
                        map[radioVal] = optVal;
                    }
                    // Special case for white/לבן
                    else if (optVal === 'white' && radioText === 'לבן') {
                        map[radioVal] = optVal;
                    }
                    // Try decoded value match
                    else if (decodeURIComponent(radioVal) === optVal || radioVal === encodeURIComponent(optVal)) {
                        map[radioVal] = optVal;
                    }
                });
            });
            
            // Important: Only use single-option fallback if NO matches were found
            if (Object.keys(map).length === 0 && $options.length === 1) {
                var singleValue = $options.first().val();
                $colorRadios.each(function() {
                    map[$(this).val()] = singleValue;
                });
            }
            
            return map;
        }
        
        var colorMap = buildColorMap();
        
        // Handle radio button clicks - use 'change' event for better compatibility
        $colorRadios.off('click change').on('click change', function(e) {
            var $radio = $(this);
            var radioValue = $radio.val();
            
            // Radio clicked/changed
            
            // Ensure this radio is checked and others are not
            $colorRadios.prop('checked', false);
            $radio.prop('checked', true);
            
            // Update visual state
            $('.wrap_attrs .wrap_item').removeClass('active');
            $radio.closest('.wrap_item').addClass('active');
            
            // Get mapped select value
            var selectValue = colorMap[radioValue];
            
            // If no mapping and only one option, use it
            if (!selectValue) {
                var $nonEmptyOptions = $colorSelect.find('option').not('[value=""]');
                if ($nonEmptyOptions.length === 1) {
                    selectValue = $nonEmptyOptions.first().val();
                }
            }
            
            if (selectValue) {
                // Only update if value is different
                if ($colorSelect.val() !== selectValue) {
                    $colorSelect.val(selectValue);
                    $colorSelect.trigger('change');
                    
                    // Force WooCommerce to recognize the change
                    setTimeout(function() {
                        $form.trigger('check_variations');
                        $form.trigger('woocommerce_variation_select_change');
                        
                        // Also trigger found_variation if we have the variation data
                        var variations = $form.data('product_variations');
                        if (variations && variations.length > 0) {
                            // Find matching variation
                            var matchingVariation = null;
                            for (var i = 0; i < variations.length; i++) {
                                if (variations[i].attributes.attribute_pa_color === selectValue) {
                                    matchingVariation = variations[i];
                                    break;
                                }
                            }
                            if (matchingVariation) {
                                $form.trigger('found_variation', [matchingVariation]);
                            }
                        }
                    }, 50);
                }
            }
        });
        
        // Sync from select to radio
        function syncFromSelect(triggeredByUser) {
            var selectVal = $colorSelect.val();
            
            if (selectVal) {
                // First, clear all radio selections
                $colorRadios.prop('checked', false);
                $('.wrap_attrs .wrap_item').removeClass('active');
                
                // Find radio that maps to this select value
                var radioFound = false;
                for (var radioVal in colorMap) {
                    if (colorMap[radioVal] === selectVal) {
                        var $radio = $colorRadios.filter('[value="' + radioVal + '"]');
                        if ($radio.length) {
                            $radio.prop('checked', true);
                            $radio.closest('.wrap_item').addClass('active');
                            radioFound = true;
                            break;
                        }
                    }
                }
                
                // If no radio found but we have a select value, check if it's a special case
                if (!radioFound && selectVal === 'white') {
                    // Try to find the white/לבן radio
                    $colorRadios.each(function() {
                        var $radio = $(this);
                        var label = $radio.closest('.wrap_item').find('.tooltip span').text().trim();
                        if (label === 'לבן' || label === 'white') {
                            $radio.prop('checked', true);
                            $radio.closest('.wrap_item').addClass('active');
                            return false;
                        }
                    });
                }
            } else {
                // No selection - clear radios
                $colorRadios.prop('checked', false);
                $('.wrap_attrs .wrap_item').removeClass('active');
            }
        }
        
        // Initial sync - Clear all pre-selections and wait for user input
        function clearAllSelections() {
            // Clear all visual selections
            $('.wrap_attrs .wrap_item').removeClass('active');
            $colorRadios.prop('checked', false);
            
            // Clear WooCommerce select (but don't trigger change to avoid loops)
            $colorSelect.off('change.colorsync'); // Temporarily disable listener
            $colorSelect.val('');
            $colorSelect.on('change.colorsync', function() {
                clearTimeout(selectChangeTimer);
                selectChangeTimer = setTimeout(function() {
                    syncFromSelect(true);
                }, 50);
            }); // Re-enable listener
        }
        
        // Clear immediately
        clearAllSelections();
        
        // Clear again after a delay in case WooCommerce overrides
        setTimeout(clearAllSelections, 100);
        setTimeout(clearAllSelections, 300);
        
        // Final clear after WooCommerce fully loads
        setTimeout(clearAllSelections, 1000);
        
        // Listen for select changes - debounce to prevent loops
        var selectChangeTimer;
        $colorSelect.off('change.colorsync').on('change.colorsync', function() {
            clearTimeout(selectChangeTimer);
            selectChangeTimer = setTimeout(function() {
                syncFromSelect(true);
            }, 50);
        });
        
        // REMOVED: Form submit handler that was causing multiple submissions
        // Color selection is already properly synced by the radio click handlers
        
        // Monitor for dynamic changes (in case WooCommerce updates the select)
        var observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
                    // Select value changed programmatically
                    syncFromSelect(false);
                }
            });
        });
        
        // Observe the select element for value changes
        if ($colorSelect[0]) {
            observer.observe($colorSelect[0], {
                attributes: true,
                attributeFilter: ['value']
            });
        }
        
        // Also monitor for new radio buttons being added
        var radioObserver = new MutationObserver(function(mutations) {
            var needsReinit = false;
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes.length > 0) {
                    $(mutation.addedNodes).each(function() {
                        if ($(this).find('input[type="radio"][name="attribute_pa_color"]').length > 0) {
                            needsReinit = true;
                        }
                    });
                }
            });
            
            if (needsReinit) {
                setTimeout(initColorSync, 100);
            }
        });
        
        // Observe the color attributes container
        var $attrsContainer = $('.wrap_attrs');
        if ($attrsContainer[0]) {
            radioObserver.observe($attrsContainer[0], {
                childList: true,
                subtree: true
            });
        }
        
        // REMOVED: setInterval that was running every second causing performance issues
        // The radio click handlers and mutation observers already handle synchronization
    }
});