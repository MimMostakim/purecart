<!-- Thanks for contributing to PureCart for WooCommerce! Please read the contributing guidelines before submitting:
https://github.com/theaminulai/purecart/blob/main/CONTRIBUTING.md -->

## What?
<!-- Link this PR to its associated issue. Use keywords: Closes, Fixes, or Resolves -->
Closes #<!-- ISSUE-NUMBER -->

<!-- Briefly describe what this PR does. -->

## Why?
<!-- Explain why this change is necessary:
- What problem does it solve?
- What bug or user need does it address?
- Reference any related issues or PRs
-->

## How?
<!-- Describe how this PR implements the solution:
- What approach did you take?
- Any key implementation details or architectural decisions?
-->

## Type of Change
<!-- Check all that apply -->
- [ ] Bug fix
- [ ] New feature
- [ ] Refactor / code quality
- [ ] Performance improvement
- [ ] Security fix
- [ ] Documentation update
- [ ] Build / tooling change

## Areas Affected
<!-- Check all that apply -->
- [ ] License management (`includes/Licensing/`)
- [ ] Order handling (`includes/Commerce/`)
- [ ] Secure downloads (`includes/Downloads/`)
- [ ] SaaS provisioning (`includes/SaaS/`)
- [ ] REST API (`includes/API/`)
- [ ] Admin panel (`includes/Admin/`)
- [ ] Customer dashboard (`includes/CustomerDashboard/`)
- [ ] Database / Activator (`includes/Activator.php`)
- [ ] Frontend assets (`src/`)
- [ ] Build config (`webpack.config.js`, `postcss.config.js`)
- [ ] PHP coding standards (`phpcs.xml`)
- [ ] Plugin metadata (`purecart.php`, `readme.txt`, `composer.json`)

## Testing Instructions
<!-- Step-by-step instructions to verify this PR works correctly -->
1.
2.
3.

<!-- Example for a licensing change:
1. Install the plugin on a clean WordPress + WooCommerce site with WP_DEBUG enabled
2. Create a PureCart Plugin product and complete a test order
3. Confirm a license key is generated and visible under PureCart → Licenses
4. Call POST /wp-json/purecart/v1/license/activate with the key and a domain
5. Verify the activation is recorded and activated_count increments
6. Check the browser console and PHP error log for any errors
-->

## Checklist
- [ ] Code follows the PureCart coding standards (PHP 8.1+, `declare(strict_types=1)`, PSR-4 namespace `PureCart\`)
- [ ] PHPCS passes with no errors (`composer cs`)
- [ ] Tested on a clean WordPress installation with `WP_DEBUG` set to `true`
- [ ] WooCommerce HPOS compatibility verified if order-related code was changed
- [ ] No direct file URLs exposed — all downloads go through PHP streaming
- [ ] All background jobs use Action Scheduler, not raw WP-Cron
- [ ] Text domain `purecart` used in all translatable strings
- [ ] No `__()` calls inside constructors
