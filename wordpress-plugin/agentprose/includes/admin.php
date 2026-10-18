<?php
/**
 * Admin: Settings → agentprose.
 *
 * @package agentprose
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Registers the settings page.
 */
function agentprose_admin_menu() {
	add_options_page(
		__( 'agentprose', 'agentprose' ),
		__( 'agentprose', 'agentprose' ),
		'manage_options',
		'agentprose',
		'agentprose_settings_page'
	);
}
add_action( 'admin_menu', 'agentprose_admin_menu' );

/**
 * Registers the option with its sanitizer.
 */
function agentprose_register_setting() {
	register_setting(
		'agentprose',
		'agentprose',
		array(
			'type'              => 'array',
			'sanitize_callback' => 'agentprose_sanitize',
			'default'           => agentprose_defaults(),
		)
	);
}
add_action( 'admin_init', 'agentprose_register_setting' );

/**
 * Sanitizes the submitted settings.
 *
 * @param mixed $in Raw input.
 * @return array<string, mixed>
 */
function agentprose_sanitize( $in ) {
	$in  = is_array( $in ) ? $in : array();
	$d   = agentprose_defaults();
	$key = isset( $in['cloud_key'] ) ? trim( sanitize_text_field( $in['cloud_key'] ) ) : '';
	if ( '' !== $key && ! preg_match( '/^pk_[A-Za-z0-9_-]{8,64}$/', $key ) ) {
		add_settings_error( 'agentprose', 'agentprose_cloud_key', __( 'That does not look like an agentprose Cloud site key (it starts with pk_). The previous key was kept.', 'agentprose' ) );
		$key = (string) agentprose_options()['cloud_key'];
	}
	$types = isset( $in['types'] ) ? strtolower( sanitize_text_field( $in['types'] ) ) : $d['types'];
	$types = trim( preg_replace( '/[^a-z0-9_,-]/', '', $types ), ',' );
	return array(
		'enabled'      => empty( $in['enabled'] ) ? 0 : 1,
		'types'        => '' === $types ? $d['types'] : $types,
		'content'      => isset( $in['content'] ) ? sanitize_text_field( $in['content'] ) : '',
		'prefix'       => isset( $in['prefix'] ) ? sanitize_key( $in['prefix'] ) : '',
		'subscribe'    => isset( $in['subscribe'] ) ? esc_url_raw( $in['subscribe'] ) : '',
		'navigate'     => empty( $in['navigate'] ) ? 0 : 1,
		'inspector'    => empty( $in['inspector'] ) ? 0 : 1,
		'polyfill'     => empty( $in['polyfill'] ) ? 0 : 1,
		'cloud_key'    => $key,
		'cloud_search' => empty( $in['cloud_search'] ) ? 0 : 1,
		'analytics'    => isset( $in['analytics'] ) ? esc_url_raw( $in['analytics'] ) : '',
	);
}

/**
 * Renders a checkbox row.
 *
 * @param string $name  Option key.
 * @param string $label Row heading.
 * @param string $text  Checkbox label.
 * @param string $help  Optional description.
 */
function agentprose_checkbox_row( $name, $label, $text, $help = '' ) {
	$o = agentprose_options();
	?>
	<tr>
		<th scope="row"><?php echo esc_html( $label ); ?></th>
		<td>
			<label><input type="checkbox" name="agentprose[<?php echo esc_attr( $name ); ?>]" value="1" <?php checked( ! empty( $o[ $name ] ) ); ?>> <?php echo esc_html( $text ); ?></label>
			<?php if ( $help ) : ?>
				<p class="description"><?php echo wp_kses_post( $help ); ?></p>
			<?php endif; ?>
		</td>
	</tr>
	<?php
}

/**
 * Renders a text input row.
 *
 * @param string $name        Option key.
 * @param string $label       Row heading.
 * @param string $help        Description.
 * @param string $placeholder Placeholder.
 * @param string $type        Input type.
 */
function agentprose_text_row( $name, $label, $help, $placeholder = '', $type = 'text' ) {
	$o  = agentprose_options();
	$id = 'agentprose-' . $name;
	?>
	<tr>
		<th scope="row"><label for="<?php echo esc_attr( $id ); ?>"><?php echo esc_html( $label ); ?></label></th>
		<td>
			<input id="<?php echo esc_attr( $id ); ?>" class="regular-text" type="<?php echo esc_attr( $type ); ?>" name="agentprose[<?php echo esc_attr( $name ); ?>]" value="<?php echo esc_attr( $o[ $name ] ); ?>" placeholder="<?php echo esc_attr( $placeholder ); ?>">
			<p class="description"><?php echo wp_kses_post( $help ); ?></p>
		</td>
	</tr>
	<?php
}

/**
 * Renders the settings page.
 */
function agentprose_settings_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	$o     = agentprose_options();
	$cloud = agentprose_cloud_url();
	?>
	<div class="wrap">
		<h1><?php esc_html_e( 'agentprose', 'agentprose' ); ?></h1>
		<p>
			<?php
			printf(
				/* translators: %s: link to the WebMCP specification. */
				esc_html__( 'agentprose registers read-only %s tools, so AI agents in the visitor\'s browser can read, search and cite your posts. The tools read this site\'s public REST API in the visitor\'s browser. Nothing is sent to other servers unless you connect agentprose Cloud or set an analytics endpoint below.', 'agentprose' ),
				'<a href="https://webmachinelearning.github.io/webmcp/">WebMCP</a>'
			);
			?>
		</p>
		<?php if ( ! empty( $o['enabled'] ) && ! empty( $o['inspector'] ) ) : ?>
			<p>
				<?php
				printf(
					/* translators: %s: link to the site's front page. */
					esc_html__( 'To see the tools, open %s while logged in as an administrator and click the 🔌 button.', 'agentprose' ),
					'<a href="' . esc_url( home_url( '/' ) ) . '" target="_blank" rel="noopener">' . esc_html__( 'your site', 'agentprose' ) . '</a>'
				);
				?>
			</p>
		<?php endif; ?>
		<form method="post" action="options.php">
			<?php settings_fields( 'agentprose' ); ?>
			<h2 class="title"><?php esc_html_e( 'Agent tools', 'agentprose' ); ?></h2>
			<table class="form-table" role="presentation">
				<?php
				agentprose_checkbox_row( 'enabled', __( 'Enabled', 'agentprose' ), __( 'Register the agent tools on front-end pages', 'agentprose' ) );
				agentprose_text_row( 'types', __( 'Post types', 'agentprose' ), esc_html__( 'REST bases, comma-separated: posts, pages, or a custom post type\'s rest_base.', 'agentprose' ), 'posts' );
				agentprose_text_row( 'content', __( 'Content selector', 'agentprose' ), esc_html__( 'Only needed if your theme\'s article body is not detected (CSS selector).', 'agentprose' ), '.entry-content' );
				agentprose_text_row( 'prefix', __( 'Tool name prefix', 'agentprose' ), esc_html__( 'Optional, for pages that already register tools with the same names.', 'agentprose' ), 'blog_' );
				agentprose_text_row( 'subscribe', __( 'Subscribe URL', 'agentprose' ), esc_html__( 'Newsletter or feed address that agents can offer to readers.', 'agentprose' ), get_feed_link(), 'url' );
				agentprose_checkbox_row( 'navigate', __( 'Navigation tool', 'agentprose' ), __( 'Let agents open other pages of this site (navigate_to)', 'agentprose' ) );
				agentprose_checkbox_row( 'polyfill', __( 'WebMCP polyfill', 'agentprose' ), __( 'Load the bundled WebMCP polyfill in browsers without built-in WebMCP', 'agentprose' ), esc_html__( 'Needed for agents that read tools through the polyfill (for example the MCP-B browser extension). Served from this site, about 9 KB gzipped, loaded only when the browser has no WebMCP.', 'agentprose' ) );
				agentprose_checkbox_row( 'inspector', __( 'Inspector', 'agentprose' ), __( 'Show the 🔌 tool inspector to administrators on the front end', 'agentprose' ) );
				?>
			</table>

			<h2 class="title"><?php esc_html_e( 'agentprose Cloud (optional)', 'agentprose' ); ?></h2>
			<p>
				<?php
				printf(
					/* translators: %s: link to agentprose Cloud. */
					esc_html__( 'Connect %s to see which agents read what, and to give agents hosted full-text search. This is an external service and is off until you enter a site key.', 'agentprose' ),
					'<a href="' . esc_url( $cloud ) . '" target="_blank" rel="noopener">agentprose Cloud</a>'
				);
				?>
			</p>
			<table class="form-table" role="presentation">
				<?php
				agentprose_text_row(
					'cloud_key',
					__( 'Site key', 'agentprose' ),
					sprintf(
						/* translators: %s: Cloud origin. */
						esc_html__( 'Your public site key (pk_…) from %s. When set, each agent tool call sends the tool name, outcome, timing, page address and search query (never post content) to agentprose Cloud.', 'agentprose' ),
						esc_html( $cloud )
					),
					'pk_…'
				);
				agentprose_checkbox_row( 'cloud_search', __( 'Hosted search', 'agentprose' ), __( 'Answer agent searches from the Cloud index (falls back to WordPress search)', 'agentprose' ) );
				agentprose_text_row( 'analytics', __( 'Own analytics endpoint', 'agentprose' ), esc_html__( 'Advanced, instead of the Cloud: a URL of yours that receives the same per-call message via navigator.sendBeacon. Ignored when a site key is set.', 'agentprose' ), 'https://', 'url' );
				?>
			</table>
			<?php submit_button(); ?>
		</form>
	</div>
	<?php
}

/**
 * Adds a Settings link on the Plugins screen.
 *
 * @param string[] $links Action links.
 * @return string[]
 */
function agentprose_action_links( $links ) {
	array_unshift( $links, '<a href="' . esc_url( admin_url( 'options-general.php?page=agentprose' ) ) . '">' . esc_html__( 'Settings', 'agentprose' ) . '</a>' );
	return $links;
}
add_filter( 'plugin_action_links_' . plugin_basename( AGENTPROSE_FILE ), 'agentprose_action_links' );
