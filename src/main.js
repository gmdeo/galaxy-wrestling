// Galaxy Wrestling: three.js stage over the original match / stage / audio logic.
import { createRenderer } from './renderer3d.js';
import { buildRing } from './ring3d.js';
import { Wrestler3D } from './wrestlers3d.ts';
import { Pyro3D } from './pyro3d.js';
import { Match, OPPONENTS, LEAD, TYPE_LANE } from './match.js';
import { Stage } from './stage.js';
import { Audio } from './audio.js';
import { HERO_PALETTE, RUGPULL_PALETTE, UI } from './palette.js';

// 2D stage space (320 px wide, centre 160) -> 3D ring units.
const PX = 0.075;
const MAT_H = 1.1;                       // canvas height in ring3d.js
const to3dX = (x) => (x - 160) * PX;
const to3dY = (y) => MAT_H + Math.max(0, (118 - y) * PX);

// ---------- Scene ----------
const canvas = document.getElementById('canvas');
const { scene, composer, bloom, cineCam } = createRenderer(canvas);
buildRing(scene);
const hero3d = new Wrestler3D(HERO_PALETTE, scene);
const opp3d = new Wrestler3D(RUGPULL_PALETTE, scene);
const pyro3d = new Pyro3D(scene);
const audio = new Audio();

// Adapter: stage.js speaks 2D pyro (burst/ring/requestFlash in pixels). Route it into 3D.
const pyro = {
  reduced: false,
  burst(x, y, n = 12, opts = {}) { pyro3d.burst(to3dX(x), to3dY(y), 0, Math.min(60, n * 2), { pal: opts.pal }); },
  ring(x, y, opts = {}) { pyro3d.burst(to3dX(x), 0.3, 0, opts.n || 24, { pal: opts.pal, speed: 5 }); },
  requestFlash(now, amount = 1) { pyro3d.requestFlash(now, 0.25 * amount); cineCam.impact(0.4 * amount); },
  word(text) { showBanner(text); },
  spark() {}, update() {},
};

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);
const elTitle = $('title'), elResult = $('result'), elBanner = $('move-banner');
const elHeroHP = $('hero-hp'), elOppHP = $('opp-hp'), elScore = $('score'), elCtl = $('control-ind');
let bannerUntil = 0;
function showBanner(text, dur = 1.4) {
  elBanner.textContent = text;
  elBanner.style.opacity = '1';
  bannerUntil = performance.now() / 1000 + dur;
}

// ---------- Game state ----------
const game = { screen: 'title', match: null, stage: null, resultAt: 0, pressed: [0, 0, 0, 0, 0], judge: null };
window.WG = {
  three: { scene, cineCam, composer, bloom, hero3d, opp3d }, game, audio };

function startFight() {
  audio.init(); audio.resume();
  const opp = OPPONENTS.rugpull;
  const typing = matchMedia('(pointer: fine)').matches;
  game.match = new Match({ opponent: opp, seed: (Math.random() * 1e9) | 0, typing });
  game.stage = new Stage();
  game.screen = 'fight';
  game.resultAt = 0;
  elTitle.style.display = 'none';
  elResult.style.display = 'none';
  audio.start(opp.bpm);
  audio.sfxBell();
  audio.sfxCrowd(2, 0.3);
  showBanner('FIGHT!', 1.2);
}
$('start-btn').addEventListener('click', startFight);

// ---------- Input ----------
const KEYMAP = { ArrowLeft: 0, ArrowDown: 1, ArrowUp: 2, ArrowRight: 3, KeyD: 0, KeyF: 1, KeyJ: 2, KeyK: 3 };
addEventListener('keydown', (e) => {
  if (e.repeat) return;
  const m = game.match;
  const live = game.screen === 'fight' && m && !m.over;
  if (live && m.seq && m.seq.typed && /^Key[A-Z]$/.test(e.code)) {
    e.preventDefault(); game.pressed[TYPE_LANE] = 0.12;
    const g = m.pressLetter(e.code.slice(3), audio.songTime());
    if (!g || g === 'ghost') audio.sfxTick();
    return;
  }
  if (live && m.kickoutState && (e.code === 'Space' || e.code.startsWith('Arrow'))) {
    e.preventDefault(); audio.sfxTick(); m.tapKickout(audio.songTime()); return;
  }
  if (live && e.code in KEYMAP) {
    e.preventDefault();
    const lane = KEYMAP[e.code];
    game.pressed[lane] = 0.12;
    if (!m.press(lane, audio.songTime())) audio.sfxTick();
    return;
  }
  if ((e.code === 'Enter' || e.code === 'Space') && game.screen !== 'fight') { e.preventDefault(); startFight(); }
  if (e.code === 'KeyM') { audio.setMuted(!audio.muted); }
});

// ---------- Match events -> juice ----------
function handleEvents(now) {
  const m = game.match, st = game.stage;
  for (const e of m.takeEvents()) {
    st.onEvent(e, now, pyro, audio);
    switch (e.type) {
      case 'judge':
        game.judge = { grade: e.grade, t: now };
        if (e.grade === 'miss') audio.sfxMiss(); else audio.sfxHit(e.grade);
        break;
      case 'moveStart': if (e.move) showBanner(e.move.name, 1.2); break;
      case 'bigmove':
        cineCam.zoomIn(); cineCam.impact(0.6);
        pyro3d.burst(0, 2.5, 0, 50);
        audio.sfxPyro();
        break;
      case 'reversal': showBanner('REVERSAL!'); cineCam.impact(0.4); break;
      case 'finisherReady': showBanner('FINISHER READY', 1.6); break;
      case 'predator': showBanner('BE THE PREDATOR', 1.8); bloom.strength = 0.8; audio.intensity = 2; audio.sfxPyro(); break;
      case 'predatorLost': bloom.strength = 0.45; audio.intensity = 1; break;
      case 'knockdown': showBanner('NEVER TAP OUT', 1.8); cineCam.impact(0.9); break;
      case 'win':
      case 'lose':
        game.resultAt = now + 2.2;
        showBanner(e.type === 'win' ? 'WINNER' : 'PINNED', 2.2);
        if (e.type === 'win') { bloom.strength = 0.9; for (let i = 0; i < 4; i++) pyro3d.burst(-6 + i * 4, 4, -2, 50); }
        break;
    }
  }
}

// ---------- Wrestler sync ----------
function syncActor(actor, w3d) {
  const pose = actor.down ? 'down' : (actor.pose || 'idle');
  if (pose === 'down') w3d.applyPose('down', actor.facing > 0 ? 1 : -1, actor.lift || 0);
  else {
    w3d.resetBody();
    w3d.applyPose(pose, actor.facing > 0 ? 1 : -1, actor.lift || 0);
    if (actor.rot) w3d.setRoll(actor.rot);
  }
  w3d.root.position.set(to3dX(actor.x), MAT_H + 0.11, 0);
  w3d.flash(actor.flash > 0);
}

// ---------- Note track (2D overlay) ----------
const track = $('track-canvas');
const tc = track.getContext('2d');
const LANE_COLS = [UI.offense, UI.kickout, UI.defense, UI.finisher];
const ARROWS = ['\u2190', '\u2193', '\u2191', '\u2192'];
// Lane 0..3 read as: strike, duck, block, grapple. Each gets an icon word too,
// so the lane is identifiable even when a note is mid-screen.
const LANE_TAGS = ['STRIKE', 'DUCK', 'BLOCK', 'GRAB'];

function fitTrack() {
  const r = devicePixelRatio || 1;
  track.width = Math.floor(track.clientWidth * r);
  track.height = Math.floor(track.clientHeight * r);
  tc.setTransform(r, 0, 0, r, 0, 0);
}
addEventListener('resize', fitTrack);
fitTrack();

/** Rounded rect path (older canvas has no roundRect in some engines). */
/** Crisp vector arrow. dir: 0=left, 1=down, 2=up, 3=right. size = full width. */
function drawArrow(g, x, y, dir, size, colour) {
  const h = size * 0.42;         // half-extent of the arrow head
  const w = size * 0.50;         // half-length of the arrow
  const t = size * 0.105;        // shaft half-thickness (thin, so the head reads)
  g.save();
  g.translate(x, y);
  g.rotate([Math.PI, Math.PI / 2, -Math.PI / 2, 0][dir]);
  g.fillStyle = colour;
  g.beginPath();
  g.moveTo(w, 0);                // tip (points +x before rotation)
  g.lineTo(w - h, -h);
  g.lineTo(w - h, -t);
  g.lineTo(-w, -t);
  g.lineTo(-w, t);
  g.lineTo(w - h, t);
  g.lineTo(w - h, h);
  g.closePath();
  g.fill();
  g.restore();
}

function rr(g, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + rad, y);
  g.arcTo(x + w, y, x + w, y + h, rad);
  g.arcTo(x + w, y + h, x, y + h, rad);
  g.arcTo(x, y + h, x, y, rad);
  g.arcTo(x, y, x + w, y, rad);
  g.closePath();
}

function drawTrack(now, t) {
  const W = track.clientWidth, H = track.clientHeight;
  tc.clearRect(0, 0, W, H);
  const m = game.match;

  const PAD = 8;
  const laneH = (H - PAD * 2) / 4;
  const hitX = Math.round(Math.min(150, Math.max(96, W * 0.115)));
  const speed = (W - hitX - 24) / LEAD;
  const R = Math.min(laneH * 0.46, 34);          // note radius
  const cx = R * 0.74;                            // glyph size scale

  // ---------- lanes ----------
  for (let i = 0; i < 4; i++) {
    const y = PAD + i * laneH;
    const col = LANE_COLS[i];
    const hot = game.pressed[i] > 0;

    tc.fillStyle = i % 2 ? '#05081a' : '#0a0f2c';
    tc.fillRect(0, y, W, laneH);

    // coloured wash: identifies the lane without hiding the notes
    tc.globalAlpha = hot ? 0.34 : 0.17;
    tc.fillStyle = col;
    tc.fillRect(0, y, W, laneH);
    tc.globalAlpha = 1;

    // lane divider
    tc.fillStyle = 'rgba(255,255,255,0.07)';
    tc.fillRect(0, y + laneH - 1, W, 1);

    // lane name, far right, out of the note path
    tc.textAlign = 'right'; tc.textBaseline = 'middle';
    tc.font = `bold ${Math.max(9, Math.round(laneH * 0.30))}px monospace`;
    const lw = tc.measureText(LANE_TAGS[i]).width;
    const lp = 7, lh = Math.max(15, laneH * 0.44);
    tc.globalAlpha = 0.20;
    tc.fillStyle = col;
    rr(tc, W - 12 - lw - lp * 2, y + laneH / 2 - lh / 2, lw + lp * 2, lh, 4);
    tc.fill();
    tc.globalAlpha = 1;
    tc.fillStyle = col;
    tc.fillText(LANE_TAGS[i], W - 12 - lp, y + laneH / 2);
  }

  // ---------- beat grid ----------
  // One faint vertical line per beat, so note spacing is readable at a glance.
  const beatPx = speed * 0.5;
  if (beatPx > 14) {
    const phase = ((t % 0.5) / 0.5) * beatPx;
    tc.fillStyle = 'rgba(255,255,255,0.045)';
    for (let x = hitX + phase; x < W; x += beatPx) tc.fillRect(x, PAD, 1, H - PAD * 2);
  }

  // ---------- hit zone ----------
  // Dark column so the target area reads as a distinct band.
  tc.fillStyle = 'rgba(0,0,0,0.55)';
  tc.fillRect(hitX - R - 6, 0, (R + 6) * 2, H);
  for (let i = 0; i < 4; i++) {
    const y = PAD + i * laneH + laneH / 2;
    const col = LANE_COLS[i];
    const hot = game.pressed[i] > 0;

    // glowing socket ring
    tc.beginPath(); tc.arc(hitX, y, R * 0.94, 0, Math.PI * 2);
    tc.strokeStyle = hot ? col : col + '88';
    tc.lineWidth = Math.max(2, R * 0.13);
    tc.shadowColor = col; tc.shadowBlur = hot ? 18 : 8;
    tc.stroke();
    tc.shadowBlur = 0;

    // the key you must press
    drawArrow(tc, hitX, y, i, R * 1.15, hot ? '#ffffff' : col);
  }

  // vertical hit line
  tc.fillStyle = 'rgba(255,255,255,0.30)';
  tc.fillRect(hitX - 1, PAD, 2, H - PAD * 2);

  if (!m) return;

  // ---------- judgement ----------
  // Drawn LEFT of the note path and before the notes, so a travelling note is
  // never hidden behind the word.
  if (game.judge && now - game.judge.t < 0.6) {
    const age = (now - game.judge.t) / 0.6;
    const g = game.judge.grade.toUpperCase();
    const col = g === 'MISS' ? '#F02E98' : g === 'PERFECT' ? '#FFD84A' : '#35BDD2';
    tc.globalAlpha = Math.max(0, 1 - age * 0.85);
    tc.textAlign = 'center'; tc.textBaseline = 'middle';
    tc.font = `bold ${Math.round(H * 0.20)}px monospace`;
    const jw = tc.measureText(g).width;
    const jx = Math.max(jw / 2 + 10, hitX - R - 16 - jw / 2);
    const jy = H / 2 - age * 10;
    rr(tc, jx - jw / 2 - 10, jy - H * 0.11, jw + 20, H * 0.22, 6);
    tc.fillStyle = 'rgba(4,6,16,0.88)';
    tc.fill();
    tc.strokeStyle = col; tc.lineWidth = 2; tc.stroke();
    tc.shadowColor = col; tc.shadowBlur = 14;
    tc.fillStyle = col;
    tc.fillText(g, jx, jy);
    tc.shadowBlur = 0;
    tc.globalAlpha = 1;
  }

  // ---------- notes ----------
  for (const n of m.notes) {
    if (n.judged || n.void) continue;
    const x = hitX + (n.t - t) * speed;
    if (x < hitX - R * 2 || x > W + R * 2) continue;

    // typed finisher letters travel mid-track as big glowing glyphs
    if (n.letter) {
      tc.textAlign = 'center'; tc.textBaseline = 'middle';
      tc.font = `bold ${Math.round(H * 0.42)}px monospace`;
      tc.shadowColor = UI.finisher; tc.shadowBlur = 20;
      tc.fillStyle = UI.finisher;
      tc.fillText(n.letter, x, H / 2);
      tc.shadowBlur = 0;
      continue;
    }

    const y = PAD + n.lane * laneH + laneH / 2;
    const col = n.kind === 'defense' ? UI.defense : LANE_COLS[n.lane];
    const near = Math.abs(x - hitX) < R * 1.5;      // in the hit window: flash

    // 1) soft trail behind the note, so speed is readable
    tc.globalAlpha = 0.16;
    tc.fillStyle = col;
    tc.beginPath();
    tc.ellipse(x + R * 1.1, y, R * 1.25, R * 0.52, 0, 0, Math.PI * 2);
    tc.fill();
    tc.globalAlpha = 1;

    // 2) solid coloured disc with a bright rim: legible at speed on any lane
    const s = R * 0.94;
    tc.beginPath(); tc.arc(x, y, s, 0, Math.PI * 2);
    tc.shadowColor = col; tc.shadowBlur = near ? 26 : 14;
    tc.fillStyle = col;
    tc.fill();
    tc.shadowBlur = 0;
    tc.lineWidth = 2.5;
    tc.strokeStyle = near ? '#ffffff' : 'rgba(255,255,255,0.75)';
    tc.stroke();
    // darker core so the white arrow always has a background to sit on
    tc.beginPath(); tc.arc(x, y, s * 0.76, 0, Math.PI * 2);
    tc.fillStyle = 'rgba(6,9,24,0.55)';
    tc.fill();

    // 3) the arrow, always white, sized to the disc
    drawArrow(tc, x, y, n.lane, R * 1.35, '#ffffff');
  }


  // ---------- kick-out prompt ----------
  if (m.kickoutState) {
    const pulse = 0.55 + 0.45 * Math.sin(now * 9);
    const barH = Math.round(H * 0.34);
    const by = Math.round(H * 0.5 - barH / 2);
    tc.globalAlpha = 0.82;
    tc.fillStyle = '#1a1408';
    tc.fillRect(0, by, W, barH);
    tc.globalAlpha = 1;
    tc.fillStyle = `rgba(255,216,74,${pulse})`;
    tc.fillRect(0, by, W, 2);
    tc.fillRect(0, by + barH - 2, W, 2);
    tc.textAlign = 'center'; tc.textBaseline = 'middle';
    tc.font = `bold ${Math.round(H * 0.17)}px monospace`;
    tc.fillStyle = '#FFD84A';
    tc.shadowColor = '#FFD84A'; tc.shadowBlur = 16;
    tc.fillText('MASH ARROW / SPACE TO KICK OUT', W / 2, H / 2);
    tc.shadowBlur = 0;
  }
}

function updateHUD(m) {
  elHeroHP.style.width = Math.max(0, m.heroHP) + '%';
  elOppHP.style.width = Math.max(0, m.oppHP) + '%';
  elScore.textContent = String(m.score | 0).padStart(7, '0');
  const def = m.phase === 'defense';
  elCtl.textContent = m.kickoutState ? 'KICK OUT' : def ? 'DEFEND' : m.predator ? 'PREDATOR' : 'ATTACK';
  elCtl.style.color = def ? UI.defense : m.predator ? UI.finisher : UI.offense;
}

// ---------- Loop ----------
let last = performance.now();
function frame(ms) {
  const dtReal = Math.min(0.05, (ms - last) / 1000);
  last = ms;
  const now = ms / 1000;
  audio.pump();
  for (let i = 0; i < game.pressed.length; i++) game.pressed[i] = Math.max(0, game.pressed[i] - dtReal);

  if (game.screen === 'fight') {
    const m = game.match, st = game.stage;
    const t = audio.songTime();
    m.update(t);
    handleEvents(now);
    let dt = dtReal;
    if (st.hitstop > 0) { st.hitstop -= dtReal; dt = 0; }
    st.update(dt, now, m, pyro, audio);
    if (st.shake > 0) cineCam.impact(Math.min(1, st.shake * 0.15));
    syncActor(st.hero, hero3d);
    syncActor(st.opp, opp3d);
    updateHUD(m);
    drawTrack(now, t);
    if (m.over && game.resultAt && now > game.resultAt) {
      game.screen = 'result';
      audio.stop();
      const won = m.phase === 'won';
      elResult.className = won ? 'win' : 'lose';
      $('result-heading').textContent = won ? 'YOU WIN!' : 'PINNED!';
      $('final-score-val').textContent = String(m.score | 0).padStart(7, '0');
      elResult.style.display = 'flex';
    }
  } else {
    // Idle attract mode: wrestlers circle in their corners.
    hero3d.resetBody(); opp3d.resetBody();
    hero3d.applyPose(Math.floor(now * 2) % 2 ? 'idle' : 'idle2', 1, 0);
    opp3d.applyPose(Math.floor(now * 2 + 1) % 2 ? 'idle' : 'idle2', -1, 0);
    hero3d.root.position.set(-2.4, MAT_H + 0.11, 0);
    opp3d.root.position.set(2.4, MAT_H + 0.11, 0);
    drawTrack(now, 0);
  }
  if (bannerUntil && now > bannerUntil) { elBanner.style.opacity = '0'; bannerUntil = 0; }
  bloom.strength += (0.7 - bloom.strength) * dtReal * 0.5;
  // crowd bowl is static geometry; nothing to bob
  pyro3d.update(dtReal, now);
  cineCam.update(dtReal);
  composer.render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
