import * as THREE from 'three';
import { CatmullRomCurve3, TubeGeometry } from 'three';

function makeMatTexture() {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const g = c.getContext('2d');

  // Base mat color
  g.fillStyle = '#e2e4f2';
  g.fillRect(0, 0, size, size);

  // Grey stripes
  for (let i = 0; i < size; i += 42) {
    g.fillStyle = i % 84 < 42 ? '#d0d4e8' : '#c8cce0';
    g.fillRect(0, i, size, 2);
  }

  // Cyan ellipse logo
  g.save();
  g.translate(size / 2, size / 2);
  g.scale(1, 0.55);
  g.beginPath();
  g.arc(0, 0, 140, 0, Math.PI * 2);
  g.strokeStyle = '#35BDD2';
  g.lineWidth = 14;
  g.stroke();
  g.beginPath();
  g.arc(0, 0, 110, 0, Math.PI * 2);
  g.strokeStyle = 'rgba(53,189,210,0.3)';
  g.lineWidth = 6;
  g.stroke();
  g.restore();

  // $WRESTLER text
  g.save();
  g.translate(size / 2, size / 2 + 14);
  g.fillStyle = '#35BDD2';
  g.font = 'bold 38px monospace';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('$WRESTLER', 0, 0);
  g.restore();

  const tex = new THREE.CanvasTexture(c);
  return tex;
}

function makeBannerTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#0b1238';
  g.fillRect(0, 0, 512, 64);
  g.strokeStyle = '#D10A7A';
  g.lineWidth = 2;
  g.strokeRect(1, 1, 510, 62);
  g.fillStyle = '#F02E98';
  g.font = 'bold 36px monospace';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('$WRESTLER GALAXY', 256, 32);
  return new THREE.CanvasTexture(c);
}

export function buildRing(scene) {
  const group = new THREE.Group();

  // Mat
  const matTex = makeMatTexture();
  const mat = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 14),
    new THREE.MeshLambertMaterial({ map: matTex })
  );
  mat.rotation.x = -Math.PI / 2;
  mat.receiveShadow = true;
  group.add(mat);

  // Apron
  const apron = new THREE.Mesh(
    new THREE.BoxGeometry(16, 0.3, 16),
    new THREE.MeshLambertMaterial({ color: 0x0b1238 })
  );
  apron.position.y = -0.15;
  apron.receiveShadow = true;
  group.add(apron);

  // Floor under apron
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshLambertMaterial({ color: 0x070a1c })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.31;
  floor.receiveShadow = true;
  group.add(floor);

  // Cyan apron edge strip
  const edgeStrip = new THREE.Mesh(
    new THREE.BoxGeometry(16.1, 0.05, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x35bdd2, emissive: 0x35bdd2, emissiveIntensity: 0.8 })
  );
  edgeStrip.position.set(0, -0.02, 8.06);
  group.add(edgeStrip);

  // Front apron banner
  const bannerTex = makeBannerTexture();
  const banner = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 0.9),
    new THREE.MeshStandardMaterial({ map: bannerTex, emissiveMap: bannerTex, emissive: new THREE.Color(0.4, 0.1, 0.3) })
  );
  banner.position.set(0, -0.05, 8.01);
  group.add(banner);

  // 4 corner posts
  const postMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
  const padMat = new THREE.MeshStandardMaterial({
    color: 0x220033,
    emissive: 0xd10a7a,
    emissiveIntensity: 1.2
  });
  const corners = [[-7, -7], [7, -7], [-7, 7], [7, 7]];
  for (const [px, pz] of corners) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 5.5, 8), postMat);
    post.position.set(px, 2.45, pz);
    post.castShadow = true;
    group.add(post);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.35, 8), padMat);
    pad.position.set(px, 5.25, pz);
    group.add(pad);
  }

  // Ropes: 3 per side, heights 1.5 / 2.5 / 3.5
  const ropeColors = [
    { color: 0xd10a7a, emissive: 0xd10a7a, intensity: 0.55 }, // bottom: magenta
    { color: 0xb8bcd0, emissive: 0x000000, intensity: 0 }, // middle: white
    { color: 0x35bdd2, emissive: 0x35bdd2, intensity: 0.35 }, // top: cyan
  ];
  const ropeHeights = [1.5, 2.5, 3.5];

  for (let ri = 0; ri < 3; ri++) {
    const y = ropeHeights[ri];
    const sag = 0.12;
    const rc = ropeColors[ri];
    const ropeMat = new THREE.MeshStandardMaterial({
      color: rc.color,
      emissive: rc.emissive,
      emissiveIntensity: rc.intensity
    });

    // 4 sides
    const sides = [
      { pts: [new THREE.Vector3(-7, y, -7), new THREE.Vector3(0, y - sag, -7), new THREE.Vector3(7, y, -7)] },
      { pts: [new THREE.Vector3(-7, y, 7), new THREE.Vector3(0, y - sag, 7), new THREE.Vector3(7, y, 7)] },
      { pts: [new THREE.Vector3(-7, y, -7), new THREE.Vector3(-7, y - sag, 0), new THREE.Vector3(-7, y, 7)] },
      { pts: [new THREE.Vector3(7, y, -7), new THREE.Vector3(7, y - sag, 0), new THREE.Vector3(7, y, 7)] },
    ];
    for (const side of sides) {
      const curve = new CatmullRomCurve3(side.pts);
      const tube = new THREE.Mesh(new TubeGeometry(curve, 20, 0.04, 6, false), ropeMat);
      tube.castShadow = true;
      group.add(tube);
    }
  }

  scene.add(group);
  return group;
}
