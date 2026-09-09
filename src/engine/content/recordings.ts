// src/engine/content/recordings.ts -- GENERATED (import list only) by
// tools/fetch-audio.js from tools/audio-manifest.json. The per-piece JSON
// under src/recordings/ holds the licensing metadata (title/composer/
// performer/audio) and the analyzed envelope (durationSec/peak/loudness/
// dynamics, from tools/analyze-audio-piece.js). One import per recording, in
// manifest order. Edit the manifest, not this file. Still attaches each
// piece to window.Wordbound.Sandbox for RoundSandbox.jsx/audioPiece.ts,
// which read pieces off the global by name (e.g. Sandbox.recordedFurElise).
import '../sandboxGlobal';
import type { RecordedPiece } from './audioPiece';

import recordedFurElise from '../../recordings/recordedFurElise.json';
import recordedMoonlight from '../../recordings/recordedMoonlight.json';
import recordedSymphony5 from '../../recordings/recordedSymphony5.json';
import recordedGoldbergAria from '../../recordings/recordedGoldbergAria.json';
import recordedMountainKing from '../../recordings/recordedMountainKing.json';
import recordedWilliamTell from '../../recordings/recordedWilliamTell.json';
import recordedGymnopedie from '../../recordings/recordedGymnopedie.json';
import recordedNachtmusik from '../../recordings/recordedNachtmusik.json';
import recordedBaldMountain from '../../recordings/recordedBaldMountain.json';

const Sandbox = window.Wordbound.Sandbox;
Sandbox.recordedFurElise = recordedFurElise as RecordedPiece;
Sandbox.recordedMoonlight = recordedMoonlight as RecordedPiece;
Sandbox.recordedSymphony5 = recordedSymphony5 as RecordedPiece;
Sandbox.recordedGoldbergAria = recordedGoldbergAria as RecordedPiece;
Sandbox.recordedMountainKing = recordedMountainKing as RecordedPiece;
Sandbox.recordedWilliamTell = recordedWilliamTell as RecordedPiece;
Sandbox.recordedGymnopedie = recordedGymnopedie as RecordedPiece;
Sandbox.recordedNachtmusik = recordedNachtmusik as RecordedPiece;
Sandbox.recordedBaldMountain = recordedBaldMountain as RecordedPiece;
