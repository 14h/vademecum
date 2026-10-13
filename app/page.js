"use client";
import {useEffect, useMemo, useRef, useState} from 'react';

const modes = {
    medicines: {label: 'Arzneimittel', file: '/vademecum.json'},
    indications: {label: 'Indikationen', file: '/indikationen.json'}
};
export default function Home() {
    const requestVersion = useRef(0);
    const [mode, setMode] = useState('medicines'), [data, setData] = useState(null), [query, setQuery] = useState(''), [letter, setLetter] = useState('A'), [selection, setSelection] = useState(null), [doc, setDoc] = useState(null), [error, setError] = useState(''), [anchor, setAnchor] = useState('');
    useEffect(() => {
        const controller = new AbortController();
        setData(null);
        fetch(modes[mode].file, {signal: controller.signal})
            .then(r => r.json())
            .then(setData)
            .catch(e => {
                if (e.name !== 'AbortError') {
                    setError('Index konnte nicht geladen werden.');
                }
            });
        return () => controller.abort();
    }, [mode]);
    const entries = useMemo(() => (data?.items ?? []).filter(item => query.trim() ? item.name.toLocaleLowerCase()
                                                                                        .includes(query.trim()
                                                                                                       .toLocaleLowerCase()) : item.letter === letter), [data, query, letter]);

    async function open(url, name, followAnchor = false) {
        const parsed = new URL(url, 'https://www.vademecum.org');
        const id = parsed.pathname.match(/\/([gvm]\d+)(?:\.html)?$/)?.[1];
        if (!id) {
            return;
        }
        const version = ++requestVersion.current;
        setSelection({name, url});
        setDoc(null);
        setError('');
        setAnchor(followAnchor ? parsed.hash.slice(1) : '');
        window.scrollTo({top: 0, left: 0, behavior: 'instant'});
        document.querySelector('.reader')?.scrollTo({top: 0, left: 0, behavior: 'instant'});
        try {
            const response = await fetch(`/documents/${id}.json`);
            if (!response.ok) {
                throw new Error();
            }
            const next = await response.json();
            if (version === requestVersion.current) {
                setDoc(next);
            }
        } catch {
            if (version === requestVersion.current) {
                setError('Dokument konnte nicht geladen werden.');
            }
        }
    }

    useEffect(() => {
        if (!doc) {
            return;
        }
        const target = anchor && document.getElementById(`content-${anchor}`);
        if (target) {
            target.scrollIntoView({block: 'start'});
        } else {
            document.querySelector('.reader')
                    ?.scrollTo(0, 0);
        }
    }, [doc, anchor]);

    function render(node, key) {
        if (node.type === 'text') {
            return node.text;
        }
        const props = {...(node.id && {id: `content-${node.id}`})};
        const children = node.children?.map((child, i) => render(child, `${key}-${i}`));
        if (node.type === 'image') {
            return <figure key={key} {...props}><img src={node.src} alt={node.alt}
                                                     loading="lazy"/></figure>;
        }
        if (node.type === 'break') {
            return <br key={key} {...props}/>;
        }
        if (node.type === 'link') {
            const internal = /^#|\/offline\/documents\/|https?:\/\/(?:www\.)?vademecum\.org\/med\/de05\//.test(node.href);
            return <a key={key} {...props} href={node.href} onClick={internal ? e => {
                e.preventDefault();
                if (node.href.startsWith('#')) {
                    document.getElementById(`content-${node.href.slice(1)}`)
                            ?.scrollIntoView();
                } else {
                    open(node.href, 'Dokument', true);
                }
            } : undefined} target={internal ? undefined : '_blank'}
                      rel={internal ? undefined : 'noreferrer'}>{children}</a>;
        }
        const tags = {
            inline: 'span',
            paragraph: 'p',
            list: node.ordered ? 'ol' : 'ul',
            item: 'li',
            strong: 'strong',
            emphasis: 'em',
            table: 'table',
            row: 'tr',
            cell: 'td',
            sup: 'sup',
            sub: 'sub',
            heading: `h${Math.min(node.level ?? 2, 4)}`,
            group: 'div'
        };
        const Tag = tags[node.type] ?? 'div';
        return <Tag key={key} {...props}>{children}</Tag>;
    }

    return <main className={selection ? 'workspace reading' : 'workspace'}>
        <aside className="index">
            <div className="index-controls">
                {selection && <header><button onClick={() => {
                    setSelection(null);
                    setDoc(null);
                    setError('');
                }}>← Übersicht</button></header>}
                <div className="header-row">
                <div className="mode-switch">{Object.entries(modes)
                                                    .map(([key, value]) => <button key={key} aria-pressed={mode === key}
                                                                                   className={mode === key ? 'active' : ''}
                                                                                   onClick={() => {
                                                                                       setMode(key);
                                                                                       setQuery('');
                                                                                       setLetter('A');
                                                                                   }}>{value.label}</button>)}</div>
                <input className="search" aria-label="Suchen" placeholder={`${modes[mode].label} suchen…`} value={query}
                       onChange={e => setQuery(e.target.value)}/>
                </div>
            <div className="letters">{'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
                                                                  .map(value => <button key={value}
                                                                                        className={!query && value === letter ? 'active' : ''}
                                                                                        disabled={!data?.items.some(item => item.letter === value)}
                                                                                        onClick={() => {
                                                                                            setLetter(value);
                                                                                            setQuery('');
                                                                                        }}>{value}</button>)}</div>
            </div>
            <p className="result-count">{data ? `${entries.length} Einträge` : 'Index wird geladen…'}</p>
            <div className="entry-list">{entries.map(entry => mode === 'medicines' ?
                <button className={`entry ${selection?.name === entry.name ? 'selected' : ''}`} key={entry.name}
                        disabled={!entry.url} onClick={() => open(entry.url, entry.name)}>{entry.name}<span>→</span>
                </button> : <details key={entry.name}>
                    <summary>{entry.name}<small>{entry.medicines?.length ?? 0}</small></summary>
                    <div className="related">{entry.medicines?.map(item => <button className="entry"
                                                                                   key={item.url + item.label}
                                                                                   onClick={() => open(item.url, item.label)}>{item.label}<span>→</span>
                    </button>) ?? <p>Keine verknüpften Dokumente.</p>}</div>
                </details>)}</div>
            {error && !selection && <p role="alert">{error}</p>}
        </aside>
        {selection && <article className="reader" aria-live="polite">
            <div className="document-content">{error ? <p role="alert">{error}</p> : doc ? <><p
                    className="eyebrow">{selection.name}</p>
                    <h1>{doc.title}</h1>{doc.blocks.map((node, i) => render(node, i))}</> :
                <p>Dokument wird geladen…</p>}</div>
        </article>}</main>;
}
