# Security policy

## Supported versions

| Version | Supported |
|---|---|
| 0.1.x | ✅ |

## Reporting a vulnerability

Please **do not open a public issue**. Use GitHub's private vulnerability reporting: the repository's **Security** tab, then **Report a vulnerability**. You'll get an acknowledgement within 3 working days and a fix or mitigation plan within 14 days for confirmed issues. We credit reporters in the CHANGELOG unless you'd rather stay anonymous.

In scope: the browser script and its lazily loaded files, the adapters, the CLI, the WordPress plugin, and the proxy examples.

Especially interesting: ways to make readmcp fetch cross-origin, leak a credential, execute page content, change state through a read-only tool, or break the host page.

## Design guarantees

See [docs/security.md](docs/security.md) for the threat model. In short: read-only tools with `untrustedContentHint`, same-origin fetching, refusal of management credentials, bounded output, no runtime dependencies in the browser, and no data sent anywhere unless the site owner configures analytics.
