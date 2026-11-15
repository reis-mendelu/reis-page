# SEO tracking

Not part of the website: `.vercelignore` keeps this folder off reisapp.cz.

| File | What |
| --- | --- |
| `keywords.json` | The searches we track: topic, query, language (`hl`). Edit freely. |
| `rank.mjs` | Google top 10 for each query, as seen from Czechia (Serper.dev, `gl=cz`). Appends to `ranks.csv`, rewrites `latest.md`. 1 query = 1 Serper credit. |
| `compare.mjs` | Our guide next to the best-ranked mendelu.cz page per topic: words served without JS, headings, images, structured data, date, canonical and (with `--lighthouse`) the Lighthouse SEO score. Writes `compare.md`. |
| `ranks.csv` | History: every result of every run. |
| `latest.md`, `compare.md` | The last run, readable. |

Runs only by hand: Actions → SEO positions → Run workflow (`.github/workflows/seo-rank.yml`). It needs the repo secret `SERPER_API_KEY`.

Locally: `SERPER_API_KEY=… node seo/rank.mjs`, `node seo/compare.mjs [URL…] [--lighthouse]` (no Google Chrome on this Mac: prefix `CHROME_PATH="/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"`), tests: `node --test seo/lib.test.mjs`.

**What this does and doesn't measure.** Serper gives Google's ranking for a query, ours and everyone else's. It doesn't give impressions, clicks or search volume: those come from Google Search Console (our site only) and Seznam Webmaster. A Lighthouse SEO score of 100 only means the page is technically sound; it says nothing about ranking.
