import { useEffect, useMemo, useRef, useState } from 'react';
import './starnav.css';
import { createTick } from './engine/tick';
import { loadObserver, saveObserver, type Observer } from './engine/observer';
import { altAzAt } from './engine/altaz';
import { STARS } from './engine/stars';
import { PLANETS, planetAltAz, type PlanetName } from './engine/planets';
import { project, angDiff, FIELD, type Aim } from './sky/projection';
import { compass, pad3, clamp, type SkyObj } from './sky/format';
import { useDeviceAim } from './sky/pointme';
import { useSettings, smoothnessAlpha } from './store/settings';
import { useFitScale } from './hooks/useFitScale';
import { TargetPicker } from './TargetPicker';
import { CitySearch } from './CitySearch';
import { Settings } from './Settings';
import { UpdateBanner } from './components/UpdateBanner';

const PLANET_COLOR: Record<PlanetName, string> = {
  Mercury: '#D9C9A8', Venus: '#FFFFFF', Mars: '#FF8A60', Jupiter: '#FFDFAE', Saturn: '#F0E2B8',
};

// ── full-bleed backdrop starfield — uptyme's exact generator (sparse, calm,
//    monochrome bluish-white; color via .star in CSS). Not bewthr's denser field. ──
interface BgStar { left: string; top: string; opacity: string; size: string; animation?: string; }
function genStars(count: number): BgStar[] {
  const out: BgStar[] = [];
  for (let i = 0; i < count; i++) {
    const big = Math.random() > 0.82;
    const twinkles = Math.random() > 0.3;
    out.push({
      left: `${(Math.random() * 100).toFixed(2)}%`,
      top: `${(Math.random() * 100).toFixed(2)}%`,
      opacity: (0.2 + Math.random() * 0.5).toFixed(2),
      size: big ? '2px' : '1.5px',
      animation: twinkles
        ? `tw ${(2.5 + Math.random() * 3).toFixed(1)}s ease-in-out ${(Math.random() * 3).toFixed(1)}s infinite`
        : undefined,
    });
  }
  return out;
}

function coordLabel(o: Observer): string {
  return `${Math.abs(o.lat).toFixed(2)}°${o.lat >= 0 ? 'N' : 'S'} · ${Math.abs(o.lon).toFixed(2)}°${o.lon >= 0 ? 'E' : 'W'}`;
}

export function App() {
  const [observer, setObserver] = useState<Observer>(loadObserver);
  const setPlace = (o: Observer) => { setObserver(o); saveObserver(o); };
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const tick = createTick({ intervalMs: 1000, onFrame: setNow });
    return () => tick.stop();
  }, []);

  const [targetName, setTargetName] = useState<string | null>(() => localStorage.getItem('starnav.target'));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settings = useSettings();
  const live = useDeviceAim(smoothnessAlpha(settings.smoothness));
  const showLabels = settings.labels === 'on';
  const pick = (name: string | null) => {
    setTargetName(name);
    if (name) localStorage.setItem('starnav.target', name);
    else localStorage.removeItem('starnav.target');
  };

  const stageRef = useRef<HTMLDivElement>(null);
  const fitScale = useFitScale(stageRef);
  const bgStars = useMemo(() => genStars(96), []);

  const stars = useMemo(
    () => STARS.map((s) => ({ kind: 'star' as const, name: s.name, color: s.color, mag: s.mag, ...altAzAt(now, observer.lat, observer.lon, s.ra, s.dec) })),
    [now, observer.lat, observer.lon]
  );
  const planets = useMemo(
    () => PLANETS.map((p) => ({ kind: 'planet' as const, name: p, color: PLANET_COLOR[p], mag: -1, ...planetAltAz(p, now, observer.lat, observer.lon) })),
    [now, observer.lat, observer.lon]
  );
  const objects: SkyObj[] = useMemo(() => [...stars, ...planets], [stars, planets]);

  const target = useMemo(() => {
    if (targetName) {
      const m = objects.find((o) => o.name === targetName);
      if (m) return m;
    }
    const up = stars.filter((s) => s.alt > 8).sort((a, b) => a.mag - b.mag);
    return up[0] ?? [...stars].sort((a, b) => b.alt - a.alt)[0];
  }, [targetName, objects, stars]);

  const aim: Aim = live.state.active && live.state.aim
    ? live.state.aim
    : { az: target.az - 12, alt: clamp(target.alt - 10, 6, 78) };
  const tp = project(target.az, target.alt, aim);

  const turn = angDiff(target.az, aim.az);
  const tilt = target.alt - aim.alt;
  const fieldStars = stars.filter((s) => s.name !== target.name && s.alt > -2);
  const fieldPlanets = planets.filter((p) => p.name !== target.name && p.alt > -2);

  const tapeTicks: number[] = [];
  for (let a = Math.ceil((aim.az - 40) / 10) * 10; a <= aim.az + 40; a += 10) tapeTicks.push(a);
  const tapeX = (az: number): number => 190 + angDiff(az, aim.az) * (380 / 80);

  const placeLabel = observer.name && observer.name !== 'default' ? observer.name.toUpperCase() : coordLabel(observer);

  return (
    <>
      <div className="sky">
        <div className="stars">
          {bgStars.map((s, i) => (
            <div key={i} className="star" style={{ left: s.left, top: s.top, opacity: s.opacity, width: s.size, height: s.size, animation: s.animation }} />
          ))}
        </div>
      </div>

      <div className="stage-wrap">
        <div className="phone" ref={stageRef} style={{ transform: `scale(${fitScale})` }}>
          <div className="hdr">
            <div className="brand">
              <div className="brand-mark">S</div>
              <div className="brand-text">star<span className="a">nav</span></div>
            </div>
            <div className="header-actions">
              <button type="button" className="icon-btn" aria-label="Search city" title="Search a city" onClick={() => setCityOpen(true)}>{'⊕'}</button>
              <button type="button" className="icon-btn" aria-label="Settings" title="Settings" onClick={() => setSettingsOpen(true)}>{'⚙'}</button>
            </div>
          </div>

          <UpdateBanner />

          <div className="meta-bar">
            <div className={`meta-sys${live.state.active ? ' live' : ''}`}><span className="status-dot" />{live.state.active ? 'TRACKING' : 'SYSTEM STABLE'}</div>
            <div className="meta-place" title={coordLabel(observer)}>{placeLabel}</div>
          </div>

          {/* heading tape (azimuth) */}
          <div className="tape">
            <svg viewBox="0 0 380 44" preserveAspectRatio="xMidYMid meet">
              <g stroke="#3A476E" strokeWidth={1}>
                {tapeTicks.map((a) => <line key={a} x1={tapeX(a)} y1={a % 30 === 0 ? 26 : 30} x2={tapeX(a)} y2={38} />)}
              </g>
              <g fill="#8A90B8" fontSize={10} fontFamily="monospace" textAnchor="middle">
                {tapeTicks.filter((a) => a % 20 === 0).map((a) => <text key={a} x={tapeX(a)} y={20}>{pad3(a)}</text>)}
              </g>
              <g transform={`translate(${tapeX(target.az)},0)`}>
                <path d="M0 24 L6 34 L-6 34 Z" fill="#F0CE96" />
                <text x={0} y={12} textAnchor="middle" fill="#F4DCAE" fontSize={8.5} fontFamily="monospace">{target.name.slice(0, 6).toUpperCase()}</text>
              </g>
            </svg>
            <div className="tape-hdg">{pad3(aim.az)}°</div>
            <div className="tape-car">{'▲'}</div>
          </div>

          {/* altitude */}
          <div className="alt">
            <span className="alt-lbl">ALT</span>
            <span className="alt-end">0°</span>
            <div className="alt-track">
              <span className="alt-fill" style={{ width: `${clamp(aim.alt, 0, 90) / 90 * 100}%` }} />
              <span className="alt-tgt" style={{ left: `${clamp(target.alt, 0, 90) / 90 * 100}%` }} />
            </div>
            <span className="alt-end">90°</span>
          </div>

          {/* instrument field — real sky projected around the aim */}
          <div className="field">
            <svg viewBox={`0 0 ${FIELD.W} ${FIELD.H}`} preserveAspectRatio="xMidYMid meet">
              <defs>
                <radialGradient id="vGlow"><stop offset="0%" stopColor="#F2F6FF" stopOpacity={0.95} /><stop offset="38%" stopColor="#C2D4FF" stopOpacity={0.4} /><stop offset="100%" stopColor="#BFD2FF" stopOpacity={0} /></radialGradient>
                <radialGradient id="cGlow"><stop offset="0%" stopColor="#6FD3FF" stopOpacity={0.45} /><stop offset="100%" stopColor="#6FD3FF" stopOpacity={0} /></radialGradient>
              </defs>

              {fieldPlanets.map((p) => {
                const q = project(p.az, p.alt, aim);
                if (!q.inView) return null;
                return (
                  <g key={p.name} onClick={() => pick(p.name)} style={{ cursor: 'pointer' }}>
                    <circle cx={q.x} cy={q.y} r={16} fill="transparent" />
                    <circle cx={q.x} cy={q.y} r={13} fill={p.color} opacity={0.16} />
                    <circle cx={q.x} cy={q.y} r={3.4} fill={p.color} />
                    {showLabels && <text className="sn-lbl" x={q.x + 8} y={q.y + 3} fill="#B7A98C">{p.name}</text>}
                  </g>
                );
              })}

              {fieldStars.map((s) => {
                const q = project(s.az, s.alt, aim);
                if (!q.inView) return null;
                const r = Math.max(0.9, 2.6 - s.mag * 0.45);
                return (
                  <g key={s.name} onClick={() => pick(s.name)} style={{ cursor: 'pointer' }}>
                    <circle cx={q.x} cy={q.y} r={Math.max(9, r * 3)} fill="transparent" />
                    {s.mag < 1.2 && <circle cx={q.x} cy={q.y} r={r * 3} fill={s.color} opacity={0.18} />}
                    <circle className="sn-tw" cx={q.x} cy={q.y} r={r} fill={s.color} />
                    {showLabels && s.mag < 1.6 && <text className="sn-lbl" x={q.x + r + 4} y={q.y + 3} fill="#9aa3c8" opacity={0.85}>{s.name}</text>}
                  </g>
                );
              })}

              {tp.inView && (
                <g>
                  <circle cx={tp.x} cy={tp.y} r={32} fill={target.color} opacity={0.16} />
                  <circle cx={tp.x} cy={tp.y} r={15} fill="url(#vGlow)" />
                  <g data-anim style={{ transformOrigin: `${tp.x}px ${tp.y}px`, animation: 'sigilGlow 3.4s ease-in-out infinite' }} stroke="#EAF2FF" strokeWidth={0.9} opacity={0.5} strokeLinecap="round">
                    <line x1={tp.x} y1={tp.y - 18} x2={tp.x} y2={tp.y + 18} /><line x1={tp.x - 18} y1={tp.y} x2={tp.x + 18} y2={tp.y} />
                  </g>
                  <circle cx={tp.x} cy={tp.y} r={3.2} fill="#fff" style={{ filter: 'drop-shadow(0 0 6px #CFE0FF)' }} />
                  <circle data-anim cx={tp.x} cy={tp.y} style={{ animation: 'beaconPulse 3.4s ease-out infinite' }} fill="none" stroke="#F0CE96" strokeWidth={1} opacity={0.5} />
                  <circle cx={tp.x} cy={tp.y} r={13} fill="none" stroke="#F0CE96" strokeWidth={0.8} strokeDasharray="2 5" opacity={0.5} />
                  <text className="sn-lbl" x={tp.x + 18} y={tp.y - 6} fill="#F4DCAE" fontSize={11}>{target.name}</text>
                  <text className="sn-lbl" x={tp.x + 18} y={tp.y + 8} fill="#8E7A52" fontSize={8}>your target</text>
                </g>
              )}

              <circle cx={FIELD.CX} cy={FIELD.CY} r={32} fill="url(#cGlow)" />
              <circle data-anim cx={FIELD.CX} cy={FIELD.CY} style={{ animation: 'beaconPulse 3s ease-out infinite' }} fill="none" stroke="#6FD3FF" strokeWidth={1.5} />
              <g data-anim style={{ transformOrigin: `${FIELD.CX}px ${FIELD.CY}px`, animation: 'sigilGlow 2.6s ease-in-out infinite' }}>
                <line x1={FIELD.CX - 12} y1={FIELD.CY - 12} x2={FIELD.CX + 12} y2={FIELD.CY + 12} stroke="#A6E4FF" strokeWidth={2.4} strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 7px rgba(166,228,255,0.9))' }} />
                <line x1={FIELD.CX + 12} y1={FIELD.CY - 12} x2={FIELD.CX - 12} y2={FIELD.CY + 12} stroke="#A6E4FF" strokeWidth={2.4} strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 7px rgba(166,228,255,0.9))' }} />
              </g>
              <text className="sn-lbl" x={FIELD.CX} y={FIELD.CY + 30} textAnchor="middle" fill="#A6E4FF" fontSize={9} letterSpacing={2}>YOU ARE HERE</text>
            </svg>
          </div>

          {/* guidance */}
          <div className="guide">
            <div><div className="gv">{Math.abs(turn).toFixed(0)}° {turn >= 0 ? '→' : '←'}</div><div className="gk">turn {turn >= 0 ? 'right' : 'left'}</div></div>
            <div><div className="gv">{Math.abs(tilt).toFixed(0)}° {tilt >= 0 ? '↑' : '↓'}</div><div className="gk">tilt {tilt >= 0 ? 'up' : 'down'}</div></div>
          </div>

          <div className="nav">
            <div><div className="k">heading to</div><div className="target">{target.name}</div></div>
            <div className="right"><div className="k">bearing</div><div className="bearing">{pad3(target.az)}° {compass(target.az)}</div><div className="sub">alt {target.alt.toFixed(0)}° · {target.kind === 'star' ? `mag ${target.mag.toFixed(2)}` : 'planet'}</div></div>
          </div>

          <div className="actions">
            <button type="button" className={live.state.active ? 'btn-active' : 'btn-primary'} onClick={() => (live.state.active ? live.disable() : live.enable())}>
              {live.state.active ? '◉ tracking' : '◎ point me'}
            </button>
            <button type="button" className="btn-ghost" onClick={() => setPickerOpen(true)}>browse sky</button>
          </div>
          {live.state.error && <div className="hint">{live.state.error}</div>}

          <div className="foot">star<span className="a">nav</span> v0.1 · open source</div>
        </div>
      </div>

      <TargetPicker open={pickerOpen} objects={objects} targetName={targetName} onPick={pick} onClose={() => setPickerOpen(false)} />
      <CitySearch open={cityOpen} observer={observer} onSet={setPlace} onClose={() => setCityOpen(false)} />
      <Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
