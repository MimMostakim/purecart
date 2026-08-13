# PureCart — Code Review Checklist
**Version:** 1.0  
**Status:** Authoritative — use this checklist on every PR / feature branch  

Tick every box before marking code as ready. An unchecked box means something is either broken or needs justification in a comment.

---

## Part A — PHP / WordPress Backend

### A1. File & Structure

- [ ] Every PHP file starts with `<?php` + blank line + `declare(strict_types=1);`
- [ ] No closing `?>` tag in any file
- [ ] `namespace` is declared immediately after `declare(strict_types=1)` — no code between them
- [ ] Namespace matches folder path: `includes/Modules/Licensing/` → `PureCart\Modules\Licensing`
- [ ] Namespace depth is ≤ 3 levels (e.g., `PureCart\Modules\Licensing\Api` is the limit)
- [ ] File name exactly matches class name (`LicenseGenerator.php` → `class LicenseGenerator`)
- [ ] One class per file — no second class, no functions mixed in
- [ ] `use` imports are grouped: (1) PHP built-ins, (2) vendor, (3) PureCart — with a blank line between each group
- [ ] No inline fully-qualified class names in method bodies (use `use` at the top instead)
- [ ] No `PureCart_` prefixed class names (old non-namespaced style)

### A2. Class Conventions

- [ ] Class name is PascalCase and follows the suffix convention (`Module`, `Repository`, `Controller`, `Generator`, `Handler`, `Engine`, `Manager`, `Email`, `Exception`)
- [ ] Class has a `@since` docblock
- [ ] All properties have type declarations (`private string $key` — not `private $key`)
- [ ] Class constants are `UPPER_SNAKE_CASE`
- [ ] No `static` properties used for state — use DI or WP options
- [ ] No magic methods (`__get`, `__set`) — explicit getters/setters only
- [ ] Class is not a God class (≤ 8 public methods; if more, it should be split)
- [ ] Concerns are not mixed: a Repository class does not send emails; a Mailer does not write to DB directly

### A3. Method Conventions

- [ ] All method names are `snake_case`
- [ ] No public/private/protected methods carry a `purecart_` prefix (namespace provides uniqueness)
- [ ] Every parameter has a type declaration
- [ ] Every method has a return type declaration (`void`, `string`, `bool`, `?License`, etc.)
- [ ] Nullable types (`?string`) are used only when `null` is a meaningful return value
- [ ] Method body is ≤ 40 lines of executable code
- [ ] Nesting depth inside method is ≤ 3 levels
- [ ] Methods follow verb-first naming: `get_*`, `create_*`, `validate_*`, `handle_*`, `register_*`, etc.
- [ ] Global functions (if any) are prefixed `purecart_` and exist only in `includes/Helpers/`

### A4. Prefix Strategy

- [ ] Every WP action/filter hook name starts with `purecart_`
- [ ] Every Action Scheduler hook name starts with `purecart_`
- [ ] Every AJAX action name starts with `purecart_`
- [ ] Every WP option key starts with `purecart_` (and is referenced via `OptionKeys::CONSTANT`, not a raw string)
- [ ] Every post/order/user meta key starts with `_purecart_` (and is referenced via `MetaKeys::CONSTANT`)
- [ ] Every database table name is `{$wpdb->prefix}purecart_{name}` — never hard-coded `wp_`
- [ ] Every transient key starts with `purecart_`
- [ ] Every `wp_enqueue_script` / `wp_enqueue_style` handle starts with `purecart-` (hyphen)
- [ ] The JS global object is named `purecartAdmin` (camelCase)
- [ ] PHP defines are `PURECART_NOUN` format
- [ ] Nonce action strings start with `purecart_`
- [ ] No prefix on class methods — `purecart_` on class methods is a bug

### A5. WordPress Hooks

- [ ] All `add_action` / `add_filter` calls are inside `boot()` or `register_hooks()` — never in the constructor, never in a `static` initializer
- [ ] Action hook names follow `purecart_{noun}_{past_tense_verb}` format (e.g., `purecart_license_revoked`)
- [ ] Filter hook names follow `purecart_{noun}` or `purecart_{noun}_{context}` format
- [ ] Priority is `10` unless there is a documented reason to use another value
- [ ] `PHP_INT_MAX` is never used as a priority — use `999` at most
- [ ] Every state-changing operation fires a `do_action('purecart_...')` after it completes
- [ ] Every computed return value that could reasonably be customized passes through `apply_filters('purecart_...')`
- [ ] Custom hooks have a docblock comment above `do_action()` / `apply_filters()` with `@since`, `@param` tags
- [ ] `remove_action` / `remove_filter` is used to remove external plugin hooks only — never to remove PureCart's own hooks from outside

### A6. Database

- [ ] All DB access is inside a `Repository` class — zero raw SQL in modules, controllers, or handlers
- [ ] Every query that includes a variable uses `$wpdb->prepare()` with `%s`, `%d`, `%f` placeholders
- [ ] `$wpdb->insert()`, `$wpdb->update()`, `$wpdb->delete()` are used for DML — no `$wpdb->query()` for DML
- [ ] Format arrays are passed to `insert()` and `update()` (e.g., `['%s', '%d']`)
- [ ] `get_results()` always passes `ARRAY_A` — never returns objects
- [ ] Table names use `$wpdb->prefix . 'purecart_{name}'` — never the hard-coded string `wp_`
- [ ] Table creation uses `dbDelta()` inside `Migrator.php` — never `CREATE TABLE` in a module
- [ ] Schema strings are defined as constants in `Schema.php` — not written inline
- [ ] `dbDelta()` is called on every plugin update (not just activation)
- [ ] Two spaces before each column definition in `CREATE TABLE` strings (required by `dbDelta()`)
- [ ] No trailing comma before the closing `)` in the schema string
- [ ] All tables have: `id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY`, `created_at`, `updated_at`
- [ ] Boolean columns are `TINYINT(1) NOT NULL DEFAULT 0` — not `BOOLEAN`
- [ ] Status columns use `ENUM` with every valid state listed

### A7. HPOS (High-Performance Orders)

- [ ] `get_post_meta()` is never called on an order ID — always use `$order->get_meta(MetaKeys::CONSTANT)`
- [ ] `update_post_meta()` is never called on an order ID — always use `$order->update_meta_data()` + `$order->save()`
- [ ] `delete_post_meta()` is never called on an order — always use `$order->delete_meta_data()`
- [ ] `get_posts(['post_type' => 'shop_order', ...])` is never used — always use `wc_get_orders()`
- [ ] HPOS compatibility is declared in `purecart.php` via `FeaturesUtil::declare_compatibility('custom_order_tables', __FILE__, true)`

### A8. REST API

- [ ] Routes are registered on `rest_api_init` — not `init`
- [ ] Namespace string `'purecart/v1'` is used via `RestApi::NAMESPACE` constant — never as a raw string in route handlers
- [ ] Every route has a `permission_callback` — even public routes return `true` explicitly, never `__return_true`
- [ ] Every route defines an `args` array with `type`, `sanitize_callback`, and `validate_callback` for each parameter
- [ ] `rest_ensure_response()` is used for successful responses — never `wp_send_json()`
- [ ] `WP_Error` is returned for failures — never `wp_die()` from a REST endpoint
- [ ] Error codes follow `purecart_{noun}_{condition}` format
- [ ] HTTP status codes are set: 201 (created), 400 (bad input), 401 (unauthenticated), 403 (forbidden), 404 (not found), 409 (conflict), 422 (validation), 500 (server error)
- [ ] Controllers are thin: they validate + call the repository/service, then format the response — no business logic
- [ ] Raw DB arrays are formatted through `prepare_item_for_response()` before returning

### A9. Security

- [ ] Every admin form submission verifies a nonce (`wp_verify_nonce()`)
- [ ] Every AJAX handler verifies a nonce
- [ ] Nonce field is output with `wp_nonce_field('purecart_{action}', 'purecart_nonce')`
- [ ] POST data is unslashed with `wp_unslash()` before being sanitized
- [ ] Every admin action checks `current_user_can('manage_woocommerce')` or the relevant capability
- [ ] All user input is sanitized at the point of intake (`sanitize_text_field`, `absint`, `sanitize_email`, etc.)
- [ ] All user-facing output is escaped at the point of output (`esc_html()`, `esc_attr()`, `esc_url()`)
- [ ] Cryptographic tokens use `random_bytes()` via the `Crypto` class — never `rand()`, `mt_rand()`, `uniqid()`, or `md5()`
- [ ] `hash_equals()` is used for constant-time string comparison (token validation, signature verification) — never `===` or `strcmp()`
- [ ] Rate limiting is in place on public endpoints (license activation, token refresh) via `RateLimiter`
- [ ] `defined('ABSPATH') || exit;` is the first line of every template and non-class file
- [ ] No user-controlled data is ever passed to `include`, `require`, `eval`, `shell_exec`, or `system`

### A10. Action Scheduler

- [ ] All background jobs use `as_schedule_*` — no `wp_schedule_event()` or `wp_cron` anywhere
- [ ] The group string `'purecart'` is passed to every `as_schedule_*` and `as_unschedule_*` call
- [ ] Action Scheduler handler methods are idempotent (running twice = same result as running once)
- [ ] Every handler checks current state at the start before doing work (cart may have recovered, license may have been revoked since the job was queued)
- [ ] Recurring jobs are unscheduled on plugin deactivation: `as_unschedule_all_actions('', [], 'purecart')`
- [ ] Handler args are simple scalars or small arrays — no large data blobs stored as job args (fetch from DB inside the handler instead)

### A11. Options & Meta Keys

- [ ] No raw option key strings anywhere — always `OptionKeys::CONSTANT`
- [ ] No raw meta key strings anywhere — always `MetaKeys::CONSTANT`
- [ ] `get_option()` / `update_option()` are not called directly from modules or controllers — always go through `Settings::get()` / `Settings::set()`
- [ ] `add_option()` (not `update_option()`) is used in `Installer::set_defaults()` so existing installs are not overwritten

### A12. Emails

- [ ] All plugin emails extend `WC_Email` (directly or via `AbstractEmail`)
- [ ] Every email class sets `$this->id`, `$this->template_html`, `$this->template_plain` in the constructor
- [ ] Email templates live in `templates/emails/` and contain only HTML + variable output — no business logic
- [ ] Templates start with `defined('ABSPATH') || exit;`
- [ ] `do_action('woocommerce_email_header', ...)` and `do_action('woocommerce_email_footer', ...)` are called in every email template
- [ ] Emails are queued via Action Scheduler — not sent inline inside `order_status_changed` hooks

### A13. Translations (i18n)

- [ ] Text domain is always the literal string `'purecart'` — never a variable
- [ ] `load_plugin_textdomain()` is NOT called (WordPress auto-loads for WP.org plugins since 4.6)
- [ ] `__()`, `_e()`, `esc_html__()`, `esc_attr__()` are never called inside a constructor
- [ ] No string concatenation inside a translation function — use `sprintf()` with `%s` placeholders
- [ ] `_n()` is used for any string that depends on a count
- [ ] No database values or option keys are wrapped in translation functions

### A14. Assets

- [ ] Scripts and styles are enqueued only on PureCart admin pages (`is_purecart_page($hook)` check in place)
- [ ] `wp_localize_script()` is called with `'purecartAdmin'` as the object name
- [ ] Localized data includes: `restUrl`, `nonce` (wp_rest nonce), `siteUrl`, `currency`, `locale`, `version`, `modules`
- [ ] Script dependencies use the generated `.asset.php` file from `@wordpress/scripts` build
- [ ] Scripts are enqueued in the footer (`true` as the last argument to `wp_enqueue_script`)

### A15. Activation / Deactivation / Uninstall

- [ ] `register_activation_hook()` calls `Installer::activate()` which: checks PHP/WC versions, runs `dbDelta()`, sets defaults with `add_option()`, schedules AS jobs, flushes rewrite rules
- [ ] `register_deactivation_hook()` only: unschedules AS jobs + flushes rewrite rules — does NOT delete data
- [ ] `uninstall.php` exists and calls `Uninstaller::run()` — guarded by `defined('WP_UNINSTALL_PLUGIN') || exit`
- [ ] `Uninstaller::run()` only deletes data when a "delete all data" user option is enabled
- [ ] Plugin `boot()` is guarded against double-execution with `if (self::$booted) return;`
- [ ] WooCommerce availability is checked before booting: `if (!class_exists('WooCommerce')) { admin_notice + return; }`

---

## Part B — React / TypeScript Frontend

### B1. Component Structure

- [ ] All components are functional (arrow function or named function expression) — no class components
- [ ] Each component file exports a single default component
- [ ] Component name is PascalCase and matches the file name
- [ ] Props interface is defined above the component and named `{ComponentName}Props`
- [ ] No component has more than ~150 lines — if longer, extract sub-components or custom hooks
- [ ] No `any` type used — all props, state, and API responses are typed
- [ ] No `// @ts-ignore` or `// @ts-nocheck` comments

### B2. TypeScript

- [ ] All interfaces are in `src/app/types/` — not defined inline in component files
- [ ] API response shapes match the PHP REST API `prepare_item_for_response()` output
- [ ] Enums are used for string literal unions with a fixed set of values (e.g., `DownloadStatus`, `UpdateChannel`)
- [ ] No implicit `any` — all function parameters and return types are typed
- [ ] No `as unknown as X` double-cast without a comment explaining why

### B3. Material Design 3 — Design System

- [ ] All colors come from the `M3` object imported from `../../utils/static-data` — no hardcoded hex values in JSX/TSX inline styles
- [ ] No Tailwind utility classes in component JSX — only in layout/grid wrappers during the migration phase (per `tailwind-removal-plan.md`)
- [ ] BEM class names are used for custom SCSS — no new `style={{ ... }}` blocks that duplicate what a BEM class already covers
- [ ] No third-party icon library other than `lucide-react` — no Font Awesome, no HeroIcons, no MUI icons
- [ ] All Lucide icons are sized consistently: 16px in chips/badges, 20px in table cells, 24px in sidebar nav, 32px+ in KPI cards
- [ ] Buttons use the correct MD3 variant: `<FilledButton>` (primary action), `<TonalButton>` (secondary), `<OutlinedButton>` (tertiary/neutral), `<TextButton>` (low-emphasis), `<IconButton>` (icon-only)
- [ ] Danger actions use `danger={true}` prop on the button and `<ConfirmDialog danger>` — never a plain `onClick` without confirmation
- [ ] `<StatusBadge>` is used for all status displays — no custom inline badge divs for status

### B4. State Management

- [ ] All local UI state is managed with `useState` — no Redux, no Zustand, no MobX
- [ ] Global state (current user, active modules) uses Context API via the existing context providers
- [ ] `useEffect` dependency arrays are complete — no missing deps that would cause stale closures
- [ ] Every `useEffect` that sets state checks `isMounted` or uses an `AbortController` to prevent state updates on unmounted components
- [ ] State updates after mutations are optimistic: local state is updated immediately on API success, reverted on failure
- [ ] No page reload to reflect state changes — all mutations update React state after a successful API response

### B5. API Calls

- [ ] All fetch calls include `'X-WP-Nonce': window.purecartAdmin.nonce` in headers
- [ ] All fetch calls use `window.purecartAdmin.restUrl` (or `window.purecartAdmin.apiBase`) as the base — no hardcoded `/wp-json/` URLs
- [ ] API functions live in `src/app/utils/api/` — not inline inside components
- [ ] Every fetch call has a `.catch()` or `try/catch` — no unhandled promise rejections
- [ ] API errors display a `<Toast>` with the error message — never `console.error()` alone
- [ ] Loading state is tracked with `const [loading, setLoading] = useState(true)` — skeleton screens are shown while `loading === true`
- [ ] No loading spinners — skeleton screens only (per design guideline)

### B6. Skeleton Screens

- [ ] While `loading === true`, the component renders skeleton elements with the `skeleton` class
- [ ] Skeleton elements approximate the shape of the real content (stat card → `skeleton--stat`, table row → `skeleton--row`)
- [ ] The number of skeleton rows/cards matches the expected page size (e.g., 10 row skeletons for a 10-per-page table)
- [ ] Skeletons disappear only when `loading === false` and data is ready — no flash of empty state

### B7. Tables

- [ ] All admin data tables are inside a `<Card>` component
- [ ] Tables have: checkbox column (select), data columns, actions column (`<ActionDropdown>` or `<RowActionMenu>`)
- [ ] Row hover state is implemented with `onMouseEnter` / `onMouseLeave` toggling background to `M3.surfaceContainerHigh`
- [ ] Row selection highlights with `${M3.primary}14` (8% alpha) background
- [ ] Pagination footer shows "Showing N of total" and prev/next/page-number buttons
- [ ] Bulk action bar appears only when ≥ 1 row is selected

### B8. Destructive Actions

- [ ] Every destructive action (revoke, delete, rollback, bulk revoke) shows a `<ConfirmDialog>` before executing
- [ ] `<ConfirmDialog danger={true}>` is used for all irreversible actions — never for non-destructive actions
- [ ] The confirm dialog body shows the specific item being affected (e.g., license key, version number) — not just a generic message
- [ ] The cancel button in the dialog is a `<TextButton>` or `<OutlinedButton>` — the confirm button is `<FilledButton danger>`

### B9. Filter Bar

- [ ] Every list page has a search `<input>` and at least one `<FilterChip>` group
- [ ] Filter state is local (not in URL params) — clearing filters resets to `'All'`
- [ ] A "Clear all" button appears when any filter is non-`'All'`
- [ ] Changing a filter resets `currentPage` to `1`

### B10. Accessibility

- [ ] All interactive elements have an accessible label: `aria-label` on `<IconButton>`, `htmlFor` on `<label>`, `alt` on `<img>`
- [ ] `<ConfirmDialog>` traps focus inside the dialog when open, restores focus to the trigger on close
- [ ] Keyboard navigation works for the sidebar nav and `<ActionDropdown>` (arrow keys, Enter, Escape)
- [ ] Color is not the only indicator of status — every `<StatusBadge>` combines color + text label (+ icon optionally)
- [ ] No `onClick` on non-interactive elements (`<div onClick>`) — use `<button>` or `<a>` with `role`

### B11. Performance

- [ ] No inline object/array literals in JSX that recreate on every render (e.g., `style={{ color: M3.primary }}` inside a `.map()` — move out or use useMemo)
- [ ] `.map()` keys are stable unique IDs (`key={item.id}`) — never `key={index}` in lists that can be reordered or filtered
- [ ] Large lists are paginated — no rendering of 500+ rows at once
- [ ] `useCallback` is used on event handlers passed as props to memoized child components
- [ ] No `console.log` / `console.warn` left in production code

---

## Part C — Integration & End-to-End

### C1. REST Endpoint Wiring

- [ ] Every REST route consumed by React (`fetch('/wp-json/purecart/v1/...')`) has a matching `register_rest_route()` in `RestApi.php`
- [ ] HTTP method matches: `GET` endpoints in React use the same method registered in PHP (`READABLE`)
- [ ] Route parameters match: `(?P<id>\d+)` in PHP → `${id}` in the JS URL string
- [ ] The `args` array in PHP matches what the React fetch actually sends as query params or body
- [ ] PHP response shape (field names, nesting) matches the TypeScript interface used in React

### C2. wp_localize_script ↔ window.purecartAdmin

- [ ] `window.purecartAdmin.restUrl` is used correctly (ends with `/`) — the JS code doesn't double-slash
- [ ] `window.purecartAdmin.nonce` is the wp_rest nonce — not a custom action nonce
- [ ] `window.purecartAdmin.modules` array is used to conditionally hide/show module-gated sections in React (e.g., JWT section hidden when `modules.jwt === false`)
- [ ] Any new field added to `wp_localize_script` is also added to the corresponding TypeScript `declare global` or `Window` interface extension

### C3. Nonce Flow

- [ ] The PHP side calls `wp_create_nonce('wp_rest')` and passes it via `wp_localize_script`
- [ ] The React side sends `'X-WP-Nonce': window.purecartAdmin.nonce` in every authenticated fetch
- [ ] The PHP REST permission callback does NOT call `wp_verify_nonce()` manually — WP REST API verifies the `X-WP-Nonce` header automatically
- [ ] For My Account PHP forms: `wp_nonce_field('purecart_{action}_{id}', 'purecart_nonce')` is output in the form, and the handler calls `wp_verify_nonce($_POST['purecart_nonce'], 'purecart_{action}_{id}')`

### C4. Module Gating

- [ ] If a module is disabled in `Settings::get(OptionKeys::ACTIVE_MODULES)`, its REST routes are NOT registered
- [ ] The admin sidebar nav item for a disabled module is hidden (PHP side: menu item not added; React side: nav item conditionally rendered based on `window.purecartAdmin.modules`)
- [ ] My Account tab is hidden when the corresponding module is disabled (`purecart_module_active()` check in `menu_items` filter)
- [ ] React components that check `window.purecartAdmin.modules.{module}` fail gracefully if the property is missing (use `?.` optional chaining)

### C5. Download / Update Token Flow

- [ ] Download token is 64-char hex generated by `Crypto::generate_token()` — never a JWT
- [ ] Download token is stored in `{prefix}purecart_downloads` — retrievable instantly without signature verification
- [ ] Update token is HMAC-SHA256 signed — not stored in DB — verified at delivery time
- [ ] Signed update token TTL is 15 minutes — checked at serve time: `payload.exp < time()` → 403
- [ ] Single-use enforcement: download token `download_count` is incremented and checked against `max_downloads`; update signed token JTI is stored in a short-lived transient to prevent reuse

### C6. License Activation Flow

- [ ] License key format is validated against `XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX` before DB lookup
- [ ] Staging domains (matching exempt patterns in `OptionKeys::LICENSING_STAGING_DOMAINS`) do not count against `activation_limit`
- [ ] `LicenseActivator::activate()` returns a typed result object — not a raw bool — so the caller knows the failure reason
- [ ] After activation, `purecart_license_activated` is fired with `($license_id, $domain, $environment)`
- [ ] After deactivation, `purecart_license_deactivated` is fired with `($license_id, $domain)`

---

## Part D — Known Hard Rules (Instant Fail)

These are zero-tolerance items. If any of these are found, the code must not merge until fixed.

- [ ] **No `get_post_meta()` on orders** — always `$order->get_meta()`
- [ ] **No `wp_schedule_event()`** — always Action Scheduler
- [ ] **No `rand()` / `md5()` for security tokens** — always `random_bytes()` via `Crypto` class
- [ ] **No raw SQL outside Repository classes** — controllers and modules must not touch `$wpdb` directly
- [ ] **No raw option key strings** — always `OptionKeys::CONSTANT`
- [ ] **No raw meta key strings** — always `MetaKeys::CONSTANT`
- [ ] **No `load_plugin_textdomain()` call**
- [ ] **No `__()` or any i18n function inside a constructor**
- [ ] **No `echo` in a REST controller** — always return `WP_REST_Response` or `WP_Error`
- [ ] **No `permission_callback` missing from any REST route**
- [ ] **No hardcoded hex color in React JSX** — always `M3.tokenName`
- [ ] **No non-Lucide icons** in the React admin UI
- [ ] **No loading spinner** — skeleton screens only
- [ ] **No destructive action without `<ConfirmDialog>`**
- [ ] **No `key={index}` in a filterable/sortable list**
- [ ] **No unhandled promise rejection** in any fetch call
- [ ] **Plugin folder name `woo-digital-downloads` must never be renamed**

---

## How to Use This Checklist

1. **Open a new PR** → copy this checklist into the PR description under a "Review" section and start ticking
2. **Quick scan mode** — run down Part D first. Any hit = request changes immediately before reading further
3. **Backend PR** — complete Parts A + C
4. **Frontend PR** — complete Parts B + C
5. **Full-stack PR** — complete all four parts
6. **For each unchecked box** — add a code comment referencing the line number and what is wrong, not just "fix this"
