/**
 * Limes Side Cart Drawer + Toast notification
 */
(function ($) {
  'use strict';

  var $drawer, $overlay, $toast, $body;
  var toastTimer;

  /* ---- Toast ---- */
  function showToast(msg) {
    if (!$toast.length) return;
    $toast.find('.limes-toast__text').text(msg || 'נוסף לסל הקניות');
    $toast.addClass('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      $toast.removeClass('is-visible');
    }, 3000);
  }

  /* ---- Drawer ---- */
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
    $toast   = $('#limes-toast');
    $body    = $('body');

    if (!$drawer.length) return;

    // Cart icon click → open drawer instead of navigating
    $(document).on('click', 'a.cart-contents', function (e) {
      e.preventDefault();
      openCart();
    });

    // Fired after every successful AJAX add-to-cart (WC + our custom handler)
    $body.on('added_to_cart', function () {
      showToast();
      openCart();
    });

    // Close triggers
    $overlay.on('click', closeCart);
    $drawer.on('click', '.side-cart__close', closeCart);
    $(document).on('keydown', function (e) {
      if (e.key === 'Escape') closeCart();
    });

    // Button links inside drawer navigate normally, close drawer first
    $drawer.on('click', '.woocommerce-mini-cart__buttons a', function () {
      closeCart();
    });
  });

})(jQuery);
