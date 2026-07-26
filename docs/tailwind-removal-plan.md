# Removing Tailwind CSS — Plan

## 1. Current setup (what's actually there)

- Tailwind is only used inside the React admin dashboard, entry point [src/main.tsx](../src/main.tsx) → [src/app/App.tsx](../src/app/App.tsx) (single 9,000-line component file).
- CSS import chain: `main.tsx` → [src/styles/index.css](../src/styles/index.css) → [src/styles/tailwind.css](../src/styles/tailwind.css) (`@import 'tailwindcss' source(none)` + `@source '../**/*.{js,ts,jsx,tsx}'` + `@import 'tw-animate-css'`) + [src/styles/fonts.css](../src/styles/fonts.css) (Google Fonts `@import`).
- [src/styles/globals.css](../src/styles/globals.css) is **empty** — safe to reuse or delete.
- No `tailwind.config.js` / `postcss.config.js` exist — this is Tailwind v4's CSS-first config, and there's no `@theme` override, so every class below uses **Tailwind's default theme values**.
- Webpack (`webpack.config.js`) compiles `main.tsx` (which pulls in the CSS import chain) into `build/admin/admin.css` + `build/admin/admin.js`, both enqueued by `includes/Admin/Admin.php`.
- `assets/css/admin.css` is a **separate, hand-written, non-Tailwind stylesheet** for legacy admin markup — not affected by this removal.
- Good news that makes this low-risk:
  - `clsx` and `tailwind-merge` are declared as dependencies but **never imported/called** anywhere in the source.
  - `tw-animate-css` classes (`animate-*`, `fade-*`, `slide-*`, etc.) are **never used**.
  - No arbitrary color utilities (`bg-blue-500`, `text-[#...]`, etc.) — only `bg-transparent`, `border-white`, `text-white`. All real colors are already applied via inline `style={{ color: M3.primary, ... }}`, not Tailwind.
  - Only one arbitrary-value class exists: `min-h-[600px]`.
  - Only two classes use a `/` fraction: `left-1/2` and `-translate-x-1/2` (always paired together, in 2 places).
  - Only 4 classes involve pseudo-selectors: `hover:opacity-100`, `hover:underline`, `group-hover:opacity-100` (+ `group`), `first:mt-0`.
  - 1,461 `className="..."` occurrences in App.tsx boil down to only **203 unique class tokens**.

Because the class list is small, static, and has no dynamic/conditional class construction (no `clsx(...)`/template-literal class building except one harmless case), the cheapest and safest removal path is: **stop compiling Tailwind, and instead ship a small hand-written CSS file that defines the same class names as plain CSS rules.** This means `App.tsx` barely needs to change — only 2 lines with fraction-based classes need renaming.

## 2. Step-by-step removal plan

1. **Add a replacement stylesheet.**
   Create `src/styles/utilities.css` containing the plain-CSS rules listed in §3 below (one selector per Tailwind class actually used). Reuse `src/styles/globals.css` if you'd rather not add a new file — it's currently empty.

2. **Rewire the two fraction-based classes** (the only lines that need a JSX edit), in [src/app/App.tsx](../src/app/App.tsx):
   - Line 1146: `className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 pointer-events-none"`
   - Line 2425: `className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-5 py-3 rounded-2xl z-50"`

   Replace `left-1/2 -translate-x-1/2` with a single new class, e.g. `toast-centered`, and add to your new stylesheet:
   ```css
   .toast-centered {
     left: 50%;
     transform: translateX(-50%);
   }
   ```

3. **Update the CSS entry point.** In [src/styles/index.css](../src/styles/index.css), replace:
   ```css
   @import './fonts.css';
   @import './tailwind.css';
   ```
   with:
   ```css
   @import './fonts.css';
   @import './utilities.css';
   ```

4. **Delete `src/styles/tailwind.css`** (no longer imported by anything).

5. **Remove the packages** from [package.json](../package.json):
   - `devDependencies`: `tailwindcss`
   - `dependencies`: `tailwind-merge`, `tw-animate-css` (confirmed unused above)
   - Leave `clsx` only if you plan to use it for conditional classNames going forward; otherwise remove it too since it's currently unused.

   Then run:
   ```bash
   npm uninstall tailwindcss tailwind-merge tw-animate-css clsx
   ```
   (drop `clsx` from the command if you want to keep it)

6. **Check for a PostCSS/Tailwind plugin wiring.** This project has no `postcss.config.js`, so Tailwind v4's PostCSS plugin isn't separately registered — `@wordpress/scripts`' built-in PostCSS pipeline picks it up only because `tailwindcss` is importable via the `@import 'tailwindcss'` at-rule (Tailwind v4's own Vite/PostCSS plugin auto-registers via `postcss-import`/Lightning CSS in `wp-scripts`). Once step 4's import is gone, there's nothing left for Tailwind to hook into — no extra webpack config change needed. Confirm by checking there's no `tailwindcss` reference left in `webpack.config.js` (there currently isn't).

7. **Rebuild and verify:**
   ```bash
   npm run build
   ```
   Then diff `build/admin/admin.css` before/after — it should shrink from ~912 lines to only your hand-written utilities + fonts, and the dashboard should render pixel-identical since every class has a matching manual rule.

8. **Visually smoke-test the admin dashboard** (all major screens: Dashboard, Licenses, Affiliates, Subscriptions, etc.) to confirm no class was missed. Cross-reference against the full class list in §3 — if you added any Tailwind classes after this audit was taken, re-run the extraction command in §4 to catch them.

## 3. Class → CSS reference (line-by-line swap)

Below is **every unique Tailwind class found in `App.tsx`**, with the literal CSS it resolves to under Tailwind v4's default theme (spacing unit = `0.25rem` = 4px). Put these into `src/styles/utilities.css` as real selectors — since there's no dynamic class construction, the class **names themselves don't need to change** in `App.tsx` (except the two fraction classes in §2 step 2, and note the colon/slash/bracket characters need escaping in real CSS selectors, shown below).

### Layout / display
```css
.absolute      { position: absolute; }
.relative      { position: relative; }
.fixed         { position: fixed; }
.block         { display: block; }
.inline-block  { display: inline-block; }
.flex          { display: flex; }
.inline-flex   { display: inline-flex; }
.grid          { display: grid; }
```

### Flexbox / Grid
```css
.flex-1         { flex: 1 1 0%; }
.flex-col       { flex-direction: column; }
.flex-wrap      { flex-wrap: wrap; }
.flex-shrink-0  { flex-shrink: 0; }

.grid-cols-2  { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.grid-cols-3  { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.grid-cols-4  { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.grid-cols-6  { grid-template-columns: repeat(6, minmax(0, 1fr)); }

.col-span-1  { grid-column: span 1 / span 1; }
.col-span-2  { grid-column: span 2 / span 2; }
.col-span-3  { grid-column: span 3 / span 3; }

.items-center   { align-items: center; }
.items-end      { align-items: flex-end; }
.items-start    { align-items: flex-start; }
.items-stretch  { align-items: stretch; }

.justify-between { justify-content: space-between; }
.justify-center   { justify-content: center; }
.justify-end      { justify-content: flex-end; }

.self-center  { align-self: center; }
.self-start   { align-self: flex-start; }
```

### Gap
```css
.gap-0    { gap: 0px; }
.gap-0\.5 { gap: 0.125rem; }
.gap-1    { gap: 0.25rem; }
.gap-1\.5 { gap: 0.375rem; }
.gap-2    { gap: 0.5rem; }
.gap-2\.5 { gap: 0.625rem; }
.gap-3    { gap: 0.75rem; }
.gap-4    { gap: 1rem; }
.gap-5    { gap: 1.25rem; }
.gap-6    { gap: 1.5rem; }
.gap-8    { gap: 2rem; }
.gap-x-4  { column-gap: 1rem; }
.gap-y-1  { row-gap: 0.25rem; }
```

### Sizing (height / width / min / max)
```css
.h-1     { height: 0.25rem; }
.h-1\.5  { height: 0.375rem; }
.h-2     { height: 0.5rem; }
.h-2\.5  { height: 0.625rem; }
.h-3     { height: 0.75rem; }
.h-4     { height: 1rem; }
.h-5     { height: 1.25rem; }
.h-6     { height: 1.5rem; }
.h-7     { height: 1.75rem; }
.h-8     { height: 2rem; }
.h-9     { height: 2.25rem; }
.h-10    { height: 2.5rem; }
.h-12    { height: 3rem; }
.h-20    { height: 5rem; }
.h-24    { height: 6rem; }
.h-64    { height: 16rem; }
.h-full  { height: 100%; }
.h-screen{ height: 100vh; }

.w-1\.5  { width: 0.375rem; }
.w-2     { width: 0.5rem; }
.w-2\.5  { width: 0.625rem; }
.w-4     { width: 1rem; }
.w-5     { width: 1.25rem; }
.w-7     { width: 1.75rem; }
.w-8     { width: 2rem; }
.w-9     { width: 2.25rem; }
.w-10    { width: 2.5rem; }
.w-12    { width: 3rem; }
.w-20    { width: 5rem; }
.w-full  { width: 100%; }
.w-px    { width: 1px; }

.min-w-0        { min-width: 0px; }
.min-h-\[600px\]{ min-height: 600px; }   /* or rename to .min-h-600 */
.max-w-xs       { max-width: 20rem; }   /* 320px */
.max-w-sm       { max-width: 24rem; }   /* 384px */
```

### Margin
```css
.mb-0\.5 { margin-bottom: 0.125rem; }
.mb-1    { margin-bottom: 0.25rem; }
.mb-1\.5 { margin-bottom: 0.375rem; }
.mb-2    { margin-bottom: 0.5rem; }
.mb-3    { margin-bottom: 0.75rem; }
.mb-4    { margin-bottom: 1rem; }
.mb-5    { margin-bottom: 1.25rem; }

.ml-1    { margin-left: 0.25rem; }
.ml-2    { margin-left: 0.5rem; }
.ml-3    { margin-left: 0.75rem; }
.ml-auto { margin-left: auto; }

.mr-1    { margin-right: 0.25rem; }

.mt-0\.5 { margin-top: 0.125rem; }
.mt-1    { margin-top: 0.25rem; }
.mt-1\.5 { margin-top: 0.375rem; }
.mt-2    { margin-top: 0.5rem; }
.mt-3    { margin-top: 0.75rem; }
.mt-4    { margin-top: 1rem; }
.mt-5    { margin-top: 1.25rem; }
.mt-6    { margin-top: 1.5rem; }

.mx-0    { margin-left: 0px; margin-right: 0px; }
.mx-2    { margin-left: 0.5rem; margin-right: 0.5rem; }
.mx-3    { margin-left: 0.75rem; margin-right: 0.75rem; }
.mx-6    { margin-left: 1.5rem; margin-right: 1.5rem; }
.mx-auto { margin-left: auto; margin-right: auto; }

.my-0\.5 { margin-top: 0.125rem; margin-bottom: 0.125rem; }
.my-1    { margin-top: 0.25rem; margin-bottom: 0.25rem; }
.my-1\.5 { margin-top: 0.375rem; margin-bottom: 0.375rem; }
.my-2    { margin-top: 0.5rem; margin-bottom: 0.5rem; }

.first\:mt-0:first-child { margin-top: 0px; }
```

### Padding
```css
.p-3 { padding: 0.75rem; }
.p-4 { padding: 1rem; }
.p-5 { padding: 1.25rem; }
.p-6 { padding: 1.5rem; }

.pb-1 { padding-bottom: 0.25rem; }
.pb-2 { padding-bottom: 0.5rem; }
.pb-3 { padding-bottom: 0.75rem; }
.pb-4 { padding-bottom: 1rem; }
.pb-5 { padding-bottom: 1.25rem; }
.pb-6 { padding-bottom: 1.5rem; }

.pt-1 { padding-top: 0.25rem; }
.pt-2 { padding-top: 0.5rem; }
.pt-3 { padding-top: 0.75rem; }
.pt-4 { padding-top: 1rem; }
.pt-6 { padding-top: 1.5rem; }

.px-1\.5 { padding-left: 0.375rem; padding-right: 0.375rem; }
.px-2    { padding-left: 0.5rem; padding-right: 0.5rem; }
.px-3    { padding-left: 0.75rem; padding-right: 0.75rem; }
.px-4    { padding-left: 1rem; padding-right: 1rem; }
.px-5    { padding-left: 1.25rem; padding-right: 1.25rem; }
.px-6    { padding-left: 1.5rem; padding-right: 1.5rem; }

.py-0\.5 { padding-top: 0.125rem; padding-bottom: 0.125rem; }
.py-1    { padding-top: 0.25rem; padding-bottom: 0.25rem; }
.py-1\.5 { padding-top: 0.375rem; padding-bottom: 0.375rem; }
.py-2    { padding-top: 0.5rem; padding-bottom: 0.5rem; }
.py-2\.5 { padding-top: 0.625rem; padding-bottom: 0.625rem; }
.py-3    { padding-top: 0.75rem; padding-bottom: 0.75rem; }
.py-3\.5 { padding-top: 0.875rem; padding-bottom: 0.875rem; }
.py-4    { padding-top: 1rem; padding-bottom: 1rem; }
.py-5    { padding-top: 1.25rem; padding-bottom: 1.25rem; }
.py-16   { padding-top: 4rem; padding-bottom: 4rem; }
```

### Positioning
```css
.inset-0  { top: 0px; right: 0px; bottom: 0px; left: 0px; }
.left-0   { left: 0px; }
.right-0  { right: 0px; }
.bottom-6 { bottom: 1.5rem; }
.z-30     { z-index: 30; }
.z-40     { z-index: 40; }
.z-50     { z-index: 50; }

/* left-1/2 + -translate-x-1/2 → replace both with one class (see §2 step 2) */
.toast-centered { left: 50%; transform: translateX(-50%); }
```

### Typography
```css
.text-xs   { font-size: 0.75rem; line-height: 1rem; }
.text-sm   { font-size: 0.875rem; line-height: 1.25rem; }
.text-base { font-size: 1rem; line-height: 1.5rem; }
.text-lg   { font-size: 1.125rem; line-height: 1.75rem; }
.text-xl   { font-size: 1.25rem; line-height: 1.75rem; }
.text-2xl  { font-size: 1.5rem; line-height: 2rem; }
.text-3xl  { font-size: 1.875rem; line-height: 2.25rem; }
.text-5xl  { font-size: 3rem; line-height: 1; }

.font-light    { font-weight: 300; }
.font-normal   { font-weight: 400; }
.font-medium   { font-weight: 500; }
.font-semibold { font-weight: 600; }
.font-bold     { font-weight: 700; }

.leading-none    { line-height: 1; }
.leading-tight   { line-height: 1.25; }
.leading-snug    { line-height: 1.375; }
.leading-relaxed { line-height: 1.625; }

.text-left      { text-align: left; }
.text-center    { text-align: center; }
.text-right     { text-align: right; }
.text-white     { color: #fff; }
.uppercase      { text-transform: uppercase; }
.capitalize     { text-transform: capitalize; }
.tracking-widest{ letter-spacing: 0.1em; }

.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.whitespace-nowrap   { white-space: nowrap; }
.whitespace-pre-wrap { white-space: pre-wrap; }

.hover\:underline:hover { text-decoration: underline; }
```

### Borders / radius / background
```css
.bg-transparent { background-color: transparent; }
.border-4       { border-width: 4px; }
.border-white   { border-color: #fff; }

.rounded-lg   { border-radius: 0.5rem; }
.rounded-xl   { border-radius: 0.75rem; }
.rounded-2xl  { border-radius: 1rem; }
.rounded-3xl  { border-radius: 1.5rem; }
.rounded-full { border-radius: 9999px; }
```

### Effects / opacity
```css
.shadow-sm { box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); }
.shadow-xl { box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1); }

.opacity-0  { opacity: 0; }
.opacity-40 { opacity: 0.4; }
.opacity-50 { opacity: 0.5; }
.opacity-60 { opacity: 0.6; }

.hover\:opacity-100:hover { opacity: 1; }
.group:hover .group-hover\:opacity-100 { opacity: 1; }
```

### Interactivity / overflow
```css
.cursor-default { cursor: default; }
.cursor-pointer { cursor: pointer; }
.outline-none   { outline: none; }
.pointer-events-none { pointer-events: none; }
.resize-none    { resize: none; }

.overflow-hidden  { overflow: hidden; }
.overflow-x-auto  { overflow-x: auto; }
.overflow-y-auto  { overflow-y: auto; }
```

### Transitions
```css
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}
.transition-opacity {
  transition-property: opacity;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}
.duration-200 { transition-duration: 200ms; }
.duration-300 { transition-duration: 300ms; }
```

### `group` marker
```css
/* .group itself needs no rules — it's only a hook for .group:hover child selectors above */
```

## 4. How to re-verify this list yourself later

If `App.tsx` changes before you do the removal, re-extract the class list to make sure nothing in §3 is stale:

```bash
grep -oE 'className=\{?"[^"]*"' src/app/App.tsx \
  | sed -E 's/className=\{?"//; s/"$//' \
  | tr ' ' '\n' | grep -v '^$' | sort -u
```

Also re-check for dynamic class construction (would need extra care beyond a static swap):

```bash
grep -n "clsx(\|cn(\|className={\`" src/app/App.tsx
```

## 5. Rollback safety

Nothing here is destructive to Tailwind itself — `tailwindcss` stays in `package-lock.json`'s history via git, and steps 1–5 are all file edits/deletes you can revert with `git checkout` if the visual diff doesn't match. Recommend doing the swap on a branch and comparing screenshots of each dashboard page before/after `npm run build`.
