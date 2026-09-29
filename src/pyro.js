// Pyrotechnic text: particles fly in from fountains, lock onto the pixels of a word,
// burn and flicker, then blow outwards as embers. Also generic spark bursts.
import { textPixels, textWidth, GLYPH_H } from './font.js';
import { UI } from './palette.js';

export class Pyro {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.parts = [];
    this.words = [];
    this.flashes = []; // times of recent screen flashes, for the 3-per-second cap
    this.flash = 0;
    this.reduced = false;
  }

  /** Request a full-screen flash, capped at 3 per rolling second for photosensitivity safety. */
  requestFlash(now, amount = 1) {
    if (this.reduced) return;
    this.flashes = this.flashes.filter((t) => now - t < 1);
    if (this.flashes.length >= 3) return;
    this.flashes.push(now);
    this.flash = Math.max(this.flash, amount);
  }

  /**
   * Spell a word in fire. opts: { y, scale, hold (s), palette, now }
   */
  word(text, { y = 60, scale = 3, hold = 1.6, palette = UI.fire, now = 0, cx = this.w / 2 } = {}) {
    const pts = textPixels(text, scale);
    const w = textWidth(text, scale);
    const ox = Math.round(cx - w / 2);
    // hold is measured from the moment every pixel has landed, not from birth.
    const arrive = 1.05;
    const word = { text, born: now, hold: hold + arrive, arrive, life: hold + arrive + 1.2, pts: [] };
    for (const p of pts) {
      // Every pixel is a particle that flies from a fountain at the bottom corners.
      const fromLeft = Math.random() < 0.5;
      const sx = fromLeft ? -4 + Math.random() * 30 : this.w - 26 + Math.random() * 30;
      const sy = this.h + 4;
      word.pts.push({
        tx: ox + p.x, ty: y + p.y,
        sx, sy,
        delay: Math.random() * 0.35 + (p.x / Math.max(1, w)) * 0.25,
        seed: Math.random(),
        pal: palette,
      });
    }
    this.words.push(word);
    // Fountains either side.
    for (let i = 0; i < 70; i++) this.spark(Math.random() < 0.5 ? 6 : this.w - 6, this.h, { vy: -140 - Math.random() * 120, vx: (Math.random() - 0.5) * 80, life: 0.8 + Math.random() * 0.6, pal: palette });
    this.requestFlash(now, 0.5);
  }

  spark(x, y, { vx = (Math.random() - 0.5) * 120, vy = (Math.random() - 0.5) * 120, life = 0.5, pal = UI.fire, g = 180, size = 1 } = {}) {
    this.parts.push({ x, y, vx, vy, life, max: life, pal, g, size });
  }

  /** A flat ring of sparks, for spins and cut-ins. */
  ring(x, y, { n = 20, r = 22, life = 0.4, pal = UI.fire } = {}) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      this.spark(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.5, { vx: Math.cos(a) * 40, vy: Math.sin(a) * 20, life, pal, g: 0 });
    }
  }

  burst(x, y, n = 12, opts = {}) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = (opts.speed ?? 90) * (0.4 + Math.random() * 0.8);
      this.spark(x, y, { ...opts, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30 });
    }
  }

  update(dt, now) {
    for (const p of this.parts) {
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    this.parts = this.parts.filter((p) => p.life > 0 && p.y < this.h + 10);
    for (const wd of this.words) {
      const age = now - wd.born;
      // At the end of the hold, the letters explode into embers.
      if (!wd.exploded && age > wd.hold) {
        wd.exploded = true;
        for (const p of wd.pts) if (Math.random() < 0.5) this.spark(p.tx, p.ty, { vx: (Math.random() - 0.5) * 160, vy: -Math.random() * 120, life: 0.4 + Math.random() * 0.6, pal: p.pal });
      }
    }
    this.words = this.words.filter((wd) => now - wd.born < wd.hold + 1.2);
    this.flash = Math.max(0, this.flash - dt * 4);
  }

  draw(ctx, now) {
    // Dark outline pass so fire letters stay legible over the busy crowd.
    // Darken the whole band behind active words so fire reads over the crowd.
    for (const wd of this.words) {
      const arr = wd.arrive ?? 1.05;
      const age = now - wd.born;
      const fade = Math.min(1, Math.max(0, (age - 0.25) / 0.3)) * Math.min(1, Math.max(0, (wd.hold + 0.9 - age) / 0.4));
      if (fade <= 0) continue;
      let y0 = 999, y1 = -999, x0 = 999, x1 = -999;
      for (const p of wd.pts) { y0 = Math.min(y0, p.ty); y1 = Math.max(y1, p.ty); x0 = Math.min(x0, p.tx); x1 = Math.max(x1, p.tx); }
      const h = y1 - y0 + 3;
      const grd = ctx.createLinearGradient(0, y0 - 12, 0, y1 + 12);
      grd.addColorStop(0, 'rgba(0,0,0,0)');
      grd.addColorStop(0.3, `rgba(0,0,0,${0.72 * fade})`);
      grd.addColorStop(0.7, `rgba(0,0,0,${0.72 * fade})`);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, y0 - 12, this.w, h + 24);
      ctx.fillStyle = `rgba(0,0,0,${0.9 * fade})`;
      for (const p of wd.pts) ctx.fillRect(p.tx - 1, p.ty - 1, 3, 3);
    }
    for (const wd of this.words) {
      const age = now - wd.born;
      for (const p of wd.pts) {
        const k = Math.min(1, Math.max(0, (age - p.delay) / 0.45));
        if (k <= 0) continue;
        const e = 1 - Math.pow(1 - k, 3); // ease out
        const arc = Math.sin(k * Math.PI) * -40;
        const x = Math.round(p.sx + (p.tx - p.sx) * e);
        const y = Math.round(p.sy + (p.ty - p.sy) * e + arc);
        // Flicker through the fire palette; settled letters burn hot at the top, deep at the bottom.
        const pal = p.pal;
        let idx;
        if (k < 1) idx = 1 + Math.floor(Math.random() * 2);
        else {
          const top = wd.pts.reduce((m, q) => Math.min(m, q.ty), 999);
          const base = ((p.ty - top) / (GLYPH_H * 3)) * (pal.length - 2);
          idx = Math.min(pal.length - 3, Math.max(0, Math.floor(base * 0.6 + Math.sin(now * 20 + p.seed * 40) * 0.8)));
        }
        ctx.fillStyle = pal[idx];
        ctx.fillRect(x, y, 1, 1);
        // Occasional flame lick above settled pixels.
        if (k >= 1 && Math.random() < 0.03) this.spark(p.tx, p.ty, { vx: (Math.random() - 0.5) * 10, vy: -30 - Math.random() * 30, life: 0.25, g: -20, pal });
      }
    }
    for (const p of this.parts) {
      const t = 1 - p.life / p.max;
      ctx.fillStyle = p.pal[Math.min(p.pal.length - 1, Math.floor(t * p.pal.length))];
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
  }

  drawFlash(ctx) {
    if (this.flash <= 0) return;
    ctx.globalAlpha = Math.min(0.6, this.flash * 0.6);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, this.w, this.h);
    ctx.globalAlpha = 1;
  }
}
