# BeckYards — Project Handoff

Living status doc for the BeckYards Landscaping & Design website.

_Last updated: 2026-09-13_

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
- **Not deployed to Vercel yet.** No public URL exists for this site at all yet — that's the very next step before the domain can be touched.
- **Domain (`beckyards.com`) has not been touched.** It's still fully on Shopify. Nothing about this project changes that until the user explicitly says to point DNS at the new site.

## How this project's accounts are separated from Oskelo

This was a deliberate, explicit decision by the user (see task log) after the very first version of this site was accidentally set up under the Oskelo GitHub/Supabase accounts. Everything was migrated to fresh, separate accounts:

- **GitHub:** account `beckyards` (created 2026-09-13), not `oskeloco-stack`.
- **Supabase:** its own account, org "BeckYards", not the "oskelo.com" org. To have Claude work on this database, the Supabase connector in Claude's settings must be switched to the BeckYards account (Settings → Connectors → Supabase → reconnect, logging into the BeckYards Supabase account) — switching it away from whatever Oskelo has connected, and vice versa when work shifts back to Oskelo. There is no way to have both connected simultaneously.
- **A leftover, empty, orphaned Supabase project** for BeckYards still technically exists under the *Oskelo* Supabase org (`cidhpivtuloosndxvire`) from before the migration — harmless (nothing points to it anymore) but worth deleting eventually next time the Oskelo Supabase account is connected.

## Outstanding / next steps

- [ ] **Push the 1 pending local commit to GitHub.** `git push origin main` has been hanging/failing on a credential prompt (Windows Credential Manager, `beckyards` GitHub account) — worked several times earlier in the session via a classic Personal Access Token (`ghp_...`, generated at Settings → Developer settings → Personal access tokens → Tokens (classic), with the `repo` scope checked), then stopped working. **Next session: ask the user for a fresh classic token if this recurs**, push with `git remote set-url origin https://beckyards:<token>@github.com/beckyards/beckyards-website.git`, push, then immediately `git remote set-url origin https://github.com/beckyards/beckyards-website.git` to scrub the token back out of the git config. Fine-grained PATs were tried first and do **not** reliably work for git push even when the API reports push access — use classic tokens for this repo.
- [ ] **Deploy to Vercel.** No public URL exists yet. User said: "tomorrow I will launch the website and get my domain from Shopify" — so next session should walk through creating a Vercel project connected to `github.com/beckyards/beckyards-website`, adding the same env vars from `.env.local` (including `SUPABASE_SERVICE_ROLE_KEY`), and confirming the deployed site works before touching DNS.
- [ ] **Point `beckyards.com` at the new site**, replacing Shopify — only after Vercel deployment is confirmed working, and only with explicit user confirmation immediately before doing it (this takes the Shopify site offline the moment it happens).
- [ ] **Delete the orphaned empty Supabase project** under the Oskelo org (`cidhpivtuloosndxvire`) — needs the Supabase connector switched back to the Oskelo account first.
- [ ] **Decide what to do with the current Shopify site/subscription** once the new site is live and confirmed working (cancel it, keep it dormant, etc. — user's call).
- [ ] **Optional:** the AI-generated Spring+/Green+ placeholder images from the old Shopify site were never added to the new site (only the real logo and hero photo were carried over) — user can supply real job photos instead whenever ready, via the Images admin.

## Task log

Newest first.

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
