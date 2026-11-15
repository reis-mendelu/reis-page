// Pure helpers shared by rank.mjs and compare.mjs. No network, no fs: tested in lib.test.mjs.

export const OUR_HOST = 'reisapp.cz';

/** Who a result belongs to: 'reis', 'mendelu' (any *.mendelu.cz) or 'other'. */
export function ownerOf(url) {
  let host;
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return 'other';
  }
  if (host === OUR_HOST || host.endsWith(`.${OUR_HOST}`)) return 'reis';
  if (host === 'mendelu.cz' || host.endsWith('.mendelu.cz')) return 'mendelu';
  return 'other';
}

/** Serper /search response → [{ position, url, title, owner }], organic results only. */
export function parseSerper(json) {
  const organic = Array.isArray(json?.organic) ? json.organic : [];
  return organic
    .filter((r) => typeof r.link === 'string')
    .map((r, i) => ({
      position: Number.isInteger(r.position) ? r.position : i + 1,
      url: r.link,
      title: String(r.title ?? ''),
      owner: ownerOf(r.link),
    }));
}

/** One query's results → a summary row: where we are, where MENDELU's best page is, who is #1. */
export function summarize(keyword, results) {
  const ours = results.find((r) => r.owner === 'reis');
  const mendelu = results.find((r) => r.owner === 'mendelu');
  const top = results[0];
  return {
    topic: keyword.topic,
    hl: keyword.hl,
    q: keyword.q,
    reisPos: ours ? ours.position : null,
    reisUrl: ours ? ours.url : '',
    mendeluPos: mendelu ? mendelu.position : null,
    mendeluUrl: mendelu ? mendelu.url : '',
    topUrl: top ? top.url : '',
  };
}

function csvCell(v) {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const CSV_HEADER = 'date,topic,hl,query,position,owner,url';

/** One line written by toCsvLines → its cells (handles quoted cells with commas and "" escapes). */
export function parseCsvLine(line) {
  const cells = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      cells.push(cell);
      cell = '';
    } else cell += c;
  }
  cells.push(cell);
  return cells;
}

/** Every result of one query as CSV lines (the raw history; the trend is computed from it). */
export function toCsvLines(date, keyword, results) {
  return results.map((r) =>
    [date, keyword.topic, keyword.hl, keyword.q, r.position, r.owner, r.url].map(csvCell).join(','),
  );
}

const pos = (p) => (p === null ? '–' : String(p));

/** Summary rows → a Markdown table for latest.md and the GitHub job summary. */
export function toMarkdown(date, rows) {
  const lines = [
    `# Search positions, ${date}`,
    '',
    'Google, gl=cz, top 10 organic results (Serper). "–" = not in the top 10.',
    '',
    '| Topic | Query | reisapp.cz | Best mendelu.cz page | #1 result |',
    '| --- | --- | --- | --- | --- |',
  ];
  for (const r of rows) {
    const mendelu = r.mendeluPos === null ? '–' : `${r.mendeluPos} ${r.mendeluUrl}`;
    lines.push(
      `| ${r.topic} | ${r.q}${r.hl === 'en' ? ' (en)' : ''} | ${pos(r.reisPos)} | ${mendelu} | ${r.topUrl || '–'} |`,
    );
  }
  return `${lines.join('\n')}\n`;
}

/** Served HTML → what a crawler that does not run JS can read. */
export function pageFacts(html) {
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').trim();
  const description =
    html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i)?.[1] ??
    '';
  const jsonLdTypes = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)]
    .flatMap((m) => {
      try {
        const data = JSON.parse(m[1]);
        const items = Array.isArray(data) ? data : data['@graph'] ?? [data];
        return items.map((x) => x?.['@type']).flat().filter(Boolean);
      } catch {
        return ['(invalid JSON-LD)'];
      }
    });
  const body = html
    .replace(/<(script|style|noscript|template)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-z]+;|&#\d+;/gi, ' ');
  const words = body.match(/[\p{L}\p{N}]+/gu) ?? [];
  return {
    title,
    description,
    words: words.length,
    h1: (html.match(/<h1[\s>]/gi) ?? []).length,
    h2: (html.match(/<h2[\s>]/gi) ?? []).length,
    images: (html.match(/<img[\s>]/gi) ?? []).length,
    canonical: /<link[^>]+rel=["']canonical["']/i.test(html),
    dated: /\b(\d{1,2}\.\s?\d{1,2}\.\s?20\d{2}|20\d{2}-\d{2}-\d{2})\b/.test(body),
    unrenderedTemplate: /\{\{[^}]+\}\}/.test(body),
    jsonLd: [...new Set(jsonLdTypes)],
  };
}
