// ---- Special effects ----
// Seismic-trace hero, oil "gusher" bursts, card stamps, shake, spotlight glow, count-up numbers,
// a drill-depth scroll gauge and a circular theme reveal. All of it is switched off by the
// Effects toggle and by the system "reduce motion" setting.
const FX = (() => {
  let enabled = true;
  const reduce = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const on = () => enabled && !reduce();
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

  // ---------- particle layer (gusher, sparks) ----------
  const layer = document.getElementById('fxLayer');
  const lc = layer.getContext('2d');
  let parts = [], raf = 0;
  function sizeLayer() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    layer.width = innerWidth * dpr; layer.height = innerHeight * dpr;
    lc.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  addEventListener('resize', sizeLayer); sizeLayer();
  function loop() {
    lc.clearRect(0, 0, innerWidth, innerHeight);
    parts = parts.filter(p => p.life > 0);
    for (const p of parts) {
      p.vy += p.g; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.life -= 1;
      const a = Math.min(1, p.life / 25);
      lc.globalAlpha = a; lc.fillStyle = p.c;
      lc.beginPath();
      if (p.drop) { // teardrop stretched along velocity
        const ang = Math.atan2(p.vy, p.vx), len = Math.min(3.2, 1 + Math.hypot(p.vx, p.vy) * 0.18);
        lc.ellipse(p.x, p.y, p.r * len, p.r, ang, 0, Math.PI * 2);
      } else lc.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      lc.fill();
    }
    lc.globalAlpha = 1;
    raf = parts.length ? requestAnimationFrame(loop) : 0;
  }
  function kick() { if (!raf) raf = requestAnimationFrame(loop); }

  // Oil gusher from a point: dark crude droplets with an amber sheen, flung up then falling.
  function gusher(x, y, n) {
    if (!on()) return;
    const cols = [css('--oil'), css('--oil'), css('--accent'), css('--oil-2')];
    for (let i = 0; i < (n || 46); i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.1, sp = 5 + Math.random() * 9;
      parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.38, r: 2 + Math.random() * 3.2, life: 55 + Math.random() * 35, c: cols[i % cols.length], drop: true });
    }
    kick();
  }
  function gusherFrom(el, n) { if (!el) return; const r = el.getBoundingClientRect(); gusher(r.left + r.width / 2, r.top + r.height / 2, n); }
  // Gentle confetti-like rain of droplets across the top (session complete).
  function rain() {
    if (!on()) return;
    const cols = [css('--oil'), css('--accent'), css('--oil-2'), css('--ink')];
    for (let i = 0; i < 120; i++) parts.push({ x: Math.random() * innerWidth, y: -20 - Math.random() * 200, vx: (Math.random() - 0.5) * 2, vy: 2 + Math.random() * 3, g: 0.12, r: 2 + Math.random() * 3, life: 160 + Math.random() * 80, c: cols[i % cols.length], drop: true });
    kick();
  }

  function shake(el) { if (!el || !on()) return; el.classList.remove('fx-shake'); void el.offsetWidth; el.classList.add('fx-shake'); }
  function stamp(el, text) {
    if (!el || !on()) return;
    const s = document.createElement('span');
    s.className = 'fx-stamp'; s.textContent = text || 'MASTERED';
    el.appendChild(s);
    setTimeout(() => s.remove(), 1500);
  }
  function pop(el) { if (!el || !on()) return; el.classList.remove('fx-pop'); void el.offsetWidth; el.classList.add('fx-pop'); }

  // Count a number up from 0 (dashboard stat cards).
  function countUp(el, to, dec) {
    const d = dec || 0;
    if (!on()) { el.textContent = Number(to).toFixed(d); return; }
    const t0 = performance.now(), dur = 900;
    const step = now => {
      const u = Math.min(1, (now - t0) / dur), e = 1 - (1 - u) ** 4;
      el.textContent = (to * e).toFixed(d);
      if (u < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // Cursor spotlight on any .glow element (CSS reads --mx / --my).
  document.addEventListener('pointermove', ev => {
    const el = ev.target.closest && ev.target.closest('.glow');
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', (ev.clientX - r.left) + 'px');
    el.style.setProperty('--my', (ev.clientY - r.top) + 'px');
  }, { passive: true });

  // Press ripple on buttons.
  document.addEventListener('pointerdown', ev => {
    const b = ev.target.closest && ev.target.closest('.btn, .chip-btn, .opt');
    if (!b || !on()) return;
    const r = b.getBoundingClientRect(), s = document.createElement('span');
    s.className = 'fx-ripple';
    s.style.left = (ev.clientX - r.left) + 'px'; s.style.top = (ev.clientY - r.top) + 'px';
    b.appendChild(s);
    setTimeout(() => s.remove(), 600);
  });

  // ---------- seismic traces (dashboard hero) ----------
  // Wiggle traces with variable-area fill, the way seismic sections are printed. Reflectors
  // drift slowly; the cursor sends a ripple through nearby traces.
  function seismic(canvas) {
    const c = canvas.getContext('2d');
    let w = 0, h = 0, t = 0, mx = -999, my = -999, id = 0, alive = true;
    const refl = Array.from({ length: 18 }, (_, i) => ({ y: 0.05 + i * 0.053 + Math.random() * 0.02, a: (Math.random() < 0.5 ? -1 : 1) * (0.35 + Math.random() * 0.75), dip: (Math.random() - 0.5) * 0.16, f: 0.6 + Math.random() * 0.8 }));
    function size() {
      const r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width; h = r.height; canvas.width = w * dpr; canvas.height = h * dpr; c.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function frame() {
      if (!alive || !canvas.isConnected) { alive = false; return; }
      c.clearRect(0, 0, w, h);
      const ink = css('--trace'), fill = css('--trace-fill');
      const n = Math.max(24, Math.floor(w / 14)), dx = w / n;
      for (let k = 0; k < n; k++) {
        const x0 = dx * (k + 0.5);
        const near = Math.exp(-((x0 - mx) ** 2) / 9000) * (my > -900 ? 1 : 0);
        c.beginPath(); c.moveTo(x0, 0);
        const pts = [];
        for (let y = 0; y <= h; y += 3) {
          let a = 0;
          for (const r of refl) {
            const yy = (r.y + r.dip * (k / n - 0.5) + 0.01 * Math.sin(t * 0.3 + r.f * 3)) * h;
            const d = (y - yy) / 5;
            a += r.a * (1 - 2 * d * d) * Math.exp(-d * d); // Ricker wavelet
          }
          a += near * 0.9 * Math.sin(y * 0.09 - t * 4) * Math.exp(-((y - my) ** 2) / 4000);
          a += 0.06 * Math.sin(y * 0.7 + k * 1.3 + t);
          pts.push([x0 + a * dx * 0.9, y]);
        }
        for (const [x, y] of pts) c.lineTo(x, y);
        c.strokeStyle = ink; c.lineWidth = 0.7; c.stroke();
        // variable-area fill on the positive side
        c.beginPath(); c.moveTo(x0, 0);
        for (const [x, y] of pts) c.lineTo(Math.max(x0, x), y);
        c.lineTo(x0, h); c.closePath(); c.fillStyle = fill; c.fill();
      }
      t += 0.016;
      id = requestAnimationFrame(frame);
    }
    canvas.addEventListener('pointermove', ev => { const r = canvas.getBoundingClientRect(); mx = ev.clientX - r.left; my = ev.clientY - r.top; });
    canvas.addEventListener('pointerleave', () => { mx = my = -999; });
    new ResizeObserver(size).observe(canvas);
    size();
    if (on()) frame(); else { t = 2; frame(); cancelAnimationFrame(id); }
  }

  // ---------- drill-depth gauge (glossary scroll) ----------
  function depthGauge(el, getLetter) {
    const bit = el.querySelector('.bit'), lbl = el.querySelector('.depth-l'), ft = el.querySelector('.depth-ft');
    const update = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      const u = max > 0 ? Math.min(1, scrollY / max) : 0;
      bit.style.setProperty('--u', u.toFixed(4));
      lbl.textContent = getLetter() || 'A';
      ft.textContent = Math.round(u * 12000).toLocaleString() + ' ft';
    };
    addEventListener('scroll', update, { passive: true });
    update();
    return update;
  }

  // Circular reveal when the theme changes (View Transitions API where supported).
  function themeSwap(apply, x, y) {
    if (!on() || !document.startViewTransition) { apply(); return; }
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.documentElement.style.setProperty('--vt-x', x + 'px');
    document.documentElement.style.setProperty('--vt-y', y + 'px');
    document.documentElement.style.setProperty('--vt-r', r + 'px');
    document.startViewTransition(apply);
  }

  // Reveal text letter by letter (term of the day).
  function typewrite(el, text) {
    if (!on()) { el.textContent = text; return; }
    el.textContent = '';
    let i = 0;
    const step = () => { if (!el.isConnected) return; i = Math.min(text.length, i + 2); el.textContent = text.slice(0, i); if (i < text.length) setTimeout(step, 14); };
    step();
  }

  return {
    set enabled(v) { enabled = !!v; document.documentElement.classList.toggle('no-fx', !enabled); },
    get enabled() { return enabled; },
    on, gusher, gusherFrom, rain, shake, stamp, pop, countUp, seismic, depthGauge, themeSwap, typewrite,
  };
})();
