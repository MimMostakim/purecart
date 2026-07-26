# TopBar

The plugin's top app bar (M3 Top App Bar). Shows a breadcrumb trail (built from the current `page`), the page title from `PAGE_TITLES`, and right-aligned Help/Notifications icon buttons plus a user avatar initials badge.

Source: [`TopBar.tsx`](../../src/app/components/ui/TopBar.tsx)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `page` | `Page` | — | Current page id, drives both the breadcrumb trail and the `<h1>` title |
| `onNav` | `(p: Page) => void` | — | Called when a clickable breadcrumb segment is clicked |

## Behavior

- Breadcrumbs are hand-built per page/page-family (analytics sub-pages, detail pages like `customer-detail`, `saas-detail`, `affiliate-detail`, `license-summary`, `license-detail`) — adding a new detail page requires adding a branch to this logic.
- The avatar badge is currently static (`"AD"` initials, hardcoded) — not wired to a real user.
- Uses [IconButton](IconButton.md) for Help and Notifications.

## Usage

```tsx
import { TopBar } from "../ui";

<TopBar page={page} onNav={setPage} />
```

## Related

Pairs with [Sidebar](Sidebar.md) to form the plugin's page chrome.
