import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { load } from 'cheerio';

const input = new URL('../public/offline/documents/med/de05/', import.meta.url);
const output = new URL('../public/documents/', import.meta.url);
await mkdir(output, { recursive: true });
const clean = (text) => text.replace(/\s+/g, ' ').trim();
const manifest = [];

for (const file of await readdir(input)) {
  if (!file.endsWith('.html')) continue;
  const $ = load(await readFile(new URL(file, input), 'utf8'));
  const title = clean($('h1').first().text()) || clean($('title').first().text().split('|')[0]);
  const content = $('[data-block-title]').parent().first().length
    ? $('[data-block-title]').parent().first()
    : $('.content-container').first();
  content.find('script, style, form, nav, footer, .feedback, [data-global], [data-column="doi-copy-text"], .btn, .footer-menu').remove();

  function convert(node) {
    if (node.type === 'text') return node.data.trim() ? { type: 'text', text: node.data.replace(/\s+/g, ' ') } : null;
    if (node.type !== 'tag') return null;
    const element = $(node);
    const tag = node.name;
    if (tag === 'h1') return null;
    if (tag === 'img') return { type: 'image', src: element.attr('src'), alt: element.attr('alt') || element.attr('title') || '' };
    if (tag === 'br') return { type: 'break' };
    const children = (node.children ?? []).map(convert).filter(Boolean);
    if (!children.length) return null;
    const id = element.attr('id');
    const types = { span: 'inline', p: 'paragraph', ul: 'list', ol: 'list', li: 'item', strong: 'strong', b: 'strong', em: 'emphasis', i: 'emphasis', table: 'table', tr: 'row', td: 'cell', th: 'cell', sup: 'sup', sub: 'sub' };
    let type = types[tag] ?? 'group';
    if (/^h[2-6]$/.test(tag)) type = 'heading';
    if (tag === 'button') type = 'group';
    if (tag === 'a') {
      const href = element.attr('href') ?? '';
      if (/^(javascript:|mailto:)/.test(href) || clean(element.text()) === 'Mehr') return null;
      return { type: 'link', href, ...(id && { id }), children };
    }
    return { type, ...(id && { id }), ...(type === 'heading' && { level: Number(tag[1]) }), ...(tag === 'ol' && { ordered: true }), children };
  }

  const blocks = content.contents().toArray().map(convert).filter(Boolean);
  const document = { id: file.replace('.html', ''), title, description: $('meta[name="description"]').attr('content') ?? '', blocks };
  if (!title || !blocks.length) throw new Error(`No document content in ${file}`);
  await writeFile(new URL(`${document.id}.json`, output), JSON.stringify(document));
  manifest.push({ id: document.id, title });
}
await writeFile(new URL('index.json', output), JSON.stringify(manifest));
console.log(`Extracted ${manifest.length} documents into structured JSON.`);
