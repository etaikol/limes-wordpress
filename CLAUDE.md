# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A custom WordPress theme named **Limes** for a Hebrew/RTL WooCommerce store (design business — curtains, seating, home textiles). Built on the Automattic Underscores (_s) starter theme and heavily customized for a single-store use case. Not meant to be reused as a parent theme.

Active upgrade project is scoped in `../שדרוג אתר לימס.pdf` (cart UX, category page, product page). Work happens on the `upload-project` branch.

## Upgrade mission list

This is the working backlog for the current upgrade project, ordered by ROI (impact / effort) rather than by PDF order. Check off items as they ship by changing `[ ]` → `[x]` and adding a brief note + commit SHA. When scope changes, edit this list directly — this is the single source of truth for "what's left".

### Tier 1 — quick wins (hours each)

- [x] **Shrink the brown `top-inner` banner** — _shipped as A/B/legacy variant switcher in `template-parts/top-inner.php` via `?banner=` query param; default `a` is the inline breadcrumb + content-flow H1 (no brown slab). Variant `b` is a 96px strip with WC category-image background. Once mom picks, flip `$default_variant` and delete the losers + their CSS blocks._
- [ ] **Slide-in side-cart on "Add to cart"** — _Impact: Very high · Difficulty: Low–Med_
  PDF spec 1.b. `woocommerce/cart/mini-cart.php` already exists; wire a fragments drawer triggered on the `added_to_cart` JS event. Biggest conversion lever in the whole backlog.
- [x] **Slim the product card on the shop grid** — _On inspection the tile itself was already clean (heart + image + title + price + button, no repeated category or Q&A badges). Real problem was the "בואו להתרשם / מוצרים בקטגוריה" decorative title + long term description pushing products ~400px below the fold. Shipped in `woocommerce/taxonomy-product_cat.php` + `css/style.css`: deleted decorative section-title, moved category description below the product grid as `.section-subtitle--below-products`, added `.leading-products--category` modifier for tight top padding. Satisfies PDF spec 2.b. Grid is already `33.33%` per box (3-per-row) on desktop — no change needed there._
- [x] **Conditional "צד מנגנון" field** — _Scoped per-category per mom. New file `inc/features/category-mechanism-toggle.php` registers an ACF true/false checkbox "הסתר שדה צד מנגנון במוצרי הקטגוריה" on every product_cat edit screen + exposes `limes_product_hides_mechanism_side($product_id)` helper. Render guard wraps `.wrap_mechanism` in `inc/woo-product-page.php:299`; validation guard in the dimension-validation function (same file) skips requiring the radio when hidden. CSS in `css/style.css` gives `.wrap_installation` full width when mechanism is absent. Mom enables it per-category via Products → Categories → edit (e.g. וילון בד). No product-level edits needed._
- [x] **Disable/limit the body-zoom hack on small desktops** — _`header.php:20` — bumped `minZoom` from `0.1` to `1`. Viewports below 1920 no longer shrink; only >1920 monitors still scale up (original intent preserved). Unlocks pixel-accurate CSS on 1366/1440/1536 laptops._

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

### Done

_(Nothing yet. Move completed items here with commit SHA and a one-liner about what actually shipped, e.g. `[x] Banner shrink — 1c26fa3 — padding 35→12px, title 60→32px`. Keeps the active list short.)_

## Deploy + dev loop

There is no build step. PHP/CSS/JS edits upload directly to the dev WordPress via VSCode's SFTP extension.

- **Dev site**: http://limmes-co-il-newdev.s201.upress.link/wp-admin
- **SFTP config**: `.vscode/sftp.json` (this folder = theme root → maps to `/wp-content/themes/limes-wordpress-master/` on the server — note the `-master` suffix from an old GitHub zip extraction; don't rename unless you also update the server)
- **Workflow**: edit locally → right-click file → `SFTP: Upload Active File` → hard-reload the dev URL (Ctrl+F5)
- **`uploadOnSave` is intentionally false** — uploads are manual. Don't enable auto-upload while editing multiple files.

### Cache gotcha

**WP Rocket is active on dev** and will serve stale CSS/JS. After uploading theme assets either:
- Deactivate WP Rocket on dev (Plugins → Deactivate), OR
- WP admin toolbar → WP Rocket → Clear cache after every change

If a CSS change doesn't show up, this is almost always why. Browser hard-reload alone is not enough.

### Viewport zoom hack (read this before touching layout)

`header.php` contains an inline script (lines ~16–167) that applies `document.body.style.zoom` based on viewport width vs. a 1920px base. Any pixel dimension in CSS is effectively multiplied by this zoom factor on desktops smaller than 1920px. Consequences:

- "Shrink this to 50px" doesn't mean 50 real pixels on a 1440 screen — it means ~37px after zoom
- Media queries still fire based on actual viewport, creating a layering confusion
- Below 975px the zoom resets to 1

When diagnosing "my CSS change looks wrong on my laptop but right in the mock", suspect this first.

## Commands

From the theme root (requires Composer):

```bash
composer install              # first time setup
composer run lint:php         # parallel PHP syntax check across the theme
composer run lint:wpcs        # WordPress Coding Standards via PHPCS
composer run make-pot         # regenerate languages/_s.pot for translations
```

There are no unit tests and no JS build pipeline — JS is plain jQuery files in `js/` loaded via `wp_enqueue_script`.

## Architecture

### File loading order (functions.php)

`functions.php` orchestrates everything. The order matters:

1. **Core** (`inc/core/*`) — theme support, enqueues, image sizes, menus, CPTs, taxonomies, utilities, admin
2. **Templates** (`inc/templates/*`) — product/post/blog template helpers
3. **Features** (`inc/features/*`) — e.g. Yoast breadcrumb customizations
4. **WooCommerce** (only if `class_exists('WooCommerce')`) — loaded as:
   - `inc/woo-product-control.php` first (gates downstream behavior)
   - Then the "new modular" `inc/woocommerce/woocommerce-integration.php`
   - Then "legacy" files (`inc/woocommerce.php`, `inc/woo-product-page.php`, `inc/woo-cart-calculations.php`, `inc/woo-simple-product-customization.php`, `inc/woo-final-price-display.php`, `inc/woo-ensure-form-handler.php`) — still active, pending phase-out
5. `functions-loaders.php` / `functions-templates.php` / `functions-woocommerce.php` at the theme root are **empty stubs** kept only so old `require_once` calls don't fatal. Don't add code to them.

### "Legacy vs modular" — the recurring tension

The theme is mid-refactor. There are two overlapping systems for several concerns (especially product customization and cart display). When you touch product addons, cart totals, or price display:

- **Check both** the modular (`inc/woocommerce/*`) and legacy (`inc/woo-*.php`) files — behavior may be set by either
- Files named `woo-simple-product-*` are scar tissue from past fights with WooCommerce Product Add-Ons. `debug`, `form-fix`, `fix-final` in the names = iterative patches. Read them top-to-bottom before changing, they often disable or override each other.
- Safer to add new behavior via the modular system and remove the legacy counterpart, than to edit legacy files in place.

### WooCommerce template overrides

`woocommerce/` at the theme root is the standard WC template override folder — files here replace WooCommerce plugin defaults. Deepest customizations:

- `woocommerce/cart/*` — the cart page (cart.php, cart-totals.php, mini-cart.php, shipping-calculator.php)
- `woocommerce/checkout/*` — form-checkout, form-billing, form-shipping, review-order
- `woocommerce/single-product/*` — product page layout including a custom `product-form/` subfolder
- `woocommerce/content-product.php` — the product card used in shop/category grids

When changing product or cart behavior, the template override in `woocommerce/` is usually the right layer; logic/hook customizations go in `inc/woocommerce/` or the legacy `inc/woo-*.php` files.

### Page chrome

- `header.php` — logo, top nav, mobile menu, cart icon, plus the body-zoom script and GTM/Meta Pixel tags. Header markup is inside `<header class="header-inner">`.
- `template-parts/top-inner.php` — the brown banner with page title + Yoast breadcrumbs on every inner page. Styled in `css/style.css:1461` (section.top-inner, `#B29076`).
- `footer.php` — footer.
- `sidebar.php` — widget area (rarely used on this site).

### Styles

- `style.css` — theme header only (required by WP); actual CSS is in `css/style.css`
- `css/style.css` — the real stylesheet, a long single file organized by section comments (`/* ---- Section X ---- */`). Use Grep for section names rather than scrolling.
- `style-rtl.css` — RTL overrides (the site is Hebrew, `<html dir="rtl">` hard-coded in header.php)
- `woocommerce.css` — WC-specific styles, enqueued separately

### JS

`js/` is a flat folder of jQuery-era scripts enqueued from `inc/core/enqueue-scripts.php`. Most are feature-specific patches (e.g. `addon-checkbox-to-dropdown.js`, `progressive-field-control.js`, `woocommerce-validation-fix.js`). `js/main.js` is the catch-all site behavior. There is no bundler — each file is a separate `<script>` tag.

## Conventions specific to this codebase

- **RTL first.** The site is Hebrew. When adding layout CSS, verify in RTL context — don't assume left/right.
- **Theme slug is `Limes` / `_s` / `limes-wordpress-master`** in various places. The server folder is `limes-wordpress-master`; the text domain is `extra` (set in `style.css` header, left over from the template); the theme name is `Limes`. Don't "fix" these inconsistencies without a coordinated deploy — references exist across the codebase and WP's options table.
- **ACF options are heavily used.** Header contact info, social icons, and many content fields come from `get_field('header', 'options')` and similar. Template files assume these fields exist — check the "Limes Options" ACF group in `/wp-admin` when a field is missing at render time.
- **`wp_is_mobile()` gates markup in header.php** — that's a server-side UA check, not a CSS breakpoint. Changes to mobile vs desktop header behavior often need edits in two places (PHP branch + the `desktop_only` / `mobile_only` class rules in CSS).
- **Don't commit `.vscode/sftp.json`** — the file contains the FTP password. Already in `ignore` for the SFTP extension, but not in `.gitignore`. If you see it staged, unstage it.

## Branches

- `main`, `dev`, `upload-project` exist locally and on origin
- Active work is on `upload-project`
- Production deploy path is not yet established — treat all merges to `main` as "we're about to push to the live site" and ask the user before doing so.
