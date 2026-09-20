import { KEYS, readJSON, removeRaw, writeJSON } from './persistence';
import type { RunSnapshot } from '../engine/state/facade';

export interface ActiveRunSave {
  version: 1;
  seed: string;
  characterId: string;
  bagId: string;
  phase: 'live' | 'won' | 'shop' | 'letter';
  entered: boolean;
  word: string;
  snapshot: RunSnapshot;
}

export function readActiveRun(): ActiveRunSave | null {
  const value = readJSON<ActiveRunSave | null>(KEYS.activeRun, null);
  if (!value || value.version !== 1) return null;
  if (!['live', 'won', 'shop', 'letter'].includes(value.phase)) return null;
  if (typeof value.seed !== 'string' || typeof value.characterId !== 'string')
    return null;
  if (typeof value.bagId !== 'string' || typeof value.word !== 'string')
    return null;
  const { run, rng } = value.snapshot || {};
  if (!run || !rng || typeof rng.seed !== 'number') return null;
  if (!run.round || !run.enemy || !Array.isArray(run.deck)) return null;
  if (!Array.isArray(run.items) || !Array.isArray(run.felled)) return null;
  return value;
}

export function writeActiveRun(value: ActiveRunSave): void {
  writeJSON(KEYS.activeRun, value);
}

export function clearActiveRun(): void {
  removeRaw(KEYS.activeRun);
}
