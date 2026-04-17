<?php
/**
 * Conditional "צד מנגנון" (mechanism side) field per category.
 *
 * Registers a true/false ACF field on product categories. When checked on a
 * category, products in that category will not render the mechanism-side
 * radios on the product page, and server-side validation skips the field too.
 *
 * PDF spec 3.b — fabric curtains (וילון בד) and similar have no mechanism side.
 *
 * @package Limes
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Register the taxonomy-level ACF field.
 * Appears on every product category edit screen as a single checkbox.
 */
add_action( 'acf/init', function () {
	if ( ! function_exists( 'acf_add_local_field_group' ) ) {
		return;
	}

	acf_add_local_field_group( array(
		'key'    => 'group_limes_category_mechanism_toggle',
		'title'  => 'הגדרות קטגוריה — לימס',
		'fields' => array(
			array(
				'key'           => 'field_limes_hide_mechanism_side',
				'label'         => 'הסתר שדה "צד מנגנון" במוצרי הקטגוריה',
				'name'          => 'hide_mechanism_side',
				'type'          => 'true_false',
				'instructions'  => 'סמן כדי להסתיר את בחירת צד המנגנון (ימין / שמאל) בכל המוצרים השייכים לקטגוריה זו. שימושי לוילונות בד ולקטגוריות שאין להן מנגנון פתיחה.',
				'ui'            => 1,
				'default_value' => 0,
			),
		),
		'location' => array(
			array(
				array(
					'param'    => 'taxonomy',
					'operator' => '==',
					'value'    => 'product_cat',
				),
			),
		),
		'menu_order' => 0,
		'position'   => 'normal',
		'style'      => 'default',
	) );
} );

/**
 * Returns true if the given product belongs to any category with the
 * "hide mechanism side" flag turned on.
 *
 * @param int $product_id
 * @return bool
 */
function limes_product_hides_mechanism_side( $product_id ) {
	if ( ! $product_id || ! function_exists( 'get_field' ) ) {
		return false;
	}

	$terms = wp_get_post_terms( $product_id, 'product_cat' );
	if ( empty( $terms ) || is_wp_error( $terms ) ) {
		return false;
	}

	foreach ( $terms as $term ) {
		if ( get_field( 'hide_mechanism_side', 'product_cat_' . $term->term_id ) ) {
			return true;
		}
	}

	return false;
}
