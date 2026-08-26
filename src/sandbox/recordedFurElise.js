// src/sandbox/recordedFurElise.js
// A RECORDING, not sequenced note data -- the one deliberate exception to the
// project's standing "all music is SYNTHESIZED" rule (GOALS.md), made by Jaxon
// on 2026-08-25 after the synthesized transcription still did not sound like a
// real performance. Kept HERE, in src/sandbox/, and not in js/wordbound/pieces/
// so the shared engine and the main app stay synthesized and the exception
// cannot leak into them.
//
// LICENSING: the COMPOSITION is public domain (Beethoven, WoO 59, composed
// 1810; died 1827). The RECORDING is not -- it is a Pixabay-hosted track,
// used under the Pixabay Content License, supplied by Jaxon from
// https://pixabay.com/music/search/fur%20elise/ . That license permits use
// without attribution but is NOT a public-domain dedication, so this file
// must not be described as PD-vetted the way the sequenced pieces are.
//
// WHY THE ENVELOPE DATA BELOW EXISTS. The standing rule's own reasoning is
// that owning the note data "is what makes crescendo timing exact enough to
// build the attack/parry mechanic on". That is a real dependency: the tug
// telegraphs an attack BEFORE it lands, which means it has to know what the
// music is about to do, and a raw MP3 cannot say. So the audio was decoded
// offline and reduced to what the mechanic actually needs:
//
//   keyframes -- a ~20 Hz RMS loudness envelope, smoothed over 0.6 s,
//       normalised against its own 5th/95th percentiles into the same
//       0.12..0.70 intensity band the sequenced pieces occupy (so tug balance
//       carries over unchanged), then thinned to the points that do not lie on
//       a straight line between their neighbours.
//   surges -- local loudness maxima that rise at least 0.10 above the quietest
//       point in the preceding 3 s, spaced at least 4 s apart. These are the
//       "crescendos" the tug telegraphs against.
//
// Regenerate both with tools/analyze-audio-piece.js if the track is replaced.
(function () {
  window.Wordbound = window.Wordbound || {};
  var Sandbox = (window.Wordbound.Sandbox = window.Wordbound.Sandbox || {});

  Sandbox.recordedFurElise = {
    id: 'fur-elise-recording',
    title: 'Für Elise',
    composer: 'Ludwig van Beethoven',
    // Relative so it resolves under GitHub Pages' project subpath and under
    // build-site.js's root-swap, both of which serve public/ verbatim.
    audio: 'audio/fur-elise.mp3',
    durationSec: 172.56,
    licensing: {
      composition: 'public domain (Beethoven, 1810; died 1827)',
      recording: 'Pixabay Content License -- NOT public domain',
      source: 'https://pixabay.com/music/search/fur%20elise/'
    },
    regularName: 'The Bagatelle',
    gimmick: 'Everyone knows the first eight notes. Nobody remembers what comes next.',
    stageTier: 'early',
    dynamics: {
      keyframes: [
        { sec: 0, intensity: 0.12 },
        { sec: 1, intensity: 0.135 },
        { sec: 2, intensity: 0.255 },
        { sec: 3, intensity: 0.281 },
        { sec: 5, intensity: 0.266 },
        { sec: 6, intensity: 0.316 },
        { sec: 7, intensity: 0.306 },
        { sec: 8, intensity: 0.197 },
        { sec: 11, intensity: 0.312 },
        { sec: 13, intensity: 0.229 },
        { sec: 14, intensity: 0.156 },
        { sec: 15, intensity: 0.12 },
        { sec: 16, intensity: 0.16 },
        { sec: 17, intensity: 0.305 },
        { sec: 18, intensity: 0.315 },
        { sec: 19, intensity: 0.393 },
        { sec: 20, intensity: 0.438 },
        { sec: 22, intensity: 0.182 },
        { sec: 23, intensity: 0.224 },
        { sec: 25, intensity: 0.368 },
        { sec: 26, intensity: 0.263 },
        { sec: 27, intensity: 0.286 },
        { sec: 28, intensity: 0.393 },
        { sec: 30, intensity: 0.361 },
        { sec: 32, intensity: 0.281 },
        { sec: 34, intensity: 0.249 },
        { sec: 36, intensity: 0.14 },
        { sec: 39, intensity: 0.131 },
        { sec: 42, intensity: 0.261 },
        { sec: 44, intensity: 0.334 },
        { sec: 45, intensity: 0.318 },
        { sec: 46, intensity: 0.197 },
        { sec: 47, intensity: 0.257 },
        { sec: 50, intensity: 0.36 },
        { sec: 51, intensity: 0.353 },
        { sec: 52, intensity: 0.464 },
        { sec: 53, intensity: 0.354 },
        { sec: 54, intensity: 0.355 },
        { sec: 55, intensity: 0.409 },
        { sec: 56, intensity: 0.402 },
        { sec: 57, intensity: 0.335 },
        { sec: 58, intensity: 0.23 },
        { sec: 59, intensity: 0.156 },
        { sec: 60, intensity: 0.12 },
        { sec: 64, intensity: 0.223 },
        { sec: 66, intensity: 0.355 },
        { sec: 67, intensity: 0.398 },
        { sec: 69, intensity: 0.166 },
        { sec: 70, intensity: 0.245 },
        { sec: 71, intensity: 0.278 },
        { sec: 72, intensity: 0.263 },
        { sec: 73, intensity: 0.311 },
        { sec: 74, intensity: 0.225 },
        { sec: 75, intensity: 0.207 },
        { sec: 76, intensity: 0.308 },
        { sec: 77, intensity: 0.314 },
        { sec: 78, intensity: 0.395 },
        { sec: 80, intensity: 0.438 },
        { sec: 81, intensity: 0.354 },
        { sec: 83, intensity: 0.489 },
        { sec: 84, intensity: 0.437 },
        { sec: 85, intensity: 0.471 },
        { sec: 86, intensity: 0.463 },
        { sec: 87, intensity: 0.503 },
        { sec: 88, intensity: 0.501 },
        { sec: 89, intensity: 0.562 },
        { sec: 90, intensity: 0.546 },
        { sec: 92, intensity: 0.485 },
        { sec: 93, intensity: 0.325 },
        { sec: 94, intensity: 0.205 },
        { sec: 95, intensity: 0.157 },
        { sec: 96, intensity: 0.178 },
        { sec: 97, intensity: 0.132 },
        { sec: 100, intensity: 0.374 },
        { sec: 101, intensity: 0.365 },
        { sec: 102, intensity: 0.446 },
        { sec: 103, intensity: 0.433 },
        { sec: 104, intensity: 0.287 },
        { sec: 106, intensity: 0.364 },
        { sec: 107, intensity: 0.528 },
        { sec: 109, intensity: 0.532 },
        { sec: 110, intensity: 0.51 },
        { sec: 111, intensity: 0.441 },
        { sec: 112, intensity: 0.221 },
        { sec: 113, intensity: 0.209 },
        { sec: 114, intensity: 0.271 },
        { sec: 115, intensity: 0.396 },
        { sec: 116, intensity: 0.448 },
        { sec: 117, intensity: 0.422 },
        { sec: 118, intensity: 0.339 },
        { sec: 119, intensity: 0.412 },
        { sec: 120, intensity: 0.344 },
        { sec: 122, intensity: 0.331 },
        { sec: 123, intensity: 0.578 },
        { sec: 124, intensity: 0.483 },
        { sec: 125, intensity: 0.7 },
        { sec: 126, intensity: 0.7 },
        { sec: 127, intensity: 0.648 },
        { sec: 128, intensity: 0.7 },
        { sec: 129, intensity: 0.624 },
        { sec: 130, intensity: 0.621 },
        { sec: 131, intensity: 0.558 },
        { sec: 132, intensity: 0.608 },
        { sec: 133, intensity: 0.7 },
        { sec: 134, intensity: 0.7 },
        { sec: 135, intensity: 0.665 },
        { sec: 136, intensity: 0.475 },
        { sec: 137, intensity: 0.62 },
        { sec: 138, intensity: 0.695 },
        { sec: 140, intensity: 0.691 },
        { sec: 141, intensity: 0.233 },
        { sec: 142, intensity: 0.12 },
        { sec: 145, intensity: 0.12 },
        { sec: 146, intensity: 0.266 },
        { sec: 147, intensity: 0.652 },
        { sec: 148, intensity: 0.671 },
        { sec: 150, intensity: 0.552 },
        { sec: 152, intensity: 0.517 },
        { sec: 153, intensity: 0.533 },
        { sec: 154, intensity: 0.643 },
        { sec: 156, intensity: 0.528 },
        { sec: 157, intensity: 0.654 },
        { sec: 158, intensity: 0.7 },
        { sec: 159, intensity: 0.678 },
        { sec: 161, intensity: 0.7 },
        { sec: 162, intensity: 0.356 },
        { sec: 163, intensity: 0.324 },
        { sec: 164, intensity: 0.516 },
        { sec: 165, intensity: 0.657 },
        { sec: 166, intensity: 0.506 },
        { sec: 167, intensity: 0.659 },
        { sec: 168, intensity: 0.697 },
        { sec: 169, intensity: 0.288 },
        { sec: 170, intensity: 0.12 },
        { sec: 172.5, intensity: 0.12 }
      ],
      surges: [
        { sec: 3.4, intensity: 0.273, rise: 0.183, mag: 0.251 },
        { sec: 6.15, intensity: 0.324, rise: 0.152, mag: 0.25 },
        { sec: 11.45, intensity: 0.288, rise: 0.176, mag: 0.262 },
        { sec: 19.2, intensity: 0.389, rise: 0.27, mag: 0.492 },
        { sec: 24.8, intensity: 0.347, rise: 0.277, mag: 0.474 },
        { sec: 28.7, intensity: 0.391, rise: 0.237, mag: 0.438 },
        { sec: 33.25, intensity: 0.27, rise: 0.139, mag: 0.217 },
        { sec: 44.3, intensity: 0.337, rise: 0.171, mag: 0.282 },
        { sec: 49.25, intensity: 0.335, rise: 0.218, mag: 0.365 },
        { sec: 52.15, intensity: 0.461, rise: 0.235, mag: 0.493 },
        { sec: 55, intensity: 0.409, rise: 0.192, mag: 0.375 },
        { sec: 58.35, intensity: 0.205, rise: 0.05, mag: 0 },
        { sec: 67.25, intensity: 0.401, rise: 0.314, mag: 0.579 },
        { sec: 70.5, intensity: 0.289, rise: 0.265, mag: 0.443 },
        { sec: 72.8, intensity: 0.307, rise: 0.243, mag: 0.418 },
        { sec: 79.1, intensity: 0.438, rise: 0.303, mag: 0.609 },
        { sec: 82.85, intensity: 0.493, rise: 0.271, mag: 0.582 },
        { sec: 88.9, intensity: 0.567, rise: 0.322, mag: 0.744 },
        { sec: 91.95, intensity: 0.495, rise: 0.176, mag: 0.419 },
        { sec: 100.25, intensity: 0.384, rise: 0.333, mag: 0.593 },
        { sec: 102.6, intensity: 0.471, rise: 0.227, mag: 0.463 },
        { sec: 107.05, intensity: 0.534, rise: 0.362, mag: 0.773 },
        { sec: 111.15, intensity: 0.413, rise: 0.151, mag: 0.374 },
        { sec: 115.4, intensity: 0.437, rise: 0.291, mag: 0.54 },
        { sec: 118.7, intensity: 0.377, rise: 0.185, mag: 0.361 },
        { sec: 123.2, intensity: 0.578, rise: 0.44, mag: 0.933 },
        { sec: 126.5, intensity: 0.7, rise: 0.311, mag: 0.727 },
        { sec: 129.35, intensity: 0.645, rise: 0.173, mag: 0.497 },
        { sec: 132.15, intensity: 0.621, rise: 0.178, mag: 0.499 },
        { sec: 134.4, intensity: 0.7, rise: 0.178, mag: 0.514 },
        { sec: 137.45, intensity: 0.666, rise: 0.295, mag: 0.701 },
        { sec: 139.95, intensity: 0.7, rise: 0.15, mag: 0.47 },
        { sec: 142.55, intensity: 0.121, rise: 0.072, mag: 0 },
        { sec: 146.95, intensity: 0.645, rise: 0.58, mag: 1 },
        { sec: 149.95, intensity: 0.566, rise: 0.213, mag: 0.539 },
        { sec: 158.35, intensity: 0.698, rise: 0.38, mag: 0.837 },
        { sec: 161.2, intensity: 0.671, rise: 0.091, mag: 0.376 },
        { sec: 165.35, intensity: 0.601, rise: 0.482, mag: 1 },
        { sec: 167.6, intensity: 0.674, rise: 0.351, mag: 0.791 }
      ]
    }
  };
})();
