// Pure match logic for $WRESTLER GALAXY. No DOM, no audio, so it is fully testable.
// Time is "song time" in seconds, supplied by the caller (driven by the Web Audio clock).

// Slightly generous windows: this is for humans first.
export const WINDOWS = { perfect: 0.05, great: 0.1, good: 0.15 };
export const LEAD = 2.4; // seconds a note is visible before it reaches the hit target
export const LANES = 4;
// Quiet time after a completed hero move, before the next notes even appear on the track,
// so the player can watch the slam land. Seconds; the finisher gets a longer one.
export const BREATHER = { move: 1.4, finisher: 2.2 };
// Lane index used by typed-letter notes (the 5th row that appears for special moves).
export const TYPE_LANE = 4;

/** Letters the player types for a special move: its name with spaces removed. */
export function typedLetters(name) {
  return [...name.toUpperCase()].filter((c) => c >= 'A' && c <= 'Z');
}
export const PREDATOR_STREAK = 16;
export const OFFENSE_MISS_LIMIT = 3; // misses in one of your sequences before the opponent reverses
export const DEFENSE_RUN_TO_REVERSE = 4; // consecutive blocks needed to take control back
export const START_BEAT = 6;

import { heroMoveFor, oppMoveFor, FINISHER, stageIndexFor } from './moves.js';

export const OPPONENTS = {
  rugpull: {
    id: 'rugpull',
    name: '$RUGPULL',
    bpm: 100,
    power: 0.75,
    fightBackEvery: 3, // the opponent forces a defense sequence after this many of your big moves
    moves: ['CLOTHESLINE', 'PILEDRIVER', 'BACKBREAKER'],
  },
};

// Big moves carry ~60% of the damage so completing a move matters more than single hits.
const BIG_DAMAGE = { 3: 6, 4: 8, 5: 10, 6: 12, 7: 14, 8: 16 };
const STRIKE_DAMAGE = { perfect: 0.15, great: 0.1, good: 0.05 };
// Wrong presses allowed per window before they count as a miss (stops lane mashing).
const GHOST_GRACE = 0.25;
const FINISHER_DAMAGE = 22;
const POINTS = { perfect: 300, great: 200, good: 100 };
export const FINISHER_NAME = 'GALAXY DRIVER';

/** Small deterministic RNG so charts are reproducible in tests. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick a lane, never the same lane three times running. */
function pickLane(rng, history) {
  for (;;) {
    const lane = Math.floor(rng() * LANES);
    const n = history.length;
    if (n >= 2 && history[n - 1] === lane && history[n - 2] === lane) continue;
    history.push(lane);
    return lane;
  }
}

/**
 * Build one sequence as a list of { beat, lane } offsets (beats from sequence start).
 * kind: 'offense' | 'defense' | 'kickout' | 'finisher'
 */
export function genSequence(rng, kind, { length = 4, level = 0, spacing = 1 } = {}) {
  const out = [];
  const hist = [];
  if (kind === 'finisher') {
    // Chords: two different lanes at once, on every beat.
    for (let i = 0; i < length; i++) {
      const a = Math.floor(rng() * LANES);
      const b = (a + 1 + Math.floor(rng() * (LANES - 1))) % LANES;
      out.push({ beat: i * spacing, lane: a }, { beat: i * spacing, lane: b });
    }
    return out;
  }
  // offense / defense: quarter notes, with eighth-note pairs as level rises.
  let beat = 0;
  while (out.length < length) {
    // Eighth-note pairs only once the player is up to speed (spacing 1).
    const pair = spacing <= 1 && out.length < length - 1 && rng() < 0.15 + level * 0.35;
    if (pair) {
      const l1 = pickLane(rng, hist);
      let l2 = pickLane(rng, hist);
      if (l2 === l1) { l2 = (l1 + 1) % LANES; hist[hist.length - 1] = l2; }
      out.push({ beat, lane: l1 }, { beat: beat + 0.5, lane: l2 });
    } else {
      out.push({ beat, lane: pickLane(rng, hist) });
    }
    beat += spacing;
  }
  return out;
}

export function gradeFor(dt) {
  const a = Math.abs(dt);
  if (a <= WINDOWS.perfect) return 'perfect';
  if (a <= WINDOWS.great) return 'great';
  if (a <= WINDOWS.good) return 'good';
  return null;
}

export class Match {
  constructor({ opponent = OPPONENTS.rugpull, seed = 1, typing = true } = {}) {
    // typing=false (touch-only devices) keeps the finisher as two-arrow chords.
    this.typing = typing;
    this.finishersDone = 0;
    this.opp = opponent;
    this.bpm = opponent.bpm;
    this.beat = 60 / this.bpm;
    this.rng = mulberry32(seed);
    this.heroHP = 100;
    this.oppHP = 100;
    this.phase = 'intro'; // intro | offense | defense | kickout | finisher | pinning | won | lost
    this.control = 'hero';
    this.notes = [];
    this.events = [];
    this.seq = null;
    this.seqId = 0;
    this.pendingKind = 'offense';
    this.nextSeqT = START_BEAT * this.beat;
    // Notes per move = the number of stages that move has. Opens with a 3-stage
    // strike so the first exchange is easy, then grows to the 8-stage moonsault.
    this.offenseLen = 3;
    this.bigMoves = 0;
    this.streak = 0;
    this.maxStreak = 0;
    this.predator = false;
    this.finisherReady = false;
    this.knockdowns = 0;
    this.score = 0;
    this.stats = { perfect: 0, great: 0, good: 0, miss: 0, ghost: 0, strikeDamage: 0, bigDamage: 0, finisherDamage: 0 };
    this.pin = null;
    this.time = 0;
    this.lastCountBeat = -1;
  }

  emit(type, data = {}) {
    this.events.push({ type, t: this.time, ...data });
  }

  /** Drain events for renderer and audio. */
  takeEvents() {
    const e = this.events;
    this.events = [];
    return e;
  }

  get playing() {
    return ['offense', 'defense', 'kickout', 'finisher'].includes(this.phase) || (this.phase === 'intro');
  }

  get over() {
    return this.phase === 'won' || this.phase === 'lost';
  }

  /** Below 40 HP the hero is FIRED UP: fewer blocks needed to take control back. */
  get firedUp() {
    return this.heroHP > 0 && this.heroHP < 55;
  }

  /** Taps needed to kick out: more knockdowns or lower HP = harder. */
  kickoutNeeded() {
    return Math.min(14, 6 + (this.knockdowns - 1) * 2 + (this.heroHP < 30 ? 3 : 0));
  }

  /** Seconds the player has to hit enough taps. */
  kickoutWindow() { return 3.5; }

  /** Called by the input layer on any key press during the kickout phase. */
  tapKickout(t) {
    const ko = this.kickoutState;
    if (!ko || ko.done) return;
    ko.taps++;
    this.emit('kickTap', { taps: ko.taps, needed: ko.needed, progress: ko.taps / ko.needed });
    if (ko.taps >= ko.needed) {
      ko.done = true;
      this.kickoutState = null;
      this.phase = this.finisherReady ? 'finisher' : 'offense';
      this.pendingKind = this.phase;
      this.emit('kickout');
      this.scheduleAfter(t, 2);
    }
  }

  update(t) {
    this.time = t;
    if (this.over) return;

    // Count-in: 3, 2, 1, FIGHT on the beats before the first note.
    if (this.phase === 'intro') {
      const b = Math.floor(t / this.beat);
      if (b !== this.lastCountBeat && b >= START_BEAT - 4 && b < START_BEAT) {
        this.lastCountBeat = b;
        const labels = ['3', '2', '1', 'FIGHT'];
        this.emit('countin', { label: labels[b - (START_BEAT - 4)] });
      }
    }

    // Notes that slid past the hit line are misses.
    for (const n of this.notes) {
      if (!n.judged && !n.void && t > n.t + WINDOWS.good) this.judge(n, 'miss', t);
      if (this.over) return;
    }
    this.notes = this.notes.filter((n) => t < n.t + 1.0);

    // Spawn the next sequence once it is due to appear at the top of the lane.
    if (!this.seq && this.pendingKind && t >= this.nextSeqT - LEAD) this.spawn(this.pendingKind);

    // Kick-out deadline: if time runs out without enough taps, the pin stands.
    if (this.kickoutState && !this.kickoutState.done && t >= this.kickoutState.deadline) {
      this.kickoutState.done = true;
      this.kickoutState = null;
      this.failKickout();
      return;
    }

    // Pin count, one per beat.
    if (this.pin) {
      const c = Math.floor((t - this.pin.start) / this.beat) + 1;
      if (c > this.pin.count && c <= 3) {
        this.pin.count = c;
        this.emit('count', { n: c, by: this.pin.by });
        if (c === 3) {
          this.phase = this.pin.by === 'hero' ? 'won' : 'lost';
          this.emit(this.phase === 'won' ? 'win' : 'lose');
        }
      }
    }
  }

  /**
   * Note spacing in beats. Starts at one note every 2 beats so a new player can
   * find the groove, then tightens as the match heats up.
   */
  spacingFor(kind) {
    const warm = this.bigMoves + this.knockdowns;
    if (kind === 'finisher') return warm < 4 ? 2 : 1;
    if (warm < 3) return 2;
    if (warm < 6) return 1.5;
    return 1;
  }

  spawn(kind) {
    this.pendingKind = null;
    const level = Math.min(1, this.bigMoves / 6);
    let length = 4;
    let move = null;
    if (kind === 'offense') {
      move = heroMoveFor(this.offenseLen, this.rng, this.bigMoves === 0 && !this.openerDone);
      this.openerDone = true;
      length = move.stages.length; // one note per stage: every hit advances the move
    } else if (kind === 'defense') {
      move = oppMoveFor(this.knockdowns);
      length = 8;
    } else if (kind === 'kickout') {
      // Tap-based: no note seq; use kickoutState instead.
      this.kickoutState = { taps: 0, needed: this.kickoutNeeded(), deadline: this.nextSeqT + this.kickoutWindow(), start: this.nextSeqT, done: false };
      this.seq = null;
      this.pendingKind = null;
      this.emit('kickoutStart', { needed: this.kickoutState.needed, window: this.kickoutWindow() });
      return;
    } else if (kind === 'finisher') {
      move = FINISHER;
      length = move.stages.length; // 8 chords, one per stage
    }
    const spacing = this.spacingFor(kind);
    if (kind === 'defense' && spacing >= 2) length = 6;
    const id = ++this.seqId;
    const start = this.nextSeqT;
    let notes;
    const typed = kind === 'finisher' && this.typing;
    if (typed) {
      // Special move: type its name, one letter per beat the first time, then per half beat.
      const step = this.finishersDone === 0 ? 1 : 0.5;
      notes = typedLetters(move.name).map((letter, i) => ({
        id: `${id}-${i}-${letter}`, seq: id, kind, t: start + i * step * this.beat, lane: TYPE_LANE, letter, judged: null, void: false,
      }));
    } else {
      const pattern = genSequence(this.rng, kind, { length, level: Math.max(0, level - 0.3), spacing });
      notes = pattern.map((p) => ({ id: `${id}-${p.beat}-${p.lane}`, seq: id, kind, t: start + p.beat * this.beat, lane: p.lane, judged: null, void: false }));
    }
    this.notes.push(...notes);
    this.seq = { id, kind, move, notes, typed, misses: 0, hits: 0, run: 0, start, end: notes[notes.length - 1].t };
    this.moveNow = move;
    this.stageIndex = -1;
    if (move) this.emit('moveStart', { move, kind, notes: notes.length });
    this.phase = kind;
    this.control = kind === 'defense' ? 'opp' : 'hero';
    this.emit('sequence', { kind, length: notes.length, start, move });
  }

  /**
   * Player typed a letter at song time t. Only meaningful during a typed special;
   * otherwise returns undefined so the caller can treat the key as something else.
   * A wrong letter is a ghost press (a miss against the next letter).
   */
  pressLetter(ch, t) {
    const seq = this.seq;
    if (!seq || !seq.typed) return undefined;
    ch = ch.toUpperCase();
    let best = null;
    let bestDt = Infinity;
    for (const n of seq.notes) {
      if (n.judged || n.void || n.letter !== ch) continue;
      const dt = Math.abs(t - n.t);
      if (dt <= WINDOWS.good && dt < bestDt) { best = n; bestDt = dt; }
    }
    if (!best) return this.ghost(TYPE_LANE, t);
    const grade = gradeFor(t - best.t);
    this.judge(best, grade, t);
    return grade;
  }

  /** Player pressed a lane at song time t. Returns the grade, or null for a ghost tap. */
  press(lane, t) {
    if (!this.seq) return null;
    let best = null;
    let bestDt = Infinity;
    for (const n of this.seq.notes) {
      if (n.judged || n.void || n.lane !== lane) continue;
      const dt = Math.abs(t - n.t);
      if (dt <= WINDOWS.good && dt < bestDt) { best = n; bestDt = dt; }
    }
    if (!best) return this.ghost(lane, t);
    const grade = gradeFor(t - best.t);
    this.judge(best, grade, t);
    return grade;
  }

  /**
   * A press with no note in its lane. One free stray press per GHOST_GRACE seconds;
   * beyond that it breaks the streak, and in defense / kick-out it counts as a miss
   * against the next note. This is what stops mashing all four lanes.
   */
  ghost(lane, t) {
    if (t - (this.lastGhostT ?? -9) < GHOST_GRACE) {
      this.lastGhostT = t;
      this.stats.ghost = (this.stats.ghost || 0) + 1;
      this.streak = 0;
      if (this.predator) { this.predator = false; this.emit('predatorLost'); }
      const seq = this.seq;
      if (seq && (seq.kind === 'defense' || seq.kind === 'kickout' || seq.kind === 'offense' || seq.kind === 'finisher')) {
        const next = seq.notes.find((n) => !n.judged && !n.void);
        if (next) this.judge(next, 'miss', t);
      }
      this.emit('ghost', { lane });
      return 'ghost';
    }
    this.lastGhostT = t;
    return null;
  }

  judge(note, grade, t) {
    note.judged = grade;
    note.judgedAt = t;
    this.stats[grade]++;
    const seq = this.seq && this.seq.id === note.seq ? this.seq : null;
    const hit = grade !== 'miss';

    if (hit) {
      this.streak++;
      this.maxStreak = Math.max(this.maxStreak, this.streak);
      this.score += Math.round(POINTS[grade] * (1 + Math.min(this.streak, 50) / 10) * (this.predator ? 1.5 : 1));
      // Every 16-note streak arms the finisher; the first one also enters Predator mode.
      if (this.streak % PREDATOR_STREAK === 0) {
        if (!this.finisherReady && this.streak - (this.finisherStreakMark ?? -99) >= PREDATOR_STREAK) { this.finisherReady = true; this.emit('finisherReady'); }
        if (!this.predator) { this.predator = true; this.emit('predator'); }
      }
    } else {
      this.streak = 0;
      if (this.predator) { this.predator = false; this.emit('predatorLost'); }
    }
    this.emit('judge', { grade, lane: note.lane, kind: note.kind });
    if (!seq) return;

    const mult = this.predator ? 1.5 : 1;
    if (seq.kind === 'offense' || seq.kind === 'finisher') {
      if (hit) {
        seq.hits++;
        this.advanceStage(seq);
        const d = STRIKE_DAMAGE[grade] * mult;
        this.oppHP = Math.max(0, this.oppHP - d);
        this.stats.strikeDamage += d;
        this.emit('strike', { by: 'hero', grade });
      } else {
        seq.misses++;
        if (seq.misses >= OFFENSE_MISS_LIMIT) return this.reverse('opp');
      }
    } else if (seq.kind === 'defense') {
      if (hit) {
        seq.hits++;
        seq.run++;
        this.advanceStage(seq);
        this.emit('block', { grade });
        if (seq.run >= (this.firedUp ? 3 : DEFENSE_RUN_TO_REVERSE)) return this.reverse('hero');
      } else {
        seq.run = 0;
        this.heroHP = Math.max(0, this.heroHP - 2 * this.opp.power);
        this.emit('strike', { by: 'opp' });
      }
    }

    if (seq.notes.every((n) => n.judged || n.void)) this.resolve(seq);
  }

  /** Show the next keyframe of the current move: one stage per hit note. */
  advanceStage(seq) {
    if (!seq.move || seq.kind === 'kickout') return;
    // Finisher stages are chords, so two notes advance one stage.
    const perStage = seq.kind === 'finisher' && !seq.typed ? 2 : 1;
    const stageHits = Math.ceil(seq.hits / perStage);
    const stageNotes = Math.ceil(seq.notes.length / perStage);
    const idx = stageIndexFor(seq.move, stageHits, stageNotes);
    this.stageIndex = idx;
    this.emit('stage', { move: seq.move, index: idx, hits: stageHits, notes: stageNotes, kind: seq.kind });
  }

  /** Clear the rest of the current sequence and hand control over. */
  reverse(to) {
    if (this.seq && this.seq.move && this.stageIndex >= 0) this.emit('moveEscape', { move: this.seq.move, index: this.stageIndex, by: to });
    for (const n of this.seq.notes) if (!n.judged) n.void = true;
    this.seq = null;
    this.control = to;
    this.emit('reversal', { to });
    this.pendingKind = to === 'hero' ? (this.finisherReady ? 'finisher' : 'offense') : 'defense';
    this.scheduleAfter(this.time, 2);
  }

  /** Next sequence starts so its first note only appears on the track `rest` s after t. */
  scheduleQuiet(t, rest) {
    this.nextSeqT = Math.ceil((t + rest + LEAD) / this.beat - 1e-6) * this.beat;
  }

  scheduleAfter(t, gapBeats) {
    // Always land on a whole beat so notes stay locked to the music.
    let b = Math.ceil(t / this.beat - 1e-6 + gapBeats);
    while (b * this.beat < t + 1.0) b++;
    this.nextSeqT = b * this.beat;
  }

  failKickout() {
    if (this.seq) { for (const n of this.seq.notes) if (!n.judged) n.void = true; this.seq = null; }
    this.kickoutState = null;
    this.phase = 'pinning';
    // Ref counts 1..2..3 on the beat from here; there is no escape once the kick-out failed.
    this.pin = { by: 'opp', start: this.time, count: 0 };
    this.emit('kickoutFail');
  }

  resolve(seq) {
    this.seq = null;
    const acc = seq.hits / seq.notes.length;
    if (seq.kind === 'offense' || seq.kind === 'finisher') {
      const mult = this.predator ? 1.5 : 1;
      let dmg;
      let move;
      if (seq.kind === 'finisher') {
        this.finishersDone++;
        dmg = FINISHER_DAMAGE * acc;
        move = seq.move ? seq.move.name : FINISHER_NAME;
        this.finisherReady = false;
        this.finisherStreakMark = this.streak; // need 16 fresh hits to re-arm
      } else {
        const len = Math.min(8, seq.notes.length);
        dmg = (BIG_DAMAGE[len] ?? 16) * (0.6 + 0.4 * acc) * mult;
        move = seq.move ? seq.move.name : 'BODY SLAM';
        this.offenseLen = Math.min(8, this.offenseLen + 1);
      }
      this.oppHP = Math.max(0, this.oppHP - dmg);
      if (seq.kind === 'finisher') this.stats.finisherDamage += dmg;
      else this.stats.bigDamage += dmg;
      this.bigMoves++;
      this.emit('bigmove', { by: 'hero', move, finisher: seq.kind === 'finisher', stages: seq.move ? seq.move.stages.length : 0 });
      if (this.oppHP <= 0) {
        this.phase = 'pinning';
        this.pin = { by: 'hero', start: seq.end + this.beat, count: 0 };
        this.emit('pinStart', { by: 'hero' });
        return;
      }
      const fightBack = seq.kind === 'finisher' || this.bigMoves % this.opp.fightBackEvery === 0;
      this.pendingKind = this.finisherReady ? 'finisher' : fightBack ? 'defense' : 'offense';
      if (this.pendingKind === 'defense') this.emit('fightBack');
      const rest = BREATHER[seq.kind === 'finisher' ? 'finisher' : 'move'];
      this.emit('breather', { until: seq.end + rest });
      this.scheduleQuiet(seq.end, rest);
    } else if (seq.kind === 'defense') {
      // You never strung four blocks together: the opponent lands a big move and you go down.
      const move = seq.move ? seq.move.name : this.opp.moves[this.knockdowns % this.opp.moves.length];
      this.heroHP = Math.max(0, this.heroHP - 15 * this.opp.power);
      this.knockdowns++;
      this.emit('bigmove', { by: 'opp', move, stages: seq.move ? seq.move.stages.length : 0 });
      this.emit('knockdown');
      this.pendingKind = 'kickout';
      this.scheduleAfter(seq.end, 2);
    }
  }
}
