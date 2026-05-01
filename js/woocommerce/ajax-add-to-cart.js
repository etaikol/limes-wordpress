/**
 * AJAX Add to Cart Functionality
 * Optimized for performance
 */
(function($) {
	'use strict';

	// Cache frequently used elements
	var cache = {
		$body: null,
		$form: null,
		$button: null,
		init: function() {
			this.$body = $('body');
			this.$form = $('form.cart');
			this.$button = this.$form.find('.single_add_to_cart_button');
		}
	};

	/**
     * Initialize AJAX add to cart
     */
	function init() {
		if (!$('body').hasClass('single-product')) return;

		cache.init();

		// Intercept form submission
		$(document).on('submit', 'form.cart', handleFormSubmit);
	}

	/**
     * Handle form submission via AJAX
     */
	function handleFormSubmit(e) {
		var $form = $(this);
		var $button = $form.find('.single_add_to_cart_button');

		// Only process if not already processing
		if ($button.hasClass('loading')) {
			e.preventDefault();
			return false;
		}

		// AJAX-ify both variable AND simple products so the side-cart drawer
		// can pop without a full page reload (which would otherwise trigger
		// WC's default brown banner via the URL `?added-to-cart=` param).
		e.preventDefault();

		// Quickly enable all addon fields
		enableAddonFields($form);

		// Perform AJAX submission
		submitViaAjax($form, $button);

		return false;
	}

	/**
     * Enable addon fields efficiently
     */
	function enableAddonFields($form) {
		// Enable all addon fields in one operation
		$form.find('.wc-pao-addon-field, input[name*="addon-"], select[name*="addon-"]')
			.prop('disabled', false)
			.removeAttr('disabled');
	}

	/**
     * Submit form via AJAX
     */
	function submitViaAjax($form, $button) {
		var formData = new FormData($form[0]);

		// Get product ID
		var product_id = $form.find('[name="add-to-cart"]').val() || $form.find('[name="product_id"]').val();

		// Set loading state
		$button.addClass('loading');
		
		// Convert FormData to regular object for serialization
		var data = $form.serialize();
		data += '&add-to-cart=' + product_id;
		
		console.log('Form action:', $form.attr('action'));
		console.log('Form data:', data);

		// Check if wc_ajax_url exists, otherwise use regular admin-ajax
		var ajaxUrl;
		if (wc_add_to_cart_params.wc_ajax_url) {
			ajaxUrl = wc_add_to_cart_params.wc_ajax_url.toString().replace('%%endpoint%%', 'add_to_cart');
		} else {
			ajaxUrl = wc_add_to_cart_params.ajax_url + '?wc-ajax=add_to_cart';
		}
		
		console.log('Using AJAX URL:', ajaxUrl);
		
		// Use WooCommerce's AJAX endpoint
		$.ajax({
			type: 'POST',
			url: ajaxUrl,
			data: data,
			success: function(response) {
				console.log('AJAX response:', response);
				
				// Check if response is already parsed JSON
				if (typeof response === 'object') {
					handleAjaxResponse(response, $form, $button);
				} else {
					// Try to parse JSON from response
					try {
						var jsonResponse = JSON.parse(response);
						handleAjaxResponse(jsonResponse, $form, $button);
					} catch (e) {
						console.error('Could not parse response:', e);
						// If we can't parse it but the cart was updated, refresh page with success parameter
						var currentUrl = window.location.href;
						var separator = currentUrl.indexOf('?') !== -1 ? '&' : '?';
						window.location.href = currentUrl + separator + 'ajax-added-to-cart=1';
					}
				}
			},
			error: function(xhr, status, error) {
				console.error('AJAX error:', status, error);
				console.error('Response Status:', xhr.status);
				
				// If it's a 200 response but parsing failed, the product was likely added
				if (xhr.status === 200) {
					// Refresh page with success parameter
					var currentUrl = window.location.href;
					var separator = currentUrl.indexOf('?') !== -1 ? '&' : '?';
					window.location.href = currentUrl + separator + 'ajax-added-to-cart=1';
				} else {
					handleAjaxError($form, $button);
				}
			},
			complete: function() {
				$button.removeClass('loading');
			}
		});
	}

	/**
     * Handle AJAX response
     */
	function handleAjaxResponse(response, $form, $button) {
		if (response.error && response.product_url) {
			window.location = response.product_url;
			return;
		}

		// Check if product was successfully added
		if (!response.error && response.fragments) {
			// Trigger event for other scripts
			cache.$body.trigger('added_to_cart', [response.fragments, response.cart_hash, $button]);

			// Update cart fragments (this already updates cart count)
			$.each(response.fragments, function(key, value) {
				$(key).replaceWith(value);
			});

			// Show success message only on successful add
			showSuccessMessage();
		}
	}

	/**
     * Handle AJAX error
     */
	function handleAjaxError($form, $button) {
		// Fall back to normal form submission
		$form.off('submit', handleFormSubmit);
		$form.submit();
	}

	/**
     * Show success message — handled by the side-cart drawer in side-cart.js.
     */
	function showSuccessMessage() {
		// Feedback is the drawer opening, triggered via the
		// `added_to_cart` event handler in side-cart.js.
	}

	// Initialize when DOM is ready
	$(document).ready(function() {
		// Only initialize if WooCommerce params are available
		if (typeof wc_add_to_cart_params !== 'undefined') {
			init();
		}
	});

})(jQuery);