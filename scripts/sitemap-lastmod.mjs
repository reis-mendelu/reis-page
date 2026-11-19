// Sets every <lastmod> in sitemap.xml to the date the page's HTML file last changed:
// today when the file has uncommitted changes, else the date of its last commit.
// Run before committing a content change:  node scripts/sitemap-lastmod.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const root = new URL('..', import.meta.url);
const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8' }).trim();
const today = new Date().toISOString().slice(0, 10);

const special = {
  '/': 'index.html',
  '/en': 'en.html',
  '/navod': 'navod/index.html',
  '/navody': 'navody/index.html',
  '/en/guides': 'en/guides/index.html',
};
const fileFor = (path) => special[path] || path.slice(1) + '.html';

const dirty = new Set(git('status', '--porcelain').split('\n').filter(Boolean).map((l) => l.slice(3)));
const lastChanged = (file) => {
  if (dirty.has(file)) return today;
  const d = git('log', '-1', '--format=%cs', '--', file);
  if (!d) throw new Error(`sitemap-lastmod: ${file} is not in git`);
  return d;
};

const xmlPath = new URL('sitemap.xml', root);
let changed = 0;
const xml = readFileSync(xmlPath, 'utf8').replace(
  /<loc>https:\/\/reisapp\.cz([^<]*)<\/loc>([\s\S]*?)<lastmod>[^<]*<\/lastmod>/g,
  (m, path, mid) => {
    const d = lastChanged(fileFor(path || '/'));
    const next = `<loc>https://reisapp.cz${path}</loc>${mid}<lastmod>${d}</lastmod>`;
    if (next !== m) changed++;
    return next;
  },
);
writeFileSync(xmlPath, xml);
console.log(`sitemap.xml: ${changed} lastmod value(s) updated`);
