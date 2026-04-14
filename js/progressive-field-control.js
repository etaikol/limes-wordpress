/**
 * Progressive Field Control Module
 * Manages step-by-step field enabling based on user input
 * Preserves existing UI while controlling field accessibility
 */
jQuery(document).ready(function($) {
    window.ProgressiveFieldControl = {
        fieldOrder: [],
        currentStep: 0,
        initialized: false,
        tooltip: null,
        
        // Hebrew messages for field dependencies
        messages: {
            dimensions: {
                width: 'יש להזין רוחב תחילה',
                height: 'יש להזין גובה תחילה',
                coverage: 'יש להזין שטח כיסוי תחילה',
                general: 'יש להזין מידות תחילה'
            },
            color: 'יש לבחור גוון תחילה',
            mechanism: 'יש לבחור צד מנגנון תחילה',
            installation: 'יש לבחור סוג התקנה תחילה',
            addons: 'יש למלא את כל השדות הנדרשים תחילה'
        },
        
        init: function() {
            // Prevent double initialization
            if (this.initialized) return;
            this.initialized = true;
            
            console.log('Progressive Field Control - Initializing...');
            
            // Only run on product pages with dimension fields or variable products
            if (!$('body').hasClass('single-product')) {
                console.log('Progressive Field Control - Not a product page, skipping');
                return;
            }
            
            // Skip simple products without any special fields
            if ($('body').hasClass('product-type-simple') && 
                !$('.wrap_dimensions').length && 
                !$('.wrap_attrs').length && 
                !$('.wrap_mechanism').length) {
                console.log('Progressive Field Control - Simple product without special fields, skipping entirely');
                return;
            }
            
            // Check if we have dimension fields OR if it's a variable product
            var hasDimensionFields = $('.wrap_dimensions').length > 0;
            var isVariableProduct = $('form.cart').hasClass('variations_form');
            var hasColorFields = $('.wrap_attrs').length > 0;
            var hasMechanismFields = $('.wrap_mechanism').length > 0;
            
            console.log('Progressive Field Control - Has dimension fields:', hasDimensionFields);
            console.log('Progressive Field Control - Is variable product:', isVariableProduct);
            console.log('Progressive Field Control - Has color fields:', hasColorFields);
            
            // Only proceed if we have fields that need progressive control
            if (!hasDimensionFields && !hasColorFields && !hasMechanismFields) {
                console.log('Progressive Field Control - No fields requiring progressive control, skipping');
                return;
            }
            
            // Remove any pre-existing disabled-section classes that might interfere
            $('.disabled-section').removeClass('disabled-section');
            
            // Create tooltip element
            this.createTooltip();
            
            // Determine field order based on what exists
            this.detectFieldOrder();
            
            // Set initial state
            this.setInitialState();
            
            // Bind change events
            this.bindEvents();
            
            // Bind hover events for disabled fields
            this.bindHoverEvents();
            
            console.log('Progressive Field Control - Initialization complete');
        },
        
        createTooltip: function() {
            // Create tooltip element if it doesn't exist
            if (!$('#progressive-field-tooltip').length) {
                $('body').append('<div id="progressive-field-tooltip" style="display:none;"></div>');
            }
            this.tooltip = $('#progressive-field-tooltip');
            
            // Add CSS for tooltip
            if (!$('#progressive-tooltip-styles').length) {
                var tooltipStyles = '<style id="progressive-tooltip-styles">' +
                    '#progressive-field-tooltip {' +
                        'position: fixed !important;' +
                        'background: #333 !important;' +
                        'color: #fff !important;' +
                        'padding: 8px 12px !important;' +
                        'border-radius: 4px !important;' +
                        'font-size: 14px !important;' +
                        'z-index: 999999 !important;' +
                        'pointer-events: none !important;' +
                        'white-space: nowrap !important;' +
                        'box-shadow: 0 2px 8px rgba(0,0,0,0.2) !important;' +
                        'font-family: inherit !important;' +
                        'line-height: 1.4 !important;' +
                        'display: none;' +
                    '}' +
                    '#progressive-field-tooltip:after {' +
                        'content: "";' +
                        'position: absolute;' +
                        'top: 100%;' +
                        'left: 50%;' +
                        'margin-left: -5px;' +
                        'border-width: 5px;' +
                        'border-style: solid;' +
                        'border-color: #333 transparent transparent transparent;' +
                    '}' +
                    '#progressive-field-tooltip.tooltip-below:after {' +
                        'top: auto;' +
                        'bottom: 100%;' +
                        'border-color: transparent transparent #333 transparent;' +
                    '}' +
                    '[data-field-state="disabled"] {' +
                        'cursor: not-allowed !important;' +
                    '}' +
                    '[data-field-state="disabled"] input,' +
                    '[data-field-state="disabled"] select,' +
                    '[data-field-state="disabled"] label {' +
                        'cursor: not-allowed !important;' +
                    '}' +
                    '.wrap_attrs[data-field-state="disabled"] {' +
                        'opacity: 0.6;' +
                        'position: relative;' +
                    '}' +
                    '.wrap_attrs[data-field-state="disabled"] .wrap_item {' +
                        'cursor: not-allowed !important;' +
                    '}' +
                    '.wrap_attrs[data-field-state="disabled"] input {' +
                        'cursor: not-allowed !important;' +
                    '}' +
                '</style>';
                $('head').append(tooltipStyles);
            }
        },
        
        detectFieldOrder: function() {
            var self = this;
            
            // Always start with dimensions
            if ($('.wrap_dimensions').length) {
                var dimensionFields = $('#prod_width, #prod_height, #prod_coverage').filter(function() {
                    return $(this).length && $(this).is(':visible');
                });
                
                if (dimensionFields.length > 0) {
                    this.fieldOrder.push({
                        name: 'dimensions',
                        selector: '.wrap_dimensions',
                        fields: dimensionFields,
                        validate: function() {
                            // ROLL type: only coverage field
                            if ($('#prod_coverage').length && $('#prod_coverage').is(':visible')) {
                                var coverage = $('#prod_coverage').val();
                                return coverage && parseFloat(coverage) > 0;
                            }
                            
                            // SQM or RM types: width is always required
                            var widthOk = false;
                            if ($('#prod_width').length && $('#prod_width').is(':visible')) {
                                var widthVal = $('#prod_width').val();
                                widthOk = widthVal && widthVal.trim() !== '' && parseFloat(widthVal) > 0;
                            }
                            
                            // Check if height is also required
                            var heightOk = true; // Default to true in case height isn't needed
                            if ($('#prod_height').length && $('#prod_height').is(':visible') && $('#prod_height').prop('required')) {
                                var heightVal = $('#prod_height').val();
                                heightOk = heightVal && heightVal.trim() !== '' && parseFloat(heightVal) > 0;
                            }
                            
                            // Both width and height must be valid (if required)
                            return widthOk && heightOk;
                        }
                    });
                }
            }
            
            // Add color field to progressive order
            if ($('.wrap_attrs').length) {
                var colorFields = $('input[name="custom_color_selection"]');
                if (colorFields.length > 0) {
                    this.fieldOrder.push({
                        name: 'color',
                        selector: '.wrap_attrs',
                        fields: colorFields,
                        validate: function() {
                            return $('input[name="custom_color_selection"]:checked').length > 0;
                        }
                    });
                }
            }
            
            // Determine product type for mechanism/installation validation
            var productType = $('form.cart').data('product-type') || '';
            var isRollProduct = productType === 'roll' || $('body').hasClass('product-type-roll') || 
                               $('#prod_coverage').length > 0;
            
            // Product type detection for validation logic
            
            // Add mechanism if exists AND is present in DOM (not for roll products)
            if ($('.wrap_mechanism').length && !isRollProduct) {
                var mechanismFields = $('.wrap_mechanism').find('input[type="radio"][name="prod_radio-gr2"]');
                // Only add to validation if mechanism fields actually exist and are visible
                if (mechanismFields.length > 0 && mechanismFields.is(':visible')) {
                    this.fieldOrder.push({
                        name: 'mechanism',
                        selector: '.wrap_mechanism',
                        fields: mechanismFields,
                        validate: function() {
                            return $('input[name="prod_radio-gr2"]:checked').length > 0;
                        }
                    });
                    // Mechanism validation added
                }
            }
            
            // Add installation if exists AND is present in DOM (not for roll products)
            if ($('.wrap_installation').length && !isRollProduct) {
                var installationFields = $('.wrap_installation').find('input[type="radio"][name="prod_radio-gr1"]');
                // Only add to validation if installation fields actually exist and are visible
                if (installationFields.length > 0 && installationFields.is(':visible')) {
                    this.fieldOrder.push({
                        name: 'installation',
                        selector: '.wrap_installation',
                        fields: installationFields,
                        validate: function() {
                            return $('input[name="prod_radio-gr1"]:checked').length > 0;
                        }
                    });
                    // Installation validation added
                }
            }
            
            // Addons are optional, but should only be enabled after required fields
            if ($('.wc-pao-addon-field').length) {
                this.fieldOrder.push({
                    name: 'addons',
                    selector: '.wc-pao-addon',
                    fields: $('.wc-pao-addon-field'),
                    validate: function() { return true; } // Always valid, optional
                });
                // Addons validation added
            }
            
            // Field order initialization complete
            console.log('Progressive Field Control - Field Order:', this.fieldOrder.map(function(f) { 
                return f.name + ' (' + f.fields.length + ' fields)'; 
            }));
            
        },
        
        setInitialState: function() {
            var self = this;
            
            console.log('Progressive Field Control - Setting initial state...');
            
            // First, reset ALL field groups to their default state
            $('.wrap_mechanism, .wrap_installation, .wc-pao-addon, .wrap_attrs').each(function() {
                var $group = $(this);
                // Remove any existing state
                $group.removeAttr('data-field-state');
                // Remove inline styles
                $group.find('label').removeAttr('style').css('cursor', '');
                // Enable all inputs temporarily
                $group.find('input').prop('disabled', false);
            });
            
            // IMPORTANT: Always enable dimension fields - they are the first step
            $('.wrap_dimensions').attr('data-field-state', 'enabled');
            $('.wrap_dimensions').find('input').prop('disabled', false);
            $('.wrap_dimensions').find('label').css('cursor', 'pointer');
            
            // Now disable all field groups except dimensions (first field)
            for (var i = 0; i < this.fieldOrder.length; i++) {
                var group = this.fieldOrder[i];
                console.log('Progressive Field Control - Processing field:', group.name);
                
                // Skip dimensions - they should always be enabled
                if (group.name === 'dimensions') {
                    continue;
                }
                
                // Disable all other fields
                this.disableFieldGroup(group);
            }
            
            // Disable add to cart button initially ONLY if we have fields to validate
            if (this.fieldOrder.length > 0) {
                $('.single_add_to_cart_button, .add_to_cart_trigger_btn')
                    .prop('disabled', true)
                    .addClass('disabled');
            }
            
            // Initialize form variation state
            this.initializeVariationForm();
            
            // Check if dimensions are already filled (e.g., from browser autofill)
            if (this.fieldOrder.length > 0 && this.fieldOrder[0].name === 'dimensions' && this.fieldOrder[0].validate()) {
                this.checkProgress(0);
            }
            
            // Force re-check of all disabled fields to ensure they're properly disabled
            // Also ensure dimensions are enabled
            setTimeout(function() {
                // First ensure dimensions are enabled
                $('.wrap_dimensions').attr('data-field-state', 'enabled');
                $('.wrap_dimensions').find('input').prop('disabled', false);
                $('.wrap_dimensions').find('label').css('cursor', 'pointer');
                
                // Force re-apply the correct state to each field based on our field order
                for (var i = 0; i < self.fieldOrder.length; i++) {
                    var group = self.fieldOrder[i];
                    
                    // Skip dimensions
                    if (group.name === 'dimensions') {
                        continue;
                    }
                    
                    // Check if this field should be enabled based on previous fields
                    var shouldBeEnabled = true;
                    for (var j = 0; j < i; j++) {
                        if (!self.fieldOrder[j].validate()) {
                            shouldBeEnabled = false;
                            break;
                        }
                    }
                    
                    if (shouldBeEnabled) {
                        console.log('Progressive Field Control - Field', group.name, 'should be enabled based on validation');
                        self.enableFieldGroup(group);
                    } else {
                        console.log('Progressive Field Control - Field', group.name, 'should be disabled');
                        self.disableFieldGroup(group);
                    }
                }
            }, 200);
        },
        
        initializeVariationForm: function() {
            var $form = $('form.cart');
            if ($form.hasClass('variations_form')) {
                // Ensure variation form is properly initialized
                var variations = $form.data('product_variations');
                if (!variations) {
                    // Try to get variations from WooCommerce
                    $form.wc_variations_form();
                }
                
                // Set form to bypass variation validation
                $form.data('progressive-controlled', true);
            }
        },
        
        disableFieldGroup: function(group) {
            var self = this;
            
            // Never disable dimensions - they are always the first required step
            if (group.name === 'dimensions') {
                return;
            }
            
            console.log('Progressive Field Control - disableFieldGroup called for:', group.name, group.selector);
            
            // Mark container as disabled first
            $(group.selector).attr('data-field-state', 'disabled');
            
            // Disable all input fields within the group
            $(group.selector).find('input, select').prop('disabled', true);
            
            // Also disable the specific fields in the group
            group.fields.prop('disabled', true);
            
            // For radio/checkbox inputs, prevent label clicks
            $(group.selector).find('label').each(function() {
                var $label = $(this);
                var $input = $label.find('input');
                
                // Remove any existing handlers
                $label.off('click.progressive mousedown.progressive');
                $input.off('click.progressive change.progressive');
                
                // Prevent default radio behavior
                $input.on('click.progressive change.progressive', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    return false;
                });
                
                // Add click handler to label to show tooltip
                $label.on('click.progressive mousedown.progressive', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    var message = self.getRequiredFieldMessage(group.name);
                    self.showTooltip(e, message);
                    return false;
                });
                
                // Set cursor style
                $label.css('cursor', 'not-allowed');
            });
            
            // Add click interceptor for the entire container
            $(group.selector)
                .off('click.progressive')
                .on('click.progressive', function(e) {
                    // Only intercept if clicking on disabled content
                    if (!$(e.target).closest('[data-field-state="enabled"]').length) {
                        e.preventDefault();
                        e.stopPropagation();
                        var message = self.getRequiredFieldMessage(group.name);
                        self.showTooltip(e, message);
                        return false;
                    }
                });
        },
        
        enableFieldGroup: function(group) {
            console.log('Progressive Field Control - enableFieldGroup called for:', group.name, group.selector);
            
            var $container = $(group.selector);
            console.log('Progressive Field Control - Container found:', $container.length > 0);
            
            // Mark container as enabled first
            $container.attr('data-field-state', 'enabled');
            
            // Enable all input fields within the group
            $container.find('input, select').prop('disabled', false);
            
            // Also enable the specific fields in the group
            group.fields.prop('disabled', false);
            
            // Remove all click interceptors
            $container.off('click.progressive mousedown.progressive');
            
            // Remove click interceptors from labels and restore cursor
            $container.find('label').each(function() {
                var $label = $(this);
                var $input = $label.find('input');
                
                // Remove all event handlers
                $label.off('click.progressive mousedown.progressive');
                $input.off('click.progressive change.progressive');
                
                // Restore normal cursor
                $label.css('cursor', 'pointer');
                
                // Remove pointer-events restriction if any
                $label.css('pointer-events', '');
            });
            
            // Force remove disabled attribute from all inputs
            $container.find('input').each(function() {
                $(this).prop('disabled', false).removeAttr('disabled');
            });
            
            console.log('Progressive Field Control - Field', group.name, 'should now be enabled');
            
            // If this is the color field, also enable and sync the hidden select
            if (group.name === 'color') {
                $('#pa_color').prop('disabled', false);
                
                // Also enable custom_color_selection radio buttons
                $('input[name="custom_color_selection"]').prop('disabled', false);
                
                // Sync any existing selection with the select dropdown
                var $checkedRadio = $('input[name="custom_color_selection"]:checked');
                if ($checkedRadio.length) {
                    var radioValue = $checkedRadio.val();
                    var $select = $('#pa_color');
                    if ($select.length) {
                        // Try to find matching option
                        var matchFound = false;
                        $select.find('option').each(function() {
                            if ($(this).val() === radioValue || 
                                decodeURIComponent($(this).val()) === decodeURIComponent(radioValue)) {
                                $select.val($(this).val()).trigger('change');
                                matchFound = true;
                                return false;
                            }
                        });
                        // If no match, trigger change anyway to update variation
                        if (!matchFound) {
                            $select.trigger('change');
                        }
                    }
                }
            }
        },
        
        bindEvents: function() {
            var self = this;
            
            // Bind to each field group
            this.fieldOrder.forEach(function(group, index) {
                // For input fields
                group.fields.on('change input blur', function() {
                    self.checkProgress(index);
                });
                
                // Special handling for radio buttons - bind to all radios in the group
                if (group.fields.is(':radio')) {
                    var radioName = group.fields.attr('name');
                    $(document).on('change', 'input[name="' + radioName + '"]', function() {
                        self.checkProgress(index);
                    });
                }
            });
            
            // Monitor color field changes separately
            $(document).on('change', 'input[name="custom_color_selection"], input[name="attribute_pa_color"], #pa_color', function() {
                // Find the color field index in our field order
                var colorIndex = -1;
                for (var i = 0; i < self.fieldOrder.length; i++) {
                    if (self.fieldOrder[i].name === 'color') {
                        colorIndex = i;
                        break;
                    }
                }
                
                // If we found the color field, trigger checkProgress
                if (colorIndex >= 0) {
                    self.checkProgress(colorIndex);
                }
                
                // Also check if all fields are complete for add to cart button
                var lastValidIndex = -1;
                for (var i = 0; i < self.fieldOrder.length; i++) {
                    if (self.fieldOrder[i].validate()) {
                        lastValidIndex = i;
                    } else {
                        break;
                    }
                }
                
                // Trigger checkProgress to update add to cart button state
                if (lastValidIndex >= 0) {
                    self.checkProgress(lastValidIndex);
                }
            });
        },
        
        bindHoverEvents: function() {
            var self = this;
            
            // Bind hover events for disabled field containers
            $(document).on('mouseenter.progressive', '[data-field-state="disabled"]', function(e) {
                var $fieldGroup = $(this);
                
                // Find which field group this belongs to
                var fieldGroupInfo = null;
                for (var i = 0; i < self.fieldOrder.length; i++) {
                    if ($fieldGroup.is(self.fieldOrder[i].selector)) {
                        fieldGroupInfo = self.fieldOrder[i];
                        break;
                    }
                }
                
                if (fieldGroupInfo) {
                    // Get the appropriate message
                    var message = self.getRequiredFieldMessage(fieldGroupInfo.name);
                    
                    // Show tooltip
                    self.showTooltip(e, message);
                }
            });
            
            // Hide tooltip on mouse leave
            $(document).on('mouseleave.progressive', '[data-field-state="disabled"]', function() {
                self.hideTooltip();
            });
            
            // Update tooltip position on mouse move
            $(document).on('mousemove.progressive', '[data-field-state="disabled"]', function(e) {
                if (self.tooltip && self.tooltip.is(':visible')) {
                    self.updateTooltipPosition(e);
                }
            });
            
            // Also bind to disabled inputs directly for better coverage
            $(document).on('mouseenter.progressive', 'input:disabled, select:disabled', function(e) {
                var $target = $(this);
                var $fieldGroup = $target.closest('[data-field-state="disabled"]');
                
                if ($fieldGroup.length) {
                    $fieldGroup.trigger('mouseenter.progressive');
                }
            });
        },
        
        getRequiredFieldMessage: function(fieldName) {
            // Find what needs to be completed before this field
            var fieldIndex = this.fieldOrder.findIndex(g => g.name === fieldName);
            if (fieldIndex <= 0) return '';
            
            // Check previous fields to find what's incomplete
            for (var i = 0; i < fieldIndex; i++) {
                if (!this.fieldOrder[i].validate()) {
                    var incompleteName = this.fieldOrder[i].name;
                    
                    // Special handling for dimensions
                    if (incompleteName === 'dimensions') {
                        // Check which dimension fields are missing
                        var missingFields = [];
                        
                        if ($('#prod_coverage').length && $('#prod_coverage').is(':visible')) {
                            // Roll type - only coverage
                            if (!$('#prod_coverage').val()) {
                                return this.messages.dimensions.coverage;
                            }
                        } else {
                            // SQM or RM types
                            if ($('#prod_width').length && $('#prod_width').is(':visible') && !$('#prod_width').val()) {
                                missingFields.push('רוחב');
                            }
                            if ($('#prod_height').length && $('#prod_height').is(':visible') && 
                                $('#prod_height').prop('required') && !$('#prod_height').val()) {
                                missingFields.push('גובה');
                            }
                            
                            if (missingFields.length === 2) {
                                return 'יש להזין רוחב וגובה תחילה';
                            } else if (missingFields.includes('רוחב')) {
                                return this.messages.dimensions.width;
                            } else if (missingFields.includes('גובה')) {
                                return this.messages.dimensions.height;
                            }
                        }
                        return this.messages.dimensions.general;
                    }
                    
                    return this.messages[incompleteName] || 'יש למלא את השדה הקודם תחילה';
                }
            }
            
            return 'יש למלא את כל השדות הקודמים';
        },
        
        showTooltip: function(event, message) {
            if (!this.tooltip || !message) return;
            
            this.tooltip.text(message);
            this.tooltip.css('display', 'block');
            this.updateTooltipPosition(event);
        },
        
        hideTooltip: function() {
            if (this.tooltip) {
                this.tooltip.css('display', 'none');
            }
        },
        
        updateTooltipPosition: function(event) {
            if (!this.tooltip || !this.tooltip.is(':visible')) return;
            
            var tooltipWidth = this.tooltip.outerWidth();
            var tooltipHeight = this.tooltip.outerHeight();
            var windowWidth = $(window).width();
            var windowHeight = $(window).height();
            
            // Use client coordinates for fixed positioning
            var left = event.clientX - (tooltipWidth / 2);
            var top = event.clientY - tooltipHeight - 15;
            
            // Adjust if tooltip goes off screen
            if (left < 10) {
                left = 10;
            } else if (left + tooltipWidth > windowWidth - 10) {
                left = windowWidth - tooltipWidth - 10;
            }
            
            // If tooltip would go above viewport, show below cursor
            if (top < 10) {
                top = event.clientY + 15;
                // Adjust arrow position
                this.tooltip.addClass('tooltip-below');
            } else {
                this.tooltip.removeClass('tooltip-below');
            }
            
            this.tooltip.css({
                left: left + 'px',
                top: top + 'px'
            });
        },
        
        checkProgress: function(changedIndex) {
            var self = this;
            
            console.log('Progressive Field Control - checkProgress called for index:', changedIndex);
            
            // Check if current step is valid
            if (changedIndex < this.fieldOrder.length) {
                var currentGroup = this.fieldOrder[changedIndex];
                console.log('Progressive Field Control - Checking field:', currentGroup.name);
                
                var isValid = currentGroup.validate();
                console.log('Progressive Field Control - Field', currentGroup.name, 'is valid:', isValid);
                
                if (isValid) {
                    // Enable next group if exists
                    var nextIndex = changedIndex + 1;
                    if (nextIndex < this.fieldOrder.length) {
                        var nextGroup = this.fieldOrder[nextIndex];
                        console.log('Progressive Field Control - Enabling next field:', nextGroup.name);
                        this.enableFieldGroup(nextGroup);
                    }
                    
                    // Check if all required fields are complete
                    var allComplete = true;
                    
                    // Check all fields including mechanism/installation validation
                    for (var i = 0; i < this.fieldOrder.length; i++) {
                        // Skip addons as they're optional
                        if (this.fieldOrder[i].name === 'addons') continue;
                        
                        // Only validate fields that exist in the DOM
                        if (this.fieldOrder[i].fields.length > 0 && !this.fieldOrder[i].validate()) {
                            allComplete = false;
                            break;
                        }
                    }
                    
                    // Enable/disable add to cart based on completion
                    if (allComplete) {
                        $('.single_add_to_cart_button, .add_to_cart_trigger_btn')
                            .prop('disabled', false)
                            .removeClass('disabled')
                            .removeClass('wc-variation-selection-needed');
                        
                        // Enable all addon fields when all required fields are complete
                        for (var i = 0; i < this.fieldOrder.length; i++) {
                            if (this.fieldOrder[i].name === 'addons') {
                                this.enableFieldGroup(this.fieldOrder[i]);
                                break;
                            }
                        }
                        
                        // For variable products, ensure variation_id is set
                        var $form = $('form.cart');
                        if ($form.hasClass('variations_form')) {
                            var $variationId = $form.find('input[name="variation_id"]');
                            if ($variationId.length && (!$variationId.val() || $variationId.val() === '0')) {
                                // Try to get first available variation
                                var variations = $form.data('product_variations');
                                if (variations && variations.length > 0) {
                                    $variationId.val(variations[0].variation_id);
                                    $form.trigger('found_variation', [variations[0]]);
                                }
                            }
                        }
                    } else {
                        $('.single_add_to_cart_button, .add_to_cart_trigger_btn')
                            .prop('disabled', true)
                            .addClass('disabled');
                    }
                    
                    // Trigger price recalculation
                    if (typeof window.recalcFinalPrice === 'function') {
                        window.recalcFinalPrice();
                    }
                } else {
                    // If current step becomes invalid, disable all following steps
                    for (var i = changedIndex + 1; i < this.fieldOrder.length; i++) {
                        this.disableFieldGroup(this.fieldOrder[i]);
                    }
                    
                    // Disable add to cart
                    $('.single_add_to_cart_button, .add_to_cart_trigger_btn')
                        .prop('disabled', true)
                        .addClass('disabled');
                }
            }
        },
        
        // Helper to check if all required steps are complete
        isComplete: function() {
            for (var i = 0; i < this.fieldOrder.length; i++) {
                if (this.fieldOrder[i].name === 'addons') continue; // Optional
                // Only validate fields that exist in the DOM
                if (this.fieldOrder[i].fields.length > 0 && !this.fieldOrder[i].validate()) {
                    return false;
                }
            }
            return true;
        },
        
        // Get next incomplete step for user guidance
        getNextIncompleteStep: function() {
            for (var i = 0; i < this.fieldOrder.length; i++) {
                if (this.fieldOrder[i].name === 'addons') continue; // Skip optional
                // Only check fields that exist in the DOM
                if (this.fieldOrder[i].fields.length > 0 && !this.fieldOrder[i].validate()) {
                    return this.fieldOrder[i];
                }
            }
            return null;
        }
    };
    
    // Initialize on window load to ensure all other scripts are ready
    $(window).on('load', function() {
        // Longer delay to ensure all other scripts have initialized
        setTimeout(function() {
            // Force initialization
            if (window.ProgressiveFieldControl) {
                // Reset initialized flag to force re-init if needed
                window.ProgressiveFieldControl.initialized = false;
                window.ProgressiveFieldControl.init();
                
                // Force re-apply initial state after a delay in case other scripts modified the DOM
                setTimeout(function() {
                    // Skip for simple products without special fields
                    if ($('body').hasClass('product-type-simple') && 
                        !$('.wrap_dimensions').length && 
                        !$('.wrap_attrs').length && 
                        !$('.wrap_mechanism').length) {
                        return;
                    }
                    
                    if (window.ProgressiveFieldControl && window.ProgressiveFieldControl.initialized) {
                        console.log('Progressive Field Control - Re-applying initial state...');
                        window.ProgressiveFieldControl.setInitialState();
                        
                        // Set up a mutation observer to detect if other scripts are changing our fields
                        var observer = new MutationObserver(function(mutations) {
                            mutations.forEach(function(mutation) {
                                if (mutation.type === 'attributes' && mutation.attributeName === 'data-field-state') {
                                    var $target = $(mutation.target);
                                    var newState = $target.attr('data-field-state');
                                    console.warn('Progressive Field Control - WARNING: External script changed field state of', $target.attr('class'), 'to', newState);
                                }
                            });
                        });
                        
                        // Observe all field containers
                        $('.wrap_mechanism, .wrap_installation, .wc-pao-addon, .wrap_attrs').each(function() {
                            observer.observe(this, { attributes: true, attributeFilter: ['data-field-state'] });
                        });
                    }
                }, 500);
            }
            
            // Override form validation for progressive controlled forms
            $('form.cart').on('submit', function(e) {
                // Skip validation for simple products
                var $form = $(this);
                if (!$form.hasClass('variations_form') && !$form.hasClass('dimensions-required')) {
                    console.log('Progressive Field Control - Simple product form, allowing submission');
                    return true; // Allow normal submission
                }
                
                if (window.ProgressiveFieldControl && window.ProgressiveFieldControl.initialized) {
                    var $button = $(this).find('.single_add_to_cart_button');
                    // If button is enabled by progressive control, allow submission
                    if (!$button.prop('disabled')) {
                        // Ensure we have required hidden fields
                        
                        // Enable all addon fields before submission to ensure they're included
                        
                        // Find all addon checkboxes at once
                        var $allAddonCheckboxes = $form.find('input[type="checkbox"][name*="addon-"]');
                        
                        // Enable all checkboxes in one operation
                        $allAddonCheckboxes.prop('disabled', false).removeAttr('disabled');
                        
                        // Also enable select fields
                        $form.find('.wc-pao-addon-select, select[name*="addon-"]').prop('disabled', false).removeAttr('disabled');
                        
                        // Also ensure addon containers are marked as enabled
                        $form.find('.wc-pao-addon').attr('data-field-state', 'enabled');
                        
                        // Add variation_id if missing for variable products
                        if ($form.hasClass('variations_form')) {
                            var $variationId = $form.find('input[name="variation_id"]');
                            if (!$variationId.length || !$variationId.val() || $variationId.val() === '0') {
                                // Create or set variation_id
                                if (!$variationId.length) {
                                    $form.append('<input type="hidden" name="variation_id" value="">');
                                    $variationId = $form.find('input[name="variation_id"]');
                                }
                                
                                // Set a default variation
                                var variations = $form.data('product_variations');
                                if (variations && variations.length > 0) {
                                    $variationId.val(variations[0].variation_id);
                                } else {
                                    // Force a variation ID to bypass WooCommerce validation
                                    $variationId.val('bypass');
                                }
                            }
                        }
                        
                        return true;
                    }
                }
            });
        }, 100);
    });
    
    // Also add document ready initialization as fallback
    $(document).ready(function() {
        // Check periodically if the form is ready
        var initAttempts = 0;
        var initInterval = setInterval(function() {
            initAttempts++;
            
            // Check if form and fields exist
            if ($('form.cart').length && $('.wrap_attrs').length) {
                // Initialize if not already done
                if (window.ProgressiveFieldControl && !window.ProgressiveFieldControl.initialized) {
                    window.ProgressiveFieldControl.init();
                    clearInterval(initInterval);
                }
            }
            
            // Stop trying after 20 attempts (10 seconds)
            if (initAttempts > 20) {
                clearInterval(initInterval);
            }
        }, 500);
    });
});