// Every image in the game, with where it came from. All public domain.
export interface ArtCredit {
  file: string;
  subject: string;
  maker: string;
  year: string;
  licence: string;
  sourcePage: string;
}

export const ART_CREDITS: ArtCredit[] = [
  {
    file: 'img/beethoven.jpg',
    subject: 'Ludwig van Beethoven',
    maker: 'Blasius Höfel (engraving after Letronne)',
    year: '1814',
    licence: 'Public domain',
    sourcePage:
      'https://commons.wikimedia.org/wiki/File:Beethoven_H%C3%B6fel.jpg',
  },
  {
    file: 'img/bach.jpg',
    subject: 'Johann Sebastian Bach',
    maker: 'Rudolf Schuster (copper etching after the Bach family portrait)',
    year: '1890',
    licence: 'Public domain',
    sourcePage:
      'https://commons.wikimedia.org/wiki/File:PPN663961157_Bildnis_von_Johann_Sebastian_Bach_(1890).jpg',
  },
  {
    file: 'img/mozart.jpg',
    subject: 'Wolfgang Amadeus Mozart',
    maker: 'Johann Christian Benjamin Gottschick (engraving)',
    year: '1829',
    licence: 'Public domain',
    sourcePage:
      'https://commons.wikimedia.org/wiki/File:Mozart_1829_Gottschick_engraving.jpg',
  },
];
