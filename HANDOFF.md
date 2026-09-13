# BeckYards — Project Handoff

Living status doc for the BeckYards Landscaping & Design website.

_Last updated: 2026-09-13 (later same day)_

---

## Project

- **What:** Next.js marketing site + admin panel for BeckYards Landscaping & Design, replacing the current Shopify site.
- **Local folder:** `C:\Business\BeckYards\beckyards-website`
- **Repo:** `github.com/beckyards/beckyards-website` — a **separate GitHub account** (`beckyards`), deliberately not connected to the Oskelo business/account.
- **Database:** a **separate Supabase account** (org "BeckYards", project `yvlxgvjlhspvgtytagar`) — also deliberately not connected to Oskelo's Supabase account.
- **Current live site:** `beckyards.com` is still on Shopify. This new site is **not deployed anywhere public yet** — it only exists in this local folder and on GitHub.
- **Local dev:** `npm run dev -- -p 3001` → http://localhost:3001 (port 3001, not 3000, so it can run alongside the Oskelo project).
- **Admin login:** `thebeckyards@gmail.com` at `/admin/login` (password set by the user in Supabase; not stored here).

## Current state

- **Site built and working end-to-end:** Home, Services (6 pages), Programs (Green+, Spring+, Community+), Contact, Terms, and a dedicated Aeration & Overseeding Signup flow.
- **Admin panel working:** Dashboard, Analytics, Messages, Aeration List, Images, Content — same architecture as Oskelo's admin, ported over and adapted (green branding instead of brown, BeckYards' own content).
- **The Aeration List admin page is already in real use** — as of this writing it has **5 real customer signups already in it** (Justin West, Andy Choi, Frank Koerber, Carlos Agosto, Burt Kirchner) with real prices the user has already entered ($150, $140, $150, $120, $180). **Always be careful with this table** — it is not test data, and any SQL/testing against the `aeration_signups` table must use an unmistakable test name (this session used `_verify-*` prefixes) and clean up immediately after, the same convention used on the Oskelo project.
- **`.env.local` has real, working values** for `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `ADMIN_EMAIL=thebeckyards@gmail.com` — the admin panel fully works locally right now.
- **Local git is 1 commit ahead of GitHub** (`9f0b7fe`, "Aeration signup: only name and phone required, email/address optional" — not yet pushed). **Nothing is lost** — it's safely committed in the local repo — it just hasn't reached GitHub yet because of a git push authentication issue (see Outstanding below).
- **Deployed to Vercel and live** at `https://beckyards.vercel.app` (Vercel Pro, own separate `beckyards` Vercel account/team — same account-separation principle as GitHub/Supabase). `beckyards.com` and `www.beckyards.com` are both added as custom domains on the Vercel project.
- **Domain migration to Vercel is in progress.** `beckyards.com` was on Shopify with Shopify's default nameservers (backed by Google Cloud DNS). To keep DNS control independent of Shopify (so canceling the Shopify store subscription later can't break the site or risk the domain), DNS was moved to a **brand-new, separate Cloudflare account** (`thebeckyards@gmail.com`, not connected to Oskelo). Shopify's nameservers were switched to Cloudflare's (`addilyn.ns.cloudflare.com`, `bradley.ns.cloudflare.com`) — propagation can take a few hours up to 24. Once active, Cloudflare needs these DNS records to point at Vercel (already entered, set to "DNS only" so Vercel can issue its own SSL cert):
  - `A` record `@` → `76.76.21.21`
  - `CNAME` record `www` → `cc362e897d69ecf4.vercel-dns-017.com.`
  - The Shopify-created `AAAA` record was deleted; `CNAME account` (Shopify customer accounts) and the `_provider` TXT record were left untouched.
  - **Domain registration itself is still with Shopify** — only DNS moved. The store subscription and domain registration can be dealt with separately later; do not fully close the Shopify account until domain registration is either kept paid there or transferred elsewhere (see Outstanding).
- **New admin feature: Route** (nav label "Route", URL still `/admin/mowing-route`) — two crew groups (Group A / Group B), each a table of clients (name, address, phone, price, mowing height in 0.25" increments from 2"–5", and a payment type dropdown: Venmo/Cash/Check/Bill), click-to-edit-in-place on every text field, drag-and-drop reordering per group, and a small copy-icon button on each Group A row that duplicates that client into Group B (one-way, A→B only, per what was asked) — same proven UI pattern as the Aeration List. Backed by a new `mowing_clients` Supabase table (service-role-only access, no public policy — this is an internal tool, not a public form). Built and verified via the local dev server with a temporary `LOCAL_DEBUG_ADMIN_BYPASS` (added, tested, then fully removed each time — verified 0 matches across the codebase before finishing). **The user started using this for real client data locally the same day it was built** (Preston K., Jeff P., Jeff G. already entered — real data, left untouched during testing). **Not yet committed to git or deployed to Vercel** — exists only in the local working tree as of this writing, so it's only reachable by running the local dev server (`npm run dev -- -p 3001`) — not yet on the live/production site.

## How this project's accounts are separated from Oskelo

This was a deliberate, explicit decision by the user (see task log) after the very first version of this site was accidentally set up under the Oskelo GitHub/Supabase accounts. Everything was migrated to fresh, separate accounts:

- **GitHub:** account `beckyards` (created 2026-09-13), not `oskeloco-stack`.
- **Supabase:** its own account, org "BeckYards", not the "oskelo.com" org. To have Claude work on this database, the Supabase connector in Claude's settings must be switched to the BeckYards account (Settings → Connectors → Supabase → reconnect, logging into the BeckYards Supabase account) — switching it away from whatever Oskelo has connected, and vice versa when work shifts back to Oskelo. There is no way to have both connected simultaneously.
- **A leftover, empty, orphaned Supabase project** for BeckYards still technically exists under the *Oskelo* Supabase org (`cidhpivtuloosndxvire`) from before the migration — harmless (nothing points to it anymore) but worth deleting eventually next time the Oskelo Supabase account is connected.

## Outstanding / next steps

- [ ] **Commit and push the Mowing Route feature to GitHub**, then redeploy on Vercel (it currently only exists in the local working tree — new table, new API route, new admin page/nav entry, Dashboard card). Push to `github.com/beckyards/beckyards-website` using the classic PAT approach below if the credential prompt issue recurs.
- [ ] **Confirm the Cloudflare nameserver switch has finished propagating** (check for Cloudflare's activation email to `thebeckyards@gmail.com`), then confirm `beckyards.com` shows "Valid Configuration" in the Vercel project's Domains settings.
- [ ] **Verify `beckyards.com` actually loads the new site** once DNS is active, in a few different browsers/devices if possible (propagation can be uneven for a bit).
- [ ] **Decide on the full domain registrar transfer** (Shopify → Cloudflare Registrar) for complete independence from Shopify — optional, not urgent, takes 5–7 days (unlock domain, get auth code, ICANN confirmation emails). Not required for the site to work; only relevant if the user wants to fully close the Shopify account someday.
- [ ] **Decide what to do with the current Shopify site/subscription** once the new site is confirmed live on the real domain (cancel just the store plan, keep domain billing there, etc. — user's call, and don't fully delete the Shopify account until domain registration is handled one way or another).
- [ ] **Delete the orphaned empty Supabase project** under the Oskelo org (`cidhpivtuloosndxvire`) — needs the Supabase connector switched back to the Oskelo account first.
- [ ] **Optional:** the AI-generated Spring+/Green+ placeholder images from the old Shopify site were never added to the new site (only the real logo and hero photo were carried over) — user can supply real job photos instead whenever ready, via the Images admin.
- [ ] **Open, unresolved bug report:** user saw `TypeError: Cannot convert argument to a ByteString because the character at index 8 has a value of 8226 which is greater than 255.` on the live `/admin/aeration` page (character 8226 = U+2022 bullet "•"). Could not reproduce locally in dev or production build/start, with or without the debug auth bypass. Likely tied to the user's real authenticated session or a browser extension, not a code path found in this repo. Deprioritized by the user in favor of the domain migration — still needs the user to answer: did the page still load past the error, was it a console error or an on-page crash, and what browser/extensions were active.
- [ ] **Git push note:** `git push origin main` has previously hung/failed on a Windows Credential Manager prompt for the `beckyards` GitHub account. Fix that has worked: generate a classic PAT (GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic), `repo` scope), push with `git remote set-url origin https://beckyards:<token>@github.com/beckyards/beckyards-website.git`, push, then immediately `git remote set-url origin https://github.com/beckyards/beckyards-website.git` to scrub the token back out. Fine-grained PATs do **not** reliably work for git push on this repo even when the API reports push access.

## Task log

Newest first.

### 2026-09-13 (later) — Launched to Vercel, started domain migration, added Mowing Route

- **Deployed the site to Vercel** under a new, separate `beckyards` Vercel account/team (Pro plan) connected to `github.com/beckyards/beckyards-website`, with all `.env.local` values added as Vercel env vars. Hit a stuck "Project created" screen with no deployment; fixed by pushing an empty commit to re-trigger GitHub's webhook, which produced a successful build. Live at `https://beckyards.vercel.app`.
- **Started the domain migration off Shopify.** Added `beckyards.com` and `www.beckyards.com` as custom domains in the Vercel project. Per the user's request to not risk losing the domain if the Shopify subscription is ever canceled, set up DNS on a **new, separate Cloudflare account** (`thebeckyards@gmail.com`) rather than editing Shopify's DNS directly: imported Shopify's existing DNS records into Cloudflare, updated the `A` and `www` `CNAME` records to point at Vercel, deleted the stale `AAAA` record, left `account` CNAME and the `_provider` TXT record alone, then switched Shopify's nameservers to Cloudflare's. Domain *registration* deliberately stayed with Shopify for now — only DNS moved. Propagation was still pending at the end of this session.
- **Built a new "Mowing Route" admin feature**, requested as two crews' client lists (Group A / Group B), each with name/address/phone/price/mowing-height (2"–5" in 0.25" steps) and drag-and-drop reordering — mirroring the Aeration List's proven UI patterns (click-to-edit-in-place, drag handle, price total). New `mowing_clients` Supabase table (admin-only, no public insert policy needed since there's no public form for this one). Verified end-to-end against the real BeckYards Supabase project using `_verify-`-prefixed rows, all deleted immediately after confirming. Not yet committed/pushed/deployed.
- **State left in:** Vercel deployment live; Cloudflare DNS switch made but not yet confirmed propagated; Mowing Route feature complete locally but uncommitted. See Outstanding above for the exact next steps.

### 2026-09-13 — Full build, account migration, Aeration List features

- **Asked:** build a second website for BeckYards Landscaping & Design (currently on Shopify, no e-commerce needed) using the same Next.js + Supabase admin stack already proven on the Oskelo project.
- **Built the full site** by porting Oskelo's admin infrastructure (auth, media upload, content editor, analytics, messages) and writing BeckYards-specific pages/content: Home, Services (Mowing, Mulching, Bed Redesign, Planting, Seasonal Cleanups, Aeration & Overseeding), Programs (Green+, Spring+), Contact, Terms. Real logo and hero photo pulled from the current Shopify site (with permission); AI-generated placeholder images from Shopify deliberately left out.
- **Mistake made and corrected:** the first Supabase project and first GitHub repo were created under the existing Oskelo accounts without asking. The user caught this ("wait hold up BeckYards is a whole other business... I dont want it connected to oskelo") and everything was migrated to brand-new, separate GitHub and Supabase accounts. **This is now a saved lesson for future sessions** (see the `separate-business-accounts` memory) — always ask about account separation before scaffolding infrastructure for a different business.
- **Added a dedicated Aeration & Overseeding Signup flow**, separate from the general contact form: its own page (`/aeration-signup`), its own database table (`aeration_signups`), and its own admin page ("Aeration List") rather than mixing into the general Messages inbox. Iterated several times based on direct feedback:
  - Nav: converted "Contact" into a dropdown (Get a Quote / Aeration Signup); trimmed the Services and Programs dropdowns to just short names, lightened their text weight/color.
  - Homepage gained a dedicated Aeration & Overseeding section right after the hero (matching the old Shopify site's layout), pulling copy/pricing from the shared services data.
  - Added a third program, "Community+" — flexible, income-based pricing for homeowners who can't necessarily afford standard lawn care.
  - Program headings restructured everywhere: short name ("Green+") as the heading, the longer tagline as a subheading underneath.
  - Phone numbers auto-format as you type ("5551234567" → "(555) 123-4567"), applied to both signup forms.
  - Aeration List admin page gained: drag-and-drop reordering (a `sort_order` column, dragged via a handle), a "Done" checkbox (`completed` column, dims + strikes through the row), a total-of-all-prices footer row, and click-to-edit-in-place on every field (name/phone/email/address) — including a "+ Add email" prompt for signups that came in without one.
  - Relaxed the signup form so only name and phone are required — email and address are optional (the database column was migrated to allow a null address to match).
- **Verified everything against the real, separate BeckYards Supabase project** — every feature was tested with real interactions (not just synthetic events, which turned out to hit a real React timing quirk in headless testing that never occurs with actual clicks/typing) and unmistakably-named test rows, always deleted immediately after. **Discovered mid-session that the Aeration List already had 5 real customer signups in it** with real prices the user had already entered — confirmed the running total matched exactly, then left all 5 rows completely untouched throughout every subsequent round of testing. Also one-time-fixed one real customer's (Justin West) phone number formatting, since his signup predated the auto-formatting feature.
- **State left in:** all work committed locally; GitHub is 1 commit behind local (`9f0b7fe` not yet pushed — see Outstanding, a git-credential issue, not a code issue). Nothing deployed publicly yet. User's plan: "tomorrow I will launch the website and get my domain from Shopify."
