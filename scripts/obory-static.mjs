// Writes the /navody/obory programme summaries into the static HTML, between the
// <!-- obory-static:start --> and <!-- obory-static:end --> markers, so search engines and AI
// crawlers (which don't run JavaScript) read the same text the interactive view shows.
// Run after obory-data.js changes:  node scripts/obory-static.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';

const root = new URL('..', import.meta.url);
const ctx = { window: {} };
vm.runInNewContext(readFileSync(new URL('obory-data.js', root), 'utf8'), ctx);
const D = ctx.window.OBORY;

const and = (a) => (a.length < 2 ? a[0] : a.slice(0, -1).join(', ') + ' a ' + a[a.length - 1]);
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

// Same wording as info() in navody/obory.html; keep the two in step.
function info(p) {
  const r = p.sems.filter((s) => s.first != null);
  if (r.length < 2) return null;
  const lo = Math.min(...r.map((s) => s.first));
  const low = r.filter((s) => s.first === lo).map((s) => s.n);
  const fin = Math.min(...r.filter((s) => s.first === lo).map((s) => s.final));
  let t = (low.length === 1 ? `Nejvíc zabere ${low[0]}. semestr` : `Nejvíc zaberou ${and(low.map((n) => n + '.'))} semestr`) +
    `: napoprvé projde zhruba ${lo} z 10, po opravných termínech ${fin} z 10.`;
  const last = Math.max(...low);
  for (let k = last + 1; k < p.sems.length; k++) {
    const rest = p.sems.filter((s) => s.n >= k && s.n < p.sems.length);
    if (rest.length && rest.every((s) => s.first != null && s.first >= Math.min(9, lo + 3))) {
      t += ` Od ${k}. semestru projde napoprvé ${Math.min(...p.sems.filter((s) => s.n >= k && s.first != null).map((s) => s.first))} z 10 a víc.`;
      break;
    }
  }
  return t;
}

const types = { bc: 'Bakalářské', mgr: 'Navazující magisterské' };
let html = '<details class="all-plans">\n      <summary>Všechny obory v textu</summary>\n';
for (const f of Object.keys(D.faculties)) {
  const plans = D.plans.filter((p) => p.f === f);
  if (!plans.length) continue;
  html += `      <h3>${f} · ${esc(D.faculties[f])}</h3>\n`;
  for (const type of Object.keys(types)) {
    const L = plans.filter((p) => p.type === type).sort((a, b) => a.name.localeCompare(b.name, 'cs'));
    if (!L.length) continue;
    html += `      <p class="kind">${types[type]}</p>\n      <ul>\n`;
    for (const p of L) {
      const t = info(p);
      html += `        <li><a href="/navody/obory?f=${f}&amp;t=${type}&amp;p=${encodeURIComponent(p.code)}">${esc(p.name)}</a>: ${t ? t : 'zatím bez dat (nový studijní plán).'}</li>\n`;
    }
    html += '      </ul>\n';
  }
}
html += '    </details>';

const file = new URL('navody/obory.html', root);
const page = readFileSync(file, 'utf8');
const re = /(<!-- obory-static:start -->)[\s\S]*?(<!-- obory-static:end -->)/;
if (!re.test(page)) throw new Error('markers missing in navody/obory.html');
writeFileSync(file, page.replace(re, `$1\n    ${html}\n    $2`));
console.log(`wrote ${D.plans.length} programmes`);
