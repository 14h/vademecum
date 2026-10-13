#!/usr/bin/env node

import { writeFile } from "node:fs/promises";

const endpoint = "https://www.vademecum.org/med/de05/search-results";
const baseUrl = "https://www.vademecum.org";
const letters = "abcdefghijklmnopqrstuvwxyz".split("");
const outputPath = new URL("./vademecum-indikationen-a-z.json", import.meta.url);

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

function extractLinks(fragment) {
  const links = [];
  const pattern = /<a\b(?=[^>]*\bhref="([^"]+)")(?=[^>]*\bclass="([^"]*)")[^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of fragment.matchAll(pattern)) {
    const [, href, className, html] = match;
    const label = decodeHtml(html);
    if (!label) continue;
    links.push({
      label,
      url: new URL(href, baseUrl).href,
      classes: className.split(/\s+/).filter(Boolean),
    });
  }
  return links;
}

function parseResults(html) {
  const results = [];
  const itemPattern = /<div class="accordion-item(?:-link)?">([\s\S]*?)(?=<div class="accordion-item(?:-link)?">|$)/gi;

  for (const match of html.matchAll(itemPattern)) {
    const fragment = match[1];
    const buttonMatch = fragment.match(/<button\b[^>]*>([\s\S]*?)<\/button>/i);
    const directMatch = fragment.match(/<a\b(?=[^>]*\bclass="[^"]*\baccordion-link\b[^"]*")[^>]*>([\s\S]*?)<\/a>/i);
    const title = decodeHtml(buttonMatch?.[1] ?? directMatch?.[1] ?? "");
    if (!title) continue;

    const medicines = extractLinks(fragment)
      .filter((link) => !link.classes.includes("result-link") && !link.classes.includes("accordion-link"))
      .map(({ label, url }) => ({ label, url }));

    results.push({ title, ...(medicines.length > 0 && { medicines }) });
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
      Referer: "https://www.vademecum.org/med/de05/g0034",
    },
    body: new URLSearchParams({ search: letter, area: "idc" }),
  });
  if (!response.ok) throw new Error(`${letter}: ${response.status} ${response.statusText}`);
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

await writeFile(outputPath, `${JSON.stringify({
  metadata: {
    source: endpoint,
    area: "idc",
    queries: "a-z",
    fetchedAt: new Date().toISOString(),
  },
  byLetter,
}, null, 2)}\n`);

console.log(`Saved ${outputPath.pathname}`);
