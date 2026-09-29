import * as THREE from 'three';
import { POSES } from './sprites.js';

// Scale factor: 2D pixels → 3D units (2D ring is ~320px wide, 3D ring is 14 units)
const SCALE = 14 / 280;

function colorMat(hex, emissiveHex = null, emissiveInt = 0) {
  const base = new THREE.Color(hex);
  const hsl = {}; base.getHSL(hsl);
  if (hsl.l > 0.62) base.setHSL(hsl.h, hsl.s, 0.62);
  if (hsl.l < 0.22) base.setHSL(hsl.h, Math.max(hsl.s, 0.25), 0.22);
  return new THREE.MeshStandardMaterial({
    color: base,
    emissive: new THREE.Color(emissiveHex || 0x000000),
    emissiveIntensity: emissiveHex ? emissiveInt : 0,
    roughness: 0.55,
    metalness: 0.05,
  });
}

export class Wrestler3D {
  constructor(palette, scene) {
    this.palette = palette;
    this.group = new THREE.Group();
    this._build();
    // Bigger than life so they read from the broadcast camera.
    this.root = new THREE.Group();
    this.root.add(this.group);
    this.root.scale.setScalar(2.2);
    scene.add(this.root);
  }

  _build() {
    const P = this.palette;

    // Torso
    this.torso = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.75, 0.4),
      colorMat(P.n)
    );
    this.torso.castShadow = true;
    this.torso.receiveShadow = true;

    // Stripe on torso
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.18, 0.41),
      colorMat(P.g)
    );
    stripe.position.y = 0.18;
    this.torso.add(stripe);

    // Belt
    this.belt = new THREE.Mesh(
      new THREE.BoxGeometry(0.74, 0.12, 0.42),
      colorMat(P.p, P.p, 0.35)
    );
    this.belt.position.y = -0.3;
    this.torso.add(this.belt);

    // Head
    this.head = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.45, 0.38),
      colorMat(P.c)
    );
    this.head.castShadow = true;
    // Eye band
    const eyeBand = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.12, 0.39),
      colorMat(P.m, P.m, 0.5)
    );
    eyeBand.position.y = 0.05;
    this.head.add(eyeBand);
    // Eye whites
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.07, 0.4), colorMat('#E5E5E5'));
    eyeL.position.set(0.1, 0.05, 0);
    this.head.add(eyeL);
    const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.07, 0.4), colorMat('#E5E5E5'));
    eyeR.position.set(-0.1, 0.05, 0);
    this.head.add(eyeR);

    // Front arm
    this.fArm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.1, 0.45, 4, 6),
      colorMat(P.c)
    );
    this.fArm.castShadow = true;

    // Back arm
    this.bArm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.09, 0.42, 4, 6),
      colorMat(P.t || P.c)
    );
    this.bArm.castShadow = true;

    // Front leg
    this.fLeg = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.12, 0.55, 4, 6),
      colorMat(P.n)
    );
    this.fLeg.castShadow = true;

    // Back leg
    this.bLeg = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.11, 0.52, 4, 6),
      colorMat(P.N || P.n)
    );
    this.bLeg.castShadow = true;

    // Front boot
    this.fBoot = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.18, 0.32),
      colorMat(P.m, P.m, 0.15)
    );
    this.fBoot.castShadow = true;

    // Back boot
    this.bBoot = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.16, 0.3),
      colorMat(P.r || P.m)
    );
    this.bBoot.castShadow = true;

    // Assemble
    this.group.add(this.bArm);
    this.group.add(this.bLeg);
    this.group.add(this.bBoot);
    this.group.add(this.torso);
    this.group.add(this.fLeg);
    this.group.add(this.fBoot);
    this.group.add(this.fArm);
    this.group.add(this.head);

    this._setIdlePose();
  }

  _setIdlePose() {
    // Torso upright at hip height
    this.torso.position.set(0, 1.05, 0);
    this.torso.rotation.set(0, 0, 0);

    // Head on top of torso
    this.head.position.set(0, 1.72, 0);
    this.head.rotation.set(0, 0, 0);

    // Arms
    this.fArm.position.set(0.48, 1.1, 0);
    this.fArm.rotation.set(0, 0, -0.2);
    this.bArm.position.set(-0.48, 1.08, 0);
    this.bArm.rotation.set(0, 0, 0.2);

    // Legs
    this.fLeg.position.set(0.2, 0.45, 0);
    this.fLeg.rotation.set(0, 0, 0.05);
    this.bLeg.position.set(-0.2, 0.43, 0);
    this.bLeg.rotation.set(0, 0, -0.05);

    // Boots
    this.fBoot.position.set(0.2, 0.05, 0.04);
    this.fBoot.rotation.set(0.2, 0, 0);
    this.bBoot.position.set(-0.2, 0.04, 0.04);
    this.bBoot.rotation.set(0.2, 0, 0);
  }

  /**
   * applyPose maps the 2D sprite pose data to 3D joint positions.
   * pose: string name from POSES
   * facing: 1 (hero, faces right in 3D = +X) | -1 (opp, faces left)
   * lift: pixels up (convert to 3D units)
   */
  applyPose(poseName, facing, lift = 0) {
    const poseData = POSES[poseName] || POSES.idle;
    const liftY = lift * SCALE;
    const f = facing;

    if (poseData.rot === 'flat') {
      this._applyDown(facing, liftY);
      return;
    }

    const hipY = (poseData.hip || 14) * SCALE + liftY;

    // Torso
    const cx = (poseData.chest[0] || 0) * SCALE * f;
    const cy = hipY - (poseData.chest[1] ? Math.abs(poseData.chest[1]) * SCALE : 0.42);
    this.torso.position.set(cx, cy + 0.375, 0);

    // Head
    const hx = cx + (poseData.head[0] || 0) * SCALE * f;
    const hy = cy + (poseData.head[1] ? poseData.head[1] * SCALE : 0) + 0.75 + 0.22;
    this.head.position.set(hx, hy, 0);
    this.head.rotation.set(0, facing < 0 ? Math.PI : 0, 0);

    // Front arm (array: [[shoulder offset], [elbow/hand offset]])
    if (poseData.fArm) {
      const fa0 = poseData.fArm[0], fa1 = poseData.fArm[1];
      const ax = ((fa0[0] + fa1[0]) / 2) * SCALE * f + cx;
      const ay = hipY - ((Math.abs(fa0[1]) + Math.abs(fa1[1])) / 2) * SCALE;
      this.fArm.position.set(ax, ay, 0.08);
      const dx = (fa1[0] - fa0[0]) * f, dy = fa0[1] - fa1[1];
      this.fArm.rotation.set(0, 0, Math.atan2(dx * SCALE, dy * SCALE) * (f > 0 ? -1 : 1));
    }

    // Back arm
    if (poseData.bArm) {
      const ba0 = poseData.bArm[0], ba1 = poseData.bArm[1];
      const ax = ((ba0[0] + ba1[0]) / 2) * SCALE * f + cx;
      const ay = hipY - ((Math.abs(ba0[1]) + Math.abs(ba1[1])) / 2) * SCALE;
      this.bArm.position.set(ax, ay, -0.08);
      const dx = (ba1[0] - ba0[0]) * f, dy = ba0[1] - ba1[1];
      this.bArm.rotation.set(0, 0, Math.atan2(dx * SCALE, dy * SCALE) * (f > 0 ? -1 : 1));
    }

    // Front leg
    if (poseData.fLeg) {
      const fl0 = poseData.fLeg[0], fl1 = poseData.fLeg[1];
      const lx = ((fl0[0] + fl1[0]) / 2) * SCALE * f;
      const ly = hipY - ((Math.abs(fl0[1]) + Math.abs(fl1[1])) / 2) * SCALE + liftY;
      this.fLeg.position.set(lx, Math.max(0.25, ly), 0.06);
      const dx = (fl1[0] - fl0[0]) * f, dy = fl0[1] - fl1[1];
      this.fLeg.rotation.set(0, 0, Math.atan2(dx * SCALE, dy * SCALE) * (f > 0 ? -1 : 1));
      this.fBoot.position.set(fl1[0] * SCALE * f, fl1[1] * SCALE * -1 + liftY + 0.05, 0.1);
    }

    // Back leg
    if (poseData.bLeg) {
      const bl0 = poseData.bLeg[0], bl1 = poseData.bLeg[1];
      const lx = ((bl0[0] + bl1[0]) / 2) * SCALE * f;
      const ly = hipY - ((Math.abs(bl0[1]) + Math.abs(bl1[1])) / 2) * SCALE + liftY;
      this.bLeg.position.set(lx, Math.max(0.22, ly), -0.06);
      const dx = (bl1[0] - bl0[0]) * f, dy = bl0[1] - bl1[1];
      this.bLeg.rotation.set(0, 0, Math.atan2(dx * SCALE, dy * SCALE) * (f > 0 ? -1 : 1));
      this.bBoot.position.set(bl1[0] * SCALE * f, bl1[1] * SCALE * -1 + liftY + 0.04, -0.1);
    }
  }

  _applyDown(facing, liftY) {
    // Lay flat on the mat
    const f = facing;
    this.torso.position.set(0, 0.2, 0);
    this.torso.rotation.set(0, facing < 0 ? Math.PI : 0, Math.PI / 2);
    this.head.position.set(f * 0.6, 0.18, 0);
    this.head.rotation.set(Math.PI / 2, 0, 0);
    this.fArm.position.set(f * 0.1, 0.14, 0.25);
    this.fArm.rotation.set(Math.PI / 2, 0, 0.3 * f);
    this.bArm.position.set(f * 0.1, 0.14, -0.25);
    this.bArm.rotation.set(Math.PI / 2, 0, -0.3 * f);
    this.fLeg.position.set(-f * 0.35, 0.14, 0.15);
    this.fLeg.rotation.set(Math.PI / 2, 0, 0);
    this.bLeg.position.set(-f * 0.35, 0.14, -0.15);
    this.bLeg.rotation.set(Math.PI / 2, 0, 0);
    this.fBoot.position.set(-f * 0.72, 0.14, 0.15);
    this.fBoot.rotation.set(Math.PI / 2, 0, 0);
    this.bBoot.position.set(-f * 0.72, 0.14, -0.15);
    this.bBoot.rotation.set(Math.PI / 2, 0, 0);
  }

  setPosition(x3d, z3d) {
    this.root.position.set(x3d, 0, z3d);
  }

  flash(on) {
    for (const mesh of [this.torso, this.head, this.fArm, this.bArm, this.fLeg, this.bLeg]) {
      const m = mesh.material;
      if (!m.userData.base) m.userData.base = { c: m.emissive.clone(), i: m.emissiveIntensity };
      if (on) { m.emissive.set('#ffffff'); m.emissiveIntensity = 0.8; }
      else { m.emissive.copy(m.userData.base.c); m.emissiveIntensity = m.userData.base.i; }
    }
  }
}
