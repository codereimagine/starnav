import { useEffect, useRef, useState, type FormEvent } from 'react';
import { geolocate, searchPlaces, type Observer, type Place } from './engine/observer';

interface Props {
  open: boolean;
  observer: Observer;
  onSet: (o: Observer) => void;
  onClose: () => void;
}

interface SavedPlace { name: string; region: string; lat: number; lon: number; }

const DEBOUNCE_MS = 300;
const SAVED_KEY = 'starnav.savedPlaces';

function fmtLatLon(lat: number, lon: number): string {
  return `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'} · ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`;
}
function loadSaved(): SavedPlace[] {
  try { const s = localStorage.getItem(SAVED_KEY); if (s) return JSON.parse(s) as SavedPlace[]; } catch { /* ignore */ }
  return [];
}
function persistSaved(list: SavedPlace[]): void {
  try { localStorage.setItem(SAVED_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

export function CitySearch({ open, observer, onSet, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [saved, setSaved] = useState<SavedPlace[]>(() => loadSaved());
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery(''); setResults([]); setSearching(false); setSearchError(false);
      return;
    }
    setSaved(loadSaved());
    const t = setTimeout(() => inputRef.current?.focus(), 180);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  function runSearch(value: string) {
    setQuery(value);
    setSearchError(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) { setResults([]); setSearching(false); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        setResults(await searchPlaces(value));
      } catch {
        setSearchError(true); setResults([]);
      } finally {
        setSearching(false);
      }
    }, DEBOUNCE_MS);
  }

  // Enter dismisses the keyboard so results are freely browsable (bewthr pattern).
  function handleSubmit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); inputRef.current?.blur(); }

  function addSaved(sp: SavedPlace) {
    const next = [sp, ...saved.filter((x) => !(x.lat === sp.lat && x.lon === sp.lon))].slice(0, 8);
    setSaved(next); persistSaved(next);
  }
  function removeSaved(sp: SavedPlace) {
    const next = saved.filter((x) => !(x.lat === sp.lat && x.lon === sp.lon));
    setSaved(next); persistSaved(next);
  }

  function setLocation(name: string, lat: number, lon: number) {
    onSet({ lat, lon, name, source: 'search' });
    onClose();
  }
  function handlePick(p: Place) {
    const region = [p.region, p.country].filter(Boolean).join(' · ');
    const name = [p.name, region].filter(Boolean).join(', ');
    addSaved({ name: p.name, region, lat: p.lat, lon: p.lon });
    setLocation(name, p.lat, p.lon);
  }
  async function useGps() {
    setSearchError(false);
    try {
      const o = await geolocate();
      onSet({ ...o, name: 'my location' });
      onClose();
    } catch {
      setSearchError(true);
    }
  }

  const here = observer.name && observer.name !== 'default' ? observer.name : 'Default';
  const q = query.trim();

  return (
    <div className={`places-view${open ? ' open' : ''}`} aria-hidden={!open} role="dialog" aria-label="Set location">
      <div className="places-view-header">
        <button type="button" className="places-view-icon-btn" onClick={onClose} aria-label="Back">←</button>
        <div className="places-view-title">SET LOCATION</div>
        <button type="button" className="places-view-icon-btn" onClick={onClose} aria-label="Close">×</button>
      </div>

      <form className="places-view-search" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="search" inputMode="search" enterKeyHint="search"
          autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
          placeholder="Search any city worldwide…"
          value={query}
          onChange={(e) => runSearch(e.currentTarget.value)}
        />
      </form>

      <div className="places-view-current">
        <div className="places-view-current-label">current</div>
        <div className="places-view-current-value"><b>{here}</b><span className="places-view-coord">{fmtLatLon(observer.lat, observer.lon)}</span></div>
        <button type="button" className="pv-gps" onClick={() => void useGps()}>{'◎ '}use my location</button>
      </div>

      <div className="places-view-results" role="listbox" aria-label="Search results">
        {searchError && <div className="places-view-status error">Search failed — check your connection</div>}
        {!searchError && q.length < 2 && <div className="places-view-status hint">Type 2 or more characters to search</div>}
        {!searchError && q.length >= 2 && searching && results.length === 0 && <div className="places-view-status">Searching…</div>}
        {!searchError && q.length >= 2 && !searching && results.length === 0 && <div className="places-view-status">No results found</div>}
        {results.map((p, i) => (
          <button type="button" key={`${p.lat}-${p.lon}-${i}`} role="option" className="places-view-result" onClick={() => handlePick(p)}>
            <div className="pvr-name">{p.name}</div>
            <div className="pvr-sub">{[p.region, p.country].filter(Boolean).join(' · ')} · {fmtLatLon(p.lat, p.lon)}</div>
          </button>
        ))}
      </div>

      <div className="places-view-saved">
        <div className="places-view-section-title">saved locations</div>
        <div className="places-view-saved-list">
          {saved.length === 0 ? (
            <div className="places-view-status">No saved places yet</div>
          ) : (
            saved.map((sp, i) => (
              <div className="places-view-saved-row" key={`${sp.lat}-${sp.lon}-${i}`}>
                <button type="button" className="pv-saved-switch" onClick={() => setLocation([sp.name, sp.region].filter(Boolean).join(', '), sp.lat, sp.lon)}>
                  <div className="pvr-name">{sp.name}</div>
                  <div className="pvr-sub">{sp.region || fmtLatLon(sp.lat, sp.lon)}</div>
                </button>
                <button type="button" className="places-view-delete" aria-label={`Delete ${sp.name}`} onClick={() => removeSaved(sp)}>Delete</button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
