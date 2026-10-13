import { readFile, writeFile } from "node:fs/promises";

const source = JSON.parse(await readFile(new URL("../vademecum-a-z.json", import.meta.url)));
const indicationSource = JSON.parse(await readFile(new URL("../vademecum-indikationen-a-z.json", import.meta.url)));

const candidates = Object.entries(source.byLetter)
  .flatMap(([letter, group]) =>
    group.results.map((entry) => {
      const url = entry.detailsUrl ?? entry.result?.url ?? entry.references?.[0]?.url ?? null;
      return {
        name: entry.title,
        letter: letter.toUpperCase(),
        url,
        rank: entry.detailsUrl ? 0 : entry.result?.url ? 1 : entry.references?.[0]?.url ? 2 : 3,
      };
    }),
  );

const byName = new Map();
for (const candidate of candidates) {
  const existing = byName.get(candidate.name);
  if (!existing || candidate.rank < existing.rank) byName.set(candidate.name, candidate);
}

const items = [...byName.values()]
  .map(({ rank, ...item }) => item)
  .sort((a, b) => a.name.localeCompare(b.name, "de"));

const output = {
  kind: "medicines",
  updated: source.metadata.fetchedAt,
  total: items.length,
  items,
};

await writeFile(
  new URL("../public/vademecum.json", import.meta.url),
  `${JSON.stringify(output)}\n`,
);

const indicationsByName = new Map();
for (const [letter, group] of Object.entries(indicationSource.byLetter)) {
  for (const entry of group.results) {
    const existing = indicationsByName.get(entry.title);
    const medicines = new Map(
      (existing?.medicines ?? []).concat(entry.medicines ?? []).map((medicine) => [
        `${medicine.label}\u0000${medicine.url}`,
        medicine,
      ]),
    );
    indicationsByName.set(entry.title, {
      name: entry.title,
      letter: letter.toUpperCase(),
      medicines: [...medicines.values()],
    });
  }
}

const indications = [...indicationsByName.values()]
  .map(({ medicines, ...item }) => (medicines.length ? { ...item, medicines } : item))
  .sort((a, b) => a.name.localeCompare(b.name, "de"));

await writeFile(
  new URL("../public/indikationen.json", import.meta.url),
  `${JSON.stringify({
    kind: "indications",
    updated: indicationSource.metadata.fetchedAt,
    total: indications.length,
    items: indications,
  })}\n`,
);
