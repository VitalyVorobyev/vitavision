# Auth & User Management Guide

How to use the Clerk-based auth system, and the limits of the current Cloudflare Pages deployment.

## How to use it

### Inviting people
1. Open `/admin/users` (or go directly to [dashboard.clerk.com](https://dashboard.clerk.com/)).
2. **Users → Invite** → enter email. They get an email with a sign-in link.
3. First time they click it, they pick Google or GitHub (whichever matches the email).
4. To make someone admin: click the user → **Public metadata** → `{"role": "admin"}`. They must sign out + back in for the role to take effect on their session.

### Marking content
- **Public post** — nothing to do.
- **Members-only post** — add `access: members` to the post's frontmatter. Rebuild. Lock icon appears on the index; signed-out visitors see the gate.
- **Draft** — add `draft: true` to frontmatter. Hidden from public Blog + treated as 404 for `/blog/:slug`. Visible in `/admin/drafts`.

### Admin area
- `/admin` redirects to `/admin/drafts`. Sidebar has Drafts, Users, Analytics.
- Non-admin visitors get a `NotFound` page (not a redirect — intentional, so the URL doesn't reveal the admin area exists).

### Signing yourself in
- Click **Sign in** in the navbar → modal with Google / GitHub buttons.
- `UserButton` avatar replaces it after sign-in. Opens a popover with "Sign out".

## What's possible with this setup

- **Client-side identity**: who the user is, their role, their email — all available via `useUser()` / `useAuth()` / `useIsAdmin()` in any React component.
- **Soft-gating blog content**: a non-technical reader sees the gate; a determined one with devtools can still see the post body in the JS bundle. That's by design.
- **Admin-only UI**: any `/admin/*` page. Routes, buttons, and entire pages can be conditionally rendered. Works great for in-app dashboards and moderation tools — as long as the data they operate on is either static (repo) or fetched from a third-party API whose auth is independent.
- **Role checks in components**: `const isAdmin = useIsAdmin()` → render different UI per role.
- **Audit log of sign-ins**: Clerk dashboard keeps it.

## What's NOT possible without adding a Worker / backend

Cloudflare Pages serves static assets. There's no server-side code, so anything requiring a server is out:

- **True content privacy.** Members-only post bodies are in the JS bundle — anyone can extract them from devtools, the build output, or an archive. If you ever write a post that truly must not leak, you need a CF Worker that verifies a Clerk JWT and streams the content from R2.
- **Per-user data storage.** No database means no saved editor sessions, no per-user galleries, no bookmarks, no comments. Everything a user does lives in their browser (localStorage / IndexedDB) and is lost if they switch devices.
- **Server-side role enforcement.** A user could edit JS in devtools to bypass `RequireAdmin` and see the admin pages. It doesn't matter — the admin pages only *display* data that's already in the repo + link to Clerk's own dashboard. There's nothing destructive to protect. But if you ever add an admin action that *does something* (send email, mutate state), that action must live behind a Worker that re-verifies the session server-side. Client-side `RequireAdmin` is UX, not security.
- **Invite-by-admin from inside the app.** Creating an invite requires Clerk's **secret** backend API key, which cannot ship to the client. You'd need a Worker proxy. For now, invite via Clerk dashboard.
- **Analytics beyond Cloudflare Web Analytics.** Custom per-page metrics, funnels tied to user IDs, etc. need a backend.
- **Custom email from your app.** Password resets and "welcome" emails go through Clerk automatically. Custom transactional email (e.g. "new comment") needs a Worker + an email service.
- **Rate limiting / abuse protection on actions.** You have nothing to rate-limit against because there are no backend endpoints — but this also means you can't add any endpoint-like feature safely without introducing a Worker.

## What this setup is good for

A portfolio / blog with gated long-form content, drafts you preview before publishing, and an admin dashboard that's mostly a landing page pointing at Clerk's hosted tools.

## What it's not good for

A product with user accounts in the traditional sense: saved work, collaboration, comments, subscriptions, anything mutable per user. When you need those, the next step is a Cloudflare Worker + D1 or R2, using Clerk's JWT verification middleware.

## Reference

- Hook: `src/lib/auth/useIsAdmin.ts` — returns `boolean`.
- Guards: `src/components/auth/RequireAuth.tsx`, `src/components/auth/RequireAdmin.tsx`.
- Provider wiring: `src/App.tsx` (CSR) and `src/entry-server.tsx` (SSR).
- CSP allowlist: `public/_headers` (prod response headers) and `index.html` (meta tag, applied in both dev and prod).
- Frontmatter schema: `src/lib/content/schema.ts` — fields `access` (`public` | `members`) and `draft` (`boolean`).
- Env var: `VITE_CLERK_PUBLISHABLE_KEY` in `.env.local` (see `.env.example`).

When moving to a Clerk production instance, add that instance's custom domain (e.g. `clerk.vitavision.com`) to `script-src`, `connect-src`, and `frame-src` in both `public/_headers` and `index.html`.
