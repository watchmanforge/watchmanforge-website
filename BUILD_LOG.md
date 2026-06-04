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
