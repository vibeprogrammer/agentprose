<?php
/**
 * Plugin Name:       agentprose — Agent-readable content (WebMCP)
 * Plugin URI:        https://github.com/vibeprogrammer/agentprose
 * Description:       Lets AI agents in the browser read, search and cite your posts through WebMCP. Read-only, no account, no external requests.
 * Version:           0.1.0
 * Requires at least: 6.3
 * Requires PHP:      7.4
 * Author:            agentprose contributors
 * License:           MIT
 * License URI:       https://opensource.org/licenses/MIT
 * Text Domain:       agentprose
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'AGENTPROSE_VERSION', '0.1.0' );

/** Default settings. */
function agentprose_defaults() {
	return array(
		'enabled'    => 1,
		'subscribe'  => '',
		'content'    => '',
		'prefix'     => '',
		'types'      => 'posts',
		'inspector'  => 1,
		'analytics'  => '',
		'navigate'   => 0,
	);
}

function agentprose_options() {
	return wp_parse_args( (array) get_option( 'agentprose', array() ), agentprose_defaults() );
}

/** Enqueue the script on the front end. The script reads the REST API of this site (public, read-only). */
add_action( 'wp_enqueue_scripts', function () {
	$o = agentprose_options();
	if ( empty( $o['enabled'] ) || is_admin() ) {
		return;
	}
	wp_enqueue_script(
		'agentprose',
		plugins_url( 'assets/agentprose.min.js', __FILE__ ),
		array(),
		AGENTPROSE_VERSION,
		array( 'strategy' => 'defer', 'in_footer' => false )
	);
} );

/** Add data-* attributes to our script tag. */
add_filter( 'script_loader_tag', function ( $tag, $handle ) {
	if ( 'agentprose' !== $handle ) {
		return $tag;
	}
	$o     = agentprose_options();
	$attrs = array(
		'data-adapter' => 'wordpress',
		'data-api'     => esc_url( get_rest_url() ),
		'data-types'   => sanitize_text_field( $o['types'] ),
	);
	if ( $o['subscribe'] ) {
		$attrs['data-subscribe'] = esc_url( $o['subscribe'] );
	}
	if ( $o['content'] ) {
		$attrs['data-content'] = sanitize_text_field( $o['content'] );
	}
	if ( $o['prefix'] ) {
		$attrs['data-prefix'] = sanitize_key( $o['prefix'] );
	}
	if ( $o['analytics'] ) {
		$attrs['data-analytics'] = esc_url( $o['analytics'] );
	}
	if ( $o['navigate'] ) {
		$attrs['data-navigate'] = '';
	}
	if ( $o['inspector'] && current_user_can( 'manage_options' ) ) {
		$attrs['data-inspector'] = '';
	}
	$html = '';
	foreach ( $attrs as $k => $v ) {
		$html .= ' ' . $k . ( '' === $v ? '' : '="' . esc_attr( $v ) . '"' );
	}
	return str_replace( ' src=', $html . ' src=', $tag );
}, 10, 2 );

/** Settings page under Settings → agentprose. */
add_action( 'admin_menu', function () {
	add_options_page( 'agentprose', 'agentprose', 'manage_options', 'agentprose', 'agentprose_settings_page' );
} );

add_action( 'admin_init', function () {
	register_setting( 'agentprose', 'agentprose', array(
		'type'              => 'array',
		'sanitize_callback' => function ( $in ) {
			$d = agentprose_defaults();
			return array(
				'enabled'   => empty( $in['enabled'] ) ? 0 : 1,
				'subscribe' => esc_url_raw( $in['subscribe'] ?? '' ),
				'content'   => sanitize_text_field( $in['content'] ?? '' ),
				'prefix'    => sanitize_key( $in['prefix'] ?? '' ),
				'types'     => preg_replace( '/[^a-z0-9_,-]/', '', strtolower( $in['types'] ?? $d['types'] ) ),
				'inspector' => empty( $in['inspector'] ) ? 0 : 1,
				'analytics' => esc_url_raw( $in['analytics'] ?? '' ),
				'navigate'  => empty( $in['navigate'] ) ? 0 : 1,
			);
		},
	) );
} );

function agentprose_settings_page() {
	$o = agentprose_options();
	?>
	<div class="wrap">
		<h1>agentprose</h1>
		<p>agentprose registers read-only <a href="https://webmachinelearning.github.io/webmcp/">WebMCP</a> tools so AI agents in the browser can read, search and cite your posts. It uses this site's public REST API and sends nothing anywhere unless you set an analytics endpoint.</p>
		<form method="post" action="options.php">
			<?php settings_fields( 'agentprose' ); ?>
			<table class="form-table" role="presentation">
				<tr><th scope="row">Enabled</th><td><label><input type="checkbox" name="agentprose[enabled]" value="1" <?php checked( $o['enabled'] ); ?>> Register agent tools on the front end</label></td></tr>
				<tr><th scope="row"><label for="rm-sub">Subscribe URL</label></th><td><input id="rm-sub" class="regular-text" type="url" name="agentprose[subscribe]" value="<?php echo esc_attr( $o['subscribe'] ); ?>" placeholder="<?php echo esc_attr( get_feed_link() ); ?>"><p class="description">Newsletter or feed URL agents can show to readers.</p></td></tr>
				<tr><th scope="row"><label for="rm-types">Post types</label></th><td><input id="rm-types" class="regular-text" name="agentprose[types]" value="<?php echo esc_attr( $o['types'] ); ?>"><p class="description">REST bases, comma-separated (posts, pages, or a custom type's rest_base).</p></td></tr>
				<tr><th scope="row"><label for="rm-content">Content selector</label></th><td><input id="rm-content" class="regular-text" name="agentprose[content]" value="<?php echo esc_attr( $o['content'] ); ?>" placeholder=".entry-content"><p class="description">Only if your theme's article body is not detected.</p></td></tr>
				<tr><th scope="row"><label for="rm-prefix">Tool name prefix</label></th><td><input id="rm-prefix" name="agentprose[prefix]" value="<?php echo esc_attr( $o['prefix'] ); ?>" placeholder="blog_"></td></tr>
				<tr><th scope="row"><label for="rm-an">Analytics endpoint</label></th><td><input id="rm-an" class="regular-text" type="url" name="agentprose[analytics]" value="<?php echo esc_attr( $o['analytics'] ); ?>"><p class="description">Optional. Receives tool name, timing, page and search query per call. Never post content.</p></td></tr>
				<tr><th scope="row">Navigation tool</th><td><label><input type="checkbox" name="agentprose[navigate]" value="1" <?php checked( $o['navigate'] ); ?>> Let agents open other pages of this site (navigate_to)</label></td></tr>
				<tr><th scope="row">Inspector</th><td><label><input type="checkbox" name="agentprose[inspector]" value="1" <?php checked( $o['inspector'] ); ?>> Show the 🔌 tool inspector to administrators</label></td></tr>
			</table>
			<?php submit_button(); ?>
		</form>
	</div>
	<?php
}

/** Settings link on the Plugins screen. */
add_filter( 'plugin_action_links_' . plugin_basename( __FILE__ ), function ( $links ) {
	array_unshift( $links, '<a href="' . esc_url( admin_url( 'options-general.php?page=agentprose' ) ) . '">' . esc_html__( 'Settings', 'agentprose' ) . '</a>' );
	return $links;
} );
