<?php $td = get_template_directory_uri(); ?>

<?php
	global $page_title;
	global $page_title_h1;

	if(!$page_title && isset(get_queried_object() -> name)) $page_title = get_queried_object() -> name;
	if(!$page_title) $page_title = get_the_title();

	/**
	 * Banner variant switcher — for comparing designs.
	 *   ?banner=a  → inline breadcrumb strip + H1 in content flow (no brown slab)
	 *   ?banner=b  → compact strip with category image background (fallback: beige)
	 *   ?banner=legacy → original 150px brown banner
	 * Default below controls what visitors see with no query param.
	 */
	$default_variant = 'a';
	$allowed_variants = array('a', 'b', 'legacy');
	$banner_variant = isset($_GET['banner']) && in_array($_GET['banner'], $allowed_variants, true)
		? $_GET['banner']
		: $default_variant;

	// For variant B: try to pull WooCommerce category image if we're on a product category page.
	$category_image = '';
	if ($banner_variant === 'b') {
		$queried = get_queried_object();
		if ($queried && isset($queried->term_id)) {
			$thumb_id = get_term_meta($queried->term_id, 'thumbnail_id', true);
			if ($thumb_id) {
				$category_image = wp_get_attachment_url($thumb_id);
			}
		}
	}

	$title_tag = $page_title_h1 ? 'h1' : 'p';
?>

<?php if ($banner_variant === 'a') : ?>

	<div class="page-head page-head--inline">
		<div class="section-inner">
			<div class="breadcrumbs">
				<?php if (function_exists('yoast_breadcrumb')) { yoast_breadcrumb(''); } ?>
			</div>
			<<?=$title_tag?> class="title"><span><?=$page_title?></span></<?=$title_tag?>>
		</div>
	</div>

<?php elseif ($banner_variant === 'b') : ?>

	<section class="page-head page-head--compact<?= $category_image ? ' has-bg' : '' ?>"
		<?= $category_image ? 'style="background-image:url(' . esc_url($category_image) . ');"' : '' ?>>
		<?php if ($category_image) : ?><div class="page-head__overlay"></div><?php endif; ?>
		<div class="section-inner">
			<<?=$title_tag?> class="title"><span><?=$page_title?></span></<?=$title_tag?>>
			<div class="breadcrumbs">
				<?php if (function_exists('yoast_breadcrumb')) { yoast_breadcrumb(''); } ?>
			</div>
		</div>
	</section>

<?php else : // legacy — original banner ?>

	<section class="top-inner">
		<div class="section-inner">
			<<?=$title_tag?> class="title"><span><?=$page_title?></span></<?=$title_tag?>>
		</div>
		<div class="wrapper-breadcrumbs">
			<div class="breadcrumbs section-inner">
				<?php if (function_exists('yoast_breadcrumb')) { yoast_breadcrumb(''); } ?>
			</div>
		</div>
	</section>

<?php endif; ?>
