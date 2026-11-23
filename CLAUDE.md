# reisapp.cz (reis-page)

Static HTML. Vercel deploys `main`. Tokens in `theme.css` (dark only), shared guide look in
`navody/guide.css` + `navody/guide.js`. Push and merge recipe, SEO rules, keyword tracker: the
`reis:reis-seo` skill. **A change that can move search results adds a row to `seo/changes.csv` in
the same PR** (rules in `seo/README.md`).

## Generated files and scripts

- **`en/navod.html` is generated** from `navod/index.html` by `node scripts/navod-en.mjs`
  (English `<head>` and no-JS fallback; the page picks its language from the path, never the
  browser). Edit only the Czech file, rerun, commit both. CI (`generated-pages.yml`) fails a PR
  where they disagree.
- **"Další návody" / "More guides"** is the same list on every guide: every guide on the index page,
  in its order, named by its breadcrumb, minus itself. `node scripts/guide-lists.mjs` writes it,
  and sets each (Tech)Article's JSON-LD headline to the page's `<title>` without " – reIS"; CI fails
  when either is stale. A new guide: add it to the index page, then run the script.
- **`node scripts/sitemap-lastmod.mjs`** before committing a content change: every `<lastmod>`
  becomes the date that page's file last changed, and each guide's JSON-LD `dateModified` gets the
  same date. A new page also needs its `<url>` entry.
- **One shape for every guide, Czech and English twin alike** (Dominik, 2026-11-19): section ids are
  Czech in both languages (`#telefon`, `#pocitac`, `#oficialne`, `#nefunguje`, page-specific ones
  like `#ucebna`), so a link survives the CZ/EN switch; English dates read "16 November 2026";
  the desktop picker uses the laptop icon; the Ověřeno line ends "reIS dělají studenti MENDELU, není
  to oficiální aplikace MENDELU." and the footer says "reIS dělají studenti MENDELU." (English:
  "reIS is made by MENDELU students…"); "Wi-Fi", "Kč/noc", "budova X".
- Header and footer are JS components (`dc-import`); pages built on them carry a
  `<noscript data-static="site-nav">` link list so crawlers without JavaScript still find the
  site. A new page goes into that list on `index.html`, `en.html` and the other dc pages.

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
   of the page ends; `guide.js` puts a full-width button there. Without one it puts the same
   full-width button above the Ověřeno line: one look on every guide (Dominik, 2026-11-19).
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
10. **Text in the HTML, not only in JavaScript.** AI assistants' crawlers (ChatGPT, Claude,
    Perplexity) don't run JavaScript, so a page that builds its content in the browser is empty
    to them. Interactive views are fine on top, but the facts must also be in the static HTML,
    folded under a `<details>` if long. /navody/obory does this with `node scripts/obory-static.mjs`;
    rerun it whenever `obory-data.js` changes. Search stays Google only (Dominik, 2026-11-16).
