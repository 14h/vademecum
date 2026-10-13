#!/usr/bin/env node

import { writeFile } from "node:fs/promises";

const endpoint = "https://www.vademecum.org/med/de05/search-results";
const baseUrl = "https://www.vademecum.org";
const letters = "abcdefghijklmnopqrstuvwxyz".split("");
const outputPath = new URL("./vademecum-a-z.json", import.meta.url);

function decodeHtml(value) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&uuml;/gi, "ü")
    .replace(/&ouml;/gi, "ö")
    .replace(/&auml;/gi, "ä")
    .replace(/&szlig;/gi, "ß")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/\s+/g, " ")
    .trim();
}

function absoluteUrl(path) {
  return new URL(path, baseUrl).href;
}

function extractLinks(fragment) {
  const links = [];
  const linkPattern = /<a\b(?=[^>]*\bhref="([^"]+)")(?=[^>]*\bclass="([^"]*)")[^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of fragment.matchAll(linkPattern)) {
    const [, href, className, html] = match;
    const label = decodeHtml(html);
    if (label) {
      links.push({
        label,
        url: absoluteUrl(href),
        classes: className.split(/\s+/).filter(Boolean),
        types: className.split(/\s+/).filter((name) => /^type-\d+$/.test(name)),
      });
    }
  }
  return links;
}

function parseResults(html) {
  const results = [];
  const itemPattern = /<div class="accordion-item(?:-link)?">([\s\S]*?)(?=<div class="accordion-item(?:-link)?">|$)/gi;

  for (const match of html.matchAll(itemPattern)) {
    const fragment = match[1];
    const titleMatch = fragment.match(/<button\b[^>]*>([\s\S]*?)<\/button>/i);
    const links = extractLinks(fragment);
    const primaryLink = links.find((link) => link.classes.includes("accordion-link"));
    const title = decodeHtml(titleMatch?.[1] ?? primaryLink?.label ?? "");
    if (!title) continue;

    const detailsUrlMatch = fragment.match(/<a\b[^>]*class="result-link"[^>]*href="([^"]+)"/i);
    const references = links.filter(
      (link) => !link.classes.includes("result-link") && !link.classes.includes("accordion-link"),
    );
    const primary = primaryLink
      ? {
          url: primaryLink.url,
          types: primaryLink.types,
        }
      : null;

    results.push({
      title,
      ...(primary && { result: primary }),
      ...(detailsUrlMatch && { detailsUrl: absoluteUrl(detailsUrlMatch[1]) }),
      ...(references.length > 0 && { references }),
    });
  }

  return results;
}

async function getLetter(letter) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Accept: "*/*",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest",
      Referer: "https://www.vademecum.org/med/de05/search?at=med",
    },
    body: new URLSearchParams({ search: letter, area: "med" }),
  });

  if (!response.ok) {
    throw new Error(`${letter}: ${response.status} ${response.statusText}`);
  }

  return parseResults(await response.text());
}

const byLetter = {};
for (const letter of letters) {
  process.stdout.write(`Fetching ${letter.toUpperCase()}… `);
  const results = await getLetter(letter);
  byLetter[letter] = { count: results.length, results };
  console.log(`${results.length} results`);
  await new Promise((resolve) => setTimeout(resolve, 250));
}

const document = {
  metadata: {
    source: endpoint,
    area: "med",
    queries: "a-z",
    fetchedAt: new Date().toISOString(),
    notes: "Each result contains its Vademecum URL and any related reference links returned by the search endpoint.",
  },
  byLetter,
};

await writeFile(outputPath, `${JSON.stringify(document, null, 2)}\n`);
console.log(`Saved ${outputPath.pathname}`);
