# Contributing to PureCart for WooCommerce

Thank you for your interest in contributing! This document explains how to get started, the standards we follow, and what we expect in a pull request.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Branch Naming](#branch-naming)
- [Commit Messages](#commit-messages)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)

---

## Getting Started

1. Fork the repository and clone your fork.
2. Create a new branch from `main` for your change (see [Branch Naming](#branch-naming)).
3. Make your changes, following the standards below.
4. Test thoroughly before opening a PR.

---

## Development Setup

### Requirements

- PHP 8.1 or higher
- WordPress 6.0 or higher
- WooCommerce 9.8 or higher
- Node.js 20 or higher
- Composer

### Install dependencies

```bash
composer install
npm install
```

### Build assets

```bash
# Development (watch mode)
npm run start

# Production build
npm run build
```

### PHP CodeSniffer

```bash
# Check for violations
composer cs

# Auto-fix fixable violations
composer cs-fix
```

All PRs must pass `composer cs` with zero errors before merging.

---

## Coding Standards

### PHP

- **PHP 8.1+** — all files must begin with `declare(strict_types=1);`
- **PSR-4 namespace** — `PureCart\` (e.g. `PureCart\Licensing\LicenseGenerator`)
- **Constant prefix** — `PURECART_`
- **Hook prefix** — `purecart_`
- **Text domain** — `purecart`
- **No `__()` inside constructors** — register i18n strings in methods, not `__construct()`
- **Background jobs** — always use Action Scheduler; never raw `wp_cron`
- **File downloads** — always stream through PHP; never expose direct file URLs
- **HPOS compatibility** — use `wc_get_order()` and the WC order API; never query the `wp_posts` table directly for orders

### JavaScript / TypeScript

- All source lives under `src/`
- TypeScript preferred; React for UI components
- Follow the `@wordpress/scripts` linting config (`npm run lint`)

### Database

- Custom tables use the prefix `{$wpdb->prefix}purecart_`
- All queries use `$wpdb->prepare()`
- Direct queries require a `// phpcs:ignore` comment with a justification

---

## Branch Naming

| Type | Pattern | Example |
|------|---------|---------|
| Bug fix | `fix/short-description` | `fix/license-activation-limit` |
| New feature | `feature/short-description` | `feature/bundle-download-tokens` |
| Refactor | `refactor/short-description` | `refactor/order-handler-cleanup` |
| Documentation | `docs/short-description` | `docs/rest-api-endpoints` |
| Build / tooling | `chore/short-description` | `chore/update-webpack-config` |

---

## Commit Messages

Use the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
type(scope): short summary in present tense

Optional longer description explaining what and why.
```

**Types:** `feat`, `fix`, `refactor`, `docs`, `chore`, `test`, `style`

**Scopes:** `licensing`, `downloads`, `saas`, `api`, `admin`, `commerce`, `dashboard`, `build`

**Examples:**

```
feat(licensing): add lifetime plan type to license generator
fix(downloads): correct token expiry check for UTC timestamps
chore(build): add @tailwindcss/postcss to devDependencies
```

---

## Submitting a Pull Request

1. Ensure `composer cs` passes with zero errors.
2. Test on a clean WordPress installation with `WP_DEBUG` set to `true`.
3. If your change touches order-related code, verify WooCommerce HPOS compatibility.
4. Fill out the pull request template completely — incomplete PRs may be closed.
5. Keep PRs focused. One logical change per PR.
6. Do not open a PR against `main` for large features without discussing it in an issue first.

---

## Reporting Bugs

Open a [GitHub issue](https://github.com/theaminulai/purecart/issues) and include:

- WordPress version
- WooCommerce version
- PHP version
- Steps to reproduce
- Expected vs actual behaviour
- Any relevant error messages or logs (`WP_DEBUG` output)

---

## Requesting Features

Open a [GitHub issue](https://github.com/theaminulai/purecart/issues) with the label `enhancement`. Describe the use case clearly — what problem it solves and who benefits.

---

## License

By contributing, you agree that your code will be licensed under the [GPLv3 or later](https://www.gnu.org/licenses/gpl-3.0.html), the same license as PureCart for WooCommerce.
