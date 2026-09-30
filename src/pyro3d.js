import * as THREE from 'three';

const MAX_PARTICLES = 4000;

export class Pyro3D {
  constructor(scene) {
    this.scene = scene;

    const positions = new Float32Array(MAX_PARTICLES * 3);
    const colors = new Float32Array(MAX_PARTICLES * 3);
    const sizes = new Float32Array(MAX_PARTICLES);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    this.material = new THREE.PointsMaterial({
      size: 0.18,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.92,
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    scene.add(this.points);

    this.particles = [];
    this._flashMesh = null;
    this._flashT = -1;
    this._flashDur = 0;
  }

  /**
   * Burst of particles at 3D position.
   * count: number of particles
   * opts: { speed, life, pal (array of hex colors) }
   */
  burst(x, y, z, count = 20, opts = {}) {
    const speed = opts.speed || 3;
    const life = opts.life || 0.6;
    const pal = opts.pal || ['#FF6BD6', '#35BDD2', '#FFD84A', '#FFFFFF'];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const pitch = (Math.random() - 0.3) * Math.PI;
      const v = (0.5 + Math.random() * 0.5) * speed;
      const col = new THREE.Color(pal[Math.floor(Math.random() * pal.length)]);
      this.particles.push({
        x, y, z,
        vx: Math.cos(angle) * Math.cos(pitch) * v,
        vy: Math.abs(Math.sin(pitch)) * v + speed * 0.3,
        vz: Math.sin(angle) * Math.cos(pitch) * v,
        r: col.r, g: col.g, b: col.b,
        life, maxLife: life,
      });
    }
  }

  requestFlash(now, dur = 0.4) {
    this._flashT = now;
    this._flashDur = dur;
    if (!this._flashMesh) {
      const geo = new THREE.PlaneGeometry(60, 40);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.FrontSide,
      });
      this._flashMesh = new THREE.Mesh(geo, mat);
      this._flashMesh.position.set(0, 5, 9);
      this._flashMesh.renderOrder = 999;
      this.scene.add(this._flashMesh);
    }
  }

  update(dt, now) {
    // Update particles
    const alive = [];
    for (const p of this.particles) {
      p.life -= dt;
      if (p.life <= 0) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vy -= 4 * dt; // gravity
      alive.push(p);
    }
    this.particles = alive.slice(0, MAX_PARTICLES);

    // Write to buffer
    const pos = this.geometry.attributes.position.array;
    const col = this.geometry.attributes.color.array;
    const sz = this.geometry.attributes.size.array;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (i < this.particles.length) {
        const p = this.particles[i];
        const fade = p.life / p.maxLife;
        pos[i * 3] = p.x;
        pos[i * 3 + 1] = p.y;
        pos[i * 3 + 2] = p.z;
        col[i * 3] = p.r * fade;
        col[i * 3 + 1] = p.g * fade;
        col[i * 3 + 2] = p.b * fade;
        sz[i] = 0.18 * fade;
      } else {
        pos[i * 3] = 0; pos[i * 3 + 1] = -100; pos[i * 3 + 2] = 0;
      }
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
    this.geometry.setDrawRange(0, Math.max(1, this.particles.length));

    // Flash
    if (this._flashMesh && this._flashT >= 0) {
      const elapsed = now - this._flashT;
      const fade = Math.max(0, 1 - elapsed / this._flashDur);
      this._flashMesh.material.opacity = fade * 0.18;
      if (fade <= 0) this._flashT = -1;
    }
  }
}
