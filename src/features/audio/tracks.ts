import furElise from './tracks/fur-elise.mp3';
import moonlight from './tracks/moonlight-sonata.mp3';

export interface Track {
  title: string;
  composer: string;
  url: string;
  performer: string;
  license: string;
  sourcePage: string;
}

// Licence records copied from the old game's tools/audio-manifest.json.
const TRACKS: Track[] = [
  {
    title: 'Für Elise',
    composer: 'Ludwig van Beethoven',
    url: furElise,
    performer: 'Pixabay track, performer uncredited',
    license:
      'Pixabay Content License (composition public domain; recording permissive, not PD)',
    sourcePage: 'https://pixabay.com/music/search/fur%20elise/',
  },
  {
    title: 'Moonlight Sonata',
    composer: 'Ludwig van Beethoven',
    url: moonlight,
    performer: 'Pixabay track, performer uncredited',
    license:
      'Pixabay Content License (composition public domain; recording permissive, not PD)',
    sourcePage: 'https://pixabay.com/music/',
  },
];

/** Fights take the recordings in turn. */
export function trackForFight(fightIndex: number): Track {
  return TRACKS[fightIndex % TRACKS.length] as Track;
}
