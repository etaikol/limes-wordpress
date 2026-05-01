/**
 * Limes — click to preview images in a lightbox with zoom + pan.
 *
 * Triggers:
 *   - Small magnifier button injected over product-loop card images (shop / category / tag)
 *     (the card itself — image, white area, title — navigates to the product page)
 *   - Main product-page gallery image (single-product swiper)
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

	var $overlay, $img, $inner, $range, $val, $viewBtn;
	var currentProductUrl = '';

	function build() {
		if ($overlay && $overlay.length) return;

		$overlay = $(
			'<div id="limes-lightbox" class="limes-lightbox" aria-hidden="true" role="dialog">' +
				'<button type="button" class="limes-lightbox__close" aria-label="סגור">×</button>' +
				'<a class="limes-lightbox__view" href="#" hidden>צפה במוצר</a>' +
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
		$viewBtn = $overlay.find('.limes-lightbox__view');

		// Close: any click outside the image / zoombar / × / view-product button.
		// Keeps drag-to-pan safe because dragging ends on mouseup, not click.
		$overlay.on('click', function (e) {
			var $t = $(e.target);
			if ($t.closest('.limes-lightbox__img').length) return;
			if ($t.closest('.limes-lightbox__zoombar').length) return;
			if ($t.closest('.limes-lightbox__view').length) return;
			close();
		});

		// Click on the enlarged image navigates to the product page when the lightbox was opened
		// from a catalog card. Suppressed while the user is panning (dragging) so we don't hijack
		// their pan gesture as a click. mousedown → track; mouseup → if barely moved, treat as click.
		var downX = 0, downY = 0, downTime = 0;
		$img.on('mousedown', function (e) {
			downX = e.clientX; downY = e.clientY; downTime = Date.now();
		});
		$img.on('click', function (e) {
			if (!currentProductUrl) return;
			var moved = Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY);
			if (moved > 6) return; // drag, not click
			window.location.href = currentProductUrl;
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

	function open(src, alt, productUrl) {
		build();
		resetZoom();
		$img.attr('src', src).attr('alt', alt || '');
		currentProductUrl = productUrl || '';
		if (currentProductUrl) {
			$viewBtn.attr('href', currentProductUrl).removeAttr('hidden');
			$img.addClass('is-navigable');
		} else {
			$viewBtn.attr('hidden', true);
			$img.removeClass('is-navigable');
		}
		$overlay.addClass('is-open').attr('aria-hidden', 'false');
		$('body').addClass('limes-lightbox-open');
	}

	function close() {
		if (!$overlay || !$overlay.length) return;
		$overlay.removeClass('is-open').attr('aria-hidden', 'true');
		$('body').removeClass('limes-lightbox-open');
	}

	// --- Catalog cards: whole-card navigation + small magnifier trigger ---
	// Inject a small magnifying-glass button over each card image. The button opens the lightbox;
	// every other click on the card (image, white area, title, price) routes to the product page.
	function injectCardZoomButtons() {
		$('.box-product .inner').each(function () {
			var $inner = $(this);
			if ($inner.find('.limes-card-zoom').length) return; // already injected
			if (!$inner.find('a.image').length) return;
			var $btn = $(
				'<span class="limes-card-zoom" role="button" tabindex="0" aria-label="הגדל תמונה" title="הגדל תמונה">' +
					'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
						'<circle cx="11" cy="11" r="7"/>' +
						'<line x1="21" y1="21" x2="16.65" y2="16.65"/>' +
						'<line x1="11" y1="8" x2="11" y2="14"/>' +
						'<line x1="8" y1="11" x2="14" y2="11"/>' +
					'</svg>' +
				'</span>'
			);
			$inner.append($btn);
		});
	}
	$(function () {
		injectCardZoomButtons();
		// Product page: strip the legacy `data-fancybox` attribute so the old fancybox plugin
		// doesn't hijack the click — we want our lightbox instead.
		$('section.product .sliders .gallery-top a.swiper-slide').removeAttr('data-fancybox');
	});
	// Category pages sometimes re-render product lists via AJAX filters — re-inject after DOM changes.
	$(document).on('updated_wc_div wc_fragments_refreshed', injectCardZoomButtons);

	// Magnifier click → lightbox (carries the product URL so the lightbox can offer a "צפה במוצר" jump).
	$(document).on('click', '.limes-card-zoom', function (e) {
		e.preventDefault();
		e.stopPropagation();
		var $inner = $(this).closest('.inner');
		var $img = $inner.find('a.image img').first();
		if (!$img.length) return;
		var productUrl = $inner.find('a.image').attr('href') || '';
		open(bestSrc($img), $img.attr('alt'), productUrl);
	});
	$(document).on('keydown', '.limes-card-zoom', function (e) {
		if (e.key !== 'Enter' && e.key !== ' ') return;
		e.preventDefault();
		$(this).trigger('click');
	});

	// Whole-card click → product page. Bail if the user clicked an existing link/button or the magnifier.
	$(document).on('click', '.box-product', function (e) {
		var $t = $(e.target);
		if ($t.closest('a, button, .like, .wpulike, .limes-card-zoom').length) return;
		var href = $(this).find('a.image').attr('href');
		if (href) window.location.href = href;
	});

	// --- Trigger: single-product main gallery image (swiper slide) ---
	// The slide anchor has href pointing to the full-size image (legacy fancybox link) — we intercept
	// and open in the Limes lightbox instead.
	$(document).on('click', 'section.product .sliders .gallery-top a.swiper-slide', function (e) {
		var $img = $(this).find('img').first();
		if (!$img.length) return;
		e.preventDefault();
		e.stopPropagation();
		var fullSrc = $(this).attr('href') || bestSrc($img);
		open(fullSrc, $img.attr('alt'));
	});

	// --- Trigger: click on an already-selected color swatch ---
	// First click selects the variation (default WC behavior). Second click opens lightbox.
	// Timing note: by the time the delegated click handler runs on the label, the browser has
	// already flipped the radio to :checked, so we can't trust :checked inside click. Instead we
	// snapshot the group's previously-checked value on mousedown — before the activation fires —
	// and compare in click. Same logic covers both the swatch body and its hover tooltip image.
	var preSelected = {}; // radio-group name -> value that was checked before the current mousedown
	$(document).on('mousedown', '.wrap_attrs .wrap_item', function () {
		var $input = $(this).find('input[type="radio"]').first();
		if (!$input.length) return;
		var name = $input.attr('name');
		var $checked = $('input[type="radio"][name="' + name + '"]:checked').first();
		preSelected[name] = $checked.length ? $checked.val() : null;
	});
	$(document).on('click', '.wrap_attrs .wrap_item', function (e) {
		var $input = $(this).find('input[type="radio"]').first();
		if (!$input.length) return;
		var name = $input.attr('name');
		if (preSelected[name] !== $input.val()) return; // was not the pre-click selection — let WC select it
		var $src = $(this).find('.tooltip_img img').first();
		if (!$src.length) $src = $(this).find('.wrap_img img').first();
		if (!$src.length) return;
		e.preventDefault();
		e.stopPropagation();
		open(bestSrc($src), $src.attr('alt'));
	});
})(jQuery);
