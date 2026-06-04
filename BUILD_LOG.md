# Watchman Forge — Website Build Log

**Architect session.** Brief: `~/.openclaw/workspace/WEBSITE_SOUL.md` — this is a **movement manifesto**, not a company site. Recruit Watchmen, don't sell to customers. Cinematic, soul-hitting. Forged in Faith. Built for the Future.

---

## Starting state (verified 2026-06-03)

A prior session built a clean, well-engineered static site, but its **soul was wrong**: it read as a generic premium-tech company —
- Brand: "Watchman OS — New Jersey, USA" (should be **Watchman Forge**)
- Hero: "Building The Future One System at a Time" / "We engineer premium software and hardware"
- About: "independent technology company based in New Jersey"
- CTA: "Ready to Connect? / Contact Us"

The **visual system is excellent and cinematic** (Orbitron display, neon blue/purple, glow + gradient tokens in `css/main.css`) — keeping it. The **copy, framing, and brand** are what's off-mission.

Stack: hand-written static HTML/CSS/JS. Vercel-linked (`watchmanforge-website`), GitHub remote `watchmanforge/watchmanforge-website`. Deploy = push to `main` → Vercel auto-deploys.

### Plan (push after each major task)
1. **Homepage** → manifesto/enlistment rewrite + rebrand. ← this task
2. About → full MANIFESTO.
3. Contact → ENLISTMENT (Join the Forge).
4. Product pages → each a tool for the mission (mission taglines from the soul).
5. Legal/meta/brand sweep ("Watchman OS" → "Watchman Forge" everywhere).

---

## Task 1 — Homepage → Manifesto ✅  (deployed & verified live)

Rewrote `index.html` end to end from corporate product-pitch into a movement/enlistment manifesto, keeping the cinematic neon design system:
- **Rebrand** "Watchman OS — New Jersey, USA" → **Watchman Forge / "Forged in Faith"** (0 "Watchman OS" left on the page).
- **Hero:** "The Watchman Sees It Coming — Will you sound the trumpet?" + remnant subcopy + **Take the Post** CTA.
- **Scripture band:** Ezekiel 33:6.
- **The Charge:** Movement / Enlistment / Identity, woven with Romans 13:11, Habakkuk 2:1, Isaiah 62:6 (straight from the soul: "not a company… not a purchase… not a logo").
- **The Arsenal:** products reframed with the soul's mission taglines — Veil Studio "Sound the trumpet at scale," Pathfinder "Know the territory," ChromaForge "Light up the darkness," Vantage Edge "See what others can't."
- **Manifesto teaser** (stats recast: 33:6 / 4 Tools Forged / 24-7 On the Wall / 1 King of Kings) + **Join the Forge** enlistment CTA + new footer.
- Verified: classes resolve, tags balanced.

**Commit:** `e1d322c` pushed to `main`.

### ⚠️ Deploy mechanism finding (important)
"Push → Vercel auto-deploys" is **NOT active** — the GitHub push triggered no build (latest deploy was 27m stale). The Vercel project has **no Git integration connected**, and `vercel git connect` fails (the Vercel GitHub app isn't authorized on the `watchmanforge` org — needs a one-time dashboard OAuth by the owner).
**Workaround in use:** deploying each task with `vercel --prod --yes` from the linked project. Task 1 deploy `dpl_HxGtbY9RTnqkCQCPipoqvEqRbADu` → **READY**, confirmed live at https://www.watchmanforge.com (title "Watchman Forge — Sound the Trumpet").

## Task 2 — About → The Manifesto ✅  (live)
Full rewrite: "We Are the Watchmen", Ezekiel 33:6/33:7 statement band, "Why We Forge / Tools Are Not Neutral", The Wall / The Trumpet / The Remnant (Isaiah 62:6, Habakkuk 2:1, Romans 13:11), "The Watch" facts recast, Arsenal w/ mission taglines, **The Watchman's Creed** (6 tenets: Faith First, Excellence as Worship, The Hour Is Late, Watchfulness, The Remnant, Accountability), "Take the Post" CTA. Verified live (title "The Manifesto — Watchman Forge").

## Task 3 — Contact → Enlistment ✅  (live)
Not a signup form — an enlistment. "Take the Post" hero; info column recast (The Line / The Post / The Answer); reframed form ("Why You're Answering" with enlist/tools/partner/press/prayer options, "Your Word" message); success state "Welcome to the Wall — Stand watch, Watchman." Verified live (title "Enlist — Watchman Forge").

**Commit `ae425d2`** → deployed → both verified on www.watchmanforge.com.

---
### Now: Task 4 (product pages → tools for the mission) + Task 5 (brand/nav/footer/meta sweep on products + legal)

## Task 4 — Product pages → tools for the mission ✅  (live)
Added the soul's mission taglines as the prominent hero line on each product (accent-colored, original descriptor kept as subline):
- Veil Studio — "Sound the trumpet at scale."
- Pathfinder: The Grid — "Know the territory."
- ChromaForge — "Light up the darkness."
- Vantage Edge — "See what others can't."

## Task 5 — Sitewide brand / nav / footer / meta sweep ✅  (live)
Swept all 4 product pages + privacy + terms to the Watchman Forge identity: logo "Forged in Faith", nav (The Arsenal / The Manifesto / Enlist / Take the Post), mobile nav, footer columns (The Arsenal / The Movement), copyright, titles/meta. **Result: 0 occurrences of "Watchman OS" anywhere on the site.**

**Commit `c90b152`** → deployed → all 6 pages verified live (brand present, zero stale brand, taglines live).

---

## ✅ Session complete — all 5 tasks done & deployed

| # | Task | Status | Verified live |
|---|---|---|---|
| 1 | Homepage → manifesto/enlistment | ✅ | title "Watchman Forge — Sound the Trumpet" |
| 2 | About → The Manifesto | ✅ | "We Are the Watchmen" + Creed |
| 3 | Contact → Enlistment | ✅ | "Take the Post" / "Welcome to the Wall" |
| 4 | Product pages → mission taglines | ✅ | 4/4 taglines live |
| 5 | Sitewide brand sweep | ✅ | 0 "Watchman OS" anywhere |

**Live:** https://www.watchmanforge.com  ·  all on `main`, deployed via Vercel CLI.

### ⚠️ One thing for the owner
Git push → auto-deploy is **not wired** (Vercel project has no GitHub integration; `vercel git connect` fails because the Vercel GitHub App isn't authorized on the `watchmanforge` org). I deployed every task with `vercel --prod`. To get true push-to-deploy: in the Vercel dashboard → Project → Settings → Git, connect `watchmanforge/watchmanforge-website` (one-time OAuth).

_Forged in Faith. Built for the Future._
