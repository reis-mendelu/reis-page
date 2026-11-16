# reisapp.cz (reis-page)

Static HTML. Vercel deploys `main`. Tokens in `theme.css` (dark only), shared guide look in
`navody/guide.css` + `navody/guide.js`. Push and merge recipe, SEO rules, keyword tracker: the
`reis:reis-seo` skill.

## Page rules: check every new or reworked page against this list before showing it

Dominik's reviews of /navody/informatika-v-brne and /navody/prvni-rocnik (2026-11-16). Each rule is
a mistake that has already shipped once.

1. **Scan, don't read.** "People today are not used to reading so much." No paragraphs. One short
   line per item, a big number or a short phrase as the hook, and details folded under "Víc".
   If a screen is mostly sentences, it isn't done.
2. **Help a decision or show progress visually.** A comparison puts the same questions side by side.
   A to-do page is a checklist you can tick, with a "co teď" box first. Use icons, date pills and
   cards, not text under text.
3. **Lead with what the reader asks.** Pick the rows from what students actually ask (the r/Brno
   notes in `~/Documents/reis/research/reddit-brno-unis/`), not from what data we happen to have.
   Identical numbers (6 / 6 / 6) are never the hero.
4. **Big "Pošli spolužákovi".** Put `<div class="share-box" data-share-here>` where the useful part
   of the page ends; `guide.js` puts a full-width button there. Pages are passed between students,
   so the small default at the very bottom is only for the classic how-to guides.
5. **Nothing cluttered at the bottom.** Reading notes and caveats go inside "Zdroje", not into a
   paragraph. Leftover groups become one short list (one line each).
6. **reIS only where it helps.** Small "V reIS: …" chips at the step where the app is useful. No
   store-badge box before the reader can use it.
7. **Fair and honest.** A picker reorders and highlights, but never hides the other schools. Opinions
   are labelled "podle studentů na r/Brno". The footer says "reIS dělají studenti MENDELU". No grades
   of our own.
8. **Dates:** say the year in the first line ("termíny z roku 2026"). Prefer the reader's faculty
   (PEF) as the example.
9. **Persona test, every iteration.** A fresh subagent plays an 18–19-year-old on a phone with 1–2
   minutes, reading 390 px screens in order. Fix what it reports, then send Dominik phone (390) and
   desktop screenshots. A new layout waits for his OK before merge.
