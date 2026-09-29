// Palettes sampled from the source portrait. Keys are shared by every character,
// so an opponent is just a different colour table over the same sprite data.
export const HERO_PALETTE = {
  K: '#000000', // outline, pupils, mouth
  c: '#35BDD2', // mask base
  t: '#168494', // mask seams
  m: '#D10A7A', // eye panels
  p: '#F02E98', // hot pink trim
  r: '#6E0340', // maroon accents
  w: '#E5E5E5', // eye whites
  n: '#1A2466', // navy (lifted so it does not read as black beside the outline)
  N: '#0E1540', // navy shadow
  g: '#D6D6D6', // stripe grey
  G: '#A6A6A6', // stripe shadow
};

export const RUGPULL_PALETTE = {
  K: '#000000',
  c: '#E4572E',
  t: '#8C1C13',
  m: '#F2C14E',
  p: '#FFE07A',
  r: '#3B0A0A',
  w: '#E5E5E5',
  n: '#16161C',
  N: '#050507',
  g: '#3FBF5F',
  G: '#257A3A',
};

// Which palette key each body part uses (per character).
export const HERO_PARTS = { sleeveA: 'g', sleeveB: 'n', trunks: 'c', belt: 'p', tights: 'n', pads: 'c', boots: 'm', laces: 'p', gloves: 'm' };
export const RUGPULL_PARTS = { sleeveA: 'g', sleeveB: 'n', trunks: 'c', belt: 'm', tights: 'n', pads: 't', boots: 'c', laces: 'm', gloves: 't' };

// UI colours.
export const UI = {
  bg: '#07091c',
  laneBg: '#0b1238',
  laneLine: '#1c2560',
  offense: '#35BDD2',
  defense: '#F02E98',
  kickout: '#FFD84A',
  finisher: '#FF6BD6',
  white: '#FFFFFF',
  grey: '#8a91b8',
  fire: ['#FFF6C2', '#FFD84A', '#FF9A2E', '#F2552C', '#D10A7A', '#6E0340'],
};

// The mask head, 10x11, taken cell-for-cell from the portrait.
export const HEAD = [
  '..KKKKKK..',
  '.KccctccK.',
  'KttttttttK',
  'KcpcctccpK',
  'KcmmmtmmpK',
  'KcmwKrwKpK',
  'KcmmmrmmpK',
  'KcccctcccK',
  'KrccKKKctK',
  '.KmcctctK.',
  '..KmmrpK..',
];

// Bust for title and cut-ins: the head over the striped shirt, 16 wide.
export const BUST = [
  ...HEAD.map((r) => '...' + r + '...'),
  '....KKnnnnKK....',
  '..KKnnnnnnnnKK..',
  '.KnnnnnnnnnnnnK.',
  'KggggggggggggggK',
  'KnnnnnnnnnnnnnnK',
  'KggKggggggggKggK',
  'KnnKnnnnnnnnKnnK',
  'KggKggggggggKggK',
  'KnnKnnnnnnnnKnnK',
];
