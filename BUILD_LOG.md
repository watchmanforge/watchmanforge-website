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
