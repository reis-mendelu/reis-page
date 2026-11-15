#!/usr/bin/env node
// Puts our guide next to the official page that ranks for the same topic.
//   node seo/compare.mjs              → per topic: best-ranked mendelu.cz page (from ranks.csv) vs our guide
//   node seo/compare.mjs URL [URL…]   → any pages you name
//   add --lighthouse for the Lighthouse SEO score (needs Chrome; ~15 s per page)
// Writes seo/compare.md. Reads the HTML as served (what a crawler sees without running JS).
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { pageFacts, parseCsvLine } from './lib.mjs';

const dir = new URL('.', import.meta.url);
const args = process.argv.slice(2);
const lighthouse = args.includes('--lighthouse');
const urls = args.filter((a) => !a.startsWith('--'));

// Where our page for each topic lives (or will).
const OUR_PAGES = {
  eduroam: 'https://reisapp.cz/navody/eduroam',
  zkousky: 'https://reisapp.cz/navody/prihlaseni-na-zkousku',
  mapa: 'https://reisapp.cz/navody/mapa-kampusu',
  menza: 'https://reisapp.cz/navody/menza-jidelnicek',
  brand: 'https://reisapp.cz/',
};

/** Latest ranks.csv run → { topic: best mendelu.cz URL (lowest position across the topic's queries) }. */
async function officialPagesByTopic() {
  const csvPath = new URL('ranks.csv', dir);
  if (!existsSync(csvPath)) return {};
  const lines = (await readFile(csvPath, 'utf8')).trim().split('\n').slice(1);
  const rows = lines.map((l) => {
    const [date, topic, hl, , position, owner, url] = parseCsvLine(l);
    return { date, topic, hl, position: Number(position), owner, url };
  });
  const last = rows.reduce((d, r) => (r.date > d ? r.date : d), '');
  const best = {};
  for (const r of rows.filter((r) => r.date === last && r.owner === 'mendelu')) {
    if (!best[r.topic] || r.position < best[r.topic].position) best[r.topic] = r;
  }
  return Object.fromEntries(Object.entries(best).map(([t, r]) => [t, r.url]));
}

async function facts(url) {
  try {
    const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'reis-seo-compare' } });
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok) return { url, error: `HTTP ${res.status}` };
    if (!type.includes('html')) return { url, error: `not HTML (${type.split(';')[0]})` };
    return { url, ...pageFacts(await res.text()), seo: lighthouse ? lighthouseScore(url) : undefined };
  } catch (err) {
    return { url, error: String(err.message ?? err) };
  }
}

// Lighthouse's SEO category, run locally (CI has Chrome). PageSpeed Insights would need its own API key.
function lighthouseScore(url) {
  try {
    const out = execFileSync(
      'npx',
      ['-y', 'lighthouse@12', url, '--only-categories=seo', '--output=json', '--quiet', '--chrome-flags=--headless=new --no-sandbox'],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 120_000, stdio: ['ignore', 'pipe', 'ignore'] },
    );
    const score = JSON.parse(out)?.categories?.seo?.score;
    return typeof score === 'number' ? Math.round(score * 100) : '?';
  } catch {
    return 'lighthouse error';
  }
}

function row(label, f) {
  if (f.error) return `| ${label} | ${f.url} | ${f.error} | | | | | | |`;
  const ld = f.jsonLd.length ? f.jsonLd.join(', ') : '–';
  const flags = [f.dated ? 'dated' : 'no date', f.canonical ? 'canonical' : 'no canonical', f.unrenderedTemplate ? '⚠ {{ }}' : '']
    .filter(Boolean)
    .join(', ');
  return `| ${label} | ${f.url} | ${f.words} | ${f.h1}/${f.h2} | ${f.images} | ${ld} | ${flags} | ${f.seo ?? ''} | ${f.title.slice(0, 60)} |`;
}

const head = [
  `# Page comparison, ${new Date().toISOString().slice(0, 10)}`,
  '',
  'Words = text served without JS. H = h1/h2 count. SEO = Lighthouse SEO score (only with --lighthouse).',
  '',
  '| Topic | Page | Words | H | Img | JSON-LD | Flags | SEO | Title |',
  '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
];
const out = [];
if (urls.length) {
  for (const u of urls) out.push(row('', await facts(u)));
} else {
  const official = await officialPagesByTopic();
  for (const [topic, ours] of Object.entries(OUR_PAGES)) {
    if (official[topic]) out.push(row(`${topic} · MENDELU`, await facts(official[topic])));
    out.push(row(`${topic} · reIS`, await facts(ours)));
  }
}
const md = `${[...head, ...out].join('\n')}\n`;
await writeFile(new URL('compare.md', dir), md);
console.log(md);
