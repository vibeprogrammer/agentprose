<?php
/**
 * Removes the plugin's single option on uninstall.
 *
 * @package agentprose
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

delete_option( 'agentprose' );
