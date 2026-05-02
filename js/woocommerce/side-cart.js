/**
 * Limes Side Cart Drawer
 *
 * Auto-opens on `added_to_cart` (WooCommerce AJAX event).
 * Also opens when the header cart icon is clicked.
 * Closes on: ✕ button, overlay click, or ESC.
 */
(function ($) {
  'use strict';

  var $drawer, $overlay, $body;

  function openCart() {
    $drawer.addClass('is-open');
    $overlay.addClass('is-visible');
    $body.addClass('side-cart-open');
  }

  function closeCart() {
    $drawer.removeClass('is-open');
    $overlay.removeClass('is-visible');
    $body.removeClass('side-cart-open');
  }

  /**
   * If we just landed on the page after a non-AJAX add-to-cart
   * (some product types fall back to a full form submit and a reload),
   * WooCommerce stamps `?added-to-cart=ID` onto the URL. Open the drawer
   * and clean the param so a manual refresh won't re-trigger it.
   */
  function openIfJustAdded() {
    var hasUrlFlag = false;
    var params = new URLSearchParams(window.location.search);
    if (params.has('added-to-cart') || params.has('ajax-added-to-cart')) {
      hasUrlFlag = true;
    }

    var hasSessionFlag = false;
    try {
      hasSessionFlag = sessionStorage.getItem('limes_just_added') === '1';
      if (hasSessionFlag) sessionStorage.removeItem('limes_just_added');
    } catch (e) {}

    if (!hasUrlFlag && !hasSessionFlag) return;

    openCart();

    // Strip the URL param so refresh / share doesn't re-pop the drawer
    if (hasUrlFlag && window.history && window.history.replaceState) {
      params.delete('added-to-cart');
      params.delete('ajax-added-to-cart');
      var qs = params.toString();
      var url = window.location.pathname + (qs ? '?' + qs : '') + window.location.hash;
      window.history.replaceState({}, '', url);
    }
  }

  $(function () {
    $drawer  = $('#limes-side-cart');
    $overlay = $('#limes-side-cart-overlay');
    $body    = $('body');

    if (!$drawer.length) return;

    // Cart icon click → open drawer instead of navigating to /cart/
    $(document).on('click', 'a.cart-contents', function (e) {
      e.preventDefault();
      openCart();
    });

    /**
     * Pre-arm the drawer when the user clicks add-to-cart.
     *
     * Why: on this site some products (notably simple wallpapers with
     * custom addons) bypass our AJAX handler and submit the form normally
     * — full page reload, ~2-3s of waiting before the new page can fire
     * `added_to_cart` and pop the drawer. Setting a sessionStorage flag
     * on click means the moment the new page's DOM is ready we open the
     * drawer instantly, no waiting for fragments to update first.
     *
     * Cleared by the openIfJustAdded check that runs on next page load.
     */
    $(document).on('click', '.single_add_to_cart_button, .add_to_cart_trigger_btn', function () {
      try { sessionStorage.setItem('limes_just_added', '1'); } catch (e) {}
    });

    // Fired after every successful AJAX add-to-cart (WC core + our handler).
    // The drawer popping IS the success confirmation — no toast needed.
    $body.on('added_to_cart', function () {
      openCart();
    });

    // Catches the page-reload fallback for products whose form submit
    // bypasses our AJAX handler (some custom-addon products do this).
    openIfJustAdded();

    // Close triggers
    $overlay.on('click', closeCart);
    $drawer.on('click', '.side-cart__close', closeCart);
    $(document).on('keydown', function (e) {
      if (e.key === 'Escape') closeCart();
    });

    // CTAs inside drawer navigate normally — close the drawer first so
    // the page transition feels clean.
    $drawer.on('click', '.woocommerce-mini-cart__buttons a', function () {
      closeCart();
    });
  });

})(jQuery);
