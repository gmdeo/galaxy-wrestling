// The move repertoire. Every note you hit plays the next stage of the current move,
// so the ring shows the move being built one keypress at a time: walk in, lock up,
// lift, throw. Longer moves have more stages and do more damage.
//
// A stage is a keyframe:
//   a   : attacker { pose, dx }            dx = offset from the attacker's start, towards the victim
//   v   : victim   { pose, gap, lift, rot, pivot }
//         gap  = distance in front of the attacker (px, along facing)
//         lift = px off the mat; rot = 0 / 90 / 180 / 270 (whole-pixel rotations only)
//   cue : what the camera and crowd do on this stage
//         'step' | 'grab' | 'lift' | 'hold' | 'impact' | 'big' | 'huge' | 'climb' | 'spin'
//   label : optional one-word caption for key beats (shown small above the ring)
//
// The last stage of every move is the impact; damage is applied there.

const S = (a, v, cue = 'step', label) => ({ a, v, cue, label });

export const HERO_MOVES = [
  // ---------- Tier 0: 3 stages ----------
  {
    id: 'chop', name: 'CHOP', tier: 0,
    stages: [
      S({ pose: 'walk', dx: 14 }, { pose: 'idle', gap: 22 }),
      S({ pose: 'windup', dx: 20 }, { pose: 'idle', gap: 18 }, 'grab'),
      S({ pose: 'chop', dx: 24 }, { pose: 'hurt', gap: 20 }, 'impact', 'CHOP!'),
    ],
  },
  {
    id: 'forearm', name: 'FOREARM SMASH', tier: 0,
    stages: [
      S({ pose: 'walk2', dx: 14 }, { pose: 'idle', gap: 22 }),
      S({ pose: 'windup', dx: 20 }, { pose: 'idle', gap: 18 }, 'grab'),
      S({ pose: 'strike', dx: 26 }, { pose: 'stagger', gap: 26 }, 'impact', 'SMASH!'),
    ],
  },
  {
    id: 'dropkick', name: 'DROPKICK', tier: 0,
    stages: [
      S({ pose: 'run', dx: 10 }, { pose: 'idle', gap: 36 }),
      S({ pose: 'dropkick', dx: 26, lift: 10 }, { pose: 'idle', gap: 20 }, 'lift'),
      S({ pose: 'down', dx: 26 }, { pose: 'down', gap: 26 }, 'big', 'BOOM'),
    ],
  },

  // ---------- Tier 1: 4 stages ----------
  {
    id: 'bodyslam', name: 'BODY SLAM', tier: 1,
    stages: [
      S({ pose: 'walk', dx: 18 }, { pose: 'idle', gap: 18 }),
      S({ pose: 'lockup', dx: 26 }, { pose: 'lockup', gap: 13 }, 'grab', 'LOCK UP'),
      S({ pose: 'carry', dx: 26 }, { pose: 'hurt', gap: 2, lift: 26, rot: 90 }, 'lift', 'SCOOP'),
      S({ pose: 'kneel', dx: 26 }, { pose: 'down', gap: 24 }, 'big', 'SLAM!'),
    ],
  },
  {
    id: 'hiptoss', name: 'HIP TOSS', tier: 1,
    stages: [
      S({ pose: 'walk2', dx: 18 }, { pose: 'idle', gap: 18 }),
      S({ pose: 'lockup', dx: 26 }, { pose: 'lockup', gap: 13 }, 'grab', 'LOCK UP'),
      S({ pose: 'hipturn', dx: 28 }, { pose: 'hurt', gap: 8, lift: 18, rot: 90 }, 'lift', 'OVER'),
      S({ pose: 'taunt', dx: 28 }, { pose: 'down', gap: 26 }, 'big', 'TOSS!'),
    ],
  },
  {
    id: 'clothesline', name: 'CLOTHESLINE', tier: 1,
    stages: [
      S({ pose: 'run', dx: -26 }, { pose: 'idle', gap: 70 }, 'step', 'ROPES'),
      S({ pose: 'ropes', dx: -34 }, { pose: 'idle', gap: 78 }, 'hold', 'BOUNCE'),
      S({ pose: 'run2', dx: 16 }, { pose: 'idle', gap: 22 }),
      S({ pose: 'lariat', dx: 26 }, { pose: 'down', gap: 22 }, 'big', 'LARIAT!'),
    ],
  },

  // ---------- Tier 2: 5-6 stages ----------
  {
    id: 'suplex', name: 'SUPLEX', tier: 2,
    stages: [
      S({ pose: 'walk', dx: 18 }, { pose: 'idle', gap: 18 }),
      S({ pose: 'lockup', dx: 26 }, { pose: 'lockup', gap: 13 }, 'grab', 'LOCK UP'),
      S({ pose: 'facelock', dx: 26 }, { pose: 'bentover', gap: 9 }, 'grab', 'FACELOCK'),
      S({ pose: 'carry', dx: 26 }, { pose: 'hurt', gap: 0, lift: 44, rot: 180 }, 'lift', 'LIFT'),
      S({ pose: 'carry', dx: 25 }, { pose: 'hurt', gap: 0, lift: 52, rot: 180 }, 'hold', 'HANG'),
      S({ pose: 'down', dx: 22 }, { pose: 'down', gap: -18 }, 'huge', 'SUPLEX!'),
    ],
  },
  {
    id: 'ddt', name: 'DDT', tier: 2,
    stages: [
      S({ pose: 'walk2', dx: 18 }, { pose: 'idle', gap: 18 }),
      S({ pose: 'lockup', dx: 26 }, { pose: 'lockup', gap: 13 }, 'grab', 'LOCK UP'),
      S({ pose: 'facelock', dx: 26 }, { pose: 'bentover', gap: 9 }, 'grab', 'FACELOCK'),
      S({ pose: 'tuck', dx: 22, lift: 8 }, { pose: 'bentover', gap: 11, lift: 4 }, 'lift', 'JUMP'),
      S({ pose: 'down', dx: 20 }, { pose: 'hurt', gap: 12, rot: 270, pivot: 0.2 }, 'huge', 'SPIKE!'),
    ],
  },

  // ---------- Tier 3: 7-8 stages ----------
  {
    id: 'powerbomb', name: 'POWERBOMB', tier: 3,
    stages: [
      S({ pose: 'walk', dx: 18 }, { pose: 'idle', gap: 18 }),
      S({ pose: 'lockup', dx: 26 }, { pose: 'lockup', gap: 13 }, 'grab', 'LOCK UP'),
      S({ pose: 'facelock', dx: 26 }, { pose: 'bentover', gap: 7 }, 'grab', 'TUCK'),
      S({ pose: 'scoop', dx: 26 }, { pose: 'bentover', gap: 5, lift: 4 }, 'grab', 'HOOK'),
      S({ pose: 'carry', dx: 26 }, { pose: 'hurt', gap: 2, lift: 20, rot: 180 }, 'lift', 'UP'),
      S({ pose: 'carry', dx: 26 }, { pose: 'hurt', gap: 3, lift: 34, rot: 90 }, 'hold', 'HIGH'),
      S({ pose: 'kneel', dx: 26 }, { pose: 'down', gap: 18 }, 'huge', 'POWERBOMB!'),
    ],
  },
  {
    id: 'moonsault', name: 'MOONSAULT', tier: 3,
    stages: [
      S({ pose: 'lariat', dx: 22 }, { pose: 'down', gap: 22 }, 'impact', 'DOWN'),
      S({ pose: 'run', dx: -40 }, { pose: 'down', gap: 62 }, 'step', 'CORNER'),
      S({ pose: 'climb', dx: -52, lift: 8 }, { pose: 'down', gap: 74 }, 'climb', 'CLIMB'),
      S({ pose: 'climb', dx: -54, lift: 18 }, { pose: 'down', gap: 76 }, 'climb', 'TOP'),
      S({ pose: 'perch', dx: -54, lift: 24 }, { pose: 'down', gap: 76 }, 'hold', 'PERCH'),
      S({ pose: 'tuck', dx: -20, lift: 44, rot: 180 }, { pose: 'down', gap: 42 }, 'spin', 'FLIP'),
      S({ pose: 'splash', dx: 8, lift: 26 }, { pose: 'down', gap: 14 }, 'lift', 'AIR'),
      S({ pose: 'splash', dx: 20, lift: 4 }, { pose: 'down', gap: 2 }, 'huge', 'MOONSAULT!'),
    ],
  },
];

// Finisher: 8 chord stages, only in Predator mode.
export const FINISHER = {
  id: 'galaxy', name: 'GALAXY DRIVER', tier: 4,
  stages: [
    S({ pose: 'lockup', dx: 26 }, { pose: 'lockup', gap: 13 }, 'grab', 'LOCK UP'),
    S({ pose: 'facelock', dx: 26 }, { pose: 'bentover', gap: 8 }, 'grab', 'UNDERHOOK'),
    S({ pose: 'carry', dx: 26 }, { pose: 'hurt', gap: 1, lift: 30, rot: 180 }, 'lift', 'VERTICAL'),
    S({ pose: 'carry', dx: 26 }, { pose: 'hurt', gap: 1, lift: 34, rot: 180 }, 'hold', 'STARS'),
    S({ pose: 'carry', dx: 24 }, { pose: 'hurt', gap: -1, lift: 34, rot: 180 }, 'spin', 'SPIN'),
    S({ pose: 'carry', dx: 28 }, { pose: 'hurt', gap: 3, lift: 34, rot: 180 }, 'spin', 'GALAXY'),
    S({ pose: 'tuck', dx: 26, lift: 14 }, { pose: 'hurt', gap: 2, lift: 46, rot: 180 }, 'lift', 'JUMP'),
    S({ pose: 'kneel', dx: 26 }, { pose: 'hurt', gap: 6, rot: 270, pivot: 0.2 }, 'huge', 'DRIVE!'),
  ],
};

// What the opponent does to you when he has control. Each blocked note resists a stage.
export const OPP_MOVES = [
  {
    id: 'oclothesline', name: 'CLOTHESLINE', tier: 1,
    stages: [
      S({ pose: 'run', dx: -26 }, { pose: 'idle', gap: 70 }),
      S({ pose: 'ropes', dx: -34 }, { pose: 'idle', gap: 78 }, 'hold'),
      S({ pose: 'run2', dx: 16 }, { pose: 'idle', gap: 22 }),
      S({ pose: 'lariat', dx: 26 }, { pose: 'down', gap: 22 }, 'big', 'LARIAT!'),
    ],
  },
  {
    id: 'backbreaker', name: 'BACKBREAKER', tier: 2,
    stages: [
      S({ pose: 'walk', dx: 18 }, { pose: 'idle', gap: 18 }),
      S({ pose: 'lockup', dx: 26 }, { pose: 'lockup', gap: 13 }, 'grab'),
      S({ pose: 'carry', dx: 26 }, { pose: 'hurt', gap: 2, lift: 26, rot: 90 }, 'lift'),
      S({ pose: 'carry', dx: 26 }, { pose: 'hurt', gap: 2, lift: 30, rot: 90 }, 'hold'),
      S({ pose: 'kneel', dx: 26 }, { pose: 'down', gap: 14 }, 'huge', 'CRACK!'),
    ],
  },
  {
    id: 'piledriver', name: 'PILEDRIVER', tier: 3,
    stages: [
      S({ pose: 'walk2', dx: 18 }, { pose: 'idle', gap: 18 }),
      S({ pose: 'facelock', dx: 26 }, { pose: 'bentover', gap: 9 }, 'grab'),
      S({ pose: 'carry', dx: 26 }, { pose: 'hurt', gap: 1, lift: 26, rot: 180 }, 'lift'),
      S({ pose: 'carry', dx: 26 }, { pose: 'hurt', gap: 1, lift: 30, rot: 180 }, 'hold'),
      S({ pose: 'kneel', dx: 26 }, { pose: 'hurt', gap: 3, rot: 180, pivot: 0.1 }, 'huge', 'SPIKE!'),
      S({ pose: 'taunt', dx: 22 }, { pose: 'down', gap: 18 }, 'impact'),
    ],
  },
];

// What you do when he escapes: per-stage escape, the victim wriggles free.
export const ESCAPE = { a: { pose: 'stagger', dx: 6 }, v: { pose: 'strike', gap: 22 }, cue: 'impact', label: 'ESCAPED' };

/**
 * Pick a hero move for a sequence of `length` notes. The very first move of a match
 * is always CHOP, the simplest 3-stage strike, so every player learns on the same move.
 */
export function heroMoveFor(length, rng = Math.random, first = false) {
  if (first) return HERO_MOVES.find((m) => m.id === 'chop');
  const pool = HERO_MOVES.filter((m) => m.stages.length === length);
  if (pool.length) return pool[Math.floor(rng() * pool.length)];
  // Fall back to the longest move that fits.
  const fit = HERO_MOVES.filter((m) => m.stages.length <= length).sort((a, b) => b.stages.length - a.stages.length);
  return fit[0] || HERO_MOVES[0];
}

/** Pick the opponent's move for a defense sequence of `length` notes. */
export function oppMoveFor(knockdowns) {
  return OPP_MOVES[knockdowns % OPP_MOVES.length];
}

/**
 * Given a move and how many notes of the sequence have been hit, return the stage to show.
 * Notes can outnumber stages (8-note sequences on a 7-stage move); the final impact stage
 * is always reserved for the last note so the payoff lands with the move completing.
 */
export function stageIndexFor(move, hits, notes) {
  const n = move.stages.length;
  if (hits <= 0) return -1;
  if (hits >= notes) return n - 1;
  // Spread the build-up stages across the first notes-1 hits.
  return Math.min(n - 2, Math.floor(((hits - 1) * (n - 1)) / Math.max(1, notes - 1)));
}
