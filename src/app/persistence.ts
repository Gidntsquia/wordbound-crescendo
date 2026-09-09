// src/app/persistence.ts (READ_SLOWLY_PLAN.md A2 remainder -- target layout):
// the one place that owns every `wbc.*` localStorage key. Domain modules
// (characters.ts, stolenLetters.ts, quillDiscovery.ts, store.ts) keep their
// own read/write functions and shapes -- this just gives them one shared,
// versioned, try/catch-safe get/set instead of each hand-rolling its own
// localStorage try/catch. migrate() runs once at startup (main.tsx) and is
// the single place a future key-shape change gets a forward migration; there
// is nothing to migrate yet, so it only stamps the current version.
export const PERSISTENCE_VERSION = 1;

export const KEYS = {
  best: 'wbc.best',
  key: 'wbc.key',
  keyUnlocked: 'wbc.keyUnlocked',
  letters: 'wbc.letters',
  quills: 'wbc.quills',
  seen: 'wbc.seen',
  sfx: 'wbc.sfx',
  characters: 'wbc.characters',
} as const;

const VERSION_KEY = 'wbc.schemaVersion';

export function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeRaw(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private mode, quota, etc -- the value just doesn't persist */
  }
}

export function readJSON<T>(key: string, fallback: T): T {
  const raw = readRaw(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): void {
  writeRaw(key, JSON.stringify(value));
}

// Runs once at startup. Nothing has ever shipped a schema change yet, so
// this only stamps wbc.schemaVersion to PERSISTENCE_VERSION -- a future
// version bump adds its `if (stored < N)` transform here, ahead of the stamp.
export function migrate(): void {
  const stored = parseInt(readRaw(VERSION_KEY) || '', 10) || 0;
  if (stored >= PERSISTENCE_VERSION) return;
  writeRaw(VERSION_KEY, String(PERSISTENCE_VERSION));
}
