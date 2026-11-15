// node --test seo/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ownerOf, pageFacts, parseCsvLine, parseSerper, summarize, toCsvLines, toMarkdown } from './lib.mjs';

test('ownerOf tells our site, any mendelu.cz host and everyone else apart', () => {
  assert.equal(ownerOf('https://reisapp.cz/navody/eduroam'), 'reis');
  assert.equal(ownerOf('https://www.reisapp.cz/'), 'reis');
  assert.equal(ownerOf('https://eduroam.mendelu.cz/cz/ios'), 'mendelu');
  assert.equal(ownerOf('https://mendelu.cz/'), 'mendelu');
  assert.equal(ownerOf('https://notmendelu.cz/'), 'other');
  assert.equal(ownerOf('https://en.wikipedia.org/wiki/Eduroam'), 'other');
  assert.equal(ownerOf('not a url'), 'other');
});

const serper = {
  organic: [
    { title: 'eduroam MENDELU', link: 'https://eduroam.mendelu.cz/', position: 1 },
    { title: 'Wikipedia', link: 'https://cs.wikipedia.org/wiki/Eduroam', position: 2 },
    { title: 'reIS', link: 'https://reisapp.cz/navody/eduroam', position: 3 },
  ],
};

test('parseSerper keeps organic results in order with their owner', () => {
  const r = parseSerper(serper);
  assert.deepEqual(r.map((x) => [x.position, x.owner]), [[1, 'mendelu'], [2, 'other'], [3, 'reis']]);
  assert.deepEqual(parseSerper({}), []);
});

test('summarize finds our position and MENDELU’s best page', () => {
  const s = summarize({ topic: 'eduroam', hl: 'cs', q: 'eduroam mendelu' }, parseSerper(serper));
  assert.equal(s.reisPos, 3);
  assert.equal(s.mendeluPos, 1);
  assert.equal(s.mendeluUrl, 'https://eduroam.mendelu.cz/');
  const none = summarize({ topic: 'x', hl: 'cs', q: 'x' }, []);
  assert.equal(none.reisPos, null);
  assert.ok(toMarkdown('2026-11-16', [s, none]).includes('| eduroam | eduroam mendelu | 3 | 1 https://eduroam.mendelu.cz/'));
});

test('CSV quotes a query that contains a comma, and reads it back', () => {
  const [line] = toCsvLines('2026-11-16', { topic: 't', hl: 'cs', q: 'a, "b"' }, parseSerper(serper));
  assert.equal(line, '2026-11-16,t,cs,"a, ""b""",1,mendelu,https://eduroam.mendelu.cz/');
  assert.deepEqual(parseCsvLine(line), ['2026-11-16', 't', 'cs', 'a, "b"', '1', 'mendelu', 'https://eduroam.mendelu.cz/']);
});

test('pageFacts reads what a crawler sees and flags an unrendered template', () => {
  const html = `<html><head><title>Návod eduroam</title>
    <meta name="description" content="Jak na eduroam">
    <link rel="canonical" href="https://reisapp.cz/navody/eduroam">
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"HowTo"}</script>
    <script>var hidden = "words that do not count";</script></head>
    <body><h1>Eduroam</h1><h2>Krok 1</h2><p>Ověřeno 15. 11. 2026, tři slova</p><img src="a.png"></body></html>`;
  const f = pageFacts(html);
  assert.equal(f.title, 'Návod eduroam');
  assert.equal(f.description, 'Jak na eduroam');
  assert.equal(f.h1, 1);
  assert.equal(f.h2, 1);
  assert.equal(f.images, 1);
  assert.equal(f.canonical, true);
  assert.equal(f.dated, true);
  assert.deepEqual(f.jsonLd, ['HowTo']);
  assert.equal(f.unrenderedTemplate, false);
  assert.ok(!JSON.stringify(f).includes('hidden'));
  assert.equal(pageFacts('<p>{{ t.title }}</p>').unrenderedTemplate, true);
});
