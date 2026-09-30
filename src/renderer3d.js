import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';

export class CineCam {
  constructor(camera) {
    this.camera = camera;
    this.basePos = new THREE.Vector3(0, 3.6, 8.6);
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
    this.camera.lookAt(0, 2.15, 0);
  }
}

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.86;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05070f, 0.010);
  scene.background = new THREE.Color(0x05070f);

  // Image-based lighting from a neon stage HDRI (Poly Haven, CC0). Gives fabric
  // sheen and boot highlights that analytic lights alone cannot produce.
  let envMap = null;
  new HDRLoader().load(`${import.meta.env.BASE_URL}hdr/neon.hdr`, (hdr) => {
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    envMap = new THREE.PMREMGenerator(renderer).fromEquirectangular(hdr).texture;
    scene.environment = envMap;
    scene.environmentIntensity = 0.42;   // arcade look: present, not dominant
    hdr.dispose();
  });

  const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 6.0, 14.2);
  camera.lookAt(0, 2.15, 0);

  // Lighting
  const ambient = new THREE.AmbientLight(0x7a83b4, 0.16);
  scene.add(new THREE.HemisphereLight(0xa8c4ee, 0x2a0e38, 0.30));
  scene.add(ambient);

  // Key light: warm spot above-front
  const key = new THREE.SpotLight(0xfff2e2, 78, 40, Math.PI / 2.4, 0.85, 1.25);
  key.position.set(0, 15, 7);
  key.castShadow = true;
  key.shadow.mapSize.setScalar(1024);
  key.shadow.bias = -0.001;
  key.target.position.set(0, 1.2, 0);
  scene.add(key, key.target);

  // Back rim so silhouettes separate from the dark mat
  const back = new THREE.DirectionalLight(0xff4fb0, 0.62);
  back.position.set(0, 6, -10);
  scene.add(back);

  // Fill light: cool opposite
  const fill = new THREE.DirectionalLight(0x8090d0, 0.55);
  fill.position.set(10, 12, -8);
  scene.add(fill);

  // Rim light: cyan neon behind ring
  const rim = new THREE.SpotLight(0x00e5ff, 1.2, 50, Math.PI / 4, 0.6, 2);
  rim.position.set(0, 6, -14);
  rim.target.position.set(0, 2, 0);
  scene.add(rim, rim.target);

  // 6 gel-colored arena spotlights overhead in a ring
  const gelColors = [0xff00aa, 0x00ccff, 0xff6600, 0x00ff88, 0xaa00ff, 0xffee00];
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const g = new THREE.SpotLight(gelColors[i], 0.34, 40, Math.PI / 7, 0.8, 2);
    g.position.set(Math.cos(angle) * 14, 18, Math.sin(angle) * 10);
    g.target.position.set(0, 0, 0);
    scene.add(g, g.target);
  }

  // Post-processing. Order matters: occlusion has to be baked into the image
  // BEFORE bloom spreads light around, and antialiasing must run on the final
  // resolved image, not mid-chain.
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // GTAO: darkens armpits, between the thighs, under the chin and where boots
  // meet the canvas. Ambient occlusion is most of what stops a cheap render
  // looking like plastic.
  const gtao = new GTAOPass(scene, camera, window.innerWidth, window.innerHeight);
  gtao.output = GTAOPass.OUTPUT.Default;
  gtao.updateGtaoMaterial({
    radius: 0.5, distanceExponent: 1.1, thickness: 0.5, scale: 1.0,
    samples: 16, screenSpaceRadius: false,
  });
  composer.addPass(gtao);

  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.22, // strength
    0.32, // radius
    0.97  // threshold: only true neon and impact flashes bloom
  );
  composer.addPass(bloom);

  // Composer rendering disables the canvas MSAA, so add SMAA back explicitly.
  const smaa = new SMAAPass();
  composer.addPass(smaa);

  const output = new OutputPass();
  composer.addPass(output);

  const cineCam = new CineCam(camera);

  // Resize must also resize the new passes.
  const _onResize = () => { smaa.setSize(window.innerWidth, window.innerHeight); gtao.setSize(window.innerWidth, window.innerHeight); };
  window.addEventListener('resize', _onResize);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
  });

  return { renderer, scene, camera, composer, bloom, cineCam, envMapRef: () => envMap };
}
