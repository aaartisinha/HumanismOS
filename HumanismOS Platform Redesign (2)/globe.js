(function () {
  class AIGlobe extends HTMLElement {
    connectedCallback() {
      if (this._started) return; this._started = true;
      this.style.display = 'block'; this.style.width = '100%'; this.style.height = '100%';
      const c = document.createElement('canvas');
      c.style.cssText = 'width:100%;height:100%;display:block';
      this.appendChild(c);
      const ctx = c.getContext('2d');
      const N = 620, pts = [];
      const ga = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < N; i++) {
        const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(Math.max(0, 1 - y * y)), th = ga * i;
        pts.push({ x: Math.cos(th) * r, y, z: Math.sin(th) * r, s: 0.6 + Math.random() * 0.9, hue: Math.random() });
      }
      const arcs = [];
      for (let i = 0; i < 8; i++) arcs.push({ a: pts[(Math.random() * N) | 0], b: pts[(Math.random() * N) | 0], t: Math.random() * Math.PI * 2, sp: 0.008 + Math.random() * 0.012 });
      let W = 0, H = 0, dpr = 1;
      const resize = () => {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = this.clientWidth || 300; H = this.clientHeight || 300;
        c.width = W * dpr; c.height = H * dpr;
      };
      resize();
      this._ro = new ResizeObserver(resize); this._ro.observe(this);
      let rot = 0, px = 0, py = 0, sx = 0, sy = 0;
      this._onMove = (e) => {
        const r = this.getBoundingClientRect();
        px = (e.clientX - r.left) / r.width - 0.5;
        py = (e.clientY - r.top) / r.height - 0.5;
      };
      this.addEventListener('pointermove', this._onMove);
      this.addEventListener('pointerleave', () => { px = 0; py = 0; });
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const rotPt = (p, ry, rx) => {
        const cy0 = Math.cos(ry), sy0 = Math.sin(ry);
        let x = p.x * cy0 - p.z * sy0, z = p.x * sy0 + p.z * cy0, y = p.y;
        const cx0 = Math.cos(rx), sx0 = Math.sin(rx);
        const y2 = y * cx0 - z * sx0, z2 = y * sx0 + z * cx0;
        return { x, y: y2, z: z2 };
      };
      const proj = (p, R, cx, cy) => {
        const f = 2.6, s = f / (f - p.z);
        return { x: cx + p.x * R * s, y: cy + p.y * R * s, s, z: p.z };
      };
      const draw = () => {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);
        const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.36;
        sx += (px - sx) * 0.06; sy += (py - sy) * 0.06;
        if (!reduced) rot += 0.0022;
        const ry = rot + sx * 0.9, rx = 0.42 + sy * 0.5;
        // halo
        const g = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.5);
        g.addColorStop(0, 'rgba(167,139,250,0.10)');
        g.addColorStop(0.6, 'rgba(167,139,250,0.03)');
        g.addColorStop(1, 'rgba(167,139,250,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        // ring
        ctx.strokeStyle = 'rgba(148,163,184,0.14)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(cx, cy, R * 1.18, 0, Math.PI * 2); ctx.stroke();
        // dots
        for (let i = 0; i < N; i++) {
          const q = proj(rotPt(pts[i], ry, rx), R, cx, cy);
          const depth = (q.z + 1) / 2; // 0 back, 1 front
          const a = 0.12 + depth * 0.75;
          const rad = pts[i].s * (0.6 + depth * 1.3);
          if (pts[i].hue > 0.93) ctx.fillStyle = `rgba(251,191,36,${a})`;
          else if (pts[i].hue > 0.72) ctx.fillStyle = `rgba(167,139,250,${a})`;
          else ctx.fillStyle = `rgba(224,220,235,${a * 0.8})`;
          ctx.beginPath(); ctx.arc(q.x, q.y, rad, 0, Math.PI * 2); ctx.fill();
        }
        // arcs
        for (const arc of arcs) {
          if (!reduced) arc.t += arc.sp;
          const A = proj(rotPt(arc.a, ry, rx), R, cx, cy);
          const B = proj(rotPt(arc.b, ry, rx), R, cx, cy);
          if (A.z < -0.15 || B.z < -0.15) continue;
          const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
          const dx = mx - cx, dy = my - cy, dl = Math.hypot(dx, dy) || 1;
          const lift = 60 + Math.hypot(B.x - A.x, B.y - A.y) * 0.35;
          const qx = mx + (dx / dl) * lift, qy = my + (dy / dl) * lift;
          const pulse = (Math.sin(arc.t) + 1) / 2;
          ctx.strokeStyle = `rgba(167,139,250,${0.10 + pulse * 0.30})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.quadraticCurveTo(qx, qy, B.x, B.y); ctx.stroke();
          // traveling dot
          const tt = (Math.sin(arc.t * 0.7) + 1) / 2;
          const ox = (1 - tt) * (1 - tt) * A.x + 2 * (1 - tt) * tt * qx + tt * tt * B.x;
          const oy = (1 - tt) * (1 - tt) * A.y + 2 * (1 - tt) * tt * qy + tt * tt * B.y;
          ctx.fillStyle = `rgba(251,191,36,${0.5 + pulse * 0.5})`;
          ctx.beginPath(); ctx.arc(ox, oy, 2, 0, Math.PI * 2); ctx.fill();
        }
      };
      const loop = () => { draw(); this._raf = requestAnimationFrame(loop); };
      if (reduced) { draw(); } else { this._raf = requestAnimationFrame(loop); }
    }
    disconnectedCallback() {
      if (this._raf) cancelAnimationFrame(this._raf);
      if (this._ro) this._ro.disconnect();
    }
  }
  if (!customElements.get('ai-globe')) customElements.define('ai-globe', AIGlobe);
})();
