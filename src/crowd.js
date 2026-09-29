// Audience members: the five fan avatars supplied by the user, redrawn cell by cell
// as 20x20 busts from colours sampled off the originals. Palette keys are per-avatar.
// '.' = transparent. Every bust has a 1-cell black outline like the hero.

export const FANS = {
  // Tan skin, navy visor with cyan pixel eyes, grey headphones, mint tee.
  visor: {
    pal: { K: '#000000', s: '#C8A050', S: '#A07850', v: '#001428', e: '#00A0F0', E: '#0078C8', h: '#3C3C3C', t: '#1a1a1a', m: '#78F0C8', M: '#A0C8C8', D: '#78C8C8' },
    grid: [
      '.....KKKKKKKKKK.....',
      '....KhhhhhhhhhhK....',
      '...KhKKKKKKKKKKhK...',
      '..KhKssssssssssKhK..',
      '..KhKssssssssssKhK..',
      '.KhhKvvvvvvvvvvKhhK.',
      '.KhhKveeEvveeEvKhhK.',
      '.KhhKvvvvvvvvvvKhhK.',
      '..KhKssssssssssKhK..',
      '...KKssssssssssKK...',
      '....KssKKKKKKssK....',
      '....KssssssssssK....',
      '.....KKssssssKK.....',
      '.......KsSSsK.......',
      '...KKmmmKKKKmmmKK...',
      '..KmmmmmmKKmmmmmmK..',
      '.KMmmmmmmmmmmmmmmmK.',
      '.KMmmmmmmmmmmKKKmmK.',
      '.KMmmmmmmmmmmKDKmmK.',
      '.KMmmmmmmmmmmKKKmmK.',
    ],
  },
  // Purple frog, square yellow eyes, flat mouth, cream TIBBIR tee.
  tibbir: {
    pal: { K: '#000000', p: '#7850C8', P: '#A078C8', d: '#5050A0', y: '#F0A000', Y: '#C87800', r: '#282878', c: '#DCC8A0', C: '#C8C8A0', t: '#282828' },
    grid: [
      '..KKKKKK....KKKKKK..',
      '..KyyyyK....KyyyyK..',
      '..KyKKyK....KyKKyK..',
      '.KpYYYYKppppKYYYYpK.',
      'KppppppppppppppppppK',
      'KpPPppppppppppppPPpK',
      'KppppppppppppppppppK',
      'KpprrrrrrrrrrrrrrppK',
      'KppppppppppppppppppK',
      '.KdppppppppppppppdK.',
      '..KKddddddddddddKK..',
      '....KKKKKKKKKKKK....',
      '...KccccKppKccccK...',
      '..KccccccKKccccccK..',
      'KcKKKcKcKKcKKcKcKKcK',
      'KccKccKcKccKccKcKKcK',
      'KccKccKcKKcKKcKcKccK',
      'KccccccccccccccccccK',
      'KccccccccccccccccccK',
      'KccccccccccccccccccK',
    ],
  },
  // Blue frog, tan cowboy hat, mosaic glasses, red lips, black ALTT tee.
  altt: {
    pal: { K: '#000000', h: '#C8A028', H: '#A07800', b: '#C87828', f: '#1E5AA8', F: '#0F3C78', l: '#C82828', L: '#8A1A18', m1: '#7828A0', a: '#7828A0', o: '#C85028', g: '#14B450', w: '#C8A078', s: '#1a1a24', G: '#00C850' },
    grid: [
      '.....KKKKKKKKKK.....',
      '....KhhhhHHhhhhK....',
      '....KhhhhhhhhhhK....',
      '.KKKKbbbbbbbbbbKKKK.',
      'KhhhhhhhhhhhhhhhhhhK',
      '.KKHHHHHHHHHHHHHHKK.',
      '..KffffffffffffffK..',
      '.KfKKKKKKffKKKKKKfK.',
      '.KfKaogoKKKKgoaoKfK.',
      '.KfKglaoKffKoalgKfK.',
      '.KfKKKKKKffKKKKKKfK.',
      '.KffffffffffffffffK.',
      '.KfllllllllllllllfK.',
      '..KfLLLLLLLLLLLLfK..',
      '...KKffffffffffKK...',
      '..KKsssKKKKKKsssKK..',
      '.KssssssssssssssssK.',
      '.KssGssGsssGGGsGGGK.',
      '.KsGGGsGssssGsssGsK.',
      '.KsGsGsGGGssGsssGsK.',
    ],
  },
  // Blue frog, spiky pale-blue hair, black shades, red lips, green hoodie.
  shades: {
    pal: { K: '#000000', i: '#A0C8C8', I: '#DCEAF4', j: '#78A0C8', f: '#2F63B8', F: '#1F4E9E', n: '#163A7A', x: '#C8261E', X: '#8A1A18', g: '#6B6966', z: '#101010', v: '#4C7D36', V: '#3A6A2A', w: '#24441A' },
    grid: [
      '...K...K...K...K....',
      '..KiK.KiK.KiK.KiK...',
      '.KiIiKiIiKiIiKiIiK..',
      'KjiIijiIijiIijiIijK.',
      '.KjjjjjjjjjjjjjjjjK.',
      '.KffffffffffffffffK.',
      'KfKKKKKKKffKKKKKKKfK',
      'KfKzgzzzKKKKzgzzzKfK',
      'KfKzzzzzKffKzzzzzKfK',
      'KffKKKKKffffKKKKKffK',
      'KffffffffffffffffffK',
      'KfxxxxxxxxxxxxxxxxfK',
      '.KfXXXXXXXXXXXXXXfK.',
      '..KffffffffffffffK..',
      '...KKnnnnnnnnnnKK...',
      '..KvVKKKKKKKKKKVvK..',
      '.KvvVVvvvvvvvvVVvvK.',
      'KvvvvwvvvvvvvvwvvvvK',
      'KvvvvwvvvvvvvvwvvvvK',
      'KvvvvvvvvvvvvvvvvvvK',
    ],
  },
  // Grey mouse, big round ears, purple eyes, flat mouth, black tee with a lime glyph.
  mouse: {
    pal: { K: '#000000', a: '#8C8C8C', A: '#A0A0A0', d: '#C8C8C8', e: '#6E6E8C', p: '#A050A0', P: '#7828A0', w: '#E6E6F0', t: '#1C1C1C', T: '#2E2E2E', g: '#78C850' },
    grid: [
      'KKKKK..........KKKKK',
      'KaaaaK........KaaaaK',
      'KaeeeaK......KaeeeaK',
      'KaeeeaKKKKKKKKaeeeaK',
      'KaeeeaAAAAAAAAaeeeaK',
      'KaeeaAAAAAAAAAAaeeaK',
      '.KaaAAAAAAAAAAAAaaK.',
      '..KAAAAAAAAAAAAAAK..',
      '..KAKKKKAAAAKKKKAK..',
      '..KAKwpKAAAAKwpKAK..',
      '..KAKpPKAAAAKpPKAK..',
      '..KAKKKKAAAAKKKKAK..',
      '..KAAAAAAAAAAAAAAK..',
      '...KAAAKKKKKKAAAK...',
      '....KKAAAAAAAAKK....',
      '..KKtKKKKKKKKKKtKK..',
      '.KattttgggtttttttaK.',
      '.KattttgtgtttttttaK.',
      '.KattttggttttttttaK.',
      '.KattttgtgtttttttaK.',
    ],
  },
};

export const FAN_IDS = Object.keys(FANS);

/** Pre-render each fan to an offscreen canvas once; drawing a crowd is then just drawImage. */
export function buildFanSprites(doc = document) {
  const out = {};
  for (const [id, f] of Object.entries(FANS)) {
    const c = doc.createElement('canvas');
    c.width = f.grid[0].length;
    c.height = f.grid.length;
    const g = c.getContext('2d');
    f.grid.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const k = row[x];
        if (k === '.') continue;
        g.fillStyle = f.pal[k] || '#ff00ff';
        g.fillRect(x, y, 1, 1);
      }
    });
    out[id] = c;
  }
  return out;
}
