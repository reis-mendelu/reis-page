# SEO tracking

Not part of the website: `.vercelignore` keeps this folder off reisapp.cz.

| File | What |
| --- | --- |
| `keywords.json` | The searches we track: topic, query, language (`hl`). Edit freely. |
| `rank.mjs` | Google top 10 for each query, as seen from Czechia (Serper.dev, `gl=cz`). Appends to `ranks.csv`, rewrites `latest.md`. 1 query = 1 Serper credit. |
| `compare.mjs` | Our guide next to the best-ranked mendelu.cz page per topic: words served without JS, headings, images, structured data, date, canonical and (with `--lighthouse`) the Lighthouse SEO score. Writes `compare.md`. |
| `ranks.csv` | History: every result of every run. |
| `latest.md`, `compare.md` | The last run, readable. |
| `related.md` | Google's "Related searches" and "People also ask" per query, from the last run: wording ideas for the guides. |
| `changes.csv` | What we changed and when: `date,pr,kind,urls,what,target`. Read it next to `ranks.csv` and Search Console to see what a change did. |

## Change log (`changes.csv`)

**Add a row in the same PR as every change that can move search results** (new page, rewritten title/description/headings/body, markup, redirects, internal links, template) and for each *Request indexing* click or Search Console/DNS change that has no PR. `kind` is one of `new-page`, `rewrite`, `markup`, `technical`, `internal-links`, `move`, `template`, `indexing`. `target` is the search(es) it is meant to move: `topic:<topic from keywords.json>` or the exact query, separated by ` | `; empty when it targets none. Before 2026-11-15 nothing was logged; rows up to 2026-11-20 were reconstructed from git history and skip small layout and copy edits.

**Reading it.** Compare a page's position (`ranks.csv`, `owner` = us) and its Search Console impressions for the 28 days before and after the row's date. Count it as a result only if no other row touches the same URL or its `target` in that window; a "template" or "technical" row touches every guide, so it muddies all of them. One change per page at a time. Under about 100 impressions a page, treat movement as noise. Google needs weeks to settle on a new page, so a change made in the last 2-3 weeks is not judged yet.

Runs only by hand: Actions → SEO positions → Run workflow (`.github/workflows/seo-rank.yml`). It needs the repo secret `SERPER_API_KEY`.

Locally: `SERPER_API_KEY=… node seo/rank.mjs`, `node seo/compare.mjs [URL…] [--lighthouse]` (no Google Chrome on this Mac: prefix `CHROME_PATH="/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"`), tests: `node --test seo/lib.test.mjs`.

**What this does and doesn't measure.** Serper gives Google's ranking for a query, ours and everyone else's. It doesn't give impressions, clicks or search volume: those come from Google Search Console (our site only) and Seznam Webmaster. A Lighthouse SEO score of 100 only means the page is technically sound; it says nothing about ranking.
