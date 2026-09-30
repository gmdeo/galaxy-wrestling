// Galaxy Wrestling — skinned, fully articulated wrestler.
//
// Mesh: Quaternius "Superhero Male" (CC0), 7.3k-vertex sculpted body with real muscle
// topology, skinned to a 65-bone UE5-style skeleton (pelvis, 3 spine, neck, head,
// clavicles, two-bone arms and legs, 5-finger hands).
//
// Posing: stage.js still decides WHICH pose is shown. Each 2D pose from sprites.js is
// read as intent (spine lean, head nod, hand and foot targets) and solved in 3D:
//   - spine lean distributed over spine_01..03, head nod on neck/Head
//   - arms and legs solved by analytic two-bone IK with pole vectors
//   - feet kept flat on the canvas, fingers curled into fists
// Pose numbers are blended every frame so transitions are smooth, not snapped.
//
// Costume: a shader "paints" the singlet, straps, belt, knee/elbow pads, boots, tape,
// gloves and luchador mask onto the body using bind-pose coordinates, so the fabric
// moves with the skin exactly.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { POSES } from './sprites.js';
import { HERO_PALETTE, HERO_PARTS, RUGPULL_PARTS } from './palette.js';

type Vec2 = [number, number];
interface PoseDef {
  rot?: string;
  hip?: number;
  chest?: Vec2;
  head?: Vec2;
  fArm?: [Vec2, Vec2];
  bArm?: [Vec2, Vec2];
  fLeg?: [Vec2, Vec2];
  bLeg?: [Vec2, Vec2];
}
type Palette = Record<string, string>;
type Parts = Record<string, string>;

const POSE_TABLE = POSES as unknown as Record<string, PoseDef>;
const MODEL_URL = `${import.meta.env.BASE_URL}models/wrestler.glb`;

const WORLD_PER_PX = 0.075;          // must match PX in main.js
const RIG_SCALE = 1.25;              // 1.81 m model -> 2.26 world units (ring is ~11)
const YAW_OPEN = 0.30;               // turn the chest toward the camera (broadcast 3/4 view)
const BLEND_RATE = 16;               // pose smoothing, 1/s

// ---------- shared asset ----------
let assetPromise: Promise<THREE.Object3D> | null = null;
export function preloadWrestlers(): Promise<THREE.Object3D> {
  if (!assetPromise) {
    assetPromise = new GLTFLoader().loadAsync(MODEL_URL).then((g) => g.scene);
  }
  return assetPromise;
}

// ---------- pose vector (flattened so it can be blended) ----------
const POSE_LEN = 23;
function poseToVec(p: PoseDef, out: Float32Array): Float32Array {
  const d = POSE_TABLE.idle;
  const g = <T>(v: T | undefined, fb: T): T => (v === undefined ? fb : v);
  const chest = g(p.chest, d.chest!), head = g(p.head, d.head!);
  const fa = g(p.fArm, d.fArm!), ba = g(p.bArm, d.bArm!);
  const fl = g(p.fLeg, d.fLeg!), bl = g(p.bLeg, d.bLeg!);
  const src = [
    g(p.hip, 14), chest[0], chest[1], head[0], head[1],
    fa[0][0], fa[0][1], fa[1][0], fa[1][1],
    ba[0][0], ba[0][1], ba[1][0], ba[1][1],
    fl[0][0], fl[0][1], fl[1][0], fl[1][1],
    bl[0][0], bl[0][1], bl[1][0], bl[1][1],
    0, 0,
  ];
  for (let i = 0; i < POSE_LEN; i++) out[i] = src[i];
  return out;
}

// ---------- costume shader ----------
const REGION_GLSL = /* glsl */ `
uniform vec3 uSkin, uSinglet, uPanel, uPads, uBoots, uLaces, uGloves, uMask, uSeam, uEye, uBelt;
uniform float uFlash;
varying vec3 vBind;
float gRough;
vec3 gEmit;

vec3 costume(vec3 p) {
  float ax = abs(p.x);
  float y = p.y;
  gRough = 0.52;
  gEmit = vec3(0.0);
  vec3 col = uSkin;

  // ---- arms (bind pose is a T-pose, so arms run along x) ----
  if (ax > 0.25 && y > 1.20) {
    if (ax > 0.745) { gRough = 0.42; return uGloves; }                  // fingerless gloves
    if (ax > 0.655) { gRough = 0.75; return vec3(0.90, 0.90, 0.88); }    // wrist tape
    if (ax > 0.425 && ax < 0.505) { gRough = 0.40; return uPads; }       // elbow pads
    return col;
  }

  // ---- head: luchador mask ----
  if (y > 1.565) {
    gRough = 0.30;
    col = uMask;
    if (ax < 0.010 && p.z < 0.07) col = uSeam;                           // crown seam
    if (p.z > 0.030 && y > 1.655 && y < 1.745 && ax > 0.010 && ax < 0.072) {
      col = uEye; gEmit = uEye * 0.25;                                   // eye panels
    }
    if (p.z > 0.055 && y < 1.625) { col = uSkin; gRough = 0.55; }        // open chin
    return col;
  }

  // ---- singlet: straps, scoop neck, body, side panels, shorts ----
  bool strap = y > 1.33 && y < 1.52 && ax > 0.055 && ax < 0.135;
  bool body  = y > 0.70 && y <= 1.36;
  if (body && p.z > 0.02 && y > 1.24 && ax < 0.085) body = false;         // scoop neck
  if (strap || body) {
    gRough = 0.30;                                                       // lycra sheen
    col = uSinglet;
    if (ax > 0.150 && y > 0.90) col = uPanel;                             // side panels
    if (y < 0.90 && ax > 0.175) col = uPanel;                             // shorts stripe
    if (y > 0.965 && y < 1.035) { col = uBelt; gRough = 0.25; gEmit = uBelt * 0.35; }
    return col;
  }

  // ---- legs ----
  if (y > 0.415 && y < 0.565) { gRough = 0.40; return uPads; }            // knee pads
  if (y < 0.415) {
    gRough = 0.28;                                                       // patent boots
    col = uBoots;
    if (y > 0.375) col = uLaces;                                         // boot cuff
    if (p.z > 0.035 && y > 0.10 && y < 0.37 && fract(y * 42.0) < 0.35) col = uLaces; // laces
    if (y < 0.035) { col = vec3(0.05); gRough = 0.8; }                   // sole
    return col;
  }
  return col;
}
`;

function makeCostumeMaterial(pal: Palette, parts: Parts, skinHex: string) {
  const c = (k: string, fb = '#888888') => new THREE.Color(pal[parts[k]] || pal[k] || fb);
  const uniforms: Record<string, THREE.IUniform> = {
    uSkin:    { value: new THREE.Color(skinHex) },
    uSinglet: { value: c('trunks') },
    uPanel:   { value: c('tights') },
    uPads:    { value: c('pads') },
    uBoots:   { value: c('boots') },
    uLaces:   { value: c('laces') },
    uGloves:  { value: c('gloves') },
    uMask:    { value: new THREE.Color(pal.c) },
    uSeam:    { value: new THREE.Color(pal.t) },
    uEye:     { value: new THREE.Color(pal.m) },
    uBelt:    { value: c('belt') },
    uFlash:   { value: 0 },
  };
  const m = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.02 });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vBind;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBind = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\n${REGION_GLSL}`)
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );',
        'vec3 gCol = costume(vBind);\nvec4 diffuseColor = vec4( gCol, opacity );')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = gRough;')
      .replace('#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\ntotalEmissiveRadiance += gEmit + vec3(uFlash * 0.16);');
  };
  m.customProgramCacheKey = () => 'wrestler-costume';
  return { material: m, uniforms };
}

// ---------- math scratch ----------
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();
const _v4 = new THREE.Vector3(), _v5 = new THREE.Vector3();
const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion();

/** Apply a world-space rotation to a bone whose parent may itself be rotated. */
function rotateWorld(bone: THREE.Object3D, qWorld: THREE.Quaternion) {
  bone.parent!.getWorldQuaternion(_q1);
  bone.getWorldQuaternion(_q2);
  _q3.copy(qWorld).multiply(_q2);                  // new world orientation
  bone.quaternion.copy(_q1.invert().multiply(_q3));
  bone.updateMatrixWorld(true);
}

/** Set a bone's world orientation directly. */
function setWorldQuat(bone: THREE.Object3D, qWorld: THREE.Quaternion) {
  bone.parent!.getWorldQuaternion(_q1);
  bone.quaternion.copy(_q1.invert().multiply(qWorld));
  bone.updateMatrixWorld(true);
}

/**
 * Analytic two-bone IK (law of cosines) in world space.
 * A = upper bone (upperarm/thigh), B = mid (lowerarm/calf), C = end (hand/foot).
 * pole = world point the elbow/knee should bend toward.
 */
function solveTwoBone(A: THREE.Bone, B: THREE.Bone, C: THREE.Bone, target: THREE.Vector3, pole: THREE.Vector3) {
  const a = A.getWorldPosition(_v1);
  const b = B.getWorldPosition(_v2);
  const c = C.getWorldPosition(_v3);
  const la = a.distanceTo(b), lb = b.distanceTo(c);

  const toT = _v4.subVectors(target, a);
  const d = THREE.MathUtils.clamp(toT.length(), Math.abs(la - lb) + 1e-3, (la + lb) * 0.999);
  const dir = toT.normalize();

  // bend direction: pole projected onto the plane perpendicular to dir
  const bend = _v5.subVectors(pole, a);
  bend.addScaledVector(dir, -bend.dot(dir));
  if (bend.lengthSq() < 1e-8) bend.subVectors(b, a).addScaledVector(dir, -_v2.clone().sub(a).dot(dir));
  bend.normalize();

  const cosA = THREE.MathUtils.clamp((la * la + d * d - lb * lb) / (2 * la * d), -1, 1);
  const sinA = Math.sqrt(1 - cosA * cosA);
  const bDes = new THREE.Vector3().copy(a).addScaledVector(dir, la * cosA).addScaledVector(bend, la * sinA);

  // upper bone: current (b - a) -> desired (bDes - a)
  const cur = new THREE.Vector3().subVectors(b, a).normalize();
  const want = new THREE.Vector3().subVectors(bDes, a).normalize();
  rotateWorld(A, new THREE.Quaternion().setFromUnitVectors(cur, want));

  // mid bone: current (c - b) -> desired (target - bDes)
  const b2 = B.getWorldPosition(new THREE.Vector3());
  const c2 = C.getWorldPosition(new THREE.Vector3());
  const tDes = new THREE.Vector3().copy(a).addScaledVector(dir, d);
  const cur2 = c2.sub(b2).normalize();
  const want2 = tDes.sub(b2).normalize();
  rotateWorld(B, new THREE.Quaternion().setFromUnitVectors(cur2, want2));
}

/** Soft radial contact shadow so feet read as planted on the canvas. */
let shadowTex: THREE.CanvasTexture | null = null;
function makeContactShadow(): THREE.Mesh {
  if (!shadowTex) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d')!;
    const grd = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    grd.addColorStop(0, 'rgba(0,0,0,0.75)');
    grd.addColorStop(0.5, 'rgba(0,0,0,0.35)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    shadowTex = new THREE.CanvasTexture(c);
  }
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 0.95),
    new THREE.MeshBasicMaterial({
      map: shadowTex, transparent: true, depthWrite: false, depthTest: true,
      blending: THREE.NormalBlending, opacity: 0.9,
    }),
  );
  m.rotation.x = -Math.PI / 2;
  // The ring canvas top is exactly the root's y, so the blob must sit a hair
  // ABOVE it — anything negative is buried inside the mat box and never renders.
  m.position.y = 0.012;
  m.renderOrder = 1;
  return m;
}

interface Limb { a: THREE.Bone; b: THREE.Bone; c: THREE.Bone; len: number; side: 1 | -1 }

export class Wrestler3D {
  readonly root = new THREE.Group();   // world placement (main.js sets position)
  readonly body = new THREE.Group();   // lift / roll / lie-flat pivot (world units)
  readonly rig = new THREE.Group();    // facing yaw + scale, contains the skinned model
  ready = false;

  private P: Palette;
  private parts: Parts;
  private uniforms: Record<string, THREE.IUniform> | null = null;
  private bones: Record<string, THREE.Bone> = {};
  private rest = new Map<THREE.Bone, THREE.Quaternion>();
  private restPelvisPos = new THREE.Vector3();
  private restPelvisModelY = 0.95;
  private restFootModelQuat: Record<string, THREE.Quaternion> = {};
  private arms!: Record<'l' | 'r', Limb>;
  private legs!: Record<'l' | 'r', Limb>;
  private cur = new Float32Array(POSE_LEN);
  private tgt = new Float32Array(POSE_LEN);
  private lastPose = '';
  private lastT = 0;
  private flat = false;
  private facing = 1;

  constructor(palette: Palette, scene: THREE.Scene) {
    this.P = palette;
    this.parts = palette === HERO_PALETTE ? HERO_PARTS : RUGPULL_PARTS;
    this.root.add(this.body);
    this.body.add(this.rig);
    this.rig.scale.setScalar(RIG_SCALE);
    this.root.add(makeContactShadow());
    scene.add(this.root);
    poseToVec(POSE_TABLE.idle, this.cur);
    preloadWrestlers().then((src) => this.attach(src));
  }

  private attach(src: THREE.Object3D) {
    const model = SkeletonUtils.clone(src);
    const skinHex = this.P === HERO_PALETTE ? '#b98060' : '#7d4e33';
    const { material, uniforms } = makeCostumeMaterial(this.P, this.parts, skinHex);
    this.uniforms = uniforms;
    const eyeMat = new THREE.MeshStandardMaterial({
      color: this.P.w || '#e5e5e5', roughness: 0.25, emissive: new THREE.Color(this.P.m), emissiveIntensity: 0.25,
    });
    model.traverse((o) => {
      const m = o as THREE.SkinnedMesh;
      if (m.isSkinnedMesh || (o as THREE.Mesh).isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
        m.frustumCulled = false;
        // Match on the runtime name AND the geometry name: GLTFLoader stores the
        // mesh definition name on the geometry, and a name test that misses means
        // every mesh silently shares the costume material.
        const nm = `${o.name} ${(o as THREE.Mesh).geometry?.name ?? ''}`;
        m.material = /Eye/i.test(nm) || /Face/i.test(nm) ? eyeMat : material;
      }
      if ((o as THREE.Bone).isBone) this.bones[o.name] = o as THREE.Bone;
    });
    this.rig.add(model);
    for (const b of Object.values(this.bones)) this.rest.set(b, b.quaternion.clone());
    const pelvis = this.bones.pelvis;
    this.restPelvisPos.copy(pelvis.position);

    this.rig.updateMatrixWorld(true);
    this.restPelvisModelY = this.toModel(pelvis.getWorldPosition(new THREE.Vector3())).y;
    const rigQ = this.rig.getWorldQuaternion(new THREE.Quaternion()).invert();
    for (const s of ['l', 'r']) {
      this.restFootModelQuat[s] = rigQ.clone().multiply(this.bones[`foot_${s}`].getWorldQuaternion(new THREE.Quaternion()));
    }
    const limb = (a: string, b: string, c: string, side: 1 | -1): Limb => {
      const A = this.bones[a], B = this.bones[b], C = this.bones[c];
      const pa = A.getWorldPosition(new THREE.Vector3()), pb = B.getWorldPosition(new THREE.Vector3());
      const pc = C.getWorldPosition(new THREE.Vector3());
      return { a: A, b: B, c: C, side, len: (pa.distanceTo(pb) + pb.distanceTo(pc)) / RIG_SCALE };
    };
    // model faces +Z; its left side is +X
    this.arms = { l: limb('upperarm_l', 'lowerarm_l', 'hand_l', 1), r: limb('upperarm_r', 'lowerarm_r', 'hand_r', -1) };
    this.legs = { l: limb('thigh_l', 'calf_l', 'foot_l', 1), r: limb('thigh_r', 'calf_r', 'foot_r', -1) };
    this.ready = true;
  }

  // model-space <-> world helpers (model space: +Z forward, +Y up, +X = left side)
  private toModel(v: THREE.Vector3) { return this.rig.worldToLocal(v); }
  private toWorld(v: THREE.Vector3) { return this.rig.localToWorld(v); }

  private resetBones() {
    for (const [b, q] of this.rest) b.quaternion.copy(q);
    this.bones.pelvis.position.copy(this.restPelvisPos);
  }

  /** Curl fingers into a fist (rotation about each finger bone's own bend axis). */
  private makeFists() {
    for (const s of ['l', 'r']) {
      for (const f of ['index', 'middle', 'ring', 'pinky']) {
        for (const n of ['01', '02', '03']) {
          const b = this.bones[`${f}_${n}_${s}`];
          if (b) b.rotateZ(s === 'l' ? -1.25 : 1.25);
        }
      }
      const t = this.bones[`thumb_02_${s}`];
      if (t) t.rotateZ(-0.6);
    }
  }

  applyPose(poseName: string, facing = 1, lift = 0) {
    const f = facing >= 0 ? 1 : -1;
    const pose = POSE_TABLE[poseName] || POSE_TABLE.idle;
    this.facing = f;
    if (!this.ready) return;

    // ---- blend pose numbers toward the target (smooth, frame-rate independent) ----
    const now = performance.now() / 1000;
    const dt = this.lastT ? Math.min(0.1, now - this.lastT) : 1;
    this.lastT = now;
    const isFlat = pose.rot === 'flat';
    poseToVec(isFlat ? POSE_TABLE.idle : pose, this.tgt);
    const snap = isFlat !== this.flat || !this.lastPose;
    const k = snap ? 1 : 1 - Math.exp(-BLEND_RATE * dt);
    for (let i = 0; i < POSE_LEN; i++) this.cur[i] += (this.tgt[i] - this.cur[i]) * k;
    this.lastPose = poseName;
    this.flat = isFlat;
    const v = this.cur;
    const hip = v[0], chest: Vec2 = [v[1], v[2]], head: Vec2 = [v[3], v[4]];
    const fArm: [Vec2, Vec2] = [[v[5], v[6]], [v[7], v[8]]];
    const bArm: [Vec2, Vec2] = [[v[9], v[10]], [v[11], v[12]]];
    const fLeg: [Vec2, Vec2] = [[v[13], v[14]], [v[15], v[16]]];
    const bLeg: [Vec2, Vec2] = [[v[17], v[18]], [v[19], v[20]]];

    // ---- orientation ----
    this.body.position.set(0, lift * WORLD_PER_PX, 0);
    this.body.rotation.set(0, 0, 0);
    this.rig.rotation.set(0, f * (Math.PI / 2 - (isFlat ? 0 : YAW_OPEN)), 0);
    this.rig.updateMatrixWorld(true);
    this.resetBones();
    this.rig.updateMatrixWorld(true);

    // front limb = the side nearest the camera
    const front: 'l' | 'r' = f > 0 ? 'r' : 'l';
    const back: 'l' | 'r' = f > 0 ? 'l' : 'r';

    // ---- pelvis height (squats, kneels) with a breathing bob ----
    const breathe = Math.sin(now * 2.2 + (f > 0 ? 0 : 1.3)) * 0.008;
    const pelvisY = this.restPelvisModelY * THREE.MathUtils.clamp(hip / 14, 0.45, 1.05) * 0.94;
    const pelvis = this.bones.pelvis;
    const pw = this.toWorld(new THREE.Vector3(0, pelvisY + breathe, chest[0] * 0.012));
    pelvis.position.copy(pelvis.parent!.worldToLocal(pw));
    pelvis.updateMatrixWorld(true);

    // ---- spine lean + head nod (about the model's +X axis; + = forward) ----
    const lean = Math.atan2(chest[0], Math.max(1, -chest[1]));
    const rigQ = this.rig.getWorldQuaternion(new THREE.Quaternion());
    const axis = new THREE.Vector3(1, 0, 0).applyQuaternion(rigQ);
    const spineShare: Array<[string, number]> = [['spine_01', 0.3], ['spine_02', 0.3], ['spine_03', 0.4]];
    for (const [n, s] of spineShare) rotateWorld(this.bones[n], new THREE.Quaternion().setFromAxisAngle(axis, lean * s));
    const nod = THREE.MathUtils.clamp((head[0] - chest[0] * 0.3) * 0.05 + head[1] * 0.07, -0.6, 0.8);
    rotateWorld(this.bones.neck_01, new THREE.Quaternion().setFromAxisAngle(axis, nod * 0.5));
    rotateWorld(this.bones.Head, new THREE.Quaternion().setFromAxisAngle(axis, nod * 0.5));

    // ---- shoulder twist into strikes (about world Y) ----
    const reachPx = fArm[1][0] - fArm[0][0] + fArm[0][0] * 0.35;
    const twist = THREE.MathUtils.clamp((reachPx - 3) * 0.055, -0.2, 0.5) * -f;
    const yAxis = new THREE.Vector3(0, 1, 0);
    rotateWorld(this.bones.spine_02, new THREE.Quaternion().setFromAxisAngle(yAxis, twist * 0.45));
    rotateWorld(this.bones.spine_03, new THREE.Quaternion().setFromAxisAngle(yAxis, twist * 0.55));

    // ---- arms: two-bone IK toward hand targets ----
    // Arm targets live in WORLD space on the ring's action axis (+X toward the
    // opponent), so punches and grapples travel across the ring, not at the camera.
    const armFrom = (limb: Limb, j: [Vec2, Vec2], isFront: boolean) => {
      const sh = limb.a.getWorldPosition(new THREE.Vector3());
      const reach = limb.len * RIG_SCALE;         // world arm length
      const A = reach / 7.5;                      // 7.5 px of sprite arm = full reach
      const dx = j[1][0] - j[0][0], dy = j[1][1] - j[0][1];
      // sprite shoulder x tells us whether the arm is thrown forward or back
      const fwd = (dx + j[0][0] * 0.35) * A;
      const zOut = (isFront ? 1 : -1) * (0.20 + Math.max(0, dy) * 0.012);
      const tgt = new THREE.Vector3(sh.x + f * fwd, sh.y - dy * A, sh.z + zOut);
      tgt.y = Math.max(tgt.y, this.root.position.y + 0.25);
      // elbows point down and back (behind the body, away from the target)
      const pole = new THREE.Vector3(sh.x - f * 0.6, sh.y - 0.8, sh.z + zOut * 2.5);
      solveTwoBone(limb.a, limb.b, limb.c, tgt, pole);
    };
    armFrom(this.arms[front], fArm, true);
    armFrom(this.arms[back], bArm, false);

    // ---- legs: two-bone IK toward foot targets, feet kept flat ----
    const S = this.restPelvisModelY / 14;          // vertical px -> model units
    const legFrom = (limb: Limb, j: [Vec2, Vec2], s: 'l' | 'r', isFront: boolean) => {
      const hipW = limb.a.getWorldPosition(new THREE.Vector3());
      const footUp = Math.max(0, (hip - j[1][1]) * S) * RIG_SCALE;
      const baseY = this.body.getWorldPosition(new THREE.Vector3()).y;
      const tgt = new THREE.Vector3(
        this.root.position.x + f * j[1][0] * 0.062,
        baseY + (0.095 + footUp) * RIG_SCALE,
        hipW.z + (isFront ? 0.04 : -0.04),
      );
      // knees bend forward (toward the facing direction)
      const pole = new THREE.Vector3(hipW.x + f * 1.5, hipW.y - 0.4, hipW.z);
      solveTwoBone(limb.a, limb.b, limb.c, tgt, pole);
      setWorldQuat(limb.c, rigQ.clone().multiply(this.restFootModelQuat[s]));
    };
    legFrom(this.legs[front], fLeg, front, true);
    legFrom(this.legs[back], bLeg, back, false);

    this.makeFists();

    // ---- lying on the canvas: tip the whole body backward about world Z ----
    if (isFlat) {
      this.body.rotation.z = f * Math.PI / 2;
      this.body.position.set(f * 1.1, 0.2 + lift * WORLD_PER_PX, 0);
    }
  }

  /** stage.js spins a body (rot 90/180/270) during slams and carries. Pivot at mid-body. */
  setRoll(deg: number) {
    if (!deg) return;
    const th = -(deg * Math.PI / 180) * this.facing;
    const h = 1.1;
    this.body.rotation.z = th;
    this.body.position.x += h * Math.sin(th);
    this.body.position.y += h - h * Math.cos(th);
  }

  resetBody() {
    this.body.rotation.set(0, 0, 0);
    this.body.position.set(0, 0, 0);
  }

  setPosition(x3d: number, z3d: number) {
    this.root.position.set(x3d, 0, z3d);
  }

  flash(on: boolean) {
    if (this.uniforms) this.uniforms.uFlash.value = on ? 1 : 0;
  }
}
