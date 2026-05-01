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
