// Writes the same "Další návody" / "More guides" line on every guide: every guide linked from the
// index page, in the index's order, named by its own breadcrumb, minus the page itself.
// Run after adding, renaming or reordering a guide:  node scripts/guide-lists.mjs
// CI runs it with --check and fails when a guide's line is out of date.
import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('..', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const check = process.argv.includes('--check');
const stale = [];

for (const [index, head] of [['navody/index.html', 'Další návody'], ['en/guides/index.html', 'More guides']]) {
  const order = [...new Set([...read(index).matchAll(/href="(\/(?:navody|en\/guides)\/[a-z-]+)"/g)].map((m) => m[1]))];
  const names = Object.fromEntries(order.map((h) => {
    const m = read(h.slice(1) + '.html').match(/<span aria-current="page">(.*?)<\/span>/);
    if (!m) throw new Error(`guide-lists: ${h} has no breadcrumb <span aria-current="page">`);
    return [h, m[1]];
  }));
  const re = new RegExp(`<p class="checked">${head}:[\\s\\S]*?</p>`);
  for (const h of order) {
    const file = h.slice(1) + '.html';
    const html = read(file);
    if (!re.test(html)) throw new Error(`guide-lists: ${file} has no "${head}:" line`);
    const items = order.filter((o) => o !== h).map((o) => `<a href="${o}">${names[o]}</a>`).join(' · ');
    const next = html.replace(re, `<p class="checked">${head}: ${items}</p>`);
    if (next === html) continue;
    if (check) stale.push(file);
    else writeFileSync(new URL(file, root), next);
  }
}

if (check && stale.length) {
  console.error(`Guide lists out of date in: ${stale.join(', ')}. Run node scripts/guide-lists.mjs and commit.`);
  process.exit(1);
}
console.log(check ? 'Guide lists are up to date.' : 'Guide lists written.');
