/**
 * Checkout validation presentation.
 *
 * WooCommerce already creates inline field errors and exposes each server
 * error's field id. This mirrors that state onto the existing form row,
 * removes the duplicated page-level summary, and focuses the first error.
 */
(function ($) {
  'use strict';

  function fieldRow(fieldId) {
    if (!fieldId) return $();

    var safeId = window.CSS && window.CSS.escape
      ? window.CSS.escape(fieldId)
      : fieldId.replace(/([^a-zA-Z0-9_-])/g, '\\$1');
    var $row = $('#' + safeId + '_field');

    if (!$row.length) {
      $row = $('#' + safeId).closest('.form-row');
    }

    return $row;
  }

  function markSummaryFieldsInvalid() {
    $('.woocommerce-NoticeGroup-checkout').each(function () {
      var $noticeGroup = $(this);

      $noticeGroup.find('.woocommerce-error li[data-id]').each(function () {
        var $row = fieldRow($(this).attr('data-id'));

        if (!$row.length) return;

        $row
          .removeClass('woocommerce-validated')
          .addClass('woocommerce-invalid woocommerce-invalid-required-field');
      });

      $noticeGroup.remove();
    });

    // WooCommerce 10.x already renders these messages beside the existing
    // controls. Mirror their state onto the row for consistent label styling.
    $('form.woocommerce-checkout .checkout-inline-error-message').each(function () {
      $(this)
        .closest('.form-row')
        .removeClass('woocommerce-validated')
        .addClass('woocommerce-invalid woocommerce-invalid-required-field');
    });
  }

  function syncField($row) {
    var $control = $row.find('input:not([type="hidden"]), select, textarea').first();
    if (!$control.length) return;

    var isInvalid = $row.hasClass('woocommerce-invalid');
    $control.attr('aria-invalid', isInvalid ? 'true' : 'false');

    var $error = $row.find('.checkout-inline-error-message, .woocommerce-error').first();
    var controlId = $control.attr('id');
    if (!controlId) return;

    var errorId = $error.attr('id') || controlId + '_error';
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

    // WooCommerce already renders the field messages beside the existing
    // controls. Mark those rows and remove only the duplicated top wall.
    markSummaryFieldsInvalid();

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
