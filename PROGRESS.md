# Limes upgrade — progress & backlog

Session state, mission list, and done-log for the Limes upgrade project. **Not auto-loaded into Claude's context** — read this at session start when resuming work, or when asked "what's left".

Active spec: `../שדרוג אתר לימס.pdf`. Branch: `dev`.

---

## Session state (last updated 2026-04-19)

- **Branch:** `dev`. In sync with `origin/dev` — everything through `cdaeff8` is pushed. This iteration's commit will land on top.
- **Recent arc (2026-04-18/19 polish):** `df536bf` (gitignore + CLAUDE.md trim), `f7ba933` (category page description restore), `6b007d5` (lightbox hover overlay + expand icon, no zoom cursor), `fceb436` (lightbox selector fix + logo z-index), `594b9c1` (banner v7 symmetric 27px).
- **Working-tree noise to ignore:** 2 pre-existing vendor file drifts (`vendor/squizlabs/.../InlineHTMLUnitTest.3.inc`, `vendor/wp-coding-standards/.../CommaAfterArrayItemSniff.php`) — unrelated composer drift. `.claude/settings.local.json` is tracked-but-gitignored — harmless.
- **Not yet SFTP-uploaded in full:** 4 files — `css/style.css`, `js/product-card-lightbox.js` (now extended with zoom bar + swatch triggers + click-outside close), `inc/core/enqueue-scripts.php` (loads on product pages too, version bumped `2.0.0 → 2.1.0`), `template-parts/top-inner.php`. After upload: clear WP Rocket cache, hard-reload.
- **Banner verdict:** **A is the winner** (current default). **B is dropped.** **C is parked** as a possible future option. Cleanup task below.
- **Body-zoom hack:** ✅ verified on Etai's + brother's + mom's laptops — `minZoom: 1` works as intended. Stop treating this as "needs verification".

---

## Upgrade mission list

Working backlog ordered by ROI (impact / effort), not PDF order. When an item ships, change `[ ]` → `[x]` and move it to Done with a commit SHA + brief note. This is the single source of truth for "what's left".

### Tier 1 — quick wins (hours each)

- [ ] **Slide-in side-cart on "Add to cart"** — _Impact: Very high · Difficulty: Low–Med_
  PDF spec 1.b. `woocommerce/cart/mini-cart.php` already exists; wire a fragments drawer triggered on the `added_to_cart` JS event. Biggest conversion lever in the whole backlog. **This is the next task to pick up.**
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

### 2026-04-18/19 polish arc

- [x] **Lightbox zoom bar (slider + pan) + UX refinements** — _not yet SFTP'd_ — `js/product-card-lightbox.js` rewritten (enqueued as `v2.1.0`): bottom-center glass pill with `−` / horizontal range slider (100%→400%, step 5) / `+` / live `%` readout. Mouse wheel zooms, keyboard `+` / `-` shortcuts, `Esc` still closes. When zoomed past 100%: drag-to-pan (mouse + touch), cursor flips `grab` → `grabbing`. Image gets `transform-origin: center`; zoom & pan reset on every new open. `.limes-lightbox__inner` is now a fixed `92vw × 82vh` viewport with `overflow: hidden` so the image can overflow during pan without spilling past the backdrop. **Refinements (2026-04-19 feedback):** removed the reset `↺` button (felt useless); click on any backdrop area outside the image / zoom bar / × closes the lightbox (no more "dead inner padding"). CSS block in `css/style.css` under `/* Product card image lightbox */`.
- [x] **Color-swatch lightbox triggers + expand affordance** — _not yet SFTP'd_ — `js/product-card-lightbox.js` now opens the lightbox from two entry points on the product page: (1) click on `.wrap_attrs .tooltip_img` (the hover preview) → opens immediately; (2) **second click on an already-selected swatch** → opens the lightbox (first click still selects the variation via the WC radio). The "second click" handler checks `$input.is(':checked')` before the click's default action fires, so pre-click state is the signal. Both handlers call `preventDefault` + `stopPropagation` to block the wrapping `<label>`'s default radio-select. CSS: `.wrap_attrs .tooltip_img` gets `cursor: zoom-in` and an RTL-aware expand-icon affordance (`::after` with `inset-inline-end`). `inc/core/enqueue-scripts.php` gate extended with `|| is_product()`. No template edits required — works off the existing `.tooltip_img > img` markup in `inc/woo-product-page.php:~284`.
- [x] **Taxonomy description restore** — `f7ba933` — `woocommerce/taxonomy-product_cat.php`: reverted the first-pass over-delete that moved term description below the products. Classic layout preserved, only the oversized "מוצרים בקטגוריה" H2 stays removed. Satisfies PDF spec 2.b.
- [x] **Click product card image → lightbox preview** — `6b007d5` + `fceb436` (selector fix) — New `js/product-card-lightbox.js` (jQuery, delegated click). Enqueued in `inc/core/enqueue-scripts.php` only on `is_shop() || is_product_category() || is_product_tag()`. Selector: `.box-product a.image img, ul.products li.product a img` (Limes uses the custom `.box.box-product > .inner > a.image > img` template via `template_product_box()` in `inc/templates/product-templates.php` — **not** the standard WC loop). Picks largest srcset candidate. Overlay = fixed, 82% black, fade-in; close via × button (top-left), Escape, or click outside. Cursor on image is `pointer` (finger-hand) for affordance. Title/price/"צפה במוצר" button still navigate to product. CSS block in `css/style.css` under `/* Product card image lightbox */`.
- [x] **Banner A v6/v7 — fit to a11y widget** — `594b9c1` + 27px tweak — `.page-head-wrap--modern { margin-top: 10px }`, `.page-head--modern .section-inner { padding: 27px 0 }` (iterated 13 → 40 → 30 → 26 → 27). Brown band now sized so the accessibility icon fits in its vertical range. Breadcrumb strip padding `22px 90px 18px 0` — sits lower, pulled inward from the right edge. Lesson: **symmetric** padding on `.section-inner` keeps the title visually centered.
- [x] **Logo above accessibility widget** — `fceb436` — `header .logo-wrapper { position: relative; z-index: 100000 }` so the round "ליימס" mark covers the square a11y icon where they overlap at top-right.

### Previous session (`d5047c4`)

- [x] **Banner A/B/C/legacy variant switcher** — `template-parts/top-inner.php` with `?banner=a|b|c|legacy`. Default `a` = refined brown banner: `#B29076` with subtle light→dark gradient + `rgba(255,255,255,0.14)` hairline bottom border, grid `1fr auto 1fr` (RTL-start breadcrumb, centered title, empty balancing column), `padding: 30px 0`, 32px/700 title, 14px/500 breadcrumb (`.page-head--modern`). `b` = minimal white strip, same grid, 30px dark title `#2B2723`, muted beige breadcrumb (`.page-head--inline`). `c` = 110px compact strip, uses WC category `thumbnail_id` as bg with dark gradient fallback to `#B29076` (`.page-head--compact`). `legacy` = original 150px banner intact for rollback. CSS in `css/style.css` labeled "Page head — Variant A/B/C". **Verdict (2026-04-19):** A wins, B dropped, C parked for a possible future image-backed hero. See Tier 1 "Banner cleanup" task.
- [x] **Conditional "צד מנגנון" (mechanism side) field — per-category** — New `inc/features/category-mechanism-toggle.php` registers an ACF true/false checkbox (`field_limes_hide_mechanism_side` / name `hide_mechanism_side`, field group "הגדרות קטגוריה — לימס") on every `product_cat` edit screen. Helper `limes_product_hides_mechanism_side($product_id)` returns true if ANY of the product's categories has the flag. Wired in `functions.php` under "Load Feature Files". Render guard wraps `.wrap_mechanism` div in `inc/woo-product-page.php:~299`, adds `mech-hidden` class. Validation guard in dimension-validation (`~877`) skips requiring the radio when hidden — no "נא לבחור צד מנגנון" error fires. CSS: `.wrap_mechanism_installation.mech-hidden .wrap_installation { width: 100%; }` + `:only-child` fallback. Satisfies PDF spec 3.b. **Mom must enable the checkbox on וילון בד (and any fabric-curtain-like category) in wp-admin for it to take effect.** No product-level edits needed. תוספות + בחר גוון untouched.
- [x] **Body-zoom hack neutralized on small desktops** — `header.php:20` — `const minZoom = 0.1` → `const minZoom = 1`. Below-1920 viewports no longer shrink the whole body; >1920 monitors still scale up (original intent preserved). Unlocks pixel-accurate CSS on 1366 / 1440 / 1536 laptops.
