import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export class CineCam {
  constructor(camera) {
    this.camera = camera;
    this.basePos = new THREE.Vector3(0, 4.2, 11);
    this.shake = 0;
    this.dolly = 0; // 0=normal, 1=zoomed in
    this.dollyT = 0;
  }

  impact(strength) {
    this.shake = Math.max(this.shake, strength);
  }

  zoomIn() {
    this.dolly = 1;
    this.dollyT = 0;
  }

  update(dt) {
    this.shake = Math.max(0, this.shake - dt * 8);
    this.dolly = Math.max(0, this.dolly - dt * 1.2);

    const sx = (Math.random() - 0.5) * this.shake * 0.4;
    const sy = (Math.random() - 0.5) * this.shake * 0.25;
    const sz = (Math.random() - 0.5) * this.shake * 0.2;

    const zoom = this.dolly * 2.5;
    this.camera.position.set(
      this.basePos.x + sx,
      this.basePos.y + sy - zoom * 0.5,
      this.basePos.z + sz - zoom
    );
    this.camera.lookAt(0, 2.2, 0);
  }
}

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x07091c, 0.012);
  scene.background = new THREE.Color(0x07091c);

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 4.2, 11);
  camera.lookAt(0, 1, 0);

  // Lighting
  const ambient = new THREE.AmbientLight(0x8890c0, 0.45);
  scene.add(new THREE.HemisphereLight(0xbfd8ff, 0x301040, 0.8));
  scene.add(ambient);

  // Key light: warm spot above-front
  const key = new THREE.SpotLight(0xffe8c0, 120, 60, Math.PI / 4, 0.7, 1.5);
  key.position.set(0, 18, 9);
  key.castShadow = true;
  key.shadow.mapSize.setScalar(1024);
  key.shadow.bias = -0.001;
  key.target.position.set(0, 0, 0);
  scene.add(key, key.target);

  // Back rim so silhouettes separate from the dark mat
  const back = new THREE.DirectionalLight(0xff4fb0, 1.6);
  back.position.set(0, 6, -10);
  scene.add(back);

  // Fill light: cool opposite
  const fill = new THREE.DirectionalLight(0x8090d0, 1.2);
  fill.position.set(10, 12, -8);
  scene.add(fill);

  // Rim light: cyan neon behind ring
  const rim = new THREE.SpotLight(0x00e5ff, 2.5, 50, Math.PI / 4, 0.5, 2);
  rim.position.set(0, 6, -14);
  rim.target.position.set(0, 2, 0);
  scene.add(rim, rim.target);

  // 6 gel-colored arena spotlights overhead in a ring
  const gelColors = [0xff00aa, 0x00ccff, 0xff6600, 0x00ff88, 0xaa00ff, 0xffee00];
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const g = new THREE.SpotLight(gelColors[i], 1.2, 40, Math.PI / 8, 0.6, 2);
    g.position.set(Math.cos(angle) * 14, 18, Math.sin(angle) * 10);
    g.target.position.set(0, 0, 0);
    scene.add(g, g.target);
  }

  // Post-processing
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.45, // strength
    0.4,  // radius
    0.92  // threshold: only neon and flashes bloom
  );
  composer.addPass(bloom);

  const output = new OutputPass();
  composer.addPass(output);

  const cineCam = new CineCam(camera);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
  });

  return { renderer, scene, camera, composer, bloom, cineCam };
}
