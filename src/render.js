// Static-ish scene drawing: arena backdrop, crowd, ring, lane, HUD.
import { drawText } from './font.js';
import { OFFENSE_MISS_LIMIT, DEFENSE_RUN_TO_REVERSE } from './match.js';
import { UI, HERO_PALETTE, BUST, HEAD } from './palette.js';
import { drawGrid } from './sprites.js';
import { buildFanSprites, FAN_IDS } from './crowd.js';
import { LANES, LEAD, WINDOWS, TYPE_LANE } from './match.js';


export const W = 320;
export const H = 180;
// Bottom note track: notes scroll right-to-left into a hit target on the left.
export const TRACK_Y = 141; // top of the track panel (tags sit just above it)
export const ROW_H = 9; // one row per arrow
export const ROW_Y0 = 143; // top of row 0; 4 rows end at y=179
export const HIT_X = 30; // centre of the hit target
export const TRACK_END = W - 4; // where notes appear
export const RING_X0 = 0;
export const FLOOR_Y = 118; // wrestlers' feet: mid-mat, behind the front ropes
// Lane 0..3 = Left, Down, Up, Right (classic dance-pad order), rows top-to-bottom in that order.
export const ARROWS = ['left', 'down', 'up', 'right'];

const KIND_COLOR = { offense: UI.offense, defense: UI.defense, kickout: UI.kickout, finisher: UI.finisher };

// Deterministic crowd of the user's fan avatars: four tiered, staggered rows that
// interlock so the stands read as a crowd rather than a lattice.
const CROWD = [];
{
  let s = 7;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  // y = top of the sprite, shade = how far back the row sits (back rows are dimmer).
  const rows = [
    { y: 22, step: 19, off: 3, shade: 0.4 },
    { y: 38, step: 19, off: 12, shade: 0.62 },
    { y: 54, step: 20, off: 6, shade: 0.88 },
  ];
  rows.forEach((row, ri) => {
    for (let x = -14 + row.off; x < W + 8; x += row.step) {
      CROWD.push({
        x: x + Math.floor(r() * 4) - 2,
        y: row.y + Math.floor(r() * 3) - 1,
        row: ri,
        shade: row.shade,
        fan: FAN_IDS[Math.floor(r() * FAN_IDS.length)],
        phase: r(),
        flip: r() < 0.5,
        sign: r() < 0.05,
      });
    }
  });
}
let fanSprites = null;
let fanSpritesFlipped = null;
function sprites() {
  if (!fanSprites) {
    fanSprites = buildFanSprites();
    fanSpritesFlipped = {};
    for (const [id, c] of Object.entries(fanSprites)) {
      const f = document.createElement('canvas');
      f.width = c.width; f.height = c.height;
      const g = f.getContext('2d');
      g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(c, 0, 0);
      fanSpritesFlipped[id] = f;
    }
  }
  return fanSprites;
}

/** Arena: dark hall, lighting rig, crowd that bounces on the beat. */
export function drawArena(ctx, { beatPhase, hype, predator, now }) {
  ctx.fillStyle = predator ? '#14051a' : UI.bg;
  ctx.fillRect(0, 0, W, H);
  // Truss and spotlight cones.
  ctx.fillStyle = '#1a1f44';
  ctx.fillRect(0, 22, W, 2);
  for (let i = 0; i < 6; i++) {
    const x = 30 + i * 52;
    ctx.fillStyle = i % 2 ? UI.defense : UI.offense;
    ctx.fillRect(x, 24, 3, 2);
    ctx.globalAlpha = 0.07 + 0.05 * Math.sin(now * 2 + i);
    ctx.beginPath();
    ctx.moveTo(x, 26);
    ctx.lineTo(x - 24 + Math.sin(now * 0.7 + i) * 18, 136);
    ctx.lineTo(x + 26 + Math.sin(now * 0.7 + i) * 18, 136);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // Crowd rows. Back rows are darkened so the ring stays the focus, and everyone
  // jumps on the beat when the crowd is hot.
  const spr = sprites();
  const bounce = Math.max(0, 1 - beatPhase * 4);
  for (const c of CROWD) {
    const jumps = c.phase < 0.25 + hype * 0.65;
    const dy = jumps ? -Math.round(bounce * (1 + (2 - c.row) * 0.35) * (1 + hype * 1.6)) : 0;
    const img = (c.flip ? fanSpritesFlipped : spr)[c.fan];
    const yy = c.y + dy;
    ctx.drawImage(img, c.x, yy);
    if (c.shade < 1) {
      ctx.globalAlpha = 1 - c.shade;
      ctx.fillStyle = '#050718';
      ctx.fillRect(c.x, yy, img.width, img.height);
      ctx.globalAlpha = 1;
    }
    if (c.sign && hype > 0.25) {
      const sx = c.x + 2, sy = yy - 8;
      ctx.fillStyle = '#000';
      ctx.fillRect(sx - 1, sy - 1, 13, 9);
      ctx.fillStyle = '#fff';
      ctx.fillRect(sx, sy, 11, 7);
      ctx.fillStyle = UI.defense;
      ctx.fillRect(sx + 1, sy + 2, 9, 1);
      ctx.fillStyle = UI.offense;
      ctx.fillRect(sx + 1, sy + 4, 6, 1);
    }
    if (hype > 0.5 && Math.random() < 0.0025 * hype) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(c.x + 8, yy + 4, 2, 2);
    }
  }
  // Barricade at ringside, then the dark floor between the stands and the ring.
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 74, W, 8);
  ctx.fillStyle = '#1c2560';
  ctx.fillRect(0, 75, W, 2);
  for (let x = 0; x < W; x += 13) {
    ctx.fillStyle = '#0e1644';
    ctx.fillRect(x, 77, 8, 5);
    ctx.fillStyle = '#2b3a8a';
    ctx.fillRect(x + 1, 78, 6, 1);
  }
  // Ringside floor, so the area around the ring is lit arena rather than black void.
  ctx.fillStyle = '#0a0e24';
  ctx.fillRect(0, 82, W, H - 82);
  ctx.fillStyle = '#121838';
  for (let y = 86; y < H; y += 6) ctx.fillRect(0, y, W, 1);
}

/** Back half of the ring: apron, mat, back ropes, posts. Front ropes drawn separately over wrestlers. */
export function drawRingBack(ctx) {
  const bx0 = 58, bx1 = 262, by = 90; // back edge
  const fx0 = 36, fx1 = 284, fy = 128; // front edge
  // Mat trapezoid.
  for (let y = by; y <= fy; y++) {
    const t = (y - by) / (fy - by);
    const x0 = Math.round(bx0 + (fx0 - bx0) * t), x1 = Math.round(bx1 + (fx1 - bx1) * t);
    ctx.fillStyle = y % 12 < 1 ? '#c9cbe0' : '#e2e4f2';
    ctx.fillRect(x0, y, x1 - x0, 1);
  }
  // Centre logo: a big cyan $ ring.
  // Centre logo painted on the canvas: a squashed ring with the ticker.
  for (let dy = -8; dy <= 8; dy++) {
    const hw = Math.round(34 * Math.sqrt(1 - (dy / 8.5) ** 2));
    const iw = Math.round(26 * Math.sqrt(Math.max(0, 1 - (dy / 6.5) ** 2)));
    ctx.fillStyle = '#b6e4ee';
    ctx.fillRect(160 - hw, 110 + dy, hw * 2, 1);
    if (Math.abs(dy) < 7) { ctx.fillStyle = '#e2e4f2'; ctx.fillRect(160 - iw, 110 + dy, iw * 2, 1); }
  }
  // Plain star in the ring centre: text here got chopped up by the wrestlers' feet.
  ctx.fillStyle = '#8fd3e0';
  ctx.fillRect(159, 106, 3, 9); ctx.fillRect(155, 109, 11, 3);
  // Apron skirt.
  ctx.fillStyle = '#0b1238';
  ctx.fillRect(fx0, fy + 1, fx1 - fx0, 12);
  ctx.fillStyle = '#35BDD2';
  ctx.fillRect(fx0, fy + 1, fx1 - fx0, 1);
  // Back ropes.
  const ropes = ['#D10A7A', '#FFFFFF', '#35BDD2'];
  ropes.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(bx0, by - 10 - i * 7, bx1 - bx0, 1);
  });
  // Back posts.
  for (const x of [bx0, bx1]) {
    ctx.fillStyle = '#000';
    ctx.fillRect(x - 2, by - 28, 4, 30);
    ctx.fillStyle = '#8a91b8';
    ctx.fillRect(x - 1, by - 27, 2, 28);
  }
  // Side ropes (diagonal).
  ropes.forEach((c, i) => {
    ctx.strokeStyle = c;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx0 + 0.5, by - 10 - i * 7 + 0.5);
    ctx.lineTo(fx0 + 0.5, fy - 10 - i * 7 + 0.5);
    ctx.moveTo(bx1 + 0.5, by - 10 - i * 7 + 0.5);
    ctx.lineTo(fx1 - 0.5, fy - 10 - i * 7 + 0.5);
    ctx.stroke();
  });
}

export function drawRingFront(ctx, sag = 0) {
  const fx0 = 36, fx1 = 284, fy = 128;
  const ropes = ['#D10A7A', '#FFFFFF', '#35BDD2'];
  ropes.forEach((c, i) => {
    ctx.fillStyle = c;
    // Ropes sag in the middle on big impacts.
    for (let x = fx0; x < fx1; x += 4) {
      const t = (x - fx0) / (fx1 - fx0);
      const d = Math.round(Math.sin(t * Math.PI) * sag);
      ctx.fillRect(x, fy - 10 - i * 7 + d, 4, 1);
    }
  });
  for (const x of [fx0, fx1]) {
    ctx.fillStyle = '#000';
    ctx.fillRect(x - 3, fy - 30, 6, 34);
    ctx.fillStyle = '#8a91b8';
    ctx.fillRect(x - 2, fy - 29, 4, 32);
    ctx.fillStyle = '#D10A7A';
    ctx.fillRect(x - 2, fy - 29, 4, 5);
  }
}

// 7x7 pixel arrow pointing right; rotated for the other directions.
const ARROW_GLYPH = {};
{
  const base = ['..#....', '..##...', '######.', '#######', '######.', '..##...', '..#....'].map((r) => [...r].map((c) => c === '#'));
  const rot = (g) => g[0].map((_, c) => g.map((row) => row[c]).reverse()); // 90 degrees clockwise
  ARROW_GLYPH.right = base;
  ARROW_GLYPH.down = rot(base);
  ARROW_GLYPH.left = rot(rot(base));
  ARROW_GLYPH.up = rot(rot(rot(base)));
}

/** Draw a 7x7 arrow with a 1px black outline, centred at (cx, cy). */
export function drawArrow(ctx, dir, cx, cy, color, outline = '#000') {
  const g = ARROW_GLYPH[dir];
  const x0 = Math.round(cx - 3), y0 = Math.round(cy - 3);
  ctx.fillStyle = outline;
  for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) if (g[y][x]) ctx.fillRect(x0 + x - 1, y0 + y - 1, 3, 3);
  ctx.fillStyle = color;
  for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) if (g[y][x]) ctx.fillRect(x0 + x, y0 + y, 1, 1);
}

export function rowY(lane) {
  return ROW_Y0 + lane * ROW_H + Math.floor(ROW_H / 2);
}

/** Flow track along the bottom: 4 rows, notes scroll right-to-left into the hit target. */
export function drawLane(ctx, match, now, { pressed, judge, tint }) {
  const kind = match.seq ? match.seq.kind : match.control === 'opp' ? 'defense' : 'offense';
  const kc = KIND_COLOR[kind] || UI.offense;
  // Panel.
  ctx.fillStyle = '#000';
  ctx.fillRect(0, TRACK_Y - 1, W, H - TRACK_Y + 1);
  ctx.fillStyle = kc;
  ctx.fillRect(0, TRACK_Y - 1, W, 1);
  for (let i = 0; i < LANES; i++) {
    const y = ROW_Y0 + i * ROW_H;
    ctx.fillStyle = pressed[i] > 0 ? '#1f2a70' : i % 2 ? '#0b1238' : '#0e1644';
    ctx.fillRect(0, y, W, ROW_H - 1);
  }
  if (tint > 0) {
    ctx.globalAlpha = tint * 0.3;
    ctx.fillStyle = kc;
    ctx.fillRect(0, ROW_Y0, W, ROW_H * LANES);
    ctx.globalAlpha = 1;
  }
  // Beat lines scrolling with the music, so the player can feel the tempo.
  const beat = 60 / match.bpm;
  const pxPerSec = (TRACK_END - HIT_X) / LEAD;
  const firstBeat = Math.ceil(now / beat);
  for (let b = firstBeat; b * beat - now < LEAD; b++) {
    const x = Math.round(HIT_X + (b * beat - now) * pxPerSec);
    ctx.fillStyle = b % 4 === 0 ? '#2b3a8a' : '#18225c';
    ctx.fillRect(x, ROW_Y0, 1, ROW_H * LANES - 1);
  }
  // Hit target column.
  ctx.fillStyle = kc;
  ctx.fillRect(HIT_X - 6, ROW_Y0 - 1, 1, ROW_H * LANES + 1);
  ctx.fillRect(HIT_X + 6, ROW_Y0 - 1, 1, ROW_H * LANES + 1);
  for (let i = 0; i < LANES; i++) {
    const on = pressed[i] > 0;
    drawArrow(ctx, ARROWS[i], HIT_X, rowY(i), on ? '#fff' : '#3a4a9a', on ? kc : '#000');
  }
  // Notes.
  for (const n of match.notes) {
    if (n.void && !n.judged) continue;
    if (n.lane === TYPE_LANE) continue; // drawn by drawTypeRow
    const dt = n.t - now;
    if (dt > LEAD) continue;
    const y = rowY(n.lane);
    if (n.judged && n.judged !== 'miss') {
      const age = now - n.judgedAt;
      if (age > 0.18) continue;
      const g = Math.round(age * 40);
      ctx.fillStyle = '#fff';
      ctx.fillRect(HIT_X - 4 - g, y - 4 - g, 9 + g * 2, 1);
      ctx.fillRect(HIT_X - 4 - g, y + 4 + g, 9 + g * 2, 1);
      ctx.fillRect(HIT_X - 4 - g, y - 4 - g, 1, 9 + g * 2);
      ctx.fillRect(HIT_X + 4 + g, y - 4 - g, 1, 9 + g * 2);
      continue;
    }
    const x = Math.round(HIT_X + dt * pxPerSec);
    if (x < -6) continue;
    const c = n.judged === 'miss' ? '#444a6a' : KIND_COLOR[n.kind];
    drawArrow(ctx, ARROWS[n.lane], x, y, c);
  }
  drawTypeRow(ctx, match, now, pxPerSec, pressed);

  // Header tag on the top-left of the track: whose move it is.
  const lift = Math.round(TYPE_H * typeSlide) + (typeSlide > 0.02 ? 2 : 0);
  ctx.save();
  ctx.translate(0, -lift);
  const label = { offense: 'ATTACK', defense: 'DEFEND', kickout: 'KICK OUT!', finisher: match.seq && match.seq.typed ? 'SPECIAL' : 'FINISHER' }[kind] || '';
  const flicker = kind === 'kickout' && Math.floor(now * 8) % 2;
  const lw = label.length * 6 + 5;
  ctx.fillStyle = '#000';
  ctx.fillRect(HIT_X + 10, TRACK_Y - 10, lw, 9);
  ctx.fillStyle = kc;
  ctx.fillRect(HIT_X + 10, TRACK_Y - 10, lw, 1);
  drawText(ctx, label, HIT_X + 12, TRACK_Y - 8, flicker ? '#fff' : kc);
  // Progress pips: misses allowed on this move, or blocks needed during DEFEND.
  const seq = match.seq;
  if (seq && (kind === 'offense' || kind === 'finisher')) {
    const left = Math.max(0, OFFENSE_MISS_LIMIT - seq.misses);
    const bx = HIT_X + 10, by = TRACK_Y - 20;
    ctx.fillStyle = '#000';
    ctx.fillRect(bx - 1, by - 1, OFFENSE_MISS_LIMIT * 6 + 2, 7);
    for (let i = 0; i < OFFENSE_MISS_LIMIT; i++) {
      ctx.fillStyle = i < left ? UI.offense : UI.defense;
      ctx.fillRect(bx + i * 6, by, 4, 5);
    }
  } else if (seq && kind === 'defense') {
    const need = match.firedUp ? 3 : DEFENSE_RUN_TO_REVERSE;
    const bx = HIT_X + 10, by = TRACK_Y - 20;
    ctx.fillStyle = '#000';
    ctx.fillRect(bx - 1, by - 1, need * 6 + 2, 7);
    for (let i = 0; i < need; i++) {
      ctx.fillStyle = i < seq.run ? UI.kickout : '#2a3468';
      ctx.fillRect(bx + i * 6, by, 4, 5);
    }
  } else if (match.kickoutState) {
    // Tap kick-out bar: fills as the player mashes any arrow key / Space.
    const ko = match.kickoutState;
    const bx = 40, by = TRACK_Y - 20, bw = 240;
    const frac = Math.min(1, ko.taps / ko.needed);
    // Progress fill
    ctx.fillStyle = '#000';
    ctx.fillRect(bx - 1, by - 1, bw + 2, 7);
    ctx.fillStyle = '#2a3468';
    ctx.fillRect(bx, by, bw, 5);
    ctx.fillStyle = UI.kickout;
    ctx.fillRect(bx, by, Math.round(frac * bw), 5);
    // Tick marks: one per required tap
    for (let i = 1; i < ko.needed; i++) {
      const tx = bx + Math.round((i / ko.needed) * bw);
      ctx.fillStyle = i <= ko.taps ? '#000' : '#1a2050';
      ctx.fillRect(tx, by, 1, 5);
    }
    // Time bar: depletes as the window closes
    const timeLeft = ko.deadline - now;
    ctx.fillStyle = '#FF6BD6';
    ctx.fillRect(bx, by + 6, Math.round(Math.max(0, timeLeft / 3.5) * bw), 2);
    drawText(ctx, 'KICK OUT!', bx + bw + 4, by - 1, UI.kickout);
  }

  // Judgement pops just above the hit target; streak to the right of the tag.
  let sx = HIT_X + 14 + lw;
  if (match.streak >= 4) {
    const txt = `${match.streak} STREAK`;
    ctx.fillStyle = '#000';
    ctx.fillRect(sx, TRACK_Y - 10, txt.length * 6 + 3, 9);
    drawText(ctx, txt, sx + 2, TRACK_Y - 8, match.predator ? UI.finisher : '#fff');
    sx += txt.length * 6 + 7;
  }
  if (judge && now - judge.t < 0.5) {
    const c = { perfect: '#FFD84A', great: UI.offense, good: '#c8cde8', miss: '#F2552C' }[judge.grade];
    ctx.fillStyle = '#000';
    ctx.fillRect(sx, TRACK_Y - 10, judge.grade.length * 6 + 3, 9);
    drawText(ctx, judge.grade, sx + 2, TRACK_Y - 8, c);
  }
  ctx.restore();
}

// Typing row: a 5th row that slides up above the arrow track while a special move is on.
// Letter tiles scroll into the same hit target as the arrows; type each one on its beat.
export const TYPE_H = 13;
let typeSlide = 0;
function drawTypeRow(ctx, match, now, pxPerSec, pressed) {
  const seq = match.seq;
  const on = !!(seq && seq.typed);
  typeSlide += ((on ? 1 : 0) - typeSlide) * 0.18;
  if (typeSlide < 0.02) return;
  const y0 = Math.round(TRACK_Y - 1 - TYPE_H * typeSlide) - 1;
  const cy = y0 + 7;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, y0 - 1, W, TYPE_H + 2);
  ctx.fillStyle = pressed[TYPE_LANE] > 0 ? '#1a0a24' : '#000';
  ctx.fillRect(0, y0, W, TYPE_H);
  ctx.fillStyle = UI.finisher;
  ctx.fillRect(0, y0 - 1, W, 1);
  // Target box, same column as the arrow targets.
  ctx.fillRect(HIT_X - 7, y0 + 1, 1, TYPE_H - 2);
  ctx.fillRect(HIT_X + 7, y0 + 1, 1, TYPE_H - 2);
  if (!seq) return;
  // Next letter to type, big and centred on the right so it reads even at speed.
  const next = seq.notes.find((n) => !n.judged && !n.void);

  for (const n of seq.notes) {
    const dt = n.t - now;
    if (dt > LEAD) continue;
    if (n.judged && n.judged !== 'miss') {
      const age = now - n.judgedAt;
      if (age > 0.25) continue;
      ctx.globalAlpha = 1 - age * 4;
      drawText(ctx, n.letter, HIT_X + 1, cy - 3 - Math.round(age * 30), '#35E0F0', { align: 'center', scale: 1 });
      ctx.globalAlpha = 1;
      continue;
    }
    const x = Math.round(HIT_X + dt * pxPerSec);
    if (x < -8 || x > W + 8) continue;
    const miss = n.judged === 'miss';
    // Letter tile: black outline, magenta fill, white glyph.
    // Black tile, 1px coloured frame, flat letter: pink, cyan for the next one to type.
    const lc = miss ? '#555a78' : n === next ? '#35E0F0' : '#FF6BD6';
    ctx.fillStyle = lc;
    ctx.fillRect(x - 6, cy - 6, 13, 12);
    ctx.fillStyle = '#000';
    ctx.fillRect(x - 5, cy - 5, 11, 10);
    drawText(ctx, n.letter, x + 1, cy - 3, lc, { align: 'center' });
  }
}

function bar(ctx, x, y, w, frac, color, rightToLeft) {
  ctx.fillStyle = '#000';
  ctx.fillRect(x - 1, y - 1, w + 2, 7);
  ctx.fillStyle = '#3a0a20';
  ctx.fillRect(x, y, w, 5);
  const fw = Math.round(w * Math.max(0, Math.min(1, frac)));
  ctx.fillStyle = color;
  ctx.fillRect(rightToLeft ? x + w - fw : x, y, fw, 5);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(rightToLeft ? x + w - fw : x, y, fw, 1);
}

/** Top HUD over the whole width: portraits, health, control tug-of-war, score. */
export function drawHUD(ctx, match, opp, oppPal, now, glow) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, 21);
  // Hero portrait: the mask head at 1x.
  drawGrid(ctx, HEAD, 3, 4, glow ? { ...HERO_PALETTE, w: UI.finisher } : HERO_PALETTE, 1);
  drawGrid(ctx, HEAD, W - 13, 4, oppPal, 1);
  drawText(ctx, '$WRESTLER', 16, 3, UI.offense);
  drawText(ctx, opp.name, W - 16, 3, oppPal.c, { align: 'right' });
  const hbw = 120;
  bar(ctx, 16, 12, hbw, match.heroHP / 100, match.heroHP > 30 ? '#3FBF5F' : '#F2552C');
  bar(ctx, W - 16 - hbw, 12, hbw, match.oppHP / 100, oppPal.c, true);
  // Control indicator in the middle.
  const cx = W / 2;
  const heroCtl = match.control === 'hero';
  ctx.fillStyle = heroCtl ? UI.offense : UI.defense;
  ctx.fillRect(cx - 12, 11, 24, 7);
  ctx.fillStyle = '#000';
  ctx.fillRect(cx - 11, 12, 22, 5);
  drawText(ctx, heroCtl ? '<<' : '>>', cx, 11, heroCtl ? UI.offense : UI.defense, { align: 'center' });
  drawText(ctx, String(match.score).padStart(7, '0'), cx, 3, '#fff', { align: 'center' });
}

/** Big bust cut-in for the finisher. */
export function drawCutIn(ctx, k) {
  const band = 70;
  const y = 55;
  const slide = Math.round((1 - Math.min(1, k * 3)) * -W);
  ctx.fillStyle = UI.defense;
  ctx.fillRect(slide, y - 2, W, band + 4);
  ctx.fillStyle = '#000';
  ctx.fillRect(slide, y, W, band);
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = i % 2 ? '#0b1238' : '#101a4e';
    ctx.fillRect(slide + ((i * 40 + Math.round(k * 400)) % (W + 40)) - 40, y, 20, band);
  }
  drawGrid(ctx, BUST, slide + 40, y + 5, HERO_PALETTE, 3);
  drawText(ctx, 'GALAXY', slide + 130, y + 16, UI.offense, { scale: 3, shadow: UI.defense });
  drawText(ctx, 'DRIVER', slide + 130, y + 42, '#fff', { scale: 3, shadow: UI.defense });
}

export function drawTitleBust(ctx, x, y, scale) {
  drawGrid(ctx, BUST, x, y, HERO_PALETTE, scale);
}

export { WINDOWS };
