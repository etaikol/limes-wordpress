/**
 * Limes — click to preview images in a lightbox with zoom + pan.
 *
 * Triggers:
 *   - Product-loop card images (shop / category / tag)
 *   - Second click on an already-selected color swatch (label in .wrap_attrs) — first click just selects
 *
 * Controls:
 *   - Horizontal zoom slider (100%–400%), ± buttons
 *   - Mouse wheel zooms, drag to pan when zoomed
 *   - Escape closes; + / - keyboard shortcuts while open
 *   - Clicking anywhere outside the image (and outside the zoom bar) closes
 */
(function ($) {
	'use strict';

	var MIN_ZOOM = 100;
	var MAX_ZOOM = 400;
	var ZOOM_STEP = 25;

	var state = {
		zoom: 100,
		panX: 0,
		panY: 0,
		dragging: false,
		startX: 0,
		startY: 0,
		baseX: 0,
		baseY: 0
	};

	var $overlay, $img, $inner, $range, $val;

	function build() {
		if ($overlay && $overlay.length) return;

		$overlay = $(
			'<div id="limes-lightbox" class="limes-lightbox" aria-hidden="true" role="dialog">' +
				'<button type="button" class="limes-lightbox__close" aria-label="סגור">×</button>' +
				'<div class="limes-lightbox__inner">' +
					'<img class="limes-lightbox__img" alt="" draggable="false">' +
				'</div>' +
				'<div class="limes-lightbox__zoombar" role="group" aria-label="שליטת זום">' +
					'<button type="button" class="limes-lightbox__btn limes-lightbox__btn--out" aria-label="הקטן">−</button>' +
					'<input type="range" class="limes-lightbox__range" min="100" max="400" step="5" value="100" aria-label="רמת זום">' +
					'<button type="button" class="limes-lightbox__btn limes-lightbox__btn--in" aria-label="הגדל">+</button>' +
					'<span class="limes-lightbox__val" aria-live="polite">100%</span>' +
				'</div>' +
			'</div>'
		);
		$('body').append($overlay);

		$img = $overlay.find('.limes-lightbox__img');
		$inner = $overlay.find('.limes-lightbox__inner');
		$range = $overlay.find('.limes-lightbox__range');
		$val = $overlay.find('.limes-lightbox__val');

		// Close: any click outside the image / zoombar / × button. Keeps drag-to-pan safe because dragging ends on mouseup, not click.
		$overlay.on('click', function (e) {
			var $t = $(e.target);
			if ($t.closest('.limes-lightbox__img').length) return;
			if ($t.closest('.limes-lightbox__zoombar').length) return;
			close();
		});

		$(document).on('keydown.limeslb', function (e) {
			if (!$overlay.hasClass('is-open')) return;
			if (e.key === 'Escape' || e.keyCode === 27) {
				close();
			} else if (e.key === '+' || e.key === '=') {
				setZoom(state.zoom + ZOOM_STEP);
				e.preventDefault();
			} else if (e.key === '-' || e.key === '_') {
				setZoom(state.zoom - ZOOM_STEP);
				e.preventDefault();
			}
		});

		// Zoom controls
		$range.on('input change', function () {
			setZoom(parseInt(this.value, 10), true);
		});
		$overlay.on('click', '.limes-lightbox__btn--in', function () {
			setZoom(state.zoom + ZOOM_STEP);
		});
		$overlay.on('click', '.limes-lightbox__btn--out', function () {
			setZoom(state.zoom - ZOOM_STEP);
		});

		// Wheel zoom — prevent the page from scrolling behind
		$inner.on('wheel', function (e) {
			e.preventDefault();
			var delta = e.originalEvent.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
			setZoom(state.zoom + delta);
		});

		// Drag-to-pan (only meaningful when zoomed in past 100%)
		$img.on('mousedown', function (e) {
			if (state.zoom <= 100) return;
			state.dragging = true;
			state.startX = e.clientX;
			state.startY = e.clientY;
			state.baseX = state.panX;
			state.baseY = state.panY;
			$img.addClass('is-dragging');
			e.preventDefault();
		});
		$(document).on('mousemove.limeslb', function (e) {
			if (!state.dragging) return;
			state.panX = state.baseX + (e.clientX - state.startX);
			state.panY = state.baseY + (e.clientY - state.startY);
			apply();
		}).on('mouseup.limeslb', function () {
			if (!state.dragging) return;
			state.dragging = false;
			$img.removeClass('is-dragging');
		});

		// Touch-drag for mobile panning
		$img.on('touchstart', function (e) {
			if (state.zoom <= 100) return;
			var t = e.originalEvent.touches[0];
			state.dragging = true;
			state.startX = t.clientX;
			state.startY = t.clientY;
			state.baseX = state.panX;
			state.baseY = state.panY;
		});
		$(document).on('touchmove.limeslb', function (e) {
			if (!state.dragging) return;
			var t = e.originalEvent.touches[0];
			state.panX = state.baseX + (t.clientX - state.startX);
			state.panY = state.baseY + (t.clientY - state.startY);
			apply();
			e.preventDefault();
		}).on('touchend.limeslb', function () {
			state.dragging = false;
		});
	}

	function setZoom(z, fromSlider) {
		z = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
		state.zoom = z;
		if (z <= 100) { state.panX = 0; state.panY = 0; }
		if (!fromSlider) $range.val(z);
		$val.text(z + '%');
		apply();
	}

	function resetZoom() {
		state.panX = 0;
		state.panY = 0;
		setZoom(100);
	}

	function apply() {
		var scale = state.zoom / 100;
		$img.css('transform', 'translate(' + state.panX + 'px, ' + state.panY + 'px) scale(' + scale + ')');
		$img.toggleClass('is-zoomed', state.zoom > 100);
	}

	// Pick the largest candidate out of a srcset, falling back to plain src.
	function bestSrc($el) {
		var src = $el.attr('src') || '';
		var srcset = $el.attr('srcset');
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
		build();
		resetZoom();
		$img.attr('src', src).attr('alt', alt || '');
		$overlay.addClass('is-open').attr('aria-hidden', 'false');
		$('body').addClass('limes-lightbox-open');
	}

	function close() {
		if (!$overlay || !$overlay.length) return;
		$overlay.removeClass('is-open').attr('aria-hidden', 'true');
		$('body').removeClass('limes-lightbox-open');
	}

	// --- Trigger: product-loop card images (shop / category / tag) ---
	$(document).on('click', '.box-product a.image img, ul.products li.product a img', function (e) {
		var $t = $(this);
		e.preventDefault();
		e.stopPropagation();
		open(bestSrc($t), $t.attr('alt'));
	});

	// --- Trigger: click on an already-selected color swatch ---
	// First click selects the variation (default WC behavior). Second click opens lightbox.
	// Covers both the swatch body and its hover tooltip image — only the currently-checked swatch zooms.
	// Handler fires before the radio's default action, so :checked still reflects the pre-click state.
	$(document).on('click', '.wrap_attrs .wrap_item', function (e) {
		var $input = $(this).find('input[type="radio"]').first();
		if (!$input.length || !$input.is(':checked')) return; // unselected: let the label select it
		var $src = $(this).find('.tooltip_img img').first();
		if (!$src.length) $src = $(this).find('.wrap_img img').first();
		if (!$src.length) return;
		e.preventDefault();
		e.stopPropagation();
		open(bestSrc($src), $src.attr('alt'));
	});
})(jQuery);
