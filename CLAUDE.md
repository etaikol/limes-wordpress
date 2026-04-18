# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A custom WordPress theme named **Limes** for a Hebrew/RTL WooCommerce store (design business — curtains, seating, home textiles). Built on the Automattic Underscores (_s) starter theme and heavily customized for a single-store use case. Not meant to be reused as a parent theme.

Active upgrade project is scoped in `../שדרוג אתר לימס.pdf` (cart UX, category page, product page). Work happens on the `dev` branch.

## Session state (last updated 2026-04-18)

- **Branch:** `dev` (pushed to `origin/dev`). `upload-project` exists but is not being used. `main` is the eventual production target.
- **Last commit:** `d5047c4` — "UX upgrades: banner variants, category cleanup, zoom fix, mechanism toggle". 4 Tier-1 items shipped in a single commit.
- **Outstanding in working tree:** 2 pre-existing vendor file drifts (`vendor/squizlabs/.../InlineHTMLUnitTest.3.inc`, `vendor/wp-coding-standards/.../CommaAfterArrayItemSniff.php`). Not Claude's changes — from a prior composer install. Leave alone unless re-running composer is desired.
- **Not yet SFTP-uploaded to dev:** All 4 shipped files are committed but may not all be live on the dev site yet. Staged upload plan: (1) banner = `template-parts/top-inner.php` + `css/style.css`; (2) zoom = `header.php`; (3) category page = `woocommerce/taxonomy-product_cat.php` (CSS already covered in #1); (4) mechanism toggle = `inc/features/category-mechanism-toggle.php` + `functions.php` + `inc/woo-product-page.php` + CSS (covered in #1). After stage 4, mom must enable the ACF "הסתר שדה צד מנגנון" checkbox on the וילון בד category in wp-admin for the render guard to activate.
- **Pending mom decision:** Banner variant A / B / C. Reworked 2026-04-18 after first-pass feedback — default is now A (refined brown, modernized legacy: smaller than old slab, grid layout with breadcrumb right + title centered). B = minimal white strip (was A). C = picture background (was B). Re-upload `template-parts/top-inner.php` + `css/style.css` to dev. Once picked, flip `$default_variant` in `template-parts/top-inner.php`, delete losing branches + their CSS blocks, and remove the `?banner=legacy` rollback.

## Upgrade mission list

This is the working backlog for the current upgrade project, ordered by ROI (impact / effort) rather than by PDF order. Check off items as they ship by changing `[ ]` → `[x]` and adding a brief note + commit SHA. When scope changes, edit this list directly — this is the single source of truth for "what's left".

### Tier 1 — quick wins (hours each)
- [ ] **Slide-in side-cart on "Add to cart"** — _Impact: Very high · Difficulty: Low–Med_
  PDF spec 1.b. `woocommerce/cart/mini-cart.php` already exists; wire a fragments drawer triggered on the `added_to_cart` JS event. Biggest conversion lever in the whole backlog. **This is the next task to pick up.**

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

All 4 items below shipped in commit `d5047c4` on branch `dev`. Not yet SFTP-uploaded to dev in full — see "Session state" above for the staged upload plan.

- [x] **Banner shrink — A/B/C/legacy variant switcher** — `d5047c4` + reworked 2026-04-18 — `template-parts/top-inner.php` with `?banner=a|b|c|legacy`. Default `a` = refined brown banner (modernized legacy): `#B29076` with subtle light→dark gradient overlay + `rgba(255,255,255,0.14)` hairline bottom border, grid layout `1fr auto 1fr` (breadcrumb pinned RTL-start/right, title centered, empty column for balance), `padding: 30px 0`, 32px/700 title, 14px/500 breadcrumb (`.page-head--modern`). `b` = minimal white strip with same grid layout, 30px dark title `#2B2723`, muted beige breadcrumb (`.page-head--inline`). `c` = 110px compact strip, uses WC category `thumbnail_id` as bg image with dark gradient overlay when present, falls back to `#B29076` solid (`.page-head--compact`). `legacy` = original 150px banner intact for rollback. CSS blocks in `css/style.css` labeled "Page head — Variant A/B/C". **Pending:** mom picks A, B or C → flip `$default_variant`, delete losing variants + legacy + switcher code.
- [x] **Product card / category layout cleanup** — `d5047c4` + partial restore 2026-04-18 — `woocommerce/taxonomy-product_cat.php`: removed only the oversized "מוצרים בקטגוריה" H2 (the actual fold-killer), kept the small "בואו להתרשם" script overline and the centered `term_description()` above the product grid. First pass over-deleted the whole block and moved the description below the products; reverted to the classic layout minus the big H2 after Etai's feedback on 2026-04-18. CSS: deleted the orphaned `.leading-products--category` + `.section-subtitle--below-products` rules from `css/style.css`. Satisfies PDF spec 2.b. Only affects the `!$tapet_cat_type` path (standard categories); filtered/tapet categories unchanged.
- [x] **Conditional "צד מנגנון" (mechanism side) field — per-category** — `d5047c4` — New file `inc/features/category-mechanism-toggle.php` registers an ACF true/false checkbox (`field_limes_hide_mechanism_side` / name `hide_mechanism_side`, field group "הגדרות קטגוריה — לימס") on every `product_cat` edit screen, + exposes helper `limes_product_hides_mechanism_side($product_id)` returning true if ANY of the product's categories has the flag set. Wired into `functions.php` under "Load Feature Files". Render guard wraps `.wrap_mechanism` div (only, not `.wrap_installation`) in `inc/woo-product-page.php` ~line 299, adds `mech-hidden` class on parent wrapper. Validation guard in dimension-validation function (same file, ~line 877) skips requiring the radio when hidden — no "נא לבחור צד מנגנון" error fires. CSS: `.wrap_mechanism_installation.mech-hidden .wrap_installation { width: 100%; }` + `:only-child` fallback. Satisfies PDF spec 3.b. **Mom must enable the checkbox on the וילון בד category (and any other fabric-curtain-like category) in wp-admin for it to take effect.** No product-level edits needed. תוספות + בחר גוון remain untouched.
- [x] **Body-zoom hack neutralized on small desktops** — `d5047c4` — `header.php:20` — `const minZoom = 0.1` → `const minZoom = 1`. Below-1920 viewports no longer shrink the whole body; >1920 monitors still scale up (original intent preserved). Unlocks pixel-accurate CSS on 1366 / 1440 / 1536 laptops. Comment on the line explains why.

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
- **Active work is on `dev`** (last session pushed `d5047c4` there). `upload-project` is stale — ignore unless the user explicitly asks to use it.
- Production deploy path is not yet established — treat all merges to `main` as "we're about to push to the live site" and ask the user before doing so.
