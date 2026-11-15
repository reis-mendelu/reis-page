#!/usr/bin/env node
// Weekly Google positions for seo/keywords.json, as seen from Czechia, via Serper.dev.
//   SERPER_API_KEY=… node seo/rank.mjs
// Appends every top-10 result to seo/ranks.csv (the history), rewrites seo/latest.md, and writes
// seo/related.md: Google's "Related searches" and "People also ask" for each query.
// One query = one Serper credit.
import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { CSV_HEADER, parseSerper, parseSuggestions, suggestionsMarkdown, summarize, toCsvLines, toMarkdown } from './lib.mjs';

const dir = new URL('.', import.meta.url);
const key = process.env.SERPER_API_KEY;
if (!key) {
  console.error('SERPER_API_KEY is not set.');
  process.exit(1);
}

const keywords = JSON.parse(await readFile(new URL('keywords.json', dir), 'utf8'));
const date = new Date().toISOString().slice(0, 10);

async function search(kw) {
  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: kw.q, gl: 'cz', hl: kw.hl, num: 10 }),
  });
  if (!res.ok) throw new Error(`Serper ${res.status} for "${kw.q}": ${await res.text()}`);
  const json = await res.json();
  return { results: parseSerper(json), suggestions: parseSuggestions(json) };
}

const csvPath = new URL('ranks.csv', dir);
if (!existsSync(csvPath)) await writeFile(csvPath, `${CSV_HEADER}\n`);

const rows = [];
const suggested = [];
let failed = 0;
for (const kw of keywords) {
  try {
    const { results, suggestions } = await search(kw);
    suggested.push({ q: kw.q, hl: kw.hl, ...suggestions });
    await appendFile(csvPath, toCsvLines(date, kw, results).map((l) => `${l}\n`).join(''));
    rows.push(summarize(kw, results));
  } catch (err) {
    failed++;
    console.error(String(err));
  }
}

const md = toMarkdown(date, rows);
await writeFile(new URL('latest.md', dir), md);
await writeFile(new URL('related.md', dir), suggestionsMarkdown(date, suggested));
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, md);
console.log(md);
if (failed) {
  console.error(`${failed} of ${keywords.length} queries failed.`);
  process.exit(1);
}
