# Limes upgrade — progress & backlog

Session state, mission list, and done-log for the Limes upgrade project. **Not auto-loaded into Claude's context** — read this at session start when resuming work, or when asked "what's left".

Active spec: `../שדרוג אתר לימס.pdf`. Branch: `dev`.

---

## Session state (last updated 2026-08-18)

- **Branch:** `dev`. Current local HEAD: `05b4ebc`; the product-image QA fix below is local and uncommitted.
- **Current work (2026-08-18):** removed catalog-card image enlargement and restored full-width, uncropped product images on desktop and mobile (see Done section).
- **Validation completed locally:** `git diff --check` passes; no catalog zoom selectors/handlers remain; fixed gallery widths/heights (`720/620px`, `560/480px`) are gone.
- **Validation limitation:** this machine has no `node` or `php` executable, so JS/PHP parser checks could not run. Browser QA on dev is still required after upload and cache clear.
- **Working tree before this fix:** clean. The five modified files listed by `git status` belong to this task.
- **Older deployment note to verify:** the 2026-04-18/19 session recorded `css/style.css`, `js/product-card-lightbox.js`, and `template-parts/top-inner.php` as still needing SFTP upload; confirm current server state before replaying old uploads.
- **Banner verdict:** **A is the winner** (current default). **B is dropped.** **C is parked** as a possible future option. Cleanup task below.
- **Body-zoom hack:** ✅ verified — `minZoom: 1` works as intended. Stop treating this as "needs verification".

### Upload list for the 2026-08-18 product-image QA fix (SFTP → clear WP Rocket)

1. `js/product-card-lightbox.js` — catalog zoom injection/handlers removed; product-page gallery and swatch lightbox retained
2. `css/style.css` — obsolete catalog magnifier and catalog-only lightbox styles removed
3. `css/edits.css` — gallery restored to full width with proportional, uncropped images (`height: auto`)
4. `inc/core/enqueue-scripts.php` — cache-bust versions: lightbox JS `2.4.0`, edits CSS `1.0.2`

After upload: clear WP Rocket, then complete the Tier 1 product-media QA gate below.

### Previously tracked upload list (2026-04-20; verify deploy status before uploading)

1. `header.php` — drawer + toast HTML added after body open
2. `js/woocommerce/side-cart.js` — new: drawer open/close + toast show/hide
3. `js/woocommerce/ajax-add-to-cart.js` — `showSuccessMessage()` gutted (toast handles it)
4. `js/woocommerce/success-message.js` — removed scroll + notice from `added_to_cart` handler
5. `inc/core/enqueue-scripts.php` — enqueues `side-cart.js` sitewide
6. `inc/woocommerce/woocommerce-integration.php` — `side_cart_fragment` filter registered
7. `css/edits.css` — toast + drawer styles appended

---

## Upgrade mission list

Working backlog ordered by ROI (impact / effort), not PDF order. When an item ships, change `[ ]` → `[x]` and move it to Done with a commit SHA + brief note. This is the single source of truth for "what's left".

### Tier 1 — quick wins (hours each)

- [ ] **Product-media staging QA gate** — _Impact: High · Difficulty: Low_
  After SFTP upload and WP Rocket cache clear, verify: (1) catalog image/card clicks navigate directly to the product page and no magnifier appears; (2) desktop/laptop gallery fills its column without side whitespace; (3) iPhone and Android show the complete product image without crop; (4) Swiper arrows, pagination, swipe, product-page lightbox, zoom/pan, and selected-color swatch lightbox still work. Test at least one landscape, portrait, and square source image.
- [x] **Slide-in side-cart on "Add to cart"** — _committed 2026-04-20, see Done_
- [ ] **Banner cleanup (A wins)** — _Impact: Low · Difficulty: Low_
  `template-parts/top-inner.php`: delete the variant-B branch + its `.page-head--inline` CSS block, hardcode A as default, remove the `?banner=…` query-string switcher. **Keep C's code + `.page-head--compact` CSS block** as a parked option for a future image-backed hero — just unwired from the switcher. Remove `?banner=legacy` rollback once confident.

### Tier 2 — medium effort (1–3 days each)

- [ ] **Cart page visual redesign** — _Impact: Very high · Difficulty: Med_
  PDF spec 1.a. `woocommerce/cart/cart.php` + `cart-totals.php`. Two-column: items left, sticky summary right.
- [ ] **Color swatch → swap main product image** — _Impact: High · Difficulty: Med_
  PDF spec 3.a. `woocommerce/single-product/product-image.php` + small JS.
- [ ] **Below-products gallery on category pages** — _Impact: Med · Difficulty: Med_
  PDF spec 2.a. ACF gallery on `product_cat` taxonomy + template loop in `taxonomy-product_cat.php`.
- [ ] **Simplify shipping to delivery vs self-pickup** — _Impact: High · Difficulty: Med_
  Partial of PDF spec 1.c. Replace the long radio list in `cart-shipping.php`; derive price from a WC shipping zone table keyed on postcode.

### Tier 3 — larger projects (scope before starting)

- [ ] **1-page checkout** — _Impact: Very high · Difficulty: High_
  Do after the cart redesign and simplified shipping are stable. Risk: payment + shipping + validation flows.
- [ ] **Fully dynamic shipping calculator** — _Impact: High · Difficulty: High_
  PDF spec 1.c in full. Matrix of zones × weight/volume. Needs pricing rules from the business owner.
- [ ] **Palette refresh** — _Impact: Med–High · Difficulty: Med_
  Keep `#B29076` as accent, warm backgrounds to ivory, charcoal for body text, single CTA accent. Mock before committing.

---

## Done

### 2026-08-18 — product-image QA fixes

- [x] **Catalog image enlargement removed** — `js/product-card-lightbox.js` no longer injects `.limes-card-zoom` or intercepts catalog images for a preview. The native image link and the whole-card handler both navigate to the product page. Product-page gallery and color-swatch lightbox triggers remain active.
- [x] **Desktop gallery proportions restored** — removed the `720px`/`620px` Swiper caps and fixed `560px`/`480px` image heights from `css/edits.css`; the gallery now fills its product column.
- [x] **Mobile product images uncropped** — the final gallery override now uses `width: 100%`, `height: auto`, and `object-fit: contain`, preventing the later stylesheet from forcing landscape images into a tall cropped frame.
- [x] **Asset cache-busting updated** — `product-card-lightbox.js` bumped to `2.4.0`; `css/edits.css` bumped to `1.0.2`.

### 2026-04-20 — side-cart + toast

- [x] **Slide-in side-cart drawer** — `js/woocommerce/side-cart.js` (new), `header.php` (overlay + `#limes-side-cart` + `#limes-toast` HTML), `inc/woocommerce/woocommerce-integration.php` (`side_cart_fragment` filter keeps content fresh via WC fragments), `inc/core/enqueue-scripts.php` (enqueued sitewide, depends on `wc-cart-fragments`). Slides in from the visual left (inline-end in RTL = where the cart icon lives). `#B29076` brown header bar, thumbnail + name + qty × price per item, subtotal row, filled checkout CTA + outline view-cart link. Opens on `added_to_cart` event and on cart icon click. Overlay click / × / Esc close.
- [x] **3-second add-to-cart toast** — small white pill, `border-top: 3px solid #B29076`, brown ✓ checkmark + "נוסף לסל הקניות" text. Fixed `bottom: 34px; left: 50%` (bottom-center). Fades in on `added_to_cart` event, auto-hides after 3 s. Replaces the old ugly WC banner: `ajax-add-to-cart.js` `showSuccessMessage()` gutted; `success-message.js` scroll + notice handler removed.

### 2026-04-18/19 polish arc

- [x] **Lightbox zoom bar (slider + pan) + UX refinements** — _not yet SFTP'd_ — `js/product-card-lightbox.js` rewritten (enqueued as `v2.1.0`): bottom-center glass pill with `−` / horizontal range slider (100%→400%, step 5) / `+` / live `%` readout. Mouse wheel zooms, keyboard `+` / `-` shortcuts, `Esc` still closes. When zoomed past 100%: drag-to-pan (mouse + touch), cursor flips `grab` → `grabbing`. Image gets `transform-origin: center`; zoom & pan reset on every new open. `.limes-lightbox__inner` is now a fixed `92vw × 82vh` viewport with `overflow: hidden` so the image can overflow during pan without spilling past the backdrop. **Refinements (2026-04-19 feedback):** removed the reset `↺` button (felt useless); click on any backdrop area outside the image / zoom bar / × closes the lightbox (no more "dead inner padding"). CSS block in `css/style.css` under `/* Product card image lightbox */`.
- [x] **Color-swatch lightbox triggers + expand affordance** — _not yet SFTP'd_ — `js/product-card-lightbox.js` now opens the lightbox from two entry points on the product page: (1) click on `.wrap_attrs .tooltip_img` (the hover preview) → opens immediately; (2) **second click on an already-selected swatch** → opens the lightbox (first click still selects the variation via the WC radio). The "second click" handler checks `$input.is(':checked')` before the click's default action fires, so pre-click state is the signal. Both handlers call `preventDefault` + `stopPropagation` to block the wrapping `<label>`'s default radio-select. CSS: `.wrap_attrs .tooltip_img` gets `cursor: zoom-in` and an RTL-aware expand-icon affordance (`::after` with `inset-inline-end`). `inc/core/enqueue-scripts.php` gate extended with `|| is_product()`. No template edits required — works off the existing `.tooltip_img > img` markup in `inc/woo-product-page.php:~284`.
- [x] **Taxonomy description restore** — `f7ba933` — `woocommerce/taxonomy-product_cat.php`: reverted the first-pass over-delete that moved term description below the products. Classic layout preserved, only the oversized "מוצרים בקטגוריה" H2 stays removed. Satisfies PDF spec 2.b.
- [x] **Historical: click product card image → lightbox preview** — `6b007d5` + `fceb436`. **Superseded by the 2026-08-18 QA decision:** catalog image/card clicks now navigate directly to the product page; lightbox zoom remains available inside the product page only.
- [x] **Banner A v6/v7 — fit to a11y widget** — `594b9c1` + 27px tweak — `.page-head-wrap--modern { margin-top: 10px }`, `.page-head--modern .section-inner { padding: 27px 0 }` (iterated 13 → 40 → 30 → 26 → 27). Brown band now sized so the accessibility icon fits in its vertical range. Breadcrumb strip padding `22px 90px 18px 0` — sits lower, pulled inward from the right edge. Lesson: **symmetric** padding on `.section-inner` keeps the title visually centered.
- [x] **Logo above accessibility widget** — `fceb436` — `header .logo-wrapper { position: relative; z-index: 100000 }` so the round "ליימס" mark covers the square a11y icon where they overlap at top-right.

### Previous session (`d5047c4`)

- [x] **Banner A/B/C/legacy variant switcher** — `template-parts/top-inner.php` with `?banner=a|b|c|legacy`. Default `a` = refined brown banner: `#B29076` with subtle light→dark gradient + `rgba(255,255,255,0.14)` hairline bottom border, grid `1fr auto 1fr` (RTL-start breadcrumb, centered title, empty balancing column), `padding: 30px 0`, 32px/700 title, 14px/500 breadcrumb (`.page-head--modern`). `b` = minimal white strip, same grid, 30px dark title `#2B2723`, muted beige breadcrumb (`.page-head--inline`). `c` = 110px compact strip, uses WC category `thumbnail_id` as bg with dark gradient fallback to `#B29076` (`.page-head--compact`). `legacy` = original 150px banner intact for rollback. CSS in `css/style.css` labeled "Page head — Variant A/B/C". **Verdict (2026-04-19):** A wins, B dropped, C parked for a possible future image-backed hero. See Tier 1 "Banner cleanup" task.
- [x] **Conditional "צד מנגנון" (mechanism side) field — per-category** — New `inc/features/category-mechanism-toggle.php` registers an ACF true/false checkbox (`field_limes_hide_mechanism_side` / name `hide_mechanism_side`, field group "הגדרות קטגוריה — לימס") on every `product_cat` edit screen. Helper `limes_product_hides_mechanism_side($product_id)` returns true if ANY of the product's categories has the flag. Wired in `functions.php` under "Load Feature Files". Render guard wraps `.wrap_mechanism` div in `inc/woo-product-page.php:~299`, adds `mech-hidden` class. Validation guard in dimension-validation (`~877`) skips requiring the radio when hidden — no "נא לבחור צד מנגנון" error fires. CSS: `.wrap_mechanism_installation.mech-hidden .wrap_installation { width: 100%; }` + `:only-child` fallback. Satisfies PDF spec 3.b. **Mom must enable the checkbox on וילון בד (and any fabric-curtain-like category) in wp-admin for it to take effect.** No product-level edits needed. תוספות + בחר גוון untouched.
- [x] **Body-zoom hack neutralized on small desktops** — `header.php:20` — `const minZoom = 0.1` → `const minZoom = 1`. Below-1920 viewports no longer shrink the whole body; >1920 monitors still scale up (original intent preserved). Unlocks pixel-accurate CSS on 1366 / 1440 / 1536 laptops.
