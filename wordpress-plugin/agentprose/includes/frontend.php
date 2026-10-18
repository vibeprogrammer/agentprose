<?php
/**
 * Front end: enqueues the agentprose script and passes the settings as data-* attributes.
 *
 * The script runs in the visitor's browser and reads this site's public REST API.
 * It sends nothing to other servers unless a Cloud site key or an analytics endpoint is set.
 *
 * @package agentprose
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Enqueues the script (deferred, in the head) on front-end pages.
 */
function agentprose_enqueue() {
	$o = agentprose_options();
	if ( empty( $o['enabled'] ) ) {
		return;
	}
	wp_enqueue_script(
		'agentprose',
		plugins_url( 'js/agentprose.min.js', AGENTPROSE_FILE ),
		array(),
		AGENTPROSE_VERSION,
		array(
			'strategy'  => 'defer',
			'in_footer' => false,
		)
	);
}
add_action( 'wp_enqueue_scripts', 'agentprose_enqueue' );

/**
 * The data-* attributes for the script tag.
 *
 * @return array<string, string> Attribute name => value ('' means a bare attribute).
 */
function agentprose_script_attributes() {
	$o     = agentprose_options();
	$attrs = array(
		'data-adapter' => 'wordpress',
		'data-api'     => get_rest_url(),
		'data-types'   => (string) $o['types'],
	);
	if ( $o['subscribe'] ) {
		$attrs['data-subscribe'] = (string) $o['subscribe'];
	}
	if ( $o['content'] ) {
		$attrs['data-content'] = (string) $o['content'];
	}
	if ( $o['prefix'] ) {
		$attrs['data-prefix'] = (string) $o['prefix'];
	}
	if ( $o['navigate'] ) {
		$attrs['data-navigate'] = '';
	}

	// Browsers without WebMCP: the bundled polyfill (a local file) when enabled, otherwise none.
	// The script never fetches a polyfill from a CDN from this plugin.
	$attrs['data-polyfill'] = $o['polyfill'] ? plugins_url( 'js/vendor/webmcp-polyfill.iife.js', AGENTPROSE_FILE ) : 'false';

	// agentprose Cloud: opt-in, only when a site key is set.
	if ( $o['cloud_key'] ) {
		$cloud                       = agentprose_cloud_url();
		$attrs['data-analytics']     = $cloud . '/v1/collect';
		$attrs['data-analytics-key'] = (string) $o['cloud_key'];
		if ( $o['cloud_search'] ) {
			$attrs['data-search-endpoint'] = $cloud . '/v1/search?key=' . rawurlencode( (string) $o['cloud_key'] );
		}
	} elseif ( $o['analytics'] ) {
		$attrs['data-analytics'] = (string) $o['analytics'];
	}

	if ( $o['inspector'] && current_user_can( 'manage_options' ) ) {
		$attrs['data-inspector'] = '';
	}

	/**
	 * Filters the data-* attributes of the agentprose script tag.
	 *
	 * @param array<string, string> $attrs Attribute name => value.
	 */
	return (array) apply_filters( 'agentprose_script_attributes', $attrs );
}

/**
 * Adds the data-* attributes to our script tag.
 *
 * @param string $tag    The script tag.
 * @param string $handle The script handle.
 * @return string
 */
function agentprose_script_tag( $tag, $handle ) {
	if ( 'agentprose' !== $handle ) {
		return $tag;
	}
	$html = '';
	foreach ( agentprose_script_attributes() as $name => $value ) {
		$name = preg_replace( '/[^a-z0-9-]/', '', strtolower( (string) $name ) );
		if ( '' === $name ) {
			continue;
		}
		$html .= ' ' . $name . ( '' === $value ? '' : '="' . esc_attr( $value ) . '"' );
	}
	return preg_replace( '/<script\b/', '<script' . $html, $tag, 1 );
}
add_filter( 'script_loader_tag', 'agentprose_script_tag', 10, 2 );

/**
 * Suggested privacy-policy text (Settings → Privacy), describing exactly what is sent and when.
 */
function agentprose_privacy_policy() {
	if ( ! function_exists( 'wp_add_privacy_policy_content' ) ) {
		return;
	}
	$text  = '<p>' . esc_html__( 'This site uses the agentprose plugin, which lets AI agents running in a visitor\'s browser read and search the published content through WebMCP. It sets no cookies and stores nothing in the browser.', 'agentprose' ) . '</p>';
	$text .= '<p>' . esc_html__( 'If the site owner has connected agentprose Cloud, each time an AI agent uses one of these tools the browser sends the tool name, whether it succeeded, how long it took, the page address, the search query (if any), the number of results and a random per-page-load identifier to agentprose Cloud (https://agentprose.cloud). Post content is never sent. Like any web request, it also reveals the visitor\'s IP address to that server; see https://agentprose.cloud/privacy.', 'agentprose' ) . '</p>';
	wp_add_privacy_policy_content( 'agentprose', wp_kses_post( $text ) );
}
add_action( 'admin_init', 'agentprose_privacy_policy' );
