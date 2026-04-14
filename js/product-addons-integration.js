/**
 * WooCommerce Product Addons Integration
 * 
 * This script enhances the integration between our custom dimensional pricing
 * and the official WooCommerce Product Addons plugin.
 */
jQuery(document).ready(function($) {
    // Fix wrong prices immediately on DOM ready
    function fixWrongAddonPrices() {
        $('.wc-pao-addons-container .amount').each(function() {
            var $el = $(this);
            var priceText = $el.text();
            var price = parseFloat(priceText.replace(/[^\d\.]/g, "")) || 0;
            
            // Check for suspiciously high prices (over 10,000)
            if (price > 10000) {
                $el.html('<span class="calculating-price">מחשב...</span>');
                
                // Mark container for recalculation
                $el.closest('.wc-pao-addons-container').addClass('needs-price-fix');
            }
        });
    }
    
    // Run fix immediately
    fixWrongAddonPrices();
    
    // Wait for the page to fully load
    $(window).on('load', function() {
        // Only run on product pages
        if (!$('body').hasClass('single-product')) return;
        
        // Run fix again after page load
        fixWrongAddonPrices();
        
        // Cache selectors
        var $cartForm = $('form.cart');
        var $prodWidth = $('#prod_width');
        var $prodHeight = $('#prod_height');
        var $prodCoverage = $('#prod_coverage');
        var $basePrice = $('#base_price');
        var $officialAddonTotals = $('.wc-pao-addon-totals');
        var $customAddonTotals = $('.product-addon-totals');
        
        // Check if we have dimension fields
        var hasDimensions = $prodWidth.length > 0 || $prodHeight.length > 0 || $prodCoverage.length > 0;
        
        // Add class to form if dimensions are required
        if (hasDimensions) {
            $cartForm.addClass('dimensions-required');
        }
        
        // Remove any duplicate addon totals containers
        // The official WooCommerce Product Addons plugin adds its own container with ID 'product-addons-total'
        // Our custom container has class 'product-addon-totals'
        // If both exist, remove our custom one
        if ($('#product-addons-total').length > 0 && $('.product-addon-totals').length > 0) {
            $('.product-addon-totals').remove();
        }
        
        
        /**
         * Calculate the base price based on dimensions
         */
        function calculateDimensionalPrice() {
            // Get base price from variation or product
            var basePrice = 0;
            if ($(".woocommerce-variation-price .amount").length > 0) {
                basePrice = parseFloat(
                    $(".woocommerce-variation-price .amount")
                        .first()
                        .text()
                        .replace(/[^\d\.]/g, "")
                );
            } else {
                basePrice = parseFloat($basePrice.data("base-price")) || 0;
            }
            
            
            // Default to base price
            var adjustedPrice = basePrice;
            
            // Calculate based on dimensions
            if ($prodCoverage.length > 0) { // Roll type
                var coverage = parseFloat($prodCoverage.val()) || 0;
                var rollWidth = parseFloat($("#roll_width").val()) || 0;
                var rollLength = parseFloat($("#roll_length").val()) || 0;
                
                
                if (coverage > 0 && rollWidth > 0 && rollLength > 0) {
                    // Roll dimensions are in centimeters from ACF, convert to square meters
                    var rollArea = (rollWidth / 100) * (rollLength / 100);
                    if (rollArea < 1) rollArea = 1;
                    
                    // Add 5% margin
                    var coverage_with_margin = coverage * 1.05;
                    
                    var rollsNeeded = Math.ceil(coverage_with_margin / rollArea);
                    if (rollsNeeded < 1) rollsNeeded = 1;
                    
                    adjustedPrice = basePrice * rollsNeeded;
                    $("#prod_rolls_needed").val(rollsNeeded);
                    
                }
            } else { // SQM or RM
                var width = parseFloat($prodWidth.val()) || 0;
                var height = parseFloat($prodHeight.val()) || 0;
                
                // For RM products, use fixed height
                if ($(".wrap_height").hasClass("wrap_height_rm")) {
                    height = 100;
                }
                
                if (width > 0 && height > 0) {
                    var area = (width / 100) * (height / 100);
                    if (area < 1) area = 1;
                    adjustedPrice = basePrice * area;
                } else if (width > 0) {
                    var runMeter = width / 100;
                    adjustedPrice = basePrice * runMeter;
                }
            }
            
            // Check for minimum price
            var minPrice = parseFloat($('.from_price .woocommerce-Price-amount').text().replace(/[^\d\.]/g, "")) || 0;
            if (minPrice > 0 && adjustedPrice < minPrice) {
                adjustedPrice = minPrice;
            }
            
            
            return adjustedPrice;
        }
        
        // Configuration for loading overlay
        const LOADING_MIN_DURATION = window.LIMES_ADDON_LOADING_DURATION || 1500; // Use global config or default to 1.5 seconds
        let loadingStartTime = null;
        let isLoadingActive = false;
        let hideLoadingTimer = null;
        
        // Loading overlay functions removed - now handled by custom-addon-totals.js
        
        /**
         * Update the product price for addons calculations
         */
        let updateTimer = null;
        let lastUpdateTime = 0;
        function updateProductPriceForAddons() {
            // Delegate to central controller if available
            if (window.LimesCalculationController) {
                window.LimesCalculationController.scheduleCalculation('addons-integration', 50);
                return;
            }
            
            // Fallback only if controller not available
            console.warn('Calculation controller not available, using fallback');
            
            // Prevent too frequent calls - minimum 300ms between updates
            const now = Date.now();
            if (now - lastUpdateTime < 300) {
                console.log('Skipping product-addons-integration update - too frequent');
                return;
            }
            
            // Clear any pending updates
            if (updateTimer) {
                clearTimeout(updateTimer);
            }
            
            // Longer delay to prevent loops
            updateTimer = setTimeout(function() {
                lastUpdateTime = Date.now();
                
                // Calculate the dimensional price
                var dimensionalPrice = calculateDimensionalPrice();
                
                // Update custom addon totals if available
                if (window.LimesCustomAddonTotals && typeof window.LimesCustomAddonTotals.calculate === 'function') {
                    window.LimesCustomAddonTotals.calculate();
                }
            }, 200);
        }
        
        // Register with central controller if available
        if (window.LimesCalculationController) {
            window.LimesCalculationController.register(function(result, source) {
                // This module can react to calculation results if needed
                console.log('Addons integration notified of calculation:', result);
            });
            // Don't bind duplicate event listeners - controller handles everything
        } else {
            // Fallback to original event binding if controller not available
            // Event listeners for dimension fields
            if ($prodWidth.length > 0) {
                $prodWidth.on('input change blur', function() {
                    updateProductPriceForAddons();
                });
            }
            
            if ($prodHeight.length > 0) {
                $prodHeight.on('input change blur', function() {
                    updateProductPriceForAddons();
                });
            }
            
            if ($prodCoverage.length > 0) {
                $prodCoverage.on('input change blur', function() {
                    updateProductPriceForAddons();
                });
            }
            
            // Listen for variation changes
            $cartForm.on('found_variation reset_data', function() {
                // Don't show loading here - let updateProductPriceForAddons decide
                setTimeout(updateProductPriceForAddons, 100);
            });
            
            // Listen for addon changes
            $(document).on('change', '.wc-pao-addon-field', function() {
                updateProductPriceForAddons();
            });
        }
        
        // Remove these loading triggers - they fire before all fields are complete
        // The loading will be handled by updateProductPriceForAddons when appropriate
        
        // DISABLED: Override that causes update loops
        // Now using custom-addon-totals.js for display
        /*
        if (typeof window.wc_pao_update_totals === 'function') {
            // Let WooCommerce handle its own updates
            // Our custom totals will update separately
        }
        */
        
        // REMOVED: Redundant add-to-cart click handler that was causing performance issues
        // Validation is now handled by:
        // 1. Progressive field control (progressive-field-control.js) 
        // 2. WooCommerce validation fix (woocommerce-validation-fix.js)
        // 3. Server-side validation (woo-product-page.php)
        // Price calculations are handled by the debounced system in main.js
        
        // ensureAddonTotalsVisible and createInitialAddonTotals functions removed - now handled by custom-addon-totals.js
        
        /**
         * Ensure addon container exists for all products
         */
        function ensureAddonContainerForAllProducts() {
            // Check if the addon container exists
            if ($('.wc-pao-addons-container').length === 0) {
                
                // Get product information
                const productName = $('h1.product-title').text().trim() || $('.product_title').text().trim();
                let productPrice = calculateDimensionalPrice();
                
                // For roll products without coverage entered yet, show placeholder
                const isRollProduct = $prodCoverage.length > 0;
                const coverageEntered = parseFloat($prodCoverage.val()) > 0;
                
                // Check if this product has actual addons
                const hasAddons = $('.wc-pao-addon-field').length > 0;
                
                // Create the container structure - hide it initially for products without addons
                let priceDisplay;
                if (isRollProduct && !coverageEntered) {
                    priceDisplay = '<span class="calculating-price">מחשב...</span>';
                } else {
                    // Sanity check - if price is suspiciously high, show placeholder
                    if (productPrice > 10000) {
                        priceDisplay = '<span class="calculating-price">מחשב...</span>';
                    } else {
                        priceDisplay = `${productPrice.toFixed(2)} <span class="woocommerce-Price-currencySymbol">₪</span>`;
                    }
                }
                
                // DISABLED: Creating product-addons-total div
                // Now handled by custom-addon-totals.js
                const containerHtml = `
                    <div class="wc-pao-addons-container" ${!hasAddons ? 'style="display: none;"' : ''}>
                        <!-- Addon content handled by WooCommerce -->
                    </div>
                `;
                
                // Find the best place to insert it
                let inserted = false;
                
                // Insert after the variations button container
                const $variationsButton = $('.woocommerce-variation-add-to-cart').first();
                if ($variationsButton.length) {
                    $variationsButton.after(containerHtml);
                    inserted = true;
                }
                
                // If not found, try after the single_variation_wrap
                if (!inserted) {
                    const $variationWrap = $('.single_variation_wrap').first();
                    if ($variationWrap.length) {
                        // Insert inside the variation wrap, after the variation content
                        $variationWrap.append(containerHtml);
                        inserted = true;
                    }
                }
                
                // If still not inserted, append to form
                if (!inserted) {
                    $cartForm.append(containerHtml);
                }
            }
        }
        
        // Addon totals container creation removed - now handled by custom-addon-totals.js
        
        // Fix wrong addon prices on page load
        fixWrongAddonPrices();
        
        /**
         * Fix wrong addon prices that might be shown initially
         */
        function fixWrongAddonPrices() {
            // Check for suspiciously high prices in addon containers
            $('.product-addon-totals .amount').each(function() {
                const $amount = $(this);
                const priceText = $amount.text().replace(/[^\d\.]/g, '');
                const price = parseFloat(priceText);
                
                // If price is over 10,000, it's likely wrong
                if (price > 10000) {
                    
                    // Replace with placeholder until proper calculation
                    $amount.html('<span class="calculating-price">מחשב...</span>');
                    
                    // Trigger recalculation after a short delay
                    setTimeout(function() {
                        if ($prodCoverage.length > 0 && parseFloat($prodCoverage.val()) > 0) {
                            updateProductPriceForAddons();
                        }
                    }, 500);
                }
            });
        }
        
        /**
         * Clean up duplicate final price labels
         */
        function cleanupDuplicateLabels() {
            // Find all final price labels
            const $labels = $('.always-visible-final-price-label');
            
            // Keep only the one inside the addon container
            $labels.each(function() {
                const $label = $(this);
                if (!$label.closest('.wc-pao-addons-container').length) {
                    $label.remove();
                }
            });
        }
        
        // Clean up any duplicate final price labels
        cleanupDuplicateLabels();
        
        // Watch for addon container visibility changes to clean up loading state
        const addonContainerObserver = new MutationObserver(function(mutations) {
            const $container = $('.wc-pao-addons-container');
            if ($container.length && !$container.is(':visible') && isLoadingActive) {
                // Container was hidden while loading was active, clean up
                isLoadingActive = false;
                if (hideLoadingTimer) {
                    clearTimeout(hideLoadingTimer);
                    hideLoadingTimer = null;
                }
                $('.addon-loading-overlay').hide();
            }
        });
        
        // Observe the form for class changes that affect visibility
        const $form = $('form.cart');
        if ($form.length) {
            addonContainerObserver.observe($form[0], {
                attributes: true,
                attributeFilter: ['class']
            });
        }
        
        // Set up mutation observer to catch dynamically added addon containers
        const addonObserver = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === 1) { // Element node
                            const $node = $(node);
                            
                            // Check if this is an addon container or contains one
                            if ($node.hasClass('wc-pao-addons-container') || $node.find('.wc-pao-addons-container').length > 0) {
                                
                                // Fix wrong prices immediately
                                setTimeout(function() {
                                    fixWrongAddonPrices();
                                    
                                    // If marked as needing fix, recalculate
                                    if ($('.wc-pao-addons-container.needs-price-fix').length > 0) {
                                        updateProductPriceForAddons();
                                    }
                                }, 10);
                            }
                        }
                    });
                }
            });
        });
        
        // Start observing the form for changes
        if ($cartForm.length > 0) {
            addonObserver.observe($cartForm[0], {
                childList: true,
                subtree: true
            });
        }
        
        // Run initial calculation
        setTimeout(updateProductPriceForAddons, 300);
        
        // Also run it whenever the page is fully loaded
        $(window).on('load', function() {
            // Addon totals container creation removed - now handled by custom-addon-totals.js
            
            // For roll products, immediately recalculate to fix any wrong initial prices
            if ($prodCoverage.length > 0) {
                
                // Check if we have an incorrectly high price (like 3780000)
                $('.product-addon-totals .amount').each(function() {
                    var $el = $(this);
                    var currentPrice = parseFloat($el.text().replace(/[^\d\.]/g, "")) || 0;
                    
                    if (currentPrice > 10000) { // Suspiciously high price
                        $el.html('<span class="calculating-price">מחשב...</span>');
                    }
                });
                
                // Force immediate recalculation
                updateProductPriceForAddons();
            }
            
            // Then update it with the calculated price
            setTimeout(updateProductPriceForAddons, 500);
        });
    });
});
