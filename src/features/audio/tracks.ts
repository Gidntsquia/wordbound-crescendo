import type { ComposerId } from '@/game/types';
import furElise from './tracks/fur-elise.mp3';
import moonlight from './tracks/moonlight-sonata.mp3';
import symphony5 from './tracks/symphony-5.mp3';
import goldberg from './tracks/goldberg-aria.mp3';
import variatio5 from './tracks/variatio-5.mp3';
import variatio13 from './tracks/variatio-13.mp3';
import nachtmusik from './tracks/nachtmusik.mp3';
import romance from './tracks/romance.mp3';
import rondo from './tracks/rondo.mp3';

export interface Track {
  title: string;
  composer: ComposerId;
  url: string;
  performer: string;
  license: string;
  sourcePage: string;
}

const PIXABAY =
  'Pixabay Content License (composition public domain; recording permissive, not PD)';
const COMMONS = 'https://commons.wikimedia.org/wiki/File:';

// Every file is trimmed to 3 minutes or less at 128 kbps. Licences were read
// from each file's Commons page (2026-10-02) or carried over from the old game.
const TRACKS: Track[] = [
  {
    title: 'Für Elise',
    composer: 'beethoven',
    url: furElise,
    performer: 'Pixabay track, performer uncredited',
    license: PIXABAY,
    sourcePage: 'https://pixabay.com/music/search/fur%20elise/',
  },
  {
    title: 'Moonlight Sonata',
    composer: 'beethoven',
    url: moonlight,
    performer: 'Pixabay track, performer uncredited',
    license: PIXABAY,
    sourcePage: 'https://pixabay.com/music/',
  },
  {
    title: 'Symphony No. 5, I. Allegro con brio',
    composer: 'beethoven',
    url: symphony5,
    performer: 'Skidmore College Orchestra',
    license: 'Public domain (performers’ dedication via Musopen)',
    sourcePage: `${COMMONS}Ludwig_van_Beethoven_-_symphony_no._5_in_c_minor,_op._67_-_i._allegro_con_brio.ogg`,
  },
  {
    title: 'Goldberg Variations, Aria',
    composer: 'bach',
    url: goldberg,
    performer: 'Kimiko Ishizaka (Open Goldberg Variations)',
    license: 'CC0 1.0',
    sourcePage: `${COMMONS}Kimiko_Ishizaka_-_01_-_Aria.ogg`,
  },
  {
    title: 'Goldberg Variations, Variatio 5',
    composer: 'bach',
    url: variatio5,
    performer: 'Kimiko Ishizaka (Open Goldberg Variations)',
    license: 'CC0 1.0',
    sourcePage: `${COMMONS}Kimiko_Ishizaka_-_06_-_Variatio_5_a_1_ovvero_2_Clav.ogg`,
  },
  {
    title: 'Goldberg Variations, Variatio 13',
    composer: 'bach',
    url: variatio13,
    performer: 'Kimiko Ishizaka (Open Goldberg Variations)',
    license: 'CC0 1.0',
    sourcePage: `${COMMONS}Kimiko_Ishizaka_-_14_-_Variatio_13_a_2_Clav.ogg`,
  },
  {
    title: 'Eine kleine Nachtmusik, I. Allegro',
    composer: 'mozart',
    url: nachtmusik,
    performer: 'Musopen (European Archive)',
    license: 'Public domain (released via Musopen)',
    sourcePage: `${COMMONS}Mozart_K525_Serenade_in_G_Major_1_-_Allegro.ogg`,
  },
  {
    title: 'Eine kleine Nachtmusik, II. Romance',
    composer: 'mozart',
    url: romance,
    performer: 'Musopen (European Archive)',
    license: 'Public domain (released via Musopen)',
    sourcePage: `${COMMONS}Mozart_K525_Serenade_in_G_Major_2_-_Romance.ogg`,
  },
  {
    title: 'Eine kleine Nachtmusik, IV. Rondo',
    composer: 'mozart',
    url: rondo,
    performer: 'Musopen (European Archive)',
    license: 'Public domain (released via Musopen)',
    sourcePage: `${COMMONS}Mozart_K525_Serenade_in_G_Major_4_-_Rondo.ogg`,
  },
];

/** All of one composer's recordings, in play order. */
export function tracksFor(composer: ComposerId): Track[] {
  return TRACKS.filter((t) => t.composer === composer);
}

/** Fights take the chosen composer's recordings in turn. */
export function trackForFight(composer: ComposerId, fightIndex: number): Track {
  const list = tracksFor(composer);
  return list[fightIndex % list.length] as Track;
}
