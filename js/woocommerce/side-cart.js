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
    var params = new URLSearchParams(window.location.search);
    if (!params.has('added-to-cart') && !params.has('ajax-added-to-cart')) return;

    openCart();

    // Strip the param so refresh / share doesn't re-pop the drawer
    if (window.history && window.history.replaceState) {
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
