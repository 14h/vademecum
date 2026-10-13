#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const publicRoot = new URL("../public/", import.meta.url);
const offlineRoot = new URL("../public/offline/", import.meta.url);
const site = new URL("https://www.vademecum.org");
const limit = Number(process.argv.find((argument) => argument.startsWith("--limit="))?.split("=")[1] ?? Infinity);

const cookieSource = await readFile(new URL("../fav.js", import.meta.url), "utf8");
const cookie = cookieSource.match(/"cookie"\s*:\s*"([^"]+)"/)?.[1];
if (!cookie) throw new Error("Could not find a cookie in fav.js.");

const medicineSource = JSON.parse(await readFile(new URL("../vademecum-a-z.json", import.meta.url)));
const indicationSource = JSON.parse(await readFile(new URL("../vademecum-indikationen-a-z.json", import.meta.url)));

function isDocument(url) {
  return url.hostname === site.hostname && /^\/med\/de05\/[gvm]\d+$/i.test(url.pathname);
}

function documentPath(url) {
  return new URL(`documents${url.pathname}.html`, offlineRoot);
}

function documentUrl(url) {
  return `/offline/documents${url.pathname}.html${url.hash}`;
}

function assetPath(url) {
  return new URL(`assets${url.pathname}`, offlineRoot);
}

function assetUrl(url) {
  return `/offline/assets${url.pathname}`;
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function save(path, contents) {
  await mkdir(new URL(".", path), { recursive: true });
  await writeFile(path, contents);
}

function sourceUrls(source) {
  const urls = [];
  for (const group of Object.values(source.byLetter)) {
    for (const result of group.results) {
      if (result.result?.url) urls.push(result.result.url);
      if (result.detailsUrl) urls.push(result.detailsUrl);
      for (const reference of result.references ?? result.medicines ?? []) urls.push(reference.url);
    }
  }
  return urls;
}

function resolve(value, base) {
  try {
    return new URL(value, base);
  } catch {
    return null;
  }
}

const documents = new Map();
for (const value of [...sourceUrls(medicineSource), ...sourceUrls(indicationSource)]) {
  const url = resolve(value, site);
  if (url && isDocument(url)) {
    url.search = "";
    url.hash = "";
    documents.set(url.href, url);
  }
}
const assets = new Map();

function rewriteCss(css, base) {
  return css.replace(/url\((['"]?)([^)'"\s]+)\1\)/gi, (match, quote, value) => {
    if (/^(data:|#)/i.test(value)) return match;
    const url = resolve(value, base);
    if (!url || url.hostname !== site.hostname) return match;
    assets.set(url.href, url);
    return `url(${quote}${assetUrl(url)}${quote})`;
  });
}

function rewriteHtml(html, base) {
  let rewritten = html.replace(/\b(src|href)=(['"])([^'"]+)\2/gi, (match, attribute, quote, value) => {
    if (/^(#|data:|javascript:|mailto:|tel:)/i.test(value)) return match;
    const url = resolve(value, base);
    if (!url || url.hostname !== site.hostname) return match;

    if (isDocument(url)) {
      const document = new URL(url);
      document.search = "";
      document.hash = "";
      documents.set(document.href, document);
      return `${attribute}=${quote}${documentUrl(url)}${quote}`;
    }

    assets.set(url.href, url);
    return `${attribute}=${quote}${assetUrl(url)}${quote}`;
  });

  rewritten = rewritten.replace(/\bsrcset=(['"])([^'"]+)\1/gi, (match, quote, value) => {
    const localSources = value.split(",").map((part) => {
      const [source, descriptor] = part.trim().split(/\s+/, 2);
      const url = resolve(source, base);
      if (!url || url.hostname !== site.hostname) return part.trim();
      assets.set(url.href, url);
      return [assetUrl(url), descriptor].filter(Boolean).join(" ");
    });
    return `srcset=${quote}${localSources.join(", ")}${quote}`;
  });

  return rewriteCss(rewritten, base);
}

async function request(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "*/*",
      Cookie: cookie,
      Referer: "https://www.vademecum.org/med/de05/search?at=med",
    },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response;
}

const errors = [];
let processedDocuments = 0;
for (const url of documents.values()) {
  if (processedDocuments >= limit) break;
  const path = documentPath(url);
  processedDocuments += 1;
  if (await exists(path)) {
    const cached = await readFile(path, "utf8");
    for (const match of cached.matchAll(/\/offline\/documents(\/med\/de05\/[gvm]\d+)\.html/gi)) {
      const discovered = new URL(match[1], site);
      documents.set(discovered.href, discovered);
    }
    continue;
  }

  try {
    const response = await request(url);
    const html = rewriteHtml(await response.text(), url);
    await save(path, html);
  } catch (error) {
    errors.push(String(error));
  }

  if (processedDocuments % 25 === 0) console.log(`Saved ${processedDocuments} documents; discovered ${assets.size} assets.`);
}

let processedAssets = 0;
for (const url of assets.values()) {
  const path = assetPath(url);
  processedAssets += 1;
  if (await exists(path)) continue;

  try {
    const response = await request(url);
    const type = response.headers.get("content-type") ?? "";
    if (type.includes("text/css")) {
      await save(path, rewriteCss(await response.text(), url));
    } else {
      await save(path, Buffer.from(await response.arrayBuffer()));
    }
  } catch (error) {
    errors.push(String(error));
  }

  if (processedAssets % 50 === 0) console.log(`Saved ${processedAssets} assets.`);
}

await save(new URL("manifest.json", offlineRoot), `${JSON.stringify({
  exportedAt: new Date().toISOString(),
  documents: processedDocuments,
  assets: processedAssets,
  errors,
}, null, 2)}\n`);

console.log(`Offline export complete: ${processedDocuments} documents, ${processedAssets} assets, ${errors.length} errors.`);
