/**
 * Checkout validation presentation.
 *
 * WooCommerce already creates inline field errors and marks invalid rows.
 * This removes the duplicated page-level summary, keeps the existing inline
 * messages accessible, and moves focus to the first invalid field.
 */
(function ($) {
  'use strict';

  function syncField($row) {
    var $control = $row.find('input:not([type="hidden"]), select, textarea').first();
    if (!$control.length) return;

    var isInvalid = $row.hasClass('woocommerce-invalid');
    $control.attr('aria-invalid', isInvalid ? 'true' : 'false');

    var $error = $row.find('.woocommerce-error').first();
    var controlId = $control.attr('id');
    if (!controlId) return;

    var errorId = controlId + '_error';
    var describedBy = ($control.attr('aria-describedby') || '').split(/\s+/).filter(Boolean);

    if (!$error.length || !isInvalid) {
      describedBy = describedBy.filter(function (id) {
        return id !== errorId;
      });

      if (describedBy.length) {
        $control.attr('aria-describedby', describedBy.join(' '));
      } else {
        $control.removeAttr('aria-describedby');
      }
      return;
    }

    $error.attr('id', errorId);
    if (describedBy.indexOf(errorId) === -1) describedBy.push(errorId);
    $control.attr('aria-describedby', describedBy.join(' '));
  }

  function syncCheckoutErrors(shouldFocus) {
    var $checkout = $('form.woocommerce-checkout');
    if (!$checkout.length) return;

    // The same field messages already exist beside their controls.
    $('.woocommerce-NoticeGroup-checkout').remove();

    var $invalidRows = $checkout.find('.form-row.woocommerce-invalid');
    $invalidRows.each(function () {
      syncField($(this));
    });

    if (!shouldFocus || !$invalidRows.length) return;

    var $firstControl = $invalidRows.first()
      .find('input:not([type="hidden"]), select, textarea')
      .first();

    if (!$firstControl.length) return;

    var top = Math.max(($firstControl.offset() || { top: 0 }).top - 130, 0);
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion) {
      $('html, body').scrollTop(top);
      $firstControl.trigger('focus');
      return;
    }

    $('html, body').stop(true).animate({ scrollTop: top }, 260).promise().done(function () {
      $firstControl.trigger('focus');
    });
  }

  $(function () {
    syncCheckoutErrors(false);
  });

  $(document.body).on('checkout_error', function () {
    window.setTimeout(function () {
      syncCheckoutErrors(true);
    }, 0);
  });

  $(document).on(
    'input change',
    'form.woocommerce-checkout .form-row input, form.woocommerce-checkout .form-row select, form.woocommerce-checkout .form-row textarea',
    function () {
      var $row = $(this).closest('.form-row');
      window.setTimeout(function () {
        syncField($row);
      }, 0);
    }
  );
})(jQuery);
