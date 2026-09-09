// src/engine/content/recordings.ts -- GENERATED (import list only) by
// tools/fetch-audio.js from tools/audio-manifest.json. The per-piece JSON
// under src/recordings/ holds the licensing metadata (title/composer/
// performer/audio) and the analyzed envelope (durationSec/peak/loudness/
// dynamics, from tools/analyze-audio-piece.js). One import per recording, in
// manifest order. Edit the manifest, not this file. RECORDINGS exposes them
// by name (e.g. RECORDINGS.recordedFurElise) for RoundSandbox.jsx/
// audioPiece.ts, which look pieces up dynamically by enemy.recorded.
import type { RecordedPiece } from '../../audio/recordingPlayer';

import recordedFurElise from '../../recordings/recordedFurElise.json';
import recordedMoonlight from '../../recordings/recordedMoonlight.json';
import recordedSymphony5 from '../../recordings/recordedSymphony5.json';
import recordedGoldbergAria from '../../recordings/recordedGoldbergAria.json';
import recordedMountainKing from '../../recordings/recordedMountainKing.json';
import recordedWilliamTell from '../../recordings/recordedWilliamTell.json';
import recordedGymnopedie from '../../recordings/recordedGymnopedie.json';
import recordedNachtmusik from '../../recordings/recordedNachtmusik.json';
import recordedBaldMountain from '../../recordings/recordedBaldMountain.json';

export const RECORDINGS: Record<string, RecordedPiece> = {
  recordedFurElise: recordedFurElise as RecordedPiece,
  recordedMoonlight: recordedMoonlight as RecordedPiece,
  recordedSymphony5: recordedSymphony5 as RecordedPiece,
  recordedGoldbergAria: recordedGoldbergAria as RecordedPiece,
  recordedMountainKing: recordedMountainKing as RecordedPiece,
  recordedWilliamTell: recordedWilliamTell as RecordedPiece,
  recordedGymnopedie: recordedGymnopedie as RecordedPiece,
  recordedNachtmusik: recordedNachtmusik as RecordedPiece,
  recordedBaldMountain: recordedBaldMountain as RecordedPiece,
};
