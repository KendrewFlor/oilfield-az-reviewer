// ---- Study progress, kept in localStorage (this browser only) ----
const Store = (() => {
  const KEY = 'azr.v1';
  const blank = () => ({ v: 1, theme: 'auto', fx: true, known: {}, star: {}, box: {}, due: {}, seen: {}, days: {}, quiz: { n: 0, ok: 0 }, best: 0, tasks: {}, notes: {}, miss: {}, goal: 20 });

  // Stored data is untrusted (it can be edited, or imported from a file): keep only expected shapes.
  function clean(o) {
    const s = blank();
    if (!o || typeof o !== 'object') return s;
    if (['auto', 'light', 'dark'].includes(o.theme)) s.theme = o.theme;
    if (typeof o.fx === 'boolean') s.fx = o.fx;
    const flags = (src, dst) => { if (src && typeof src === 'object') for (const k of Object.keys(src).slice(0, 5000)) if (/^[a-z0-9-]{1,80}$/.test(k) && src[k]) dst[k] = 1; };
    const nums = (src, dst, lo, hi) => { if (src && typeof src === 'object') for (const k of Object.keys(src).slice(0, 5000)) { const v = src[k]; if (/^[a-z0-9-]{1,80}$/.test(k) && Number.isFinite(v) && v >= lo && v <= hi) dst[k] = v; } };
    flags(o.known, s.known); flags(o.star, s.star); flags(o.seen, s.seen); flags(o.tasks, s.tasks); flags(o.miss, s.miss);
    if (Number.isInteger(o.goal) && o.goal >= 5 && o.goal <= 500) s.goal = o.goal;
    nums(o.box, s.box, 1, 5); nums(o.due, s.due, 0, 1e6);
    if (o.days && typeof o.days === 'object') for (const k of Object.keys(o.days).slice(0, 4000)) { const v = o.days[k]; if (/^\d{1,6}$/.test(k) && Number.isFinite(v) && v > 0 && v < 1e5) s.days[k] = v; }
    if (o.quiz && Number.isFinite(o.quiz.n) && Number.isFinite(o.quiz.ok) && o.quiz.ok <= o.quiz.n) s.quiz = { n: o.quiz.n, ok: o.quiz.ok };
    if (Number.isFinite(o.best) && o.best >= 0) s.best = o.best;
    if (o.notes && typeof o.notes === 'object') for (const k of Object.keys(o.notes).slice(0, 2000)) if (/^[a-z0-9-]{1,80}$/.test(k) && typeof o.notes[k] === 'string') s.notes[k] = o.notes[k].slice(0, 2000);
    return s;
  }

  let S = blank();
  try { S = clean(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch (e) { /* storage blocked or corrupt */ }
  let timer = 0;
  function save() {
    clearTimeout(timer);
    timer = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }, 120);
  }
  const today = () => Lib.dayNumber();
  const hooks = {};
  function bump(n) {
    const d = today(), before = S.days[d] || 0;
    S.days[d] = before + (n || 1);
    if (before < S.goal && S.days[d] >= S.goal && hooks.goal) hooks.goal();
  }

  return {
    get s() { return S; },
    hooks,
    save,
    bump,
    today,
    seen(id) { if (!S.seen[id]) { S.seen[id] = 1; save(); } },
    toggle(field, id) { if (S[field][id]) delete S[field][id]; else S[field][id] = 1; save(); return !!S[field][id]; },
    review(id, gotIt) {
      const r = Lib.review(S.box[id], gotIt, today());
      S.box[id] = r.box; S.due[id] = r.due; S.seen[id] = 1;
      if (r.box >= 5) S.known[id] = 1;
      if (gotIt) delete S.miss[id];
      bump(1); save();
      return r;
    },
    answer(ok, id) { S.quiz.n++; if (ok) S.quiz.ok++; if (id) { if (ok) delete S.miss[id]; else S.miss[id] = 1; } bump(1); save(); },
    mastered(id) { return !!S.known[id] || (S.box[id] || 0) >= 5; },
    isDue(id) { return S.box[id] ? (S.due[id] || 0) <= today() : false; },
    exportJSON() { return JSON.stringify(S, null, 1); },
    importJSON(text) { S = clean(JSON.parse(text)); save(); },
    reset() { const keep = { theme: S.theme, fx: S.fx, goal: S.goal }; S = Object.assign(blank(), keep); save(); },
  };
})();
