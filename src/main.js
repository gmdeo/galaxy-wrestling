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
const ARROWS = ['←', '↓', '↑', '→'];
function fitTrack() {
  const r = devicePixelRatio || 1;
  track.width = Math.floor(track.clientWidth * r);
  track.height = Math.floor(track.clientHeight * r);
  tc.setTransform(r, 0, 0, r, 0, 0);
}
addEventListener('resize', fitTrack);
fitTrack();

function drawTrack(now, t) {
  const W = track.clientWidth, H = track.clientHeight;
  tc.clearRect(0, 0, W, H);
  const m = game.match;
  // Horizontal highway: notes travel right-to-left toward a hit line on the left.
  const hitX = 90, laneH = (H - 8) / 4, speed = (W - hitX - 20) / LEAD;
  for (let i = 0; i < 4; i++) {
    const y = 4 + i * laneH;
    tc.fillStyle = i % 2 ? '#0b1238' : '#0e1646';
    tc.fillRect(0, y, W, laneH);
    tc.fillStyle = game.pressed[i] > 0 ? LANE_COLS[i] : LANE_COLS[i] + '66';
    tc.font = `bold ${Math.floor(laneH * 0.8)}px monospace`;
    tc.textAlign = 'center'; tc.textBaseline = 'middle';
    tc.fillText(ARROWS[i], hitX, y + laneH / 2 + 1);
  }
  tc.fillStyle = '#ffffff55';
  tc.fillRect(hitX - 1, 2, 2, H - 4);
  if (!m) return;
  for (const n of m.notes) {
    if (n.judged || n.void) continue;
    const x = hitX + (n.t - t) * speed;
    if (x < hitX - 30 || x > W + 20) continue;
    if (n.letter) {
      tc.fillStyle = UI.finisher;
      tc.font = 'bold 18px monospace';
      tc.fillText(n.letter, x, H / 2);
      continue;
    }
    const y = 4 + n.lane * laneH + laneH / 2;
    const col = n.kind === 'defense' ? UI.defense : LANE_COLS[n.lane];
    tc.shadowColor = col; tc.shadowBlur = 10;
    tc.fillStyle = col;
    tc.beginPath(); tc.arc(x, y, laneH * 0.42, 0, Math.PI * 2); tc.fill();
    tc.shadowBlur = 0;
    tc.fillStyle = '#07091c';
    tc.font = `bold ${Math.floor(laneH * 0.6)}px monospace`;
    tc.fillText(ARROWS[n.lane], x, y + 1);
  }
  // Judgement word
  if (game.judge && now - game.judge.t < 0.5) {
    const g = game.judge.grade.toUpperCase();
    tc.fillStyle = g === 'MISS' ? '#F02E98' : g === 'PERFECT' ? '#FFD84A' : '#35BDD2';
    tc.font = 'bold 14px monospace'; tc.textAlign = 'left';
    tc.fillText(g, 8, 12);
  }
  if (m.kickoutState) {
    tc.fillStyle = '#FFD84A'; tc.font = 'bold 20px monospace'; tc.textAlign = 'center';
    tc.fillText('MASH ANY ARROW / SPACE TO KICK OUT!', W / 2, H / 2);
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
