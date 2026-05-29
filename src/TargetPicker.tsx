import { useMemo, useRef, useState, type FormEvent } from 'react';
import { compass, type SkyObj } from './sky/format';

interface Props {
  open: boolean;
  objects: SkyObj[];
  targetName: string | null; // null = auto (brightest up)
  onPick: (name: string | null) => void;
  onClose: () => void;
}

export function TargetPicker({ open, objects, targetName, onPick, onClose }: Props) {
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const inputRef = useRef<HTMLInputElement>(null);
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); inputRef.current?.blur(); };

  const rows = useMemo(() => {
    const list = objects.filter((o) => !query || o.name.toLowerCase().includes(query));
    return [...list].sort((a, b) => (b.alt > 0 ? b.alt : -90) - (a.alt > 0 ? a.alt : -90));
  }, [objects, query]);

  return (
    <div className={`places-view${open ? ' open' : ''}`} aria-hidden={!open}>
      <div className="places-view-header">
        <button type="button" className="places-view-icon-btn" onClick={onClose} aria-label="Back">←</button>
        <div className="places-view-title">CHOOSE TARGET</div>
        <button type="button" className="places-view-icon-btn" onClick={onClose} aria-label="Close">×</button>
      </div>

      <form className="places-view-search" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="search" inputMode="search" enterKeyHint="search"
          autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
          placeholder="Search stars & planets…"
          value={q} onChange={(e) => setQ(e.target.value)}
        />
      </form>

      <div className="places-view-results" role="listbox" aria-label="Targets">
        <button type="button" className="places-view-result" data-sel={targetName === null} onClick={() => { onPick(null); onClose(); }}>
          <div className="pvr-name"><span style={{ color: '#A6E4FF' }}>{'✦ '}</span>Auto</div>
          <div className="pvr-sub">brightest star currently up</div>
        </button>
        {rows.map((o) => {
          const up = o.alt > 0;
          return (
            <button type="button" key={o.name} className="places-view-result" data-sel={targetName === o.name} onClick={() => { onPick(o.name); onClose(); }}>
              <div className="pvr-name"><span style={{ color: o.color }}>{o.kind === 'planet' ? '● ' : '✦ '}</span>{o.name}</div>
              <div className="pvr-sub">
                {up ? `alt ${o.alt.toFixed(0)}° · ${compass(o.az)}` : 'below horizon'}
                {o.kind === 'star' ? ` · mag ${o.mag.toFixed(1)}` : ' · planet'}
              </div>
            </button>
          );
        })}
        {rows.length === 0 && <div className="places-view-status">No results found</div>}
      </div>
    </div>
  );
}
