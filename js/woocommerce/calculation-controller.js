/**
 * Central Calculation Controller
 * Single source of truth for all price calculations
 */
window.LimesCalculationController = (function($) {
    'use strict';
    
    var instance = null;
    var callbacks = [];
    var isCalculating = false;
    var lastCalculation = null;
    var calculationTimer = null;
    var calculationCache = new Map();
    
    function Controller() {
        this.init = function() {
            // Prevent multiple initializations
            if (instance) return instance;
            instance = this;
            
            // Set up unified event handling
            this.bindEvents();
            return this;
        };
        
        this.bindEvents = function() {
            var self = this;
            
            // Single event handler for ALL dimension changes
            $(document).on('input change', '#prod_width, #prod_height, #prod_coverage', function() {
                self.scheduleCalculation('dimension_change', 50);
            });
            
            // Single event handler for addon changes
            $(document).on('change', '.wc-pao-addon-field', function() {
                self.scheduleCalculation('addon_change', 50);
            });
            
            // Single event handler for variation changes
            $('form.cart').on('found_variation', function(e, variation) {
                self.scheduleCalculation('variation_change', 100, variation);
            });
        };
        
        this.scheduleCalculation = function(source, delay, extraData) {
            // Cancel any pending calculation
            if (calculationTimer) {
                clearTimeout(calculationTimer);
            }
            
            // Schedule new calculation
            calculationTimer = setTimeout(() => {
                this.performCalculation(source, extraData);
            }, delay);
        };
        
        this.performCalculation = function(source, extraData) {
            // Prevent concurrent calculations
            if (isCalculating) return;
            
            isCalculating = true;
            
            // Gather all data once
            var calculationData = this.gatherCalculationData(extraData);
            
            // Check cache first (skip cache for forced recalculation)
            var cacheKey = JSON.stringify(calculationData);
            if (source !== 'forced' && calculationCache.has(cacheKey)) {
                var cachedResult = calculationCache.get(cacheKey);
                this.distributeResults(cachedResult, source);
                isCalculating = false;
                return;
            }
            
            // Perform calculation once
            var result = this.calculate(calculationData);
            
            // Cache result
            calculationCache.set(cacheKey, result);
            if (calculationCache.size > 50) {
                // Remove oldest entry
                var firstKey = calculationCache.keys().next().value;
                calculationCache.delete(firstKey);
            }
            
            // Distribute to all systems
            this.distributeResults(result, source);
            
            isCalculating = false;
        };
        
        this.gatherCalculationData = function(extraData) {
            return {
                width: parseFloat($('#prod_width').val()) || 0,
                height: parseFloat($('#prod_height').val()) || 0,
                coverage: parseFloat($('#prod_coverage').val()) || 0,
                productType: $('#product_type').val() || $('form.cart').data('product-type') || '',
                basePrice: this.getBasePrice(extraData),
                addons: this.getSelectedAddons(),
                variation: extraData || null,
                timestamp: Date.now()
            };
        };
        
        this.getBasePrice = function(variation) {
            if (variation && variation.display_price) {
                return parseFloat(variation.display_price);
            }
            
            var $variationPrice = $('.woocommerce-variation-price .amount').first();
            if ($variationPrice.length && $variationPrice.is(':visible')) {
                return parseFloat($variationPrice.text().replace(/[^\d\.]/g, '')) || 0;
            }
            
            return parseFloat($('#base_price').data('base-price')) || 0;
        };
        
        this.getSelectedAddons = function() {
            var addons = [];
            $('.wc-pao-addon-field:visible').each(function() {
                var $field = $(this);
                if ($field.closest('#limes-custom-addon-totals').length) return;
                
                var value = '';
                var price = 0;
                var priceType = '';
                var label = '';
                
                if ($field.is('select')) {
                    var $selected = $field.find('option:selected');
                    if ($selected.val()) {
                        value = $selected.val();
                        price = parseFloat($selected.data('price')) || 0;
                        priceType = $selected.data('price-type') || 'flat_fee';
                        label = $selected.data('label') || $selected.text().replace(/\([^)]*\)/, '').trim();
                    }
                } else if ($field.is(':checked')) {
                    value = $field.val();
                    price = parseFloat($field.data('price')) || 0;
                    priceType = $field.data('price-type') || 'flat_fee';
                    label = $field.data('label') || $field.next('label').text() || 'תוספת';
                }
                
                if (value) {
                    addons.push({ label, price, priceType, value });
                }
            });
            
            return addons;
        };
        
        this.calculate = function(data) {
            var result = {
                basePrice: data.basePrice,
                dimensionalPrice: data.basePrice,
                addonPrice: 0,
                finalPrice: data.basePrice,
                addons: [],
                calculations: {}
            };
            
            // Calculate dimensional price
            if (data.productType === 'sqm' && data.width > 0 && data.height > 0) {
                var area = (data.width / 100) * (data.height / 100);
                if (area < 1) area = 1;
                result.dimensionalPrice = data.basePrice * area;
                result.calculations.area = area;
            } else if (data.productType === 'rm' && data.width > 0) {
                var meters = data.width / 100;
                result.dimensionalPrice = data.basePrice * meters;
                result.calculations.meters = meters;
            } else if (data.productType === 'roll' && data.coverage > 0) {
                var rollWidth = parseFloat($('#roll_width').val()) || 0;
                var rollLength = parseFloat($('#roll_length').val()) || 0;
                if (rollWidth > 0 && rollLength > 0) {
                    var rollArea = (rollWidth / 100) * (rollLength / 100);
                    var coverageWithMargin = data.coverage * 1.05;
                    var rollsNeeded = Math.ceil(coverageWithMargin / rollArea);
                    result.dimensionalPrice = data.basePrice * rollsNeeded;
                    result.calculations.rollsNeeded = rollsNeeded;
                    $('#prod_rolls_needed').val(rollsNeeded);
                }
            }
            
            // Calculate addon prices
            data.addons.forEach(addon => {
                var addonPrice = 0;
                if (addon.priceType === 'percentage_based') {
                    addonPrice = result.dimensionalPrice * (addon.price / 100);
                } else if (addon.priceType === 'flat_fee') {
                    addonPrice = addon.price;
                }
                
                result.addons.push({
                    label: addon.label,
                    price: addonPrice
                });
                
                result.addonPrice += addonPrice;
            });
            
            // Final price
            result.finalPrice = result.dimensionalPrice + result.addonPrice;
            
            // Check minimum price
            var minPrice = parseFloat($('.from_price .woocommerce-Price-amount').text().replace(/[^\d\.]/g, '')) || 0;
            if (minPrice > 0 && result.finalPrice < minPrice) {
                result.finalPrice = minPrice;
                if (result.addonPrice > 0) {
                    // Adjust dimensional price to meet minimum while keeping addon prices
                    result.dimensionalPrice = minPrice - result.addonPrice;
                } else {
                    // No addons, just use minimum as dimensional price
                    result.dimensionalPrice = minPrice;
                }
            }
            
            return result;
        };
        
        this.distributeResults = function(result, source) {
            // Update hidden fields
            $('input[name="calculated_price"]').val(result.finalPrice);
            $('form.cart').attr('data-price', result.finalPrice);
            
            // Notify all registered systems
            callbacks.forEach(callback => {
                try {
                    callback(result, source);
                } catch (e) {
                    console.error('Calculation callback error:', e);
                }
            });
            
            // Update displays WITHOUT triggering recalculation
            this.updateDisplays(result);
        };
        
        this.updateDisplays = function(result) {
            // Block all mutation observers temporarily
            window.blockMutationObservers = true;
            
            // Update custom addon totals display
            if (window.LimesCustomAddonTotals && window.LimesCustomAddonTotals.updateDisplay) {
                window.LimesCustomAddonTotals.updateDisplay(result);
            }
            
            // Update legacy displays
            if (window.updateAddonDisplay) {
                window.updateAddonDisplay(result.dimensionalPrice, result.addons, result.finalPrice);
            }
            
            // Re-enable mutation observers after a moment
            setTimeout(() => {
                window.blockMutationObservers = false;
            }, 10);
        };
        
        this.register = function(callback) {
            if (typeof callback === 'function') {
                callbacks.push(callback);
            }
        };
        
        this.forceRecalculation = function() {
            calculationCache.clear();
            this.performCalculation('forced');
        };
    }
    
    return new Controller();
})(jQuery);