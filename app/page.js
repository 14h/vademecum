"use client";

import { useEffect, useMemo, useState } from "react";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const modes = {
  medicines: { label: "Arzneimittel", endpoint: "/vademecum.json", searchLabel: "Arzneimittel" },
  indications: { label: "Indikationen", endpoint: "/indikationen.json", searchLabel: "Indikation" },
};

export default function Home() {
  const [data, setData] = useState(null);
  const [mode, setMode] = useState("medicines");
  const [activeLetter, setActiveLetter] = useState("A");
  const [query, setQuery] = useState("");

  useEffect(() => {
    setData(null);
    fetch(modes[mode].endpoint, { cache: "no-store" })
      .then((response) => response.json())
      .then(setData);
  }, [mode]);

  const entries = useMemo(() => {
    if (!data) return [];
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const candidates = normalizedQuery ? data.items : data.items.filter((item) => item.letter === activeLetter);

    if (!normalizedQuery) return candidates;
    return candidates.filter((item) => item.name.toLocaleLowerCase().includes(normalizedQuery));
  }, [activeLetter, data, query]);

  if (!data) {
    return <main className="loading">Loading the Vademecum index…</main>;
  }

  return (
    <main>
      <header className="intro">
        <p className="eyebrow">Medical index</p>
        <h1>Vademecum</h1>
        <p>Browse {data.total.toLocaleString()} {modes[mode].label.toLocaleLowerCase()}.</p>
      </header>

      <div className="mode-switch" aria-label="Choose data type">
        {Object.entries(modes).map(([key, item]) => (
          <button
            aria-pressed={mode === key}
            className={mode === key ? "active" : ""}
            key={key}
            onClick={() => {
              setMode(key);
              setQuery("");
              setActiveLetter("A");
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <section className="controls" aria-label="Search and filter">
        <label className="search">
          <span className="sr-only">Search entries</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${modes[mode].searchLabel}…`}
          />
        </label>
        <div className="letters" aria-label="Filter by first letter">
          {alphabet.map((letter) => {
            const count = data.items.filter((item) => item.letter === letter).length;
            return (
              <button
                className={!query && activeLetter === letter ? "active" : ""}
                disabled={!count}
                key={letter}
                onClick={() => {
                  setQuery("");
                  setActiveLetter(letter);
                }}
                title={`${letter}: ${count} entries`}
              >
                {letter}
              </button>
            );
          })}
        </div>
      </section>

      <section className="entries" aria-label="Entries">
        <div className="result-count">
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
        </div>
        <div className="entry-list">
          {entries.map((entry, index) => mode === "medicines" ? (
            entry.url ? (
              <a className="entry" href={entry.url} key={`${entry.name}-${entry.url}-${index}`} target="_blank" rel="noreferrer">
                {entry.name}<span aria-hidden="true">↗</span>
              </a>
            ) : (
              <div className="entry unavailable" key={`${entry.name}-${index}`}>{entry.name}</div>
            )
          ) : (
            <details className="indication" key={`${entry.name}-${index}`}>
              <summary>
                <span>{entry.name}</span>
                <small>{entry.medicines?.length ? `${entry.medicines.length} Arzneimittel` : "No links"}</small>
              </summary>
              {entry.medicines?.length ? (
                <ul>
                  {entry.medicines.map((medicine) => (
                    <li key={`${medicine.label}-${medicine.url}`}>
                      <a href={medicine.url} target="_blank" rel="noreferrer">{medicine.label}</a>
                    </li>
                  ))}
                </ul>
              ) : <p className="muted">No linked Arzneimittel returned.</p>}
            </details>
          ))}
          {!entries.length && <p className="muted">No matching entries.</p>}
        </div>
      </section>

      <footer>Dataset collected {new Date(data.updated).toLocaleDateString()}.</footer>
    </main>
  );
}
