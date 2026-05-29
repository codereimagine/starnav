// starnav — the single tick that feeds the engine. One timer, ever (the
// single-ticker invariant from uptyme): start() is idempotent, onFrame(now)
// fires once immediately then every interval, stop() clears it.

export interface Tick {
  start(): void;
  stop(): void;
  isRunning(): boolean;
  restart(): void;
}

export function createTick(opts: { intervalMs?: number; onFrame: (now: Date) => void }): Tick {
  const intervalMs = opts.intervalMs ?? 1000;
  let id: ReturnType<typeof setInterval> | null = null;
  const fire = () => opts.onFrame(new Date());
  function start(): void {
    if (id !== null) return; // idempotent — never a 2nd interval
    fire();
    id = setInterval(fire, intervalMs);
  }
  function stop(): void {
    if (id !== null) {
      clearInterval(id);
      id = null;
    }
  }
  start();
  return { start, stop, isRunning: () => id !== null, restart() { stop(); start(); } };
}
