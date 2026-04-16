/**
 * Addon Section Controller (Safe Version)
 * Controls addon totals updates based on required field validation
 * WITHOUT hiding the addon section
 * 
 * @package Limes
 */

(function($) {
    'use strict';

    // Configuration
    const config = {
        selectors: {
            addonSection: '.universal-addon-section, #product-addons-total, .wc-pao-addons-container',
            colorAttribute: 'input[name="attribute_pa_color"]',
            mechanismRadio: 'input[name="prod_radio-gr2"]',
            installationRadio: 'input[name="prod_radio-gr1"]',
            variationForm: '.single_variation_wrap',
            form: 'form.cart',
            // Add dimension field selectors
            widthField: '#prod_width',
            heightField: '#prod_height',
            coverageField: '#prod_coverage'
        },
        classes: {
            sectionVisible: 'addon-section-visible',
            fieldsComplete: 'required-fields-complete'
        }
    };

    /**
     * Initialize the addon section controller
     */
    function init() {
        bindEvents();
        checkFieldsAndUpdateTotals();
        
    }

    /**
     * Bind events to form fields
     */
    function bindEvents() {
        const $form = $(config.selectors.form);
        
        // Listen for changes on required fields
        $form.on('change', config.selectors.colorAttribute, handleFieldChange);
        $form.on('change', 'select[name="attribute_pa_color"]', handleFieldChange);
        $form.on('change', config.selectors.mechanismRadio, handleFieldChange);
        $form.on('change', config.selectors.installationRadio, handleFieldChange);
        
        // Add dimension field listeners
        $form.on('input change blur', config.selectors.widthField, handleDimensionChange);
        $form.on('input change blur', config.selectors.heightField, handleDimensionChange);
        $form.on('input change blur', config.selectors.coverageField, handleDimensionChange);
        
        // Listen for variation changes
        $form.on('found_variation reset_data', handleVariationChange);
        
        // Listen for addon changes
        $(document).on('change', '.wc-pao-addon-field', handleAddonChange);
        
        // Initial check after DOM is ready
        $(document).ready(function() {
            setTimeout(checkFieldsAndUpdateTotals, 500);
        });
    }

    /**
     * Handle field changes
     */
    function handleFieldChange() {
        setTimeout(checkFieldsAndUpdateTotals, 100);
    }

    /**
     * Handle variation changes
     */
    function handleVariationChange() {
        setTimeout(checkFieldsAndUpdateTotals, 200);
    }

    /**
     * Handle addon changes
     */
    function handleAddonChange() {
        if (areRequiredFieldsComplete()) {
            setTimeout(updateAddonTotals, 100);
        }
    }

    /**
     * Handle dimension field changes
     */
    function handleDimensionChange() {
        setTimeout(checkFieldsAndUpdateTotals, 100);
    }

    /**
     * Check if dimension fields are valid
     * @returns {boolean} True if dimensions are properly filled
     */
    function areDimensionsValid() {
        // If progressive field control is active, use its validation
        if (window.ProgressiveFieldControl && window.ProgressiveFieldControl.initialized) {
            const dimensionGroup = window.ProgressiveFieldControl.fieldOrder.find(g => g.name === 'dimensions');
            return dimensionGroup ? dimensionGroup.validate() : true;
        }
        
        // Fallback: original validation logic
        const $widthField = $(config.selectors.widthField);
        const $heightField = $(config.selectors.heightField);
        const $coverageField = $(config.selectors.coverageField);
        
        // Roll type product
        if ($coverageField.length > 0) {
            const coverageVal = $coverageField.val();
            return coverageVal && coverageVal.trim() !== '';
        }
        
        // SQM or RM type product
        if ($widthField.length > 0) {
            const widthVal = $widthField.val();
            if (!widthVal || widthVal.trim() === '') {
                return false;
            }
            
            // For SQM, also check height
            if ($heightField.length > 0 && $heightField.prop('required')) {
                const heightVal = $heightField.val();
                return heightVal && heightVal.trim() !== '';
            }
            
            return true;
        }
        
        return false;
    }

    /**
     * Check if all required fields are complete
     * @returns {boolean} True if all required fields are selected
     */
    function areRequiredFieldsComplete() {
        // If progressive field control is active, delegate to it
        if (window.ProgressiveFieldControl && window.ProgressiveFieldControl.initialized) {
            return window.ProgressiveFieldControl.isComplete();
        }
        
        // Check dimensions
        const hasDimensions = $(config.selectors.widthField).length > 0 || 
                             $(config.selectors.heightField).length > 0 || 
                             $(config.selectors.coverageField).length > 0;
        
        if (hasDimensions && !areDimensionsValid()) {
            return false;
        }
        
        // Check other required fields
        const hasColorField = $(config.selectors.colorAttribute).length > 0 || $('select[name="attribute_pa_color"]').length > 0;
        const hasMechanismField = $(config.selectors.mechanismRadio).length > 0;
        const hasInstallationField = $(config.selectors.installationRadio).length > 0;
        
        if (hasColorField) {
            const colorRadio = $(config.selectors.colorAttribute + ':checked').length > 0;
            const colorSelect = $('select[name="attribute_pa_color"]').val() !== '';
            if (!colorRadio && !colorSelect) return false;
        }
        
        if (hasMechanismField && $(config.selectors.mechanismRadio + ':checked').length === 0) {
            return false;
        }
        
        if (hasInstallationField && $(config.selectors.installationRadio + ':checked').length === 0) {
            return false;
        }
        
        return true;
    }

    /**
     * Check fields and update totals (WITHOUT hiding addon section)
     */
    function checkFieldsAndUpdateTotals() {
        const fieldsComplete = areRequiredFieldsComplete();
        const $form = $(config.selectors.form);
        const $addonSection = $(config.selectors.addonSection);
        
        // Always ensure addon section is visible
        $addonSection.show();
        
        if (fieldsComplete) {
            $form.addClass(config.classes.sectionVisible);
            $form.addClass(config.classes.fieldsComplete);
            
            // Update addon totals
            updateAddonTotals();
            
        } else {
            $form.removeClass(config.classes.fieldsComplete);
            
        }
    }

    /**
     * Update addon totals display
     */
    function updateAddonTotals() {
        // Only trigger custom addon totals to avoid loops with product-addons-integration.js
        if (window.LimesCustomAddonTotals && typeof window.LimesCustomAddonTotals.calculate === 'function') {
            window.LimesCustomAddonTotals.calculate();
        }
        
        // DISABLED: These calls create loops with product-addons-integration.js
        // Let custom-addon-totals.js handle all calculations
        
        // Ensure addon totals container is visible
        if (window.AddonTotalsFix && typeof window.AddonTotalsFix.ensureContainer === 'function') {
            window.AddonTotalsFix.ensureContainer();
        }
    }

    /**
     * Public API
     */
    window.LimesAddonController = {
        init: init,
        checkFields: checkFieldsAndUpdateTotals,
        areFieldsComplete: areRequiredFieldsComplete,
        updateTotals: updateAddonTotals
    };

    // Auto-initialize when DOM is ready
    $(document).ready(function() {
        setTimeout(init, 100);
    });

})(jQuery);