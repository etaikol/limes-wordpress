/**
 * Limes — click product-card image to preview in a lightbox.
 * Scope: product loops only (ul.products li.product). Title/price/button still navigate to the product.
 */
(function ($) {
	'use strict';

	function ensureOverlay() {
		var $ov = $('#limes-lightbox');
		if ($ov.length) return $ov;

		$ov = $(
			'<div id="limes-lightbox" class="limes-lightbox" aria-hidden="true" role="dialog">' +
				'<button type="button" class="limes-lightbox__close" aria-label="סגור">×</button>' +
				'<div class="limes-lightbox__inner">' +
					'<img class="limes-lightbox__img" alt="">' +
				'</div>' +
			'</div>'
		);
		$('body').append($ov);

		$ov.on('click', function (e) {
			if (e.target === this || $(e.target).hasClass('limes-lightbox__inner')) {
				close();
			}
		});
		$ov.on('click', '.limes-lightbox__close', close);
		$(document).on('keydown.limeslb', function (e) {
			if (e.key === 'Escape' || e.keyCode === 27) close();
		});

		return $ov;
	}

	function bestSrc($img) {
		var src = $img.attr('src') || '';
		var srcset = $img.attr('srcset');
		if (!srcset) return src;
		var best = 0;
		var chosen = src;
		srcset.split(',').forEach(function (part) {
			var m = part.trim().match(/(\S+)\s+(\d+)w/);
			if (m) {
				var w = parseInt(m[2], 10);
				if (w > best) { best = w; chosen = m[1]; }
			}
		});
		return chosen;
	}

	function open(src, alt) {
		var $ov = ensureOverlay();
		$ov.find('.limes-lightbox__img').attr('src', src).attr('alt', alt || '');
		$ov.addClass('is-open').attr('aria-hidden', 'false');
		$('body').addClass('limes-lightbox-open');
	}

	function close() {
		var $ov = $('#limes-lightbox');
		if (!$ov.length) return;
		$ov.removeClass('is-open').attr('aria-hidden', 'true');
		$('body').removeClass('limes-lightbox-open');
	}

	$(document).on('click', 'ul.products li.product a img', function (e) {
		var $img = $(this);
		e.preventDefault();
		e.stopPropagation();
		open(bestSrc($img), $img.attr('alt'));
	});
})(jQuery);
