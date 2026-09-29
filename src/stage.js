// Choreography: turns match events into wrestler poses, positions and camera juice.
// The match decides what happens; the stage makes it look like wrestling.
import { FLOOR_Y } from './render.js';

const HERO_HOME = 125;
const OPP_HOME = 195;
// Anchors used while a staged move plays, so keyframes always land in the same place.
const HERO_ANCHOR = 148;
const OPP_ANCHOR = 176;

class Actor {
  constructor(x, facing) {
    this.home = x;
    this.x = x;
    this.facing = facing;
    this.lift = 0;
    this.pose = 'idle';
    this.poseUntil = 0;
    this.flash = 0;
    this.down = false;
    this.tx = x;
    this.anim = null; // { name, t0, dur }
  }
  set(pose, now, dur = 0.18) {
    this.pose = pose;
    this.poseUntil = now + dur;
  }
}

export class Stage {
  constructor() {
    this.hero = new Actor(HERO_HOME, 1);
    this.opp = new Actor(OPP_HOME, -1);
    this.shake = 0;
    this.hitstop = 0;
    this.ropeSag = 0;
    this.hype = 0.2;
    this.moveName = null; // { text, t, by }
    this.cutIn = null;
    this.ref = { x: 250, count: 0, slapT: -1 };
    this.pinBy = null;
    this.dust = [];
    this.throwAnim = null;
    // Staged move currently on screen: { move, index, kind, t0 }
    this.stageFx = null;
    this.spotlight = 0;
  }

  /**
   * Snap both wrestlers into the keyframe for the stage just earned.
   * Each hit note moves the move on one beat, so every press visibly does something:
   * step in, lock up, lift, throw.
   */
  applyStage(e, now, pyro, audio) {
    const stage = e.move.stages[e.index];
    if (!stage) return;
    const heroAttacks = e.kind !== 'defense';
    const att = heroAttacks ? this.hero : this.opp;
    const vic = heroAttacks ? this.opp : this.hero;
    // Park the attacker at a fixed anchor, then offset by the stage.
    const anchor = heroAttacks ? HERO_ANCHOR : OPP_ANCHOR;
    att.home = anchor;
    att.facing = heroAttacks ? 1 : -1;
    this.stageFx = { move: e.move, index: e.index, kind: e.kind, t0: now, stage, heroAttacks };
    this.cue(stage.cue, att, vic, now, pyro, audio, heroAttacks);
  }

  /** Camera and crowd response for a stage cue. */
  cue(name, att, vic, now, pyro, audio, heroAttacks) {
    const hero = this.hero;
    switch (name) {
      case 'step':
        this.hitstop = 0.02;
        break;
      case 'grab':
        this.hitstop = 0.03;
        this.shake = Math.max(this.shake, 1);
        audio.sfxWhoosh();
        break;
      case 'lift':
        this.shake = Math.max(this.shake, 2);
        this.hitstop = 0.05;
        audio.sfxWhoosh();
        pyro.burst(vic.x, FLOOR_Y - 20, 6, { speed: 60, life: 0.3 });
        break;
      case 'hold':
        this.shake = Math.max(this.shake, 1);
        this.spotlight = 1;
        if (Math.random() < 0.5) pyro.requestFlash(now, 0.25);
        break;
      case 'climb':
        this.spotlight = 1;
        this.shake = Math.max(this.shake, 1);
        break;
      case 'spin':
        this.spotlight = 1;
        pyro.ring(att.x, FLOOR_Y - 40, { pal: ['#FFFFFF', '#FF6BD6', '#35BDD2'] });
        audio.sfxWhoosh();
        break;
      case 'impact':
        this.hitstop = 0.05;
        this.shake = Math.max(this.shake, 3);
        vic.flash = 0.08;
        pyro.burst(vic.x - 6, FLOOR_Y - 28, 12, { speed: 90, life: 0.35 });
        audio.sfxChop();
        this.hype = Math.min(1, this.hype + 0.04);
        break;
      case 'big':
        this.hitstop = 0.09;
        this.shake = Math.max(this.shake, 5);
        this.ropeSag = 3;
        audio.sfxSlam();
        pyro.requestFlash(now, 0.4);
        this.hype = Math.min(1, this.hype + 0.12);
        break;
      case 'huge':
        this.hitstop = 0.14;
        this.shake = Math.max(this.shake, 7);
        this.ropeSag = 5;
        audio.sfxSlam();
        audio.sfxCrowd(1.2, 0.3);
        pyro.requestFlash(now, 0.8);
        this.hype = Math.min(1, this.hype + 0.25);
        break;
    }
  }

  onEvent(e, now, pyro, audio) {
    const H = this.hero, O = this.opp;
    switch (e.type) {
      case 'strike':
        if (e.by === 'hero') {
          if (!this.stageFx) H.set(Math.random() < 0.5 ? 'strike' : 'chop', now);
          O.set('hurt', now, 0.2);
          O.flash = 0.06;
          O.x += 3;
          this.hitstop = e.grade === 'perfect' ? 0.05 : 0.03;
          this.shake = Math.max(this.shake, e.grade === 'perfect' ? 2 : 1);
          pyro.burst(O.x - 8, FLOOR_Y - 26, e.grade === 'perfect' ? 10 : 5, { speed: 70, life: 0.3 });
          audio.sfxChop();
          this.hype = Math.min(1, this.hype + 0.02);
        } else {
          if (!this.stageFx) O.set('strike', now);
          H.set('hurt', now, 0.25);
          H.flash = 0.08;
          H.x -= 4;
          this.shake = Math.max(this.shake, 2);
          this.hitstop = 0.04;
          pyro.burst(H.x + 8, FLOOR_Y - 26, 6, { speed: 70, life: 0.3, pal: ['#fff', '#F2552C', '#6E0340'] });
          audio.sfxChop();
        }
        break;
      case 'block':
        if (!this.stageFx) { H.set('block', now, 0.2); O.set('strike', now, 0.15); }
        pyro.burst(H.x + 10, FLOOR_Y - 28, 4, { speed: 50, life: 0.2, pal: ['#fff', '#35BDD2'] });
        break;
      case 'moveStart':
        // New move: reset the anchors so the walk-in starts from each wrestler's corner.
        this.stageFx = null;
        this.currentMove = { move: e.move, kind: e.kind, t: now };
        break;
      case 'stage':
        this.applyStage(e, now, pyro, audio);
        break;
      case 'moveEscape': {
        // He wriggles free: attacker stumbles back, victim shoves.
        const heroWasAttacking = e.by === 'opp';
        const att = heroWasAttacking ? H : O;
        const vic = heroWasAttacking ? O : H;
        this.stageFx = null;
        att.lift = 0; vic.lift = 0; vic.rot = 0;
        att.set('stagger', now, 0.4);
        vic.set('strike', now, 0.25);
        att.x -= 10 * att.facing;
        this.moveName = { text: 'ESCAPED!', t: now, by: e.by };
        this.shake = Math.max(this.shake, 3);
        audio.sfxWhoosh();
        break;
      }
      case 'bigmove':
        this.moveName = { text: e.move, t: now, by: e.by };
        // A staged move already played its impact on the last note: just release it.
        if (e.stages) {
          const heroAtt = e.by === 'hero';
          const vic = heroAtt ? O : H;
          const att = heroAtt ? H : O;
          this.stageFx = null;
          vic.lift = 0; vic.rot = 0;
          att.lift = 0; att.rot = 0;
          vic.down = true;
          if (heroAtt) {
            if (!e.finisher) vic.getUpAt = now + 1.3;
            if (e.finisher) this.cutIn = { t0: now };
          }
          for (let i = 0; i < 14; i++) this.dust.push({ x: vic.x + (Math.random() - 0.5) * 30, y: FLOOR_Y, vx: (Math.random() - 0.5) * 60, vy: -Math.random() * 30, life: 0.5 });
          if (e.finisher) pyro.burst(vic.x, FLOOR_Y - 10, 40, { speed: 160, life: 0.9 });
          if (heroAtt) audio.sfxCrowd(0.9, 0.25);
          break;
        }
        if (e.by === 'hero') {
          this.throwAnim = { by: 'hero', t0: now, dur: e.finisher ? 1.1 : 0.7, finisher: e.finisher };
          if (e.finisher) this.cutIn = { t0: now };
        } else {
          this.throwAnim = { by: 'opp', t0: now, dur: 0.7 };
        }
        break;
      case 'reversal':
        this.moveName = { text: e.to === 'hero' ? 'REVERSAL!' : 'COUNTERED!', t: now, by: e.to };
        if (e.to === 'opp') { H.set('hurt', now, 0.3); O.set('grab', now, 0.3); }
        else { H.set('grab', now, 0.3); O.set('hurt', now, 0.3); }
        audio.sfxWhoosh();
        this.shake = Math.max(this.shake, 2);
        break;
      case 'knockdown':
        break;
      case 'breather':
        // Hold the moment: hero poses over the downed opponent until the next move.
        this.celebrate = { from: now + 0.45, to: now + (e.until - e.t) - 0.1 };
        break;
      case 'kickout':
        H.down = false;
        H.set('kneel', now, 0.5);
        this.ref.count = 0;
        this.pinBy = null;
        O.down = false;
        this.hype = Math.min(1, this.hype + 0.25);
        audio.sfxCrowd(1.5, 0.35);
        pyro.burst(H.x, FLOOR_Y - 10, 20, { speed: 120, life: 0.6 });
        break;
      case 'kickoutFail':
        this.pinBy = 'opp';
        break;
      case 'pinStart':
        this.pinBy = e.by;
        break;
      case 'count':
        this.ref.count = e.n;
        this.ref.slapT = now;
        audio.sfxCount(e.n);
        this.shake = Math.max(this.shake, 1);
        break;
      case 'predator':
        this.hype = 1;
        break;
      case 'win':
      case 'lose':
        audio.sfxBell();
        break;
    }
  }

  /** Big throw animation: attacker lifts the victim over, then slams. */
  updateThrow(now, pyro, audio) {
    const a = this.throwAnim;
    if (!a) return;
    const k = (now - a.t0) / a.dur;
    const att = a.by === 'hero' ? this.hero : this.opp;
    const vic = a.by === 'hero' ? this.opp : this.hero;
    if (k < 0.25) {
      att.set('grab', now, 0.05);
      vic.set('hurt', now, 0.05);
      vic.x += (att.x + 16 * att.facing - vic.x) * 0.3;
      vic.lift = 0;
    } else if (k < 0.7) {
      const t = (k - 0.25) / 0.45;
      att.set('lift', now, 0.05);
      vic.set('hurt', now, 0.05);
      // Arc the victim up over the attacker.
      vic.x = att.x + att.facing * (16 - t * 8);
      vic.lift = Math.sin(t * Math.PI * 0.5) * (a.finisher ? 44 : 30);
    } else if (!a.slammed) {
      a.slammed = true;
      vic.lift = 0;
      vic.down = true;
      vic.x = att.x + att.facing * 26;
      att.set('kneel', now, 0.25);
      this.shake = a.finisher ? 7 : 5;
      this.hitstop = a.finisher ? 0.14 : 0.09;
      this.ropeSag = a.finisher ? 5 : 3;
      audio.sfxSlam();
      pyro.requestFlash(now, a.finisher ? 1 : 0.4);
      for (let i = 0; i < 16; i++) this.dust.push({ x: vic.x + (Math.random() - 0.5) * 30, y: FLOOR_Y, vx: (Math.random() - 0.5) * 60, vy: -Math.random() * 30, life: 0.5 });
      if (a.finisher) pyro.burst(vic.x, FLOOR_Y - 10, 40, { speed: 160, life: 0.9 });
      this.hype = Math.min(1, this.hype + (a.finisher ? 0.5 : 0.12));
      if (a.by === 'hero') audio.sfxCrowd(0.9, 0.25);
    }
    if (k >= 1) {
      this.throwAnim = null;
      // Victim gets up unless they are being pinned or must kick out.
      if (!(this.pinBy === a.by) && !(a.by === 'opp')) vic.getUpAt = now + 0.35;
    }
  }

  /** Ease both wrestlers toward the current stage's keyframe. */
  driveStage(dt, now) {
    const fx = this.stageFx;
    if (!fx) return false;
    const { stage, heroAttacks } = fx;
    const att = heroAttacks ? this.hero : this.opp;
    const vic = heroAttacks ? this.opp : this.hero;
    const f = att.facing;
    const k = Math.min(1, dt * 16); // ~120ms snap into each new keyframe
    const ax = att.home + (stage.a.dx || 0) * f;
    att.x += (ax - att.x) * k;
    att.lift += ((stage.a.lift || 0) - att.lift) * k;
    att.rot = stage.a.rot || 0;
    const vx = ax + (stage.v.gap || 0) * f;
    vic.x += (vx - vic.x) * k;
    // Rotation offset: when rot=180 the body is rendered upside down around its centre.
    // The feet-anchor is still at the bottom of the canvas area, so we need to push the
    // victim UP by their body height (≈34px) so the *head* ends up near the attacker's
    // hands.  rot=90/270 needs half the body height for the same reason.
    const rotOffset = stage.v.rot === 180 ? 34 : (stage.v.rot === 90 || stage.v.rot === 270) ? 17 : 0;
    vic.lift += ((stage.v.lift || 0) + rotOffset - vic.lift) * k;
    vic.rot = stage.v.rot || 0;
    vic.pivot = stage.v.pivot;
    // Hold the keyframe poses (cue() may briefly override them on the beat).
    att.pose = stage.a.pose;
    vic.pose = stage.v.pose;
    att.down = stage.a.pose === 'down';
    vic.down = stage.v.pose === 'down';
    // Hold stages breathe: a tiny bob so a held lift reads as effort, not a freeze.
    if (stage.cue === 'hold' || stage.cue === 'climb') att.lift += Math.sin(now * 18) * 0.4;
    return true;
  }

  update(dt, now, match, pyro, audio) {
    const H = this.hero, O = this.opp;
    this.spotlight = Math.max(0, this.spotlight - dt * 1.5);
    const staged = this.driveStage(dt, now);
    if (!staged) this.updateThrow(now, pyro, audio);
    for (const act of [H, O]) {
      act.flash = Math.max(0, act.flash - dt);
      if (staged) continue;
      if (act.getUpAt && now > act.getUpAt) { act.down = false; act.getUpAt = 0; act.set('kneel', now, 0.25); }
      if (now > act.poseUntil) act.pose = Math.floor(now * 2.2) % 2 ? 'idle' : 'idle2';
      act.rot = 0;
      if (!this.throwAnim) {
        // Drift back towards the corners between moves.
        const home = act === H ? HERO_HOME : OPP_HOME;
        act.home += (home - act.home) * Math.min(1, dt * 2);
        act.x += (act.home - act.x) * Math.min(1, dt * 5);
        act.lift = Math.max(0, act.lift - dt * 80);
      }
    }
    // Hero stays down while the kick-out is live or during a losing pin.
    if (match.phase === 'kickout' || (this.pinBy === 'opp')) {
      H.down = true;
      // Opponent covers the hero.
      O.set('kneel', now, 0.1);
      O.x += (H.x + 20 - O.x) * Math.min(1, dt * 6);
      this.ref.x += (H.x - 4 - this.ref.x) * Math.min(1, dt * 4);
    } else if (this.pinBy === 'hero') {
      O.down = true;
      H.set('kneel', now, 0.1);
      H.x += (O.x - 20 - H.x) * Math.min(1, dt * 6);
      this.ref.x += (O.x + 4 - this.ref.x) * Math.min(1, dt * 4);
    } else {
      this.ref.x += (250 - this.ref.x) * Math.min(1, dt * 2);
    }
    if (match.phase === 'won' && now > (this.victoryT ??= now) + 0.8) H.set(Math.floor(now * 2) % 2 ? 'flex' : 'taunt', now, 0.1);
    if (match.phase === 'lost') O.set('taunt', now, 0.1);
    if (!staged && this.celebrate && now >= this.celebrate.from && now < this.celebrate.to && !H.down) {
      H.set(Math.floor((now - this.celebrate.from) * 2.5) % 2 ? 'flex' : 'taunt', now, 0.1);
    }
    if (!staged && match.predator && now > H.poseUntil && !H.down && Math.floor(now * 1.5) % 5 === 0) H.set('flex', now, 0.25);

    this.shake = Math.max(0, this.shake - dt * 18);
    this.ropeSag = Math.max(0, this.ropeSag - dt * 12);
    this.hype = Math.max(0.15, this.hype - dt * 0.02);
    for (const d of this.dust) { d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 60 * dt; d.life -= dt; }
    this.dust = this.dust.filter((d) => d.life > 0);
  }
}
