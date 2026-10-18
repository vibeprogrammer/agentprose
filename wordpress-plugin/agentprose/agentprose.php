<?php
/**
 * Plugin Name:       agentprose
 * Plugin URI:        https://github.com/vibeprogrammer/agentprose
 * Description:       Lets AI agents in the browser read, search and cite your posts through WebMCP. Read-only tools, runs in the visitor's browser, no account needed.
 * Version:           0.1.0
 * Requires at least: 6.3
 * Requires PHP:      7.4
 * Author:            Maxim Salnikov
 * Author URI:        https://agentprose.cloud
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       agentprose
 *
 * @package agentprose
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'AGENTPROSE_VERSION', '0.1.0' );
define( 'AGENTPROSE_FILE', __FILE__ );

/**
 * The agentprose Cloud origin. Only contacted when a site key is entered in the settings.
 */
if ( ! defined( 'AGENTPROSE_CLOUD_URL' ) ) {
	define( 'AGENTPROSE_CLOUD_URL', 'https://agentprose.cloud' );
}

/**
 * Default settings.
 *
 * @return array<string, mixed>
 */
function agentprose_defaults() {
	return array(
		'enabled'      => 1,
		'types'        => 'posts',
		'content'      => '',
		'prefix'       => '',
		'subscribe'    => '',
		'navigate'     => 0,
		'inspector'    => 1,
		'polyfill'     => 0,
		'cloud_key'    => '',
		'cloud_search' => 1,
		'analytics'    => '',
	);
}

/**
 * Saved settings merged over the defaults.
 *
 * @return array<string, mixed>
 */
function agentprose_options() {
	return wp_parse_args( (array) get_option( 'agentprose', array() ), agentprose_defaults() );
}

/**
 * The Cloud origin without a trailing slash (filterable for self-hosted Clouds).
 *
 * @return string
 */
function agentprose_cloud_url() {
	return untrailingslashit( (string) apply_filters( 'agentprose_cloud_url', AGENTPROSE_CLOUD_URL ) );
}

require_once __DIR__ . '/includes/frontend.php';

if ( is_admin() ) {
	require_once __DIR__ . '/includes/admin.php';
}
