// Procedural pixel wrestlers. A pose is a small skeleton (joint offsets in pixels,
// origin at the feet). Limbs are drawn as outlined pixel capsules, then the mask head
// from the portrait is stamped on top. Everything snaps to whole pixels.
import { HEAD } from './palette.js';

// Joint offsets relative to the hip centre (x right, y down). Facing right.
// Each pose: hip height, torso lean, arm and leg joints.
const P = (o) => o;
// Chunky proportions: short legs (hip at 14px), broad chest, 2x head.
// chest = top-centre of the torso; head offset is relative to the chest (lean / bob).
export const POSES = {
  idle: P({ hip: 14, chest: [1, -12], head: [1, 0], fArm: [[5, -6], [7, -1]], bArm: [[-5, -6], [-6, -1]], fLeg: [[3, 7], [4, 14]], bLeg: [[-3, 7], [-4, 14]] }),
  idle2: P({ hip: 13, chest: [1, -12], head: [1, 1], fArm: [[5, -5], [7, 0]], bArm: [[-5, -5], [-6, 0]], fLeg: [[3, 7], [4, 13]], bLeg: [[-3, 7], [-4, 13]] }),
  strike: P({ hip: 14, chest: [3, -12], head: [2, 0], fArm: [[11, -11], [18, -11]], bArm: [[-5, -6], [-5, -1]], fLeg: [[5, 7], [7, 14]], bLeg: [[-3, 7], [-7, 14]] }),
  chop: P({ hip: 14, chest: [2, -12], head: [0, 0], fArm: [[8, -18], [13, -20]], bArm: [[-5, -6], [-5, -1]], fLeg: [[4, 7], [6, 14]], bLeg: [[-3, 7], [-6, 14]] }),
  block: P({ hip: 13, chest: [-1, -12], head: [-1, 1], fArm: [[8, -12], [9, -18]], bArm: [[6, -9], [8, -15]], fLeg: [[3, 7], [6, 13]], bLeg: [[-4, 7], [-7, 13]] }),
  hurt: P({ hip: 14, chest: [-4, -11], head: [-3, 1], fArm: [[1, -4], [5, 1]], bArm: [[-9, -8], [-13, -12]], fLeg: [[2, 7], [5, 14]], bLeg: [[-3, 7], [-3, 14]] }),
  grab: P({ hip: 13, chest: [4, -11], head: [2, 1], fArm: [[11, -8], [16, -6]], bArm: [[9, -5], [14, -3]], fLeg: [[5, 7], [7, 13]], bLeg: [[-4, 7], [-7, 13]] }),
  lift: P({ hip: 13, chest: [0, -12], head: [0, 1], fArm: [[6, -19], [7, -27]], bArm: [[-6, -19], [-7, -27]], fLeg: [[5, 7], [7, 13]], bLeg: [[-5, 7], [-7, 13]] }),
  taunt: P({ hip: 14, chest: [0, -12], head: [0, 0], fArm: [[9, -16], [11, -24]], bArm: [[-9, -16], [-11, -24]], fLeg: [[5, 7], [7, 14]], bLeg: [[-5, 7], [-7, 14]] }),
  flex: P({ hip: 14, chest: [0, -12], head: [0, 0], fArm: [[11, -10], [11, -18]], bArm: [[-11, -10], [-11, -18]], fLeg: [[5, 7], [7, 14]], bLeg: [[-5, 7], [-7, 14]] }),
  down: P({ rot: 'flat' }),
  kneel: P({ hip: 9, chest: [0, -12], head: [1, 1], fArm: [[6, -6], [9, -1]], bArm: [[-5, -6], [-4, -1]], fLeg: [[9, 1], [10, 9]], bLeg: [[-2, 8], [-11, 8]] }),

  // ---- Staged-move poses ----
  // Walking in: legs scissored, arms loose.
  walk: P({ hip: 14, chest: [2, -12], head: [1, 0], fArm: [[4, -6], [3, -1]], bArm: [[-3, -6], [-1, -1]], fLeg: [[5, 7], [8, 14]], bLeg: [[-2, 7], [-6, 13]] }),
  walk2: P({ hip: 13, chest: [2, -12], head: [1, 1], fArm: [[5, -6], [8, -2]], bArm: [[-5, -6], [-8, -2]], fLeg: [[1, 7], [0, 13]], bLeg: [[1, 7], [2, 13]] }),
  // Running: deep lean, arms pumping.
  run: P({ hip: 13, chest: [6, -11], head: [4, 1], fArm: [[9, -4], [13, -8]], bArm: [[-3, -8], [-8, -3]], fLeg: [[7, 5], [10, 12]], bLeg: [[-4, 7], [-10, 11]] }),
  run2: P({ hip: 14, chest: [6, -11], head: [4, 0], fArm: [[4, -8], [0, -3]], bArm: [[8, -5], [12, -9]], fLeg: [[2, 7], [-2, 13]], bLeg: [[5, 6], [9, 13]] }),
  // Collar-and-elbow lock-up: leaning in, both arms forward and high.
  lockup: P({ hip: 13, chest: [5, -11], head: [4, 1], fArm: [[10, -13], [14, -15]], bArm: [[9, -8], [14, -9]], fLeg: [[5, 7], [8, 13]], bLeg: [[-5, 7], [-9, 13]] }),
  // Front facelock: bent forward, arm hooked round a head at waist height.
  facelock: P({ hip: 13, chest: [5, -11], head: [3, 2], fArm: [[10, -6], [9, -1]], bArm: [[9, -9], [12, -6]], fLeg: [[5, 7], [8, 13]], bLeg: [[-5, 7], [-9, 13]] }),
  // Victim bent over, head down at the attacker's waist.
  bentover: P({ hip: 14, chest: [9, -6], head: [7, 6], fArm: [[10, 0], [11, 6]], bArm: [[6, 0], [6, 6]], fLeg: [[3, 7], [4, 14]], bLeg: [[-3, 7], [-4, 14]] }),
  // Scoop: squat and reach under, knees bent.
  scoop: P({ hip: 10, chest: [4, -11], head: [3, 1], fArm: [[10, -4], [13, 1]], bArm: [[8, -8], [12, -8]], fLeg: [[7, 4], [7, 10]], bLeg: [[-6, 4], [-7, 10]] }),
  // Carry: arms up holding someone over the head / shoulders, wide stance.
  carry: P({ hip: 14, chest: [0, -12], head: [0, 1], fArm: [[5, -19], [4, -26]], bArm: [[-5, -19], [-4, -26]], fLeg: [[6, 7], [8, 14]], bLeg: [[-6, 7], [-8, 14]] }),
  // Hip turn: back to the opponent, arm across.
  hipturn: P({ hip: 12, chest: [-2, -12], head: [-2, 1], fArm: [[-4, -8], [-9, -9]], bArm: [[4, -8], [9, -10]], fLeg: [[5, 6], [8, 12]], bLeg: [[-5, 6], [-8, 12]] }),
  // Climbing the turnbuckle: one leg high, arms reaching up.
  climb: P({ hip: 14, chest: [2, -12], head: [1, 0], fArm: [[6, -18], [8, -24]], bArm: [[3, -16], [6, -21]], fLeg: [[6, 2], [8, 6]], bLeg: [[-2, 7], [-2, 14]] }),
  // Crouched on the top rope, arms out wide for balance.
  perch: P({ hip: 9, chest: [1, -11], head: [1, 0], fArm: [[10, -10], [16, -12]], bArm: [[-9, -10], [-15, -12]], fLeg: [[6, 3], [5, 9]], bLeg: [[-5, 3], [-4, 9]] }),
  // Airborne: tucked, knees up.
  tuck: P({ hip: 10, chest: [0, -11], head: [0, 1], fArm: [[6, -5], [8, 0]], bArm: [[-6, -5], [-8, 0]], fLeg: [[6, -2], [8, 4]], bLeg: [[-4, -1], [-2, 5]] }),
  // Flat dive: arms and legs spread wide.
  splash: P({ hip: 10, chest: [0, -11], head: [0, 0], fArm: [[10, -12], [17, -12]], bArm: [[-10, -12], [-17, -12]], fLeg: [[8, 5], [14, 9]], bLeg: [[-8, 5], [-14, 9]] }),
  // Dropkick: both feet shooting forward, body horizontal.
  dropkick: P({ hip: 10, chest: [-9, -6], head: [-9, 1], fArm: [[-10, -2], [-14, 2]], bArm: [[-4, -3], [-6, 2]], fLeg: [[8, -2], [15, -3]], bLeg: [[8, 1], [15, 1]] }),
  // Big forearm cocked back.
  windup: P({ hip: 14, chest: [-2, -12], head: [-2, 0], fArm: [[-4, -16], [-10, -20]], bArm: [[4, -7], [8, -4]], fLeg: [[4, 7], [7, 14]], bLeg: [[-4, 7], [-6, 14]] }),
  // Arm straight out: clothesline.
  lariat: P({ hip: 14, chest: [4, -12], head: [3, 0], fArm: [[11, -11], [19, -11]], bArm: [[-7, -9], [-12, -6]], fLeg: [[6, 7], [10, 13]], bLeg: [[-4, 7], [-9, 13]] }),
  // Leaning back on the ropes, stretched.
  ropes: P({ hip: 13, chest: [-6, -11], head: [-6, 0], fArm: [[-2, -12], [2, -14]], bArm: [[-10, -12], [-13, -14]], fLeg: [[4, 7], [8, 13]], bLeg: [[-2, 7], [-2, 13]] }),
  // Staggering: off balance, arms flailing.
  stagger: P({ hip: 13, chest: [-5, -11], head: [-5, 2], fArm: [[3, -12], [7, -17]], bArm: [[-11, -8], [-14, -3]], fLeg: [[4, 7], [7, 13]], bLeg: [[-5, 7], [-9, 12]] }),
};

// Rotated body states for the victim of throws. Degrees, clockwise, applied around
// the body's centre. Kept to multiples of 90 so pixels stay crisp.
export const ROTATIONS = { upright: 0, horizontal: 90, inverted: 180, headfirst: 270 };

// Draw an outlined thick line between two points (Bresenham with a square brush).
function stroke(ctx, x0, y0, x1, y1, w, color) {
  ctx.fillStyle = color;
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  const h = Math.floor(w / 2);
  for (;;) {
    ctx.fillRect(x0 - h, y0 - h, w, w);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

// Head is stamped at 2x so the mask stays readable (chunky, avatar-style proportions).
export const HEAD_SCALE = 2;
function drawHead(ctx, x, y, pal, flip, glow) {
  const w = HEAD[0].length;
  const s = HEAD_SCALE;
  for (let r = 0; r < HEAD.length; r++)
    for (let c = 0; c < w; c++) {
      const k = HEAD[r][flip ? w - 1 - c : c];
      if (k === '.') continue;
      let col = pal[k];
      if (glow && k === 'w') col = '#FF6BD6';
      ctx.fillStyle = col;
      ctx.fillRect(x + c * s, y + r * s, s, s);
    }
}

/**
 * Draw a wrestler. (x, y) = feet on the canvas floor.
 * opts: { pose, facing: 1|-1, pal, parts, glow, flash, lift (px up), angle (for 'down') }
 */
let _buf = null; // shared offscreen buffer for rotated bodies
function rotBuf() {
  if (!_buf) {
    _buf = document.createElement('canvas');
    _buf.width = 96; _buf.height = 96;
    _buf.ctx = _buf.getContext('2d');
  }
  return _buf;
}

export function drawWrestler(ctx, x, y, opts) {
  const rot = opts.rot || 0;
  const pivot = opts.pivot === undefined ? 0.5 : opts.pivot;
  if (rot) {
    // Draw upright onto the buffer, then blit it back rotated by whole 90s so
    // nothing is smoothed. Used for victims held upside down or horizontally.
    const b = rotBuf();
    const g = b.ctx;
    g.clearRect(0, 0, b.width, b.height);
    drawUpright(g, 48, 92, Object.assign({}, opts, { rot: 0, facing: 1, lift: 0 }));
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.translate(0, -Math.round(34 * pivot));
    ctx.rotate((rot * Math.PI) / 180);
    ctx.translate(0, Math.round(34 * pivot));
    if ((opts.facing || 1) < 0) ctx.scale(-1, 1);
    ctx.drawImage(b, -48, -92);
    ctx.restore();
    return;
  }
  drawUpright(ctx, x, y, opts);
}

function drawUpright(ctx, x, y, { pose = 'idle', facing = 1, pal, parts, glow = false, flash = false, lift = 0 }) {
  const P = POSES[pose] || POSES.idle;
  const f = facing;
  x = Math.round(x);
  y = Math.round(y - lift);
  const col = (k) => (flash ? '#FFFFFF' : pal[k]);

  if (P.rot === 'flat') return drawDown(ctx, x, y, f, pal, parts, flash);

  const hip = [x, y - P.hip];
  const J = (o) => [hip[0] + o[0] * f, hip[1] + o[1]];
  const chest = J(P.chest);
  const limb = (a, b, w, c) => {
    stroke(ctx, a[0], a[1], b[0], b[1], w + 2, col('K'));
    stroke(ctx, a[0], a[1], b[0], b[1], w, c);
  };
  const shoulderF = [chest[0] + 5 * f, chest[1] - 1];
  const shoulderB = [chest[0] - 5 * f, chest[1] - 1];
  const hipF = [hip[0] + 3 * f, hip[1] + 2];
  const hipB = [hip[0] - 3 * f, hip[1] + 2];

  // Back limbs first (darker), torso, front limbs.
  const bl = P.bLeg.map(J), fl = P.fLeg.map(J), ba = P.bArm.map(J), fa = P.fArm.map(J);
  limb(hipB, bl[0], 5, col('N'));
  limb(bl[0], bl[1], 5, col('N'));
  boot(ctx, bl[1], f, col, parts, true);
  limb(shoulderB, ba[0], 4, col('G'));
  limb(ba[0], ba[1], 4, col('G'));
  fist(ctx, ba[1], col, parts);

  // Torso: striped shirt block.
  torso(ctx, hip, chest, f, col, parts);

  limb(hipF, fl[0], 5, col(parts.tights));
  limb(fl[0], fl[1], 5, col(parts.tights));
  kneePad(ctx, fl[0], col, parts);
  boot(ctx, fl[1], f, col, parts, false);

  // Head chin overlaps the chest top by 3px so the mask sits on the shoulders.
  const hw = HEAD[0].length * HEAD_SCALE, hh = HEAD.length * HEAD_SCALE;
  drawHead(ctx, Math.round(chest[0] + P.head[0] * f - hw / 2), Math.round(chest[1] + P.head[1] - hh - 1), flash ? whiteOut(pal) : pal, f < 0, glow);

  limb(shoulderF, fa[0], 4, col(parts.sleeveA));
  limb(fa[0], fa[1], 4, col(parts.sleeveA));
  fist(ctx, fa[1], col, parts);
}

function whiteOut(pal) {
  const o = {};
  for (const k in pal) o[k] = k === 'K' ? '#000000' : '#FFFFFF';
  return o;
}

function torso(ctx, hip, chest, f, col, parts) {
  // Trapezoid from hips (9 wide) to chest (11 wide), outlined, with horizontal stripes.
  const top = Math.round(chest[1] - 3);
  const bot = Math.round(hip[1] + 3);
  for (let yy = top - 1; yy <= bot + 1; yy++) {
    const tt = (yy - top) / Math.max(1, bot - top);
    const cx = Math.round(chest[0] + (hip[0] - chest[0]) * tt);
    const half = Math.round(8 - tt * 2);
    ctx.fillStyle = col('K');
    ctx.fillRect(cx - half - 1, yy, half * 2 + 3, 1);
  }
  for (let yy = top; yy <= bot; yy++) {
    const tt = (yy - top) / Math.max(1, bot - top);
    const cx = Math.round(chest[0] + (hip[0] - chest[0]) * tt);
    const half = Math.round(8 - tt * 2);
    let c;
    if (yy >= bot - 4) c = yy === bot - 4 ? col(parts.belt) : col(parts.trunks);
    else c = Math.floor((yy - top) / 2) % 2 === 0 ? col(parts.sleeveA) : col(parts.sleeveB);
    ctx.fillStyle = c;
    ctx.fillRect(cx - half, yy, half * 2 + 1, 1);
  }
}

function boot(ctx, p, f, col, parts, back) {
  const x = Math.round(p[0]), y = Math.round(p[1]);
  ctx.fillStyle = col('K');
  ctx.fillRect(x - 3, y - 5, 7, 6);
  ctx.fillRect(x - 3 + (f > 0 ? 1 : -2), y - 2, 8, 3);
  ctx.fillStyle = back ? col('r') : col(parts.boots);
  ctx.fillRect(x - 2, y - 4, 5, 4);
  ctx.fillRect(x - 2 + (f > 0 ? 1 : -1), y - 1, 6, 1);
  if (!back) {
    ctx.fillStyle = col(parts.laces);
    ctx.fillRect(x, y - 4, 1, 3);
  }
}

function kneePad(ctx, p, col, parts) {
  const x = Math.round(p[0]), y = Math.round(p[1]);
  ctx.fillStyle = col('K');
  ctx.fillRect(x - 3, y - 2, 6, 5);
  ctx.fillStyle = col(parts.pads);
  ctx.fillRect(x - 2, y - 1, 4, 3);
}

function fist(ctx, p, col, parts) {
  const x = Math.round(p[0]), y = Math.round(p[1]);
  ctx.fillStyle = col('K');
  ctx.fillRect(x - 3, y - 3, 6, 6);
  ctx.fillStyle = col(parts.gloves);
  ctx.fillRect(x - 2, y - 2, 4, 4);
}

// Lying on the mat, face up, head towards -facing. About 44px long.
function drawDown(ctx, x, y, f, pal, parts, flash) {
  const col = (k) => (flash ? '#FFFFFF' : pal[k]);
  const L = (dx) => Math.round(x + dx * f); // local x -> canvas x
  const box = (dx0, dx1, y0, y1, c) => {
    const a = L(dx0), b = L(dx1);
    ctx.fillStyle = c;
    ctx.fillRect(Math.min(a, b), y0, Math.abs(b - a) + 1, y1 - y0 + 1);
  };
  // Legs (towards +f) with boots pointing up.
  box(4, 16, y - 6, y - 1, col('K'));
  box(4, 15, y - 5, y - 2, col(parts.tights));
  box(15, 20, y - 9, y, col('K'));
  box(16, 19, y - 8, y - 1, col(parts.boots));
  // Torso: striped shirt running along the mat.
  box(-12, 5, y - 9, y, col('K'));
  for (let i = -11; i <= 4; i++) box(i, i, y - 8, y - 1, Math.floor((i + 11) / 2) % 2 === 0 ? col(parts.sleeveA) : col(parts.sleeveB));
  box(1, 4, y - 8, y - 1, col(parts.trunks));
  box(0, 0, y - 8, y - 1, col(parts.belt));
  // Arm flopped out on the mat.
  stroke(ctx, L(-8), y - 1, L(0), y + 2, 6, col('K'));
  stroke(ctx, L(-8), y - 1, L(0), y + 2, 4, col(parts.sleeveA));
  box(0, 3, y, y + 3, col('K'));
  box(1, 2, y + 1, y + 2, col(parts.gloves));
  // Head at 2x, upright (seen from the side of the mat, like a portrait laid by the torso).
  const hp = flash ? whiteOut(pal) : pal;
  const s = HEAD_SCALE;
  const W = HEAD[0].length;
  const hx0 = f > 0 ? L(-12) - W * s : L(-12) + 1;
  for (let r = 0; r < HEAD.length; r++)
    for (let c = 0; c < W; c++) {
      const k = HEAD[r][f > 0 ? c : W - 1 - c];
      if (k === '.') continue;
      ctx.fillStyle = hp[k];
      ctx.fillRect(hx0 + c * s, y - HEAD.length * s + 1 + r * s + 4, s, s);
    }
}

/** Draw a palette-key grid (for the bust / HUD portraits). */
export function drawGrid(ctx, grid, x, y, pal, scale = 1) {
  for (let r = 0; r < grid.length; r++)
    for (let c = 0; c < grid[r].length; c++) {
      const k = grid[r][c];
      if (k === '.') continue;
      ctx.fillStyle = pal[k];
      ctx.fillRect(x + c * scale, y + r * scale, scale, scale);
    }
}
