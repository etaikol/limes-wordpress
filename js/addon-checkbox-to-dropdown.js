/**
 * Convert checkbox addons to multi-select dropdown
 * Fixed version with proper checkbox synchronization
 */
jQuery(document).ready(function($) {
    
    function convertCheckboxesToDropdown() {
        // Find all checkbox addon groups with display-select class
        $('.wc-pao-addon.display-select.type-checkbox').each(function() {
            var $addonGroup = $(this);
            
            // Skip if already converted
            if ($addonGroup.hasClass('converted-to-dropdown')) {
                return;
            }
            
            // Get addon name
            var addonName = $addonGroup.find('.wc-pao-addon-name').text().trim();
            var addonFieldName = $addonGroup.find('input[type="checkbox"]:first').attr('name');
            
            // Create dropdown wrapper
            var $dropdownWrapper = $('<div class="custom-multi-select-wrapper"></div>');
            
            // Create the display element
            var $dropdownDisplay = $('<div class="custom-multi-select-display">' +
                '<span class="selected-text">בחר ' + addonName + '</span>' +
                '<span class="dropdown-arrow"></span>' +
                '</div>');
            
            // Create options container
            var $optionsContainer = $('<div class="custom-multi-select-options" style="display: none;"></div>');
            
            // Add "select all" option if there are multiple checkboxes
            var checkboxCount = $addonGroup.find('input[type="checkbox"]').length;
            if (checkboxCount > 1) {
                var $selectAllOption = $('<label class="multi-select-option select-all">' +
                    '<input type="checkbox" class="select-all-checkbox"> ' +
                    '<span>בחר הכל</span>' +
                    '</label>');
                $optionsContainer.append($selectAllOption);
                $optionsContainer.append('<div class="option-separator"></div>');
            }
            
            // Create hidden container for original checkboxes
            var $hiddenContainer = $('<div style="display: none;"></div>');
            
            // Convert each checkbox to dropdown option
            $addonGroup.find('p.wc-pao-addon-wrap').each(function() {
                var $wrap = $(this);
                var $checkbox = $wrap.find('input[type="checkbox"]');
                var $label = $wrap.find('label');
                var labelText = $label.text().trim();
                
                // Get checkbox attributes
                var checkboxName = $checkbox.attr('name');
                var checkboxValue = $checkbox.val();
                var checkboxPrice = $checkbox.attr('data-price');
                var checkboxRawPrice = $checkbox.attr('data-raw-price');
                var checkboxPriceType = $checkbox.attr('data-price-type');
                var checkboxLabel = $checkbox.attr('data-label');
                
                // Create option wrapper for dropdown
                var $option = $('<div class="multi-select-option"></div>');
                
                // Create a clone for the dropdown
                var $dropdownCheckbox = $checkbox.clone();
                $dropdownCheckbox.prop('disabled', false).removeAttr('disabled');
                
                var $newLabel = $('<label></label>');
                $newLabel.append($dropdownCheckbox);
                $newLabel.append(' <span>' + labelText + '</span>');
                
                $option.append($newLabel);
                $optionsContainer.append($option);
                
                // Move original checkbox to hidden container
                $hiddenContainer.append($checkbox.detach());
                
                // Remove the original wrapper
                $wrap.remove();
            });
            
            // Add hidden container after the addon group content
            $addonGroup.append($hiddenContainer);
            
            // Assemble the dropdown
            $dropdownWrapper.append($dropdownDisplay);
            $dropdownWrapper.append($optionsContainer);
            
            // Insert after the addon name
            $addonGroup.find('.wc-pao-addon-name').after($dropdownWrapper);
            
            // Mark as converted
            $addonGroup.addClass('converted-to-dropdown');
            
            // Hide duplicate addon title if it exists
            var $container = $addonGroup.closest('.addon-images-container');
            if ($container.length) {
                var $addonTitle = $container.find('> .addon-title').first();
                if ($addonTitle.length && $addonTitle.text().trim() === addonName) {
                    $addonTitle.hide();
                }
            }
            
            // Update selected text
            function updateSelectedText() {
                var selectedOptions = [];
                $optionsContainer.find('input[type="checkbox"]:not(.select-all-checkbox):checked').each(function() {
                    var optionText = $(this).parent().find('span').text();
                    // Remove price from display
                    optionText = optionText.replace(/\s*\([^)]*\)$/, '');
                    selectedOptions.push(optionText);
                });
                
                var displayText = selectedOptions.length > 0 
                    ? selectedOptions.join(', ') 
                    : 'בחר ' + addonName;
                    
                $dropdownDisplay.find('.selected-text').text(displayText);
                
                // Update select all checkbox
                var $selectAll = $optionsContainer.find('.select-all-checkbox');
                if ($selectAll.length) {
                    var totalCheckboxes = $optionsContainer.find('input[type="checkbox"]:not(.select-all-checkbox)').length;
                    var checkedCheckboxes = $optionsContainer.find('input[type="checkbox"]:not(.select-all-checkbox):checked').length;
                    
                    if (checkedCheckboxes === 0) {
                        $selectAll.prop('checked', false);
                        $selectAll.prop('indeterminate', false);
                    } else if (checkedCheckboxes === totalCheckboxes) {
                        $selectAll.prop('checked', true);
                        $selectAll.prop('indeterminate', false);
                    } else {
                        $selectAll.prop('checked', false);
                        $selectAll.prop('indeterminate', true);
                    }
                }
            }
            
            // Handle dropdown toggle
            $dropdownDisplay.on('click', function(e) {
                e.stopPropagation();
                
                // Check if addon group is disabled
                if ($addonGroup.attr('data-field-state') === 'disabled') {
                    return false;
                }
                
                var isOpen = $optionsContainer.is(':visible');
                
                // Close all other dropdowns
                $('.custom-multi-select-options').not($optionsContainer).slideUp(200);
                $('.custom-multi-select-wrapper').not($dropdownWrapper).removeClass('open');
                
                if (!isOpen) {
                    $optionsContainer.slideDown(200);
                    $dropdownWrapper.addClass('open');
                    
                    // Enable interaction with dropdown checkboxes when opened
                    $optionsContainer.find('input[type="checkbox"]').prop('disabled', false);
                    $optionsContainer.find('label').css({
                        'pointer-events': 'auto',
                        'cursor': 'pointer'
                    });
                } else {
                    $optionsContainer.slideUp(200);
                    $dropdownWrapper.removeClass('open');
                }
            });
            
            // Handle checkbox changes in dropdown
            $optionsContainer.on('change', 'input[type="checkbox"]:not(.select-all-checkbox)', function() {
                var $this = $(this);
                var value = $this.val();
                var isChecked = $this.prop('checked');
                
                // Sync with hidden checkbox
                var $hiddenCheckbox = $hiddenContainer.find('input[type="checkbox"][value="' + value + '"]');
                if ($hiddenCheckbox.length) {
                    $hiddenCheckbox.prop('checked', isChecked).prop('disabled', false);
                    console.log('Synced hidden checkbox (type-checkbox):', $hiddenCheckbox.attr('name'), 'to', isChecked);
                    
                    // Trigger change on hidden checkbox
                    $hiddenCheckbox.trigger('change');
                }
                
                // Update the display text
                updateSelectedText();
                
                // Trigger form change for calculations
                $addonGroup.closest('form').trigger('change');
                
                // Also trigger the WooCommerce addon update event
                $(document).trigger('wc-product-addons-update');
            });
            
            // Handle select all
            $optionsContainer.on('change', '.select-all-checkbox', function() {
                var isChecked = $(this).prop('checked');
                
                $optionsContainer.find('input[type="checkbox"]:not(.select-all-checkbox)').each(function() {
                    $(this).prop('checked', isChecked).trigger('change');
                });
            });
            
            // Close dropdown when clicking outside
            $(document).on('click', function(e) {
                if (!$(e.target).closest('.custom-multi-select-wrapper').length) {
                    $optionsContainer.slideUp(200);
                    $dropdownWrapper.removeClass('open');
                }
            });
            
            // Prevent dropdown from closing when clicking inside options
            $optionsContainer.on('click', function(e) {
                e.stopPropagation();
            });
            
            // Initial update
            updateSelectedText();
            
            // Ensure all checkboxes start enabled
            $optionsContainer.find('input[type="checkbox"]').prop('disabled', false).removeAttr('disabled');
            $hiddenContainer.find('input[type="checkbox"]').prop('disabled', false).removeAttr('disabled');
        });
    }
    
    // Function to convert select dropdowns to multi-select with checkboxes
    function convertSelectToMultiSelect() {
        // Find all multiple choice addon groups with display-select
        $('.wc-pao-addon.display-select.type-multiple_choice').each(function() {
            var $addonGroup = $(this);
            
            // Skip if already converted
            if ($addonGroup.hasClass('converted-to-multiselect')) {
                return;
            }
            
            var $select = $addonGroup.find('select.wc-pao-addon-select');
            if (!$select.length) {
                return;
            }
            
            // Get addon name
            var addonName = $addonGroup.find('.wc-pao-addon-name').text().trim();
            var selectName = $select.attr('name');
            
            // Create dropdown wrapper
            var $dropdownWrapper = $('<div class="custom-multi-select-wrapper"></div>');
            
            // Create the display element
            var $dropdownDisplay = $('<div class="custom-multi-select-display">' +
                '<span class="selected-text">בחר ' + addonName + '</span>' +
                '<span class="dropdown-arrow"></span>' +
                '</div>');
            
            // Create options container
            var $optionsContainer = $('<div class="custom-multi-select-options" style="display: none;"></div>');
            
            // Create hidden container for checkboxes
            var $hiddenContainer = $('<div style="display: none;"></div>');
            
            // Add "select all" option if there are multiple options
            var optionCount = $select.find('option').not('[value=""]').length;
            if (optionCount > 1) {
                var $selectAllOption = $('<label class="multi-select-option select-all">' +
                    '<input type="checkbox" class="select-all-checkbox"> ' +
                    '<span>בחר הכל</span>' +
                    '</label>');
                $optionsContainer.append($selectAllOption);
                $optionsContainer.append('<div class="option-separator"></div>');
            }
            
            // Convert each option to checkbox
            $select.find('option').each(function() {
                var $option = $(this);
                var value = $option.val();
                var label = $option.text().trim();
                var price = $option.attr('data-price');
                var rawPrice = $option.attr('data-raw-price');
                var priceType = $option.attr('data-price-type');
                var dataLabel = $option.attr('data-label');
                
                // Skip empty option
                if (!value) {
                    return;
                }
                
                // Create checkbox
                var checkboxName = selectName.replace(/\[?\]?$/, '') + '[]';
                var $checkbox = $('<input type="checkbox" class="wc-pao-addon-field wc-pao-addon-checkbox">')
                    .attr('name', checkboxName)
                    .attr('value', value)
                    .attr('data-price', price)
                    .attr('data-raw-price', rawPrice)
                    .attr('data-price-type', priceType)
                    .attr('data-label', dataLabel || label);
                
                // Create option in dropdown
                var $dropdownOption = $('<div class="multi-select-option"></div>');
                var $label = $('<label></label>');
                var $dropdownCheckbox = $checkbox.clone(); // Clone for dropdown
                
                // Remove disabled attribute from dropdown checkbox
                $dropdownCheckbox.prop('disabled', false).removeAttr('disabled');
                
                $label.append($dropdownCheckbox);
                $label.append(' <span>' + label + '</span>');
                $dropdownOption.append($label);
                $optionsContainer.append($dropdownOption);
                
                // Add original checkbox to hidden container
                $hiddenContainer.append($checkbox);
            });
            
            // Hide original select
            $select.hide();
            
            // Add hidden checkboxes after select
            $select.after($hiddenContainer);
            
            // Assemble the dropdown
            $dropdownWrapper.append($dropdownDisplay);
            $dropdownWrapper.append($optionsContainer);
            
            // Insert after the addon name
            $addonGroup.find('.wc-pao-addon-name').after($dropdownWrapper);
            
            // Mark as converted
            $addonGroup.addClass('converted-to-multiselect');
            
            // Hide duplicate addon title if it exists
            var $container = $addonGroup.closest('.addon-images-container');
            if ($container.length) {
                var $addonTitle = $container.find('> .addon-title').first();
                if ($addonTitle.length && $addonTitle.text().trim() === addonName) {
                    $addonTitle.hide();
                }
            }
            
            // Update selected text
            function updateSelectedText() {
                var selectedOptions = [];
                $optionsContainer.find('input[type="checkbox"]:not(.select-all-checkbox):checked').each(function() {
                    var optionText = $(this).parent().find('span').text();
                    selectedOptions.push(optionText);
                });
                
                var displayText = selectedOptions.length > 0 
                    ? selectedOptions.join(', ') 
                    : 'בחר ' + addonName;
                    
                $dropdownDisplay.find('.selected-text').text(displayText);
                
                // Update select all checkbox
                var $selectAll = $optionsContainer.find('.select-all-checkbox');
                if ($selectAll.length) {
                    var totalCheckboxes = $optionsContainer.find('input[type="checkbox"]:not(.select-all-checkbox)').length;
                    var checkedCheckboxes = $optionsContainer.find('input[type="checkbox"]:not(.select-all-checkbox):checked').length;
                    
                    if (checkedCheckboxes === 0) {
                        $selectAll.prop('checked', false);
                        $selectAll.prop('indeterminate', false);
                    } else if (checkedCheckboxes === totalCheckboxes) {
                        $selectAll.prop('checked', true);
                        $selectAll.prop('indeterminate', false);
                    } else {
                        $selectAll.prop('checked', false);
                        $selectAll.prop('indeterminate', true);
                    }
                }
            }
            
            // Handle dropdown toggle
            $dropdownDisplay.on('click', function(e) {
                e.stopPropagation();
                
                // Check if addon group is disabled
                if ($addonGroup.attr('data-field-state') === 'disabled') {
                    return false;
                }
                
                var isOpen = $optionsContainer.is(':visible');
                
                // Close all other dropdowns
                $('.custom-multi-select-options').not($optionsContainer).slideUp(200);
                $('.custom-multi-select-wrapper').not($dropdownWrapper).removeClass('open');
                
                if (!isOpen) {
                    $optionsContainer.slideDown(200);
                    $dropdownWrapper.addClass('open');
                    
                    // Enable interaction with dropdown checkboxes when opened
                    $optionsContainer.find('input[type="checkbox"]').prop('disabled', false);
                    $optionsContainer.find('label').css({
                        'pointer-events': 'auto',
                        'cursor': 'pointer'
                    });
                } else {
                    $optionsContainer.slideUp(200);
                    $dropdownWrapper.removeClass('open');
                }
            });
            
            // Handle checkbox changes in dropdown
            $optionsContainer.on('change', 'input[type="checkbox"]:not(.select-all-checkbox)', function() {
                var $this = $(this);
                var value = $this.val();
                var isChecked = $this.prop('checked');
                
                // Find the hidden container within the same addon group
                var $hiddenContainer = $addonGroup.find('div[style*="display: none"]').last();
                
                // Sync with hidden checkbox - use attribute selector to handle encoded values
                var $hiddenCheckbox = $hiddenContainer.find('input[type="checkbox"]').filter(function() {
                    return $(this).val() === value || decodeURIComponent($(this).val()) === decodeURIComponent(value);
                });
                
                console.log('Looking for hidden checkbox with value:', value);
                console.log('Found hidden checkboxes:', $hiddenContainer.find('input[type="checkbox"]').length);
                console.log('Matched checkbox:', $hiddenCheckbox.length);
                
                if ($hiddenCheckbox.length) {
                    $hiddenCheckbox.prop('checked', isChecked);
                    // Also ensure it's not disabled
                    $hiddenCheckbox.prop('disabled', false).removeAttr('disabled');
                    console.log('Synced hidden checkbox:', $hiddenCheckbox.attr('name'), 'to', isChecked);
                    
                    // Trigger change event on the original form to update WooCommerce
                    $hiddenCheckbox.trigger('change');
                } else {
                    console.error('Could not find hidden checkbox to sync with value:', value);
                }
                
                // Update display
                updateSelectedText();
                
                // Trigger form change event for price calculations
                $addonGroup.closest('form').trigger('change');
            });
            
            // Handle select all
            $optionsContainer.on('change', '.select-all-checkbox', function() {
                var isChecked = $(this).prop('checked');
                
                $optionsContainer.find('input[type="checkbox"]:not(.select-all-checkbox)').each(function() {
                    $(this).prop('checked', isChecked).trigger('change');
                });
            });
            
            // Close dropdown when clicking outside
            $(document).on('click', function(e) {
                if (!$(e.target).closest('.custom-multi-select-wrapper').length) {
                    $optionsContainer.slideUp(200);
                    $dropdownWrapper.removeClass('open');
                }
            });
            
            // Prevent dropdown from closing when clicking inside options
            $optionsContainer.on('click', function(e) {
                e.stopPropagation();
            });
            
            // Initial update
            updateSelectedText();
            
            // Ensure all checkboxes start enabled
            $optionsContainer.find('input[type="checkbox"]').prop('disabled', false).removeAttr('disabled');
            $hiddenContainer.find('input[type="checkbox"]').prop('disabled', false).removeAttr('disabled');
        });
    }
    
    // Convert on page load
    convertCheckboxesToDropdown();
    convertSelectToMultiSelect();
    
    // Track if we've already synced for this submission
    var isSyncing = false;
    var lastSyncTime = 0;
    var lastSyncState = '';
    
    // Remove any existing submit handlers to prevent duplicates
    $('form.cart').off('submit.addon-sync');
    
    // Ensure hidden checkboxes are synced before form submission
    $('form.cart').on('submit.addon-sync', function(e) {
        var $form = $(this);
        
        // Get current state of checkboxes
        var currentState = '';
        $form.find('.custom-multi-select-options input[type="checkbox"]:checked').each(function() {
            currentState += $(this).val() + ',';
        });
        
        // If state hasn't changed since last sync, skip
        if (currentState === lastSyncState) {
            return true;
        }
        
        // Prevent multiple syncs within 500ms
        var now = Date.now();
        if (isSyncing || (now - lastSyncTime) < 500) {
            return true;
        }
        
        isSyncing = true;
        lastSyncTime = now;
        lastSyncState = currentState;
        
        // Cache the wrappers to avoid repeated DOM queries
        var $wrappers = $form.find('.custom-multi-select-wrapper');
        if ($wrappers.length === 0) {
            isSyncing = false;
            return true;
        }
        
        // For each multi-select dropdown
        $wrappers.each(function() {
            var $wrapper = $(this);
            var $addonGroup = $wrapper.closest('.wc-pao-addon');
            var $hiddenContainer = $addonGroup.find('div[style*="display: none"]').last();
            
            // Skip if no hidden container
            if (!$hiddenContainer.length) {
                return true; // continue to next
            }
            
            // Clear all hidden checkboxes first
            $hiddenContainer.find('input[type="checkbox"]').prop('checked', false);
            
            // Get all checked checkboxes in the visible dropdown
            var $checkedVisible = $wrapper.find('.custom-multi-select-options input[type="checkbox"]:checked:not(.select-all-checkbox)');
            
            $checkedVisible.each(function() {
                var $visibleCheckbox = $(this);
                var value = $visibleCheckbox.val();
                
                // Find and check the corresponding hidden checkbox
                var $hiddenCheckbox = $hiddenContainer.find('input[type="checkbox"]').filter(function() {
                    return $(this).val() === value || decodeURIComponent($(this).val()) === decodeURIComponent(value);
                });
                
                if ($hiddenCheckbox.length) {
                    $hiddenCheckbox.prop('checked', true).prop('disabled', false).removeAttr('disabled');
                }
            });
            
            // Also uncheck any hidden checkboxes that aren't checked in the dropdown
            $hiddenContainer.find('input[type="checkbox"]').each(function() {
                var $hidden = $(this);
                var value = $hidden.val();
                
                // Find if this is checked in the dropdown
                var $visibleCheckbox = $wrapper.find('input[type="checkbox"][value="' + value + '"]');
                if (!$visibleCheckbox.length) {
                    // Try with decoded value
                    $visibleCheckbox = $wrapper.find('input[type="checkbox"]').filter(function() {
                        return $(this).val() === value || decodeURIComponent($(this).val()) === decodeURIComponent(value);
                    });
                }
                
                if ($visibleCheckbox.length && !$visibleCheckbox.is(':checked')) {
                    $hidden.prop('checked', false);
                }
            });
            
            // Remove the final verification logging to reduce console spam
        });
        
        // Reset syncing flag after a short delay
        setTimeout(function() {
            isSyncing = false;
        }, 100);
        
        // Allow form to continue submitting
        return true;
    });
    
    // Re-convert when variation changes (for variable products)
    $(document).on('found_variation', function() {
        setTimeout(function() {
            convertCheckboxesToDropdown();
            convertSelectToMultiSelect();
        }, 100);
    });
    
    // Re-convert after AJAX updates
    $(document).on('wc-product-addons-update', function() {
        setTimeout(function() {
            convertCheckboxesToDropdown();
            convertSelectToMultiSelect();
        }, 100);
    });
    
    // Monitor field state changes from progressive field control
    var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'data-field-state') {
                var $target = $(mutation.target);
                if ($target.hasClass('wc-pao-addon')) {
                    var $dropdown = $target.find('.custom-multi-select-wrapper');
                    var isDisabled = $target.attr('data-field-state') === 'disabled';
                    
                    if ($dropdown.length) {
                        if (isDisabled) {
                            $dropdown.find('.custom-multi-select-display').css('cursor', 'not-allowed');
                            $dropdown.find('.custom-multi-select-options').slideUp(200);
                            $dropdown.removeClass('open');
                            
                            // Keep labels disabled when group is disabled
                            $dropdown.find('label').css({
                                'pointer-events': 'none',
                                'cursor': 'not-allowed'
                            });
                        } else {
                            $dropdown.find('.custom-multi-select-display').css('cursor', 'pointer');
                            
                            // Enable labels when group is enabled
                            $dropdown.find('label').css({
                                'pointer-events': 'auto',
                                'cursor': 'pointer'
                            });
                            
                            // Also enable all checkboxes in the dropdown
                            $dropdown.find('input[type="checkbox"]').prop('disabled', false);
                            
                            // And sync with hidden checkboxes
                            $target.find('input[type="checkbox"][name*="addon-"]').prop('disabled', false);
                        }
                    }
                }
            }
        });
    });
    
    // Start observing addon containers for field state changes
    $('.wc-pao-addon').each(function() {
        observer.observe(this, {
            attributes: true,
            attributeFilter: ['data-field-state']
        });
    });
    
    // Also observe for new addon elements being added
    var containerObserver = new MutationObserver(function(mutations) {
        var needsConversion = false;
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length > 0) {
                $(mutation.addedNodes).each(function() {
                    if ($(this).find('.wc-pao-addon').length > 0 || $(this).hasClass('wc-pao-addon')) {
                        needsConversion = true;
                    }
                });
            }
        });
        if (needsConversion) {
            setTimeout(function() {
                convertCheckboxesToDropdown();
                convertSelectToMultiSelect();
            }, 100);
        }
    });
    
    // Observe the product form for addon changes
    var $productForm = $('form.cart');
    if ($productForm.length) {
        containerObserver.observe($productForm[0], {
            childList: true,
            subtree: true
        });
    }
    
});