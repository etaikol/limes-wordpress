/**
 * Custom Addon Totals Display
 * Creates a separate custom addon totals table that doesn't interfere with WooCommerce
 */
(function($) {
    'use strict';
    
    let updateTimer = null;
    let lastCalculation = null;
    let isInitialized = false;
    let isCalculating = false;
    let loadingStartTime = null;
    let loadingActive = false;
    const MIN_LOADING_DURATION = 0; // Remove artificial delay for instant response
    
    /**
     * Format price for display, handling whole numbers properly
     */
    function formatPrice(price) {
        const rounded = Math.round(price * 100) / 100;
        // If the price is very close to a whole number, show it without decimals
        if (Math.abs(rounded - Math.round(rounded)) < 0.01) {
            return Math.round(rounded).toFixed(2);
        }
        return rounded.toFixed(2);
    }
    
    /**
     * Initialize custom addon totals
     */
    function init() {
        if (!$('body').hasClass('single-product')) return;
        
        // Prevent duplicate initialization
        if (isInitialized) {
            return;
        }
        
        isInitialized = true;
        
        // Hide the original WooCommerce addon totals
        hideOriginalAddonTotals();
        
        // Remove the original product-addons-total div completely
        $('#product-addons-total').remove();
        
        // Create our custom container
        createCustomContainer();
        
        // Bind events
        bindEvents();
        
        // Initial calculation - will only show if conditions are met
        setTimeout(function() {
            // Force a calculation to ensure display appears
            if (window.LimesCalculationController) {
                window.LimesCalculationController.forceRecalculation();
            } else {
                calculateAndDisplay();
            }
        }, 500);
    }
    
    /**
     * Hide original WooCommerce addon totals
     */
    function hideOriginalAddonTotals() {
        // Add CSS to hide original totals
        if (!$('#custom-addon-totals-css').length) {
            $('head').append(`
                <style id="custom-addon-totals-css">
                    /* Hide original WooCommerce addon totals completely */
                    #product-addons-total {
                        display: none !important;
                        visibility: hidden !important;
                        height: 0 !important;
                        overflow: hidden !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    
                    #product-addons-total .product-addon-totals,
                    #product-addons-total > ul,
                    .wc-pao-addon-totals {
                        display: none !important;
                    }
                    
                    /* Hide custom container by default */
                    #limes-custom-addon-totals {
                        display: none;
                        visibility: hidden;
                        opacity: 0;
                        margin: 0px 0 20px 0;
                        clear: both;
                        transition: opacity 0.3s ease, visibility 0.3s ease;
                    }
                    
                    /* Show only when conditions are met */
                    #limes-custom-addon-totals.show-totals {
                        display: block !important;
                        visibility: visible !important;
                        opacity: 1 !important;
                    }
                    
                    /* Style the custom addon totals to match WooCommerce */
                    .limes-addon-totals {
                        background: transparent;
                        border: none;
                        padding: 0;
                        direction: rtl;
                        font-size: inherit;
                        line-height: inherit;
                    }
                    
                    .limes-addon-totals ul {
                        list-style: none;
                        margin: 0;
                        padding: 0;
                    }
                    
                    .limes-addon-totals li {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        padding: 7px 0;
                        margin: 0;
                        clear: both;
                    }
                    
                    .limes-addon-totals li:last-child {
                        padding-top: 10px;
                        margin-top: 10px;
                        border-top: 1px solid #e0e0e0;
                        font-weight: 600;
                    }
                    
                    .limes-addon-col1 {
                        flex: 1;
                        text-align: right;
                    }
                    
                    .limes-addon-col2 {
                        text-align: left;
                        min-width: auto;
                        padding-left: 0px;
                    }

                    .wc-pao-addons-container {
                        position: relative;
                        min-height: 0px !important; /* Prevent height issues */
                    }

                
                    
                    /* Ensure alignment with other price displays */
                    .limes-addon-totals .woocommerce-Price-currencySymbol {
                        margin-right: 0.25em;
                    }
                    
                    /* Loading overlay for custom addon totals */
                    #limes-custom-addon-totals {
                        position: relative;
                    }
                    
                    #limes-custom-addon-totals .addon-loading-overlay {
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(255, 255, 255, 0.9);
                        z-index: 999;
                        display: none;
                        align-items: center;
                        justify-content: center;
                    }
                    
                    #limes-custom-addon-totals.loading-active .addon-loading-overlay {
                        display: flex !important;
                    }
                    
                    .addon-loading-spinner {
                        text-align: center;
                    }
                    
                    .spinner-circle {
                        display: inline-block;
                        width: 30px;
                        height: 30px;
                        border: 3px solid rgba(0, 0, 0, 0.1);
                        border-top-color: #333;
                        border-radius: 50%;
                        animation: addon-spin 0.8s linear infinite;
                        margin-bottom: 10px;
                    }
                    
                    @keyframes addon-spin {
                        to { transform: rotate(360deg); }
                    }
                    
                    .addon-loading-spinner span {
                        display: block;
                        color: #666;
                        font-size: 14px;
                    }
                </style>
            `);
        }
    }
    
    /**
     * Create custom container
     */
    function createCustomContainer() {
        // Remove any existing custom container
        $('#limes-custom-addon-totals').remove();
        
        // Create new container with loading overlay
        const $container = $(`
            <div id="limes-custom-addon-totals">
                <div class="addon-loading-overlay">
                    <div class="addon-loading-spinner">
                        <div class="spinner-circle"></div>
                        <span>מחשב מחיר...</span>
                    </div>
                </div>
            </div>
        `);
        
        // Find the best place to insert it - before the cart buttons
        if ($('.wrap_cart_btns').length) {
            // Insert before the cart buttons wrapper
            $('.wrap_cart_btns').before($container);
        } else if ($('.woocommerce-variation-add-to-cart').length) {
            // Insert before the variation add to cart section
            $('.woocommerce-variation-add-to-cart').before($container);
        } else if ($('.wc-pao-addons-container').length) {
            $('.wc-pao-addons-container').after($container);
        } else if ($('.single_variation_wrap').length) {
            $('.single_variation_wrap').append($container);
        } else {
            $('form.cart').append($container);
        }
        
    }
    
    /**
     * Bind events
     */
    function bindEvents() {
        // Register with central controller if available
        if (window.LimesCalculationController) {
            window.LimesCalculationController.register(function(result, source) {
                // Update our display when calculation happens
                window.LimesCustomAddonTotals.updateDisplay(result);
            });
            // Don't bind duplicate events - controller handles everything
            return;
        }
        
        // Fallback to original event binding if controller not available
        const $form = $('form.cart');
        
        // Dimension changes - use debounced update
        $form.on('input', '#prod_width, #prod_height, #prod_coverage', debounceUpdate);
        $form.on('change blur', '#prod_width, #prod_height, #prod_coverage', debounceUpdate);
        
        // Addon changes
        $(document).on('change', '.wc-pao-addon-field', debounceUpdate);
        
        // Variation changes
        $form.on('found_variation', function(e, variation) {
            setTimeout(function() {
                // Force calculation with variation data
                if (window.LimesCalculationController) {
                    window.LimesCalculationController.scheduleCalculation('variation_change', 100, variation);
                } else {
                    calculateAndDisplay(variation);
                }
            }, 100);
        });
        
        // Color/mechanism/installation changes - avoid duplicate events
        $form.on('change', 'input[name="attribute_pa_color"]:not(.bound-addon-totals)', function() {
            $(this).addClass('bound-addon-totals');
            debounceUpdate();
        });
        $form.on('change', 'input[name="prod_radio-gr1"]:not(.bound-addon-totals), input[name="prod_radio-gr2"]:not(.bound-addon-totals)', function() {
            $(this).addClass('bound-addon-totals');
            debounceUpdate();
        });
    }
    
    /**
     * Debounced update
     */
    function debounceUpdate() {
        if (updateTimer) {
            clearTimeout(updateTimer);
        }
        
        // Reduce debounce time for instant response
        updateTimer = setTimeout(function() {
            calculateAndDisplay();
        }, 50);
    }
    
    /**
     * Calculate and display totals
     */
    function calculateAndDisplay(variation = null) {
        // Delegate to central controller if available
        if (window.LimesCalculationController) {
            window.LimesCalculationController.scheduleCalculation('custom-addon-totals', 50, variation);
            return;
        }
        
        // Prevent concurrent calculations
        if (isCalculating) {
            return;
        }
        
        // Prevent too frequent updates - minimum 250ms between calculations to avoid loops
        const now = Date.now();
        if (window.lastCalculationTime && (now - window.lastCalculationTime) < 250) {
            return;
        }
        window.lastCalculationTime = now;
        
        isCalculating = true;
        
        // First check if we should show loading
        const requiredFieldsFilled = areRequiredFieldsFilled();
        
        if (requiredFieldsFilled) {
            // Show loading only if conditions are met
            showLoading();
            
            // Small delay to show loading animation
            setTimeout(function() {
                performCalculation(variation);
                isCalculating = false;
            }, 100);
        } else {
            // Don't show loading, just hide the container
            $('#limes-custom-addon-totals').removeClass('show-totals');
            isCalculating = false;
        }
    }
    
    /**
     * Show loading overlay
     */
    function showLoading() {
        // Prevent double activation
        if (loadingActive) {
            return;
        }
        
        loadingActive = true;
        loadingStartTime = Date.now();
        
        const $container = $('#limes-custom-addon-totals');
        // Ensure container is visible before showing loading
        $container.addClass('show-totals');
        // Small delay to ensure visibility transition completes
        setTimeout(function() {
            $container.addClass('loading-active');
        }, 50);
    }
    
    /**
     * Hide loading overlay
     */
    function hideLoading() {
        if (!loadingActive) {
            return;
        }
        
        // Calculate how long loading has been shown
        const loadingDuration = Date.now() - loadingStartTime;
        const remainingTime = Math.max(0, MIN_LOADING_DURATION - loadingDuration);
        
        // Ensure loading shows for at least MIN_LOADING_DURATION
        setTimeout(function() {
            $('#limes-custom-addon-totals').removeClass('loading-active');
            loadingActive = false;
        }, remainingTime);
    }
    
    /**
     * Check if all required fields are filled
     */
    function areRequiredFieldsFilled() {
        // Check if Progressive Field Control is available
        if (window.ProgressiveFieldControl && typeof window.ProgressiveFieldControl.isComplete === 'function') {
            return window.ProgressiveFieldControl.isComplete();
        }
        
        // Fallback validation
        // Check dimensions
        const isRollProduct = $('#prod_coverage').length > 0 && $('#prod_coverage').is(':visible');
        if (isRollProduct) {
            const coverage = parseFloat($('#prod_coverage').val()) || 0;
            if (coverage <= 0) return false;
        } else {
            const width = parseFloat($('#prod_width').val()) || 0;
            if (width <= 0) return false;
            
            // Check if height is required
            if ($('#prod_height').length && $('#prod_height').is(':visible') && $('#prod_height').prop('required')) {
                const height = parseFloat($('#prod_height').val()) || 0;
                if (height <= 0) return false;
            }
        }
        
        // Check color if exists
        if ($('input[name="attribute_pa_color"]').length > 0) {
            if ($('input[name="attribute_pa_color"]:checked').length === 0) return false;
        }
        
        // Check mechanism if exists (not for roll products)
        if (!isRollProduct && $('input[name="prod_radio-gr2"]').length > 0) {
            if ($('input[name="prod_radio-gr2"]:checked').length === 0) return false;
        }
        
        // Check installation if exists (not for roll products)
        if (!isRollProduct && $('input[name="prod_radio-gr1"]').length > 0) {
            if ($('input[name="prod_radio-gr1"]:checked').length === 0) return false;
        }
        
        return true;
    }
    
    /**
     * Check if any addon is selected
     */
    function hasSelectedAddons() {
        // If there are no addon fields, don't require addon selection
        if (!$('.wc-pao-addon-field').length) {
            return true;
        }
        
        let hasAddons = false;
        
        $('.wc-pao-addon-field').each(function() {
            const $field = $(this);
            const fieldType = $field.prop('tagName').toLowerCase();
            
            if (fieldType === 'select') {
                const $selected = $field.find('option:selected');
                if ($selected.val() && $selected.val() !== '') {
                    hasAddons = true;
                    return false; // break
                }
            } else if (fieldType === 'input' && $field.is(':checked')) {
                hasAddons = true;
                return false; // break
            }
        });
        
        return hasAddons;
    }
    
    /**
     * Perform the actual calculation
     */
    function performCalculation(variation = null) {
        // Always show the container if required fields are filled
        const $container = $('#limes-custom-addon-totals');
        $container.addClass('show-totals');
        
        // Get product info
        const productName = $('h1.product-title').text().trim() || 
                          $('.product_title').text().trim() || 
                          'מוצר';
        
        // Get base price - always get fresh from variation data or original price
        let basePrice = 0;
        if (variation && variation.display_price) {
            basePrice = parseFloat(variation.display_price) || 0;
        } else {
            // Get from variations data if available
            const $form = $('form.variations_form');
            if ($form.length) {
                const variations = $form.data('product_variations');
                const variationId = parseInt($form.find('input[name="variation_id"]').val());
                
                if (variations && variationId) {
                    const currentVariation = variations.find(v => v.variation_id === variationId);
                    if (currentVariation && currentVariation.display_price) {
                        basePrice = parseFloat(currentVariation.display_price) || 0;
                    }
                }
            }
            
            // Fallback to other sources only if no variation data
            if (basePrice === 0) {
                const $variationPrice = $('.woocommerce-variation-price .amount').first();
                const $fromPrice = $('.from_price .woocommerce-Price-amount').first();
                
                if ($variationPrice.length && $variationPrice.is(':visible')) {
                    basePrice = parseFloat($variationPrice.text().replace(/[^\d\.]/g, '')) || 0;
                } else if ($fromPrice.length) {
                    // Use the "from price" as base
                    basePrice = parseFloat($fromPrice.text().replace(/[^\d\.]/g, '')) || 0;
                }
            }
        }
        
        // Calculate dimensional price with proper rounding
        let dimensionalPrice = basePrice;
        const width = parseFloat($('#prod_width').val()) || 0;
        const height = parseFloat($('#prod_height').val()) || 0;
        const coverage = parseFloat($('#prod_coverage').val()) || 0;
        let rollsNeeded = 0; // Track for percentage addon calculations
        
        // Get the product type
        const productType = $('#product_type').val() || $('.product-addon-totals').data('product-type') || '';
        
        if (productType === 'roll' && coverage > 0) {
            // Roll type
            const rollWidth = parseFloat($('#roll_width').val()) || 0;
            const rollLength = parseFloat($('#roll_length').val()) || 0;
            
            if (rollWidth > 0 && rollLength > 0) {
                const rollArea = (rollWidth * rollLength) / 10000;
                // Add 5% margin to coverage to match cart calculation
                const coverageWithMargin = coverage * 1.05;
                rollsNeeded = Math.ceil(coverageWithMargin / rollArea);
                dimensionalPrice = basePrice * rollsNeeded;
            }
        } else if (productType === 'rm' && width > 0) {
            // RM type - fix floating point precision in meters calculation
            // IGNORE height for RM products
            const meters = width / 100;
            dimensionalPrice = basePrice * meters;
        } else if (productType === 'sqm' && width > 0 && height > 0) {
            // SQM type - fix floating point precision in area calculation
            let area = (width * height) / 10000;
            
            // Apply minimum area of 1 sqm BEFORE any calculations
            if (area < 1) {
                area = 1;
            }
            
            // If area is exactly 1 (or very close to 1), use exactly 1 to avoid precision issues
            if (Math.abs(area - 1) < 0.001) {
                area = 1;
            }
            
            dimensionalPrice = basePrice * area;
        } else if (coverage > 0) {
            // Fallback for roll type
            const rollWidth = parseFloat($('#roll_width').val()) || 0;
            const rollLength = parseFloat($('#roll_length').val()) || 0;
            
            if (rollWidth > 0 && rollLength > 0) {
                const rollArea = (rollWidth * rollLength) / 10000;
                const coverageWithMargin = coverage * 1.05;
                rollsNeeded = Math.ceil(coverageWithMargin / rollArea);
                dimensionalPrice = basePrice * rollsNeeded;
            }
        } else if (width > 0 && height > 0) {
            // Fallback for SQM type
            let area = (width * height) / 10000;
            if (area < 1) {
                area = 1;
            }
            if (Math.abs(area - 1) < 0.001) {
                area = 1;
            }
            dimensionalPrice = basePrice * area;
        } else if (width > 0) {
            // Fallback for RM type
            const meters = width / 100;
            dimensionalPrice = basePrice * meters;
        }
        
        // Check for minimum price from various sources
        let minPrice = 0;
        
        // Try to get from .from_price element
        const $fromPrice = $('.from_price .woocommerce-Price-amount');
        if ($fromPrice.length) {
            minPrice = parseFloat($fromPrice.text().replace(/[^\d\.]/g, '')) || 0;
        }
        
        // Also check for data attribute on form or product
        if (!minPrice) {
            const $form = $('form.cart');
            minPrice = parseFloat($form.data('min-price')) || 0;
        }
        
        // Check ACF field value if available
        if (!minPrice && window.acf_min_price) {
            minPrice = parseFloat(window.acf_min_price) || 0;
        }
        
        
        // Round dimensional price FIRST to fix floating point precision
        dimensionalPrice = Math.round(dimensionalPrice * 100) / 100;
        
        // Apply minimum price if needed (after rounding)
        if (minPrice > 0 && dimensionalPrice < minPrice) {
            // Round to nearest integer if the minimum price is very close to a whole number
            // This prevents 600 from becoming 600.01 due to floating-point precision
            dimensionalPrice = Math.abs(minPrice - Math.round(minPrice)) < 0.01 ? Math.round(minPrice) : minPrice;
        }
        
        // Get selected addons - FIXED: Only get visible addon fields from the main form
        const addons = [];
        const addonsMap = new Map(); // Use Map to track unique addons by name
        let addonTotal = 0;
        
        // Only search within the main cart form to avoid duplicates
        $('form.cart').find('.wc-pao-addon-field:visible').each(function() {
            const $field = $(this);
            const fieldType = $field.prop('tagName').toLowerCase();
            
            // Skip if field is inside the custom addon totals container
            if ($field.closest('#limes-custom-addon-totals').length > 0) {
                return;
            }
            
            if (fieldType === 'select') {
                const $selected = $field.find('option:selected');
                if ($selected.val() && $selected.val() !== '') {
                    let price = parseFloat($selected.data('price')) || 0;
                    const priceType = $selected.data('price-type') || 'flat_fee';
                    const label = $selected.data('label') || $selected.text().replace(/\([^)]*\)/, '').trim();
                    
                    // Handle percentage-based pricing
                    if (priceType === 'percentage_based' || label.includes('%')) {
                        // For roll products, calculate percentage based on price per roll, then multiply by rolls
                        if (rollsNeeded > 0) {
                            price = (basePrice * price / 100) * rollsNeeded;
                        } else {
                            // For other products, calculate percentage of dimensional price
                            price = (dimensionalPrice * price) / 100;
                        }
                    }
                    
                    // Only add if not already in the map (prevents duplicates)
                    if (!addonsMap.has(label)) {
                        addonsMap.set(label, {
                            label: label,
                            price: price
                        });
                    }
                }
            } else if (fieldType === 'input' && $field.is(':checked')) {
                let price = parseFloat($field.data('price')) || 0;
                const priceType = $field.data('price-type') || 'flat_fee';
                const label = $field.data('label') || $field.next('label').text() || 'תוספת';
                
                // Handle percentage-based pricing
                if (priceType === 'percentage_based' || label.includes('%')) {
                    // For roll products, calculate percentage based on price per roll, then multiply by rolls
                    if (rollsNeeded > 0) {
                        price = (basePrice * price / 100) * rollsNeeded;
                    } else {
                        // For other products, calculate percentage of dimensional price
                        price = (dimensionalPrice * price) / 100;
                    }
                }
                
                // Only add if not already in the map (prevents duplicates)
                if (!addonsMap.has(label)) {
                    addonsMap.set(label, {
                        label: label,
                        price: price
                    });
                }
            }
        });
        
        // Convert Map to array and calculate total
        addonsMap.forEach((addon) => {
            addons.push(addon);
            addonTotal += addon.price;
        });
        
        // Calculate total
        const finalTotal = dimensionalPrice + addonTotal;
        
        // Check if calculation changed
        const currentCalc = JSON.stringify({ dimensionalPrice, addons, finalTotal });
        if (currentCalc === lastCalculation) {
            hideLoading();
            return;
        }
        lastCalculation = currentCalc;
        
        // Update display
        updateCustomDisplay(productName, dimensionalPrice, addons, finalTotal);
        
        // Update hidden inputs with properly rounded values
        var roundedTotal = Math.round(finalTotal * 100) / 100;
        // If the rounded total is very close to a whole number, use the whole number
        // This prevents prices like 600 from becoming 600.01
        if (Math.abs(roundedTotal - Math.round(roundedTotal)) < 0.01) {
            roundedTotal = Math.round(roundedTotal);
        }
        $('input[name="calculated_price"]').val(roundedTotal);
        $('form.cart').attr('data-price', roundedTotal);
        
        // Hide loading after display update
        hideLoading();
    }
    
    /**
     * Update custom display
     */
    function updateCustomDisplay(productName, basePrice, addons, total) {
        const $container = $('#limes-custom-addon-totals');
        if (!$container.length) return;
        
        // Ensure container is visible
        $container.addClass('show-totals');
        
        let html = '<div class="limes-addon-totals"><ul>';
        
        // Product line
        html += `
            <li>
                <div class="limes-addon-col1">
                    <strong>${productName}</strong>
                </div>
                <div class="limes-addon-col2">
                    <strong>
                        <span class="woocommerce-Price-amount amount">${formatPrice(basePrice)}</span>
                        <span class="woocommerce-Price-currencySymbol">₪</span>
                    </strong>
                </div>
            </li>
        `;
        
        // Addon lines
        addons.forEach(function(addon) {
            html += `
                <li>
                    <div class="limes-addon-col1">${addon.label}</div>
                    <div class="limes-addon-col2">
                        <span class="woocommerce-Price-amount amount">${formatPrice(addon.price)}</span>
                        <span class="woocommerce-Price-currencySymbol">₪</span>
                    </div>
                </li>
            `;
        });
        
        // Total line
        html += `
            <li class="limes-total-line">
                <div class="limes-addon-col1">
                    <strong>סה״כ</strong>
                </div>
                <div class="limes-addon-col2">
                    <strong>
                        <span class="woocommerce-Price-amount amount">${formatPrice(total)}</span>
                        <span class="woocommerce-Price-currencySymbol">₪</span>
                    </strong>
                </div>
            </li>
        `;
        
        html += '</ul></div>';
        
        // Add loading overlay back
        html += `
            <div class="addon-loading-overlay">
                <div class="addon-loading-spinner">
                    <div class="spinner-circle"></div>
                    <span>מחשב מחיר...</span>
                </div>
            </div>
        `;
        
        $container.html(html);
    }
    
    // Initialize only once when DOM is ready
    $(document).ready(function() {
        setTimeout(init, 100);
    });
    
    // Public API
    window.LimesCustomAddonTotals = {
        init: init,
        calculate: calculateAndDisplay,
        update: debounceUpdate,
        updateDisplay: function(result) {
            // First check if we should show the display
            if (!areRequiredFieldsFilled()) {
                $('#limes-custom-addon-totals').removeClass('show-totals');
                return;
            }
            
            // Show the container
            $('#limes-custom-addon-totals').addClass('show-totals');
            
            // Don't trigger any recalculation - just update display
            var productName = $('h1.product-title').text().trim() || $('.product_title').text().trim() || 'מוצר';
            
            // Format data for display
            var displayAddons = result.addons.map(addon => ({
                label: addon.label,
                price: addon.price
            }));
            
            // Update display without triggering events
            updateCustomDisplay(productName, result.dimensionalPrice, displayAddons, result.finalPrice);
            
            // Hide loading if it was active
            hideLoading();
        }
    };
    
    // Periodic cleanup of any recreated original containers - DISABLED to prevent loops
    // setInterval(function() {
    //     // Remove any original addon totals that might be recreated
    //     $('#product-addons-total').remove();
    //     
    //     // Don't force visibility - let validation control it
    // }, 1000);
    
})(jQuery);