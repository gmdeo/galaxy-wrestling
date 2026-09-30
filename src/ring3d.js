// The arena: ring canvas, apron, ropes with real sag, turnbuckles, corner posts,
// ringside barrier, tiered stands with a crowd bowl, and an overhead truss rig.
import * as THREE from 'three';

const RING = 5.6;        // half-width of the ring in world units
const MAT_H = 1.0;       // canvas height off the arena floor
const POST_H = 4.4;

// ---------- textures ----------
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function matTexture() {
  return canvasTex(1024, 1024, (g, W) => {
    g.fillStyle = '#dfe2f2';
    g.fillRect(0, 0, W, W);

    // woven canvas weave
    g.globalAlpha = 0.05;
    for (let i = 0; i < W; i += 4) {
      g.fillStyle = i % 8 ? '#8a90b8' : '#ffffff';
      g.fillRect(i, 0, 2, W);
      g.fillRect(0, i, W, 2);
    }
    g.globalAlpha = 1;

    // subtle dirt/wear blotches
    for (let i = 0; i < 90; i++) {
      const x = Math.random() * W, y = Math.random() * W, r = 30 + Math.random() * 130;
      const rg = g.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, 'rgba(90,95,130,0.05)');
      rg.addColorStop(1, 'rgba(90,95,130,0)');
      g.fillStyle = rg;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }

    // padded plank seams
    g.strokeStyle = 'rgba(120,126,160,0.35)';
    g.lineWidth = 3;
    for (let i = 1; i < 8; i++) {
      const v = (i / 8) * W;
      g.beginPath(); g.moveTo(v, 0); g.lineTo(v, W); g.stroke();
      g.beginPath(); g.moveTo(0, v); g.lineTo(W, v); g.stroke();
    }

    // centre logo
    g.save();
    g.translate(W / 2, W / 2);
    g.scale(1, 0.62);
    g.beginPath(); g.arc(0, 0, 300, 0, Math.PI * 2);
    g.strokeStyle = '#1e7f93'; g.lineWidth = 26; g.stroke();
    g.beginPath(); g.arc(0, 0, 246, 0, Math.PI * 2);
    g.strokeStyle = 'rgba(53,189,210,0.45)'; g.lineWidth = 10; g.stroke();
    g.restore();

    g.save();
    g.translate(W / 2, W / 2 - 6);
    g.fillStyle = '#1a7f95';
    g.font = 'bold 108px monospace';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('$WRESTLER', 0, 0);
    g.font = 'bold 46px monospace';
    g.fillStyle = '#c31d78';
    g.fillText('G A L A X Y', 0, 96);
    g.restore();

    // corner arcs
    g.strokeStyle = 'rgba(209,10,122,0.5)';
    g.lineWidth = 8;
    [[0,0,1],[W,0,-1],[0,W,-1],[W,W,1]].forEach(([x,y]) => {
      g.beginPath(); g.arc(x, y, 150, 0, Math.PI * 2); g.stroke();
    });
  });
}

function apronTexture() {
  return canvasTex(2048, 256, (g, W, H) => {
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#141a4a');
    grad.addColorStop(0.5, '#0b1238');
    grad.addColorStop(1, '#060a24');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);

    // quilted padding
    g.strokeStyle = 'rgba(70,85,160,0.35)';
    g.lineWidth = 2;
    for (let x = 0; x < W; x += 96) {
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke();
      g.beginPath(); g.moveTo(x + 48, 0); g.lineTo(x + 48, H); g.stroke();
    }

    // glowing brand
    g.shadowColor = '#F02E98';
    g.shadowBlur = 34;
    g.fillStyle = '#F02E98';
    g.font = 'bold 116px monospace';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('$WRESTLER GALAXY', W / 2, H / 2 + 4);
    g.shadowBlur = 0;

    g.fillStyle = 'rgba(53,189,210,0.9)';
    g.fillRect(0, 6, W, 5);
    g.fillStyle = 'rgba(209,10,122,0.9)';
    g.fillRect(0, H - 11, W, 5);
  });
}

function crowdTexture(seed = 0) {
  // EIGHT varied spectators per tile. The riser repeats this around the
  // circumference, so the eye sees a mixed crowd instead of one clone tiled.
  const N = 8;
  return canvasTex(256 * N, 256, (g, W, H) => {
    g.fillStyle = '#05070f';
    g.fillRect(0, 0, W, H);
    for (let k = 0; k < N; k++) {
      g.save();
      g.translate(k * 256, 0);
      // deterministic per-index jitter: same tile every rebuild, still varied
      const rnd = mulberry(seed * 977 + k * 131);
      drawSpectator(g, 256, 256, rnd);
      g.restore();
    }
    // rim light from the ring below, across the whole strip
    const grad = g.createLinearGradient(0, H, 0, H * 0.45);
    grad.addColorStop(0, 'rgba(120,150,255,0.20)');
    grad.addColorStop(1, 'rgba(120,150,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
  });
}

/** Deterministic PRNG so a rebuild looks identical (no flicker between loads). */
function mulberry(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One spectator drawn into a 256x256 tile. */
function drawSpectator(g, W, H, rnd) {
  const pick = (a) => a[(rnd() * a.length) | 0];
  const skins = ['#e8b48c', '#c98a5e', '#8d5a3b', '#f0c9a0', '#a8703f', '#5f3a24'];
  const shirts = ['#2b3a7a', '#7a2b52', '#1f5f6b', '#5a3a7a', '#6b6b2b', '#8a3a2b',
                  '#3a6b4a', '#4a4a7a', '#b06a2b', '#2b2b3a', '#d0d0d8', '#8a2b8a'];
  const hairs = ['#1a1a1a', '#3a2410', '#6b4a20', '#c9c9c9', '#e0c070'];
  const skin = pick(skins), shirt = pick(shirts), hair = pick(hairs);
  const cx = W / 2;
  const s = 0.86 + rnd() * 0.24;        // varied height, so heads do not line up
  g.save();
  g.translate(cx, H);
  g.scale(s, s);
  g.translate(-cx, -H);

  // body / shoulders (lower ~40%)
    g.fillStyle = shirt;
    g.beginPath();
    g.moveTo(cx - 74, H);
    g.lineTo(cx - 70, H * 0.60);
    g.quadraticCurveTo(cx, H * 0.44, cx + 70, H * 0.60);
    g.lineTo(cx + 74, H);
    g.closePath();
    g.fill();

    // collar shadow
    g.fillStyle = 'rgba(0,0,0,0.28)';
    g.fillRect(cx - 70, H * 0.60, 140, 10);

    // neck
    g.fillStyle = skin;
    g.fillRect(cx - 16, H * 0.44, 32, 26);

    // head (upper centre)
    g.fillStyle = skin;
    g.beginPath();
    g.ellipse(cx, H * 0.30, 46, 54, 0, 0, Math.PI * 2);
    g.fill();

    // hair / cap over the crown
  g.fillStyle = rnd() < 0.35 ? shirt : hair;
    g.beginPath();
    g.ellipse(cx, H * 0.235, 48, 34, 0, Math.PI, Math.PI * 2);
    g.fill();
    g.fillRect(cx - 48, H * 0.235, 96, 10);

    // eyes
    g.fillStyle = '#141422';
    g.fillRect(cx - 22, H * 0.30, 13, 9);
    g.fillRect(cx + 9, H * 0.30, 13, 9);

    // occasional glasses
  if (rnd() < 0.3) {
      g.fillStyle = '#08080f';
      g.fillRect(cx - 34, H * 0.285, 68, 15);
    }

    // occasional raised arm
  if (rnd() < 0.22) {
      g.fillStyle = skin;
    const side = rnd() < 0.5 ? -1 : 1;
      g.fillRect(cx + side * 62, H * 0.42, 20, 78);
  }
  g.restore();
}

// ---------- build ----------
export function buildRing(scene) {
  const g = new THREE.Group();
  scene.add(g);

  const concrete = new THREE.MeshStandardMaterial({ color: 0x11142c, roughness: 0.95 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x2a2f4a, roughness: 0.45, metalness: 0.75 });
  const darkSteel = new THREE.MeshStandardMaterial({ color: 0x161a2e, roughness: 0.6, metalness: 0.5 });

  // ---------- arena floor ----------
  const floorTex = canvasTex(512, 512, (c, W) => {
    c.fillStyle = '#0d1024';
    c.fillRect(0, 0, W, W);
    for (let i = 0; i < 2600; i++) {
      c.fillStyle = `rgba(${120 + Math.random() * 60 | 0},${130 + Math.random() * 60 | 0},${170 + Math.random() * 60 | 0},${Math.random() * 0.06})`;
      c.fillRect(Math.random() * W, Math.random() * W, 2, 2);
    }
  });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(14, 14);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(180, 180),
    new THREE.MeshStandardMaterial({ map: floorTex, color: 0x9aa0c0, roughness: 0.9 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  g.add(floor);

  // ---------- ring platform ----------
  const matTex = matTexture();
  matTex.anisotropy = 16;
  const canvasMesh = new THREE.Mesh(
    new THREE.BoxGeometry(RING * 2, 0.22, RING * 2),
    new THREE.MeshStandardMaterial({ map: matTex, roughness: 0.78 })
  );
  canvasMesh.position.y = MAT_H;
  canvasMesh.receiveShadow = true;
  canvasMesh.castShadow = true;
  g.add(canvasMesh);

  // skirt / apron (4 sides with brand text on the front)
  const aprTex = apronTexture();
  const apronMat = new THREE.MeshStandardMaterial({
    map: aprTex, emissiveMap: aprTex, emissive: 0xffffff, emissiveIntensity: 0.12, roughness: 0.7,
  });
  const plainApron = new THREE.MeshStandardMaterial({ color: 0x0b1238, roughness: 0.75 });
  const skirts = [
    { pos: [0, MAT_H / 2, RING], rot: 0 },              // front (branded)
    { pos: [0, MAT_H / 2, -RING], rot: Math.PI },       // back
    { pos: [-RING, MAT_H / 2, 0], rot: -Math.PI / 2 },  // left
    { pos: [RING, MAT_H / 2, 0], rot: Math.PI / 2 },    // right
  ];
  for (const s of skirts) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(RING * 2, MAT_H),
      s.rot === 0 ? apronMat : plainApron
    );
    m.position.set(...s.pos);
    m.rotation.y = s.rot;
    m.receiveShadow = true;
    g.add(m);
  }
  // padded top rail of the apron
  const rim = new THREE.Mesh(new THREE.BoxGeometry(RING * 2 + 0.6, 0.16, RING * 2 + 0.6), darkSteel);
  rim.position.y = MAT_H + 0.06;
  g.add(rim);

  // ---------- corner posts + turnbuckles ----------
  const padMats = [0xd10a7a, 0x35bdd2, 0xd10a7a, 0x35bdd2].map((c) =>
    new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.55, roughness: 0.4 })
  );
  const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
  const ropeY = [0.82, 1.46, 2.10];
  const ropeCols = [0xd10a7a, 0xb9bfd8, 0x35bdd2];
  const ropeMats = ropeCols.map((c, i) =>
    new THREE.MeshStandardMaterial({
      color: c,
      emissive: i === 1 ? 0x000000 : c,
      emissiveIntensity: i === 1 ? 0 : (i === 0 ? 0.5 : 0.42),
      roughness: 0.35,
    })
  );

  corners.forEach(([cx, cz], i) => {
    const x = cx * RING, z = cz * RING;

    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, POST_H, 16), steel);
    post.position.set(x, MAT_H + POST_H / 2, z);
    post.castShadow = true;
    g.add(post);

    // turnbuckle pad + cap
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.30, 1.3, 16), padMats[i]);
    pad.position.set(x, MAT_H + POST_H - 1.05, z);
    pad.castShadow = true;
    g.add(pad);

    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.30, 14, 10), padMats[i]);
    cap.position.set(x, MAT_H + POST_H + 0.12, z);
    g.add(cap);

    // turnbuckle brackets where ropes meet
    ropeY.forEach((ry) => {
      const br = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.24, 0.42), steel);
      br.position.set(x, MAT_H + ry, z);
      g.add(br);
    });
  });

  // ---------- ropes: 3 tiers, 4 sides, sagging both ways ----------
  for (let tier = 0; tier < 3; tier++) {
    const y = MAT_H + ropeY[tier];
    const sagAmt = 0.30 + tier * 0.04;
    for (const axis of ['x', 'z']) {
      for (const sign of [-1, 1]) {
        const pts = [];
        const N = 20;
        for (let s = 0; s <= N; s++) {
          const t = s / N;
          const lateral = (t - 0.5) * 2;           // -1 .. 1
          const along = lateral * RING;
          const vSag = (1 - lateral * lateral) * sagAmt;
          const p = axis === 'x'
            ? new THREE.Vector3(along, y - vSag, sign * RING)
            : new THREE.Vector3(sign * RING, y - vSag, along);
          pts.push(p);
        }
        const curve = new THREE.CatmullRomCurve3(pts);
        const rope = new THREE.Mesh(new THREE.TubeGeometry(curve, 72, 0.048, 10, false), ropeMats[tier]);
        rope.castShadow = true;
        g.add(rope);
      }
    }
  }

  // ---------- ringside barrier + floor mats ----------
  const barR = RING + 2.2;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const px = Math.cos(a) * barR * 1.0, pz = Math.sin(a) * barR * 1.0;
    const seg = new THREE.Mesh(new THREE.BoxGeometry(barR * 1.2, 1.15, 0.18), darkSteel);
    seg.position.set(px, 0.58, pz);
    seg.rotation.y = -a + Math.PI / 2;
    seg.castShadow = true;
    g.add(seg);
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(barR * 1.2, 0.1, 0.24),
      new THREE.MeshStandardMaterial({ color: 0x35bdd2, emissive: 0x35bdd2, emissiveIntensity: 0.5 })
    );
    rail.position.set(px, 1.18, pz);
    rail.rotation.y = -a + Math.PI / 2;
    g.add(rail);
  }

  const ringside = new THREE.Mesh(
    new THREE.RingGeometry(RING + 0.5, barR + 0.2, 4, 1),
    new THREE.MeshStandardMaterial({ color: 0x0a0d22, roughness: 0.95 })
  );
  ringside.rotation.x = -Math.PI / 2;
  ringside.position.y = 0.012;
  g.add(ringside);

  // ---------- tiered stands with crowd bowl ----------
  const crowdTex = crowdTexture(1);
  const crowdTexB = crowdTexture(7);
  const standMat = new THREE.MeshStandardMaterial({ color: 0x0a0e24, roughness: 0.95, side: THREE.DoubleSide });

  const TIERS = 13;
  const r0 = barR + 3.2;
  const risePer = 1.35;
  const runPer = 1.5;

  for (let t = 0; t < TIERS; t++) {
    const rIn = r0 + t * runPer;
    const rOut = rIn + runPer;
    const y = t * risePer;

    // riser (vertical face holding the crowd art)
    // The texture is 1024x512 covering a full revolution: repeat it enough times
    // that each figure stays roughly square instead of smearing into a streak.
    const circ = 2 * Math.PI * rIn;
    const rep = Math.max(1, Math.round(circ / risePer / 8));
    const tex = (t % 2 ? crowdTexB : crowdTex).clone();
    tex.needsUpdate = true;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.repeat.set(rep, 1);
    const riser = new THREE.Mesh(
      new THREE.CylinderGeometry(rIn, rIn, risePer, 64, 1, true, 0, Math.PI * 2),
      new THREE.MeshStandardMaterial({
        color: 0x000000,
        emissiveMap: tex,
        emissive: 0xffffff,
        emissiveIntensity: 0.82 + Math.min(0.2, t * 0.018),
        roughness: 1,
        side: THREE.DoubleSide,
      })
    );
    riser.position.y = y + risePer / 2;
    g.add(riser);

    // tread (the floor of each row)
    const tread = new THREE.Mesh(
      new THREE.RingGeometry(rIn, rOut, 48, 1),
      standMat
    );
    tread.rotation.x = -Math.PI / 2;
    tread.position.y = y + risePer;
    g.add(tread);
  }

  // outer shell wall so you never see through the bowl
  const shell = new THREE.Mesh(
    new THREE.CylinderGeometry(r0 + TIERS * runPer, r0 + TIERS * runPer, TIERS * risePer + 6, 48, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x05070f, roughness: 1, side: THREE.BackSide })
  );
  shell.position.y = (TIERS * risePer) / 2;
  g.add(shell);

  // roof truss ring
  const trussR = r0 + TIERS * runPer - 2;
  const trussY = TIERS * risePer + 2.2;
  const truss = new THREE.Mesh(
    new THREE.TorusGeometry(trussR, 0.28, 8, 64),
    new THREE.MeshStandardMaterial({ color: 0x22263c, roughness: 0.5, metalness: 0.7 })
  );
  truss.rotation.x = Math.PI / 2;
  truss.position.y = trussY;
  g.add(truss);

  // ---------- overhead lighting rig ----------
  const rigY = MAT_H + 9.5;
  const beamGeo = new THREE.CylinderGeometry(0.22, 1.9, rigY - MAT_H - POST_H, 14, 1, true);
  const colors = [0xff2ea0, 0x35bdd2, 0xffd84a, 0xff6bd6, 0x6bd0ff, 0xffffff];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const px = Math.cos(a) * 5.4, pz = Math.sin(a) * 5.4;

    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.42, 0.9, 14), steel);
    can.position.set(px, rigY, pz);
    can.rotation.z = 0.2;
    g.add(can);

    // visible volumetric shaft
    const beam = new THREE.Mesh(
      new THREE.ConeGeometry(1.9, rigY - MAT_H - POST_H, 16, 1, true),
      new THREE.MeshBasicMaterial({
        color: colors[i],
        transparent: true,
        opacity: 0.022,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    beam.position.set(px * 0.78, (rigY + MAT_H) / 2 - 0.4, pz * 0.78);
    beam.renderOrder = 3;
    g.add(beam);
  }

  // truss cross-members
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI;
    const bar = new THREE.Mesh(new THREE.BoxGeometry(16, 0.3, 0.3), darkSteel);
    bar.position.set(0, trussY - 1.2, 0);
    bar.rotation.y = a;
    g.add(bar);
  }

  return g;
}
