import * as THREE from 'three';
import { buildFanSprites, FAN_IDS } from './crowd.js';

let _sprites = null;
function getSprites() {
  if (!_sprites) _sprites = buildFanSprites();
  return _sprites;
}

function canvasToTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  return tex;
}

export function buildCrowd(scene) {
  const sprites = getSprites();
  const group = new THREE.Group();

  // 4 tiered rows: behind, left, right, front (partial)
  // Row config: [z offset, y offset, x-range, count, scale]
  const rows = [
    { z: -14, y: 3.5, xRange: 22, count: 28, scale: 0.6 },
    { z: -12, y: 2.8, xRange: 20, count: 24, scale: 0.65 },
    { z: -10, y: 2.2, xRange: 18, count: 20, scale: 0.7 },
    { z: -8,  y: 1.7, xRange: 16, count: 18, scale: 0.75 },
  ];

  // LCG for determinism
  let s = 7;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);

  for (const row of rows) {
    for (let i = 0; i < row.count; i++) {
      const fanId = FAN_IDS[Math.floor(r() * FAN_IDS.length)];
      const canvas = sprites[fanId];
      const tex = canvasToTexture(canvas);
      const aspect = canvas.width / canvas.height;
      const w = row.scale * aspect;
      const h = row.scale;

      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        alphaTest: 0.1,
        side: THREE.FrontSide,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);

      const x = (r() - 0.5) * row.xRange;
      const y = row.y + (r() - 0.5) * 0.3;
      const z = row.z + (r() - 0.5) * 1.2;

      mesh.position.set(x, y, z);
      // Face toward camera (roughly)
      mesh.lookAt(x, y, 22);
      group.add(mesh);
    }
  }

  // Side sections (left/right walls)
  const sideRows = [
    { x: -14, y: 2.5, zRange: 12, count: 14, scale: 0.65 },
    { x: -12, y: 2.0, zRange: 10, count: 12, scale: 0.7 },
    { x: 14,  y: 2.5, zRange: 12, count: 14, scale: 0.65 },
    { x: 12,  y: 2.0, zRange: 10, count: 12, scale: 0.7 },
  ];

  for (const row of sideRows) {
    for (let i = 0; i < row.count; i++) {
      const fanId = FAN_IDS[Math.floor(r() * FAN_IDS.length)];
      const canvas = sprites[fanId];
      const tex = canvasToTexture(canvas);
      const aspect = canvas.width / canvas.height;
      const w = row.scale * aspect;
      const h = row.scale;
      const mat = new THREE.MeshBasicMaterial({
        map: tex, transparent: true, alphaTest: 0.1, side: THREE.FrontSide,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      const x = row.x + (r() - 0.5) * 1.5;
      const y = row.y + (r() - 0.5) * 0.3;
      const z = (r() - 0.5) * row.zRange;
      mesh.position.set(x, y, z);
      mesh.lookAt(0, y, 22);
      group.add(mesh);
    }
  }

  scene.add(group);
  return group;
}
