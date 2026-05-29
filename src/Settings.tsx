import { usePwaUpdate } from './lib/PwaUpdate';
import { useSettings, type Animations, type Smoothness, type StarLabels, type Theme } from './store/settings';

interface Props {
  open: boolean;
  onClose: () => void;
}

const THEMES: { value: Theme; label: string; glyph: string }[] = [
  { value: 'dark', label: 'Dark', glyph: '\u{1F319}' },
  { value: 'light', label: 'Light', glyph: '☀' },
  { value: 'night', label: 'Night', glyph: '\u{1F311}' },
  { value: 'auto', label: 'Auto', glyph: '\u{1F317}' },
];
const ANIMS: { value: Animations; label: string }[] = [
  { value: 'on', label: 'On' },
  { value: 'reduce', label: 'Reduce' },
  { value: 'off', label: 'Off' },
];
const SMOOTHS: { value: Smoothness; label: string }[] = [
  { value: 'smooth', label: 'Smooth' },
  { value: 'responsive', label: 'Responsive' },
];
const LABELS: { value: StarLabels; label: string }[] = [
  { value: 'on', label: 'Show' },
  { value: 'off', label: 'Hide' },
];

interface ChipRowProps<T extends string> {
  ariaLabel: string;
  options: { value: T; label: string; glyph?: string }[];
  value: T;
  onChange: (v: T) => void;
}
function ChipRow<T extends string>({ ariaLabel, options, value, onChange }: ChipRowProps<T>) {
  return (
    <div className="settings-chip-row" role="radiogroup" aria-label={ariaLabel}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          className={`settings-chip${value === opt.value ? ' active' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.glyph && <span className="settings-chip-glyph">{opt.glyph}</span>}
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function UpdatesSection() {
  const { checkForUpdates, checkResult } = usePwaUpdate();
  const checking = checkResult === 'checking';
  let label = 'Check for updates';
  if (checking) label = 'Checking…';
  let note: string | null = null;
  if (checkResult === 'up-to-date') note = "You're up to date";
  else if (checkResult === 'found') note = 'New version found — close Settings to refresh';
  else if (checkResult === 'error') note = "Couldn't check right now";

  return (
    <div className="settings-section">
      <div className="settings-section-title">updates</div>
      <button type="button" className="settings-update-check" onClick={() => void checkForUpdates()} disabled={checking} aria-busy={checking}>{label}</button>
      {note && <div className="settings-update-note">{note}</div>}
    </div>
  );
}

export function Settings({ open, onClose }: Props) {
  const settings = useSettings();

  return (
    <div className={`places-view${open ? ' open' : ''}`} aria-hidden={!open}>
      <div className="places-view-header">
        <button type="button" className="places-view-icon-btn" onClick={onClose} aria-label="Back">←</button>
        <div className="places-view-title">SETTINGS</div>
        <button type="button" className="places-view-icon-btn" onClick={onClose} aria-label="Close">×</button>
      </div>

      <div className="settings-view-body">
        <div className="settings-section">
          <div className="settings-section-title">appearance</div>
          <ChipRow<Theme> ariaLabel="Theme" options={THEMES} value={settings.theme} onChange={settings.setTheme} />
          <div className="settings-note">Auto follows your device. Night is a deeper palette for stargazing in the dark.</div>
        </div>

        <div className="settings-section">
          <div className="settings-section-title">animations</div>
          <ChipRow<Animations> ariaLabel="Animations" options={ANIMS} value={settings.animations} onChange={settings.setAnimations} />
          <div className="settings-note">Reduce slows the star twinkle and stops beacon pulses. Off disables motion entirely.</div>
        </div>

        <div className="settings-section">
          <div className="settings-section-title">tracking</div>
          <ChipRow<Smoothness> ariaLabel="Point-me tracking" options={SMOOTHS} value={settings.smoothness} onChange={settings.setSmoothness} />
          <div className="settings-note">Smooth damps the compass so it glides (less jump). Responsive follows your phone faster.</div>
        </div>

        <div className="settings-section">
          <div className="settings-section-title">star labels</div>
          <ChipRow<StarLabels> ariaLabel="Star labels" options={LABELS} value={settings.labels} onChange={settings.setLabels} />
          <div className="settings-note">Hide the star &amp; planet names in the field for a cleaner sky.</div>
        </div>

        <UpdatesSection />

        <div className="settings-section">
          <div className="settings-section-title">reset</div>
          <button
            type="button"
            className="settings-update-check"
            onClick={() => { if (confirm('Reset starnav settings, saved location, and target?')) settings.resetDefaults(); }}
          >
            Reset all to defaults
          </button>
        </div>

        <div className="settings-section">
          <div className="set-foot">star<span className="a">nav</span> v0.1 · open source · built with claude opus</div>
        </div>
      </div>
    </div>
  );
}
