// ---- App: load data, route between views, theme, export/import ----
const App = (() => {
  const view = document.getElementById('view');
  const ROUTES = ['dashboard', 'glossary', 'acronyms', 'cards', 'practice', 'notes', 'tools', 'exercises', 'resources'];
  let current = null, data = null, toastTimer = 0, replacing = false;

  // Data comes from data/*.json (or, in the single-file preview build, from embedded JSON blocks).
  async function load(name) {
    const el = document.getElementById('data-' + name);
    if (el) return JSON.parse(el.textContent);
    const r = await fetch('data/' + name + '.json', { cache: 'no-cache' });
    if (!r.ok) throw new Error(name + '.json: HTTP ' + r.status);
    return r.json();
  }

  async function boot() {
    try {
      const [terms, disc, notes, questions, ex, res] = await Promise.all(['terms', 'disciplines', 'notes', 'questions', 'exercises', 'resources'].map(load));
      const discMap = {};
      for (const d of disc.disciplines) discMap[d.code] = d;
      const ts = terms.map(t => ({
        term: t.term, disc: t.disc.filter(c => discMap[c]), def: t.def,
        id: Lib.termId(t.term), letter: Lib.letterOf(t.term), plain: Lib.plain(t.def), slb: Lib.slbUrl(t.term, t.slb),
      })).sort((a, b) => a.term.localeCompare(b.term, 'en', { sensitivity: 'base' }));
      const byId = {};
      for (const t of ts) byId[t.id] = t;
      data = { terms: ts, byId, disc: disc.disciplines, discMap, notes, questions, ex, res, acr: Lib.acronyms(ts), related: Lib.relatedIndex(ts) };
    } catch (e) {
      view.innerHTML = `<div class="panel empty"><h2>Couldn't load the study data</h2><p class="muted">${Lib.esc(e.message)}</p><p class="muted">If you opened index.html straight from your computer, run a local server instead (for example <code>python3 -m http.server</code>) or use the GitHub Pages site.</p></div>`;
      return;
    }
    applyTheme(); FX.enabled = Store.s.fx;
    document.getElementById('fxToggle').checked = Store.s.fx;
    route();
  }

  function parse() {
    const h = location.hash.replace(/^#\/?/, '');
    const [path, qs] = h.split('?');
    const name = ROUTES.includes(path) ? path : 'dashboard';
    const q = {};
    new URLSearchParams(qs || '').forEach((v, k) => { q[k] = v.slice(0, 200); });
    return { name, q };
  }
  function route() {
    if (!data) return;
    if (current && current.leave) current.leave();
    const { name, q } = parse();
    document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('cur', a.dataset.nav === name));
    view.classList.remove('enter'); void view.offsetWidth; view.classList.add('enter');
    current = Views[name](view, q) || null;
    if (!replacing) window.scrollTo(0, 0);
    replacing = false;
    document.title = ({ dashboard: 'Dashboard', glossary: 'Glossary A–Z', acronyms: 'Acronyms', cards: 'Flashcards', practice: 'Practice', notes: 'Cheat sheets', tools: 'Tools', exercises: 'Exercises', resources: 'Resources' })[name] + ' · Oilfield A–Z Reviewer';
  }
  // Update the address bar for filters without re-rendering the view.
  function replaceQuery(name, qs) {
    const h = '#/' + name + (qs ? '?' + qs : '');
    if (location.hash !== h) { try { history.replaceState(null, '', h); } catch (e) { /* sandboxed */ } }
  }

  function applyTheme() {
    const t = Store.s.theme;
    if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t);
    document.querySelectorAll('[data-theme-set]').forEach(b => b.setAttribute('aria-pressed', b.dataset.themeSet === t));
  }
  function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.hidden = false; t.classList.remove('in'); void t.offsetWidth; t.classList.add('in');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
  }

  // Keyboard shortcuts overlay ("?")
  const helpEl = document.getElementById('help');
  let helpFrom = null;
  function help(open) {
    if (open === helpEl.hidden) {
      helpEl.hidden = !open;
      if (open) { helpFrom = document.activeElement; document.getElementById('helpClose').focus(); } else if (helpFrom && helpFrom.focus) helpFrom.focus();
    }
  }
  helpEl.addEventListener('click', e => { if (e.target === helpEl || e.target.closest('#helpClose')) help(false); });
  document.getElementById('btnHelp').addEventListener('click', () => help(true));
  Store.hooks.goal = () => { toast('Daily goal reached. Nice work!'); FX.rain(); };

  addEventListener('hashchange', route);
  document.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
    if (!helpEl.hidden) { if (e.key === 'Escape' || e.key === '?') { e.preventDefault(); help(false); } return; }
    if (!typing && e.key === '?') { e.preventDefault(); help(true); return; }
    if (!typing && data && (e.key === 'r' || e.key === 'R')) { e.preventDefault(); location.hash = '#/glossary?t=' + data.terms[Math.floor(Math.random() * data.terms.length)].id; return; }
    if (!typing && e.key === '/' && !(current && current.key && ['glossary', 'acronyms'].includes(parse().name))) { e.preventDefault(); location.hash = '#/glossary?focus=1'; return; }
    if (current && current.key) current.key(e);
  });
  document.querySelectorAll('[data-theme-set]').forEach(b => b.addEventListener('click', ev => {
    Store.s.theme = b.dataset.themeSet; Store.save();
    FX.themeSwap(applyTheme, ev.clientX, ev.clientY);
  }));
  document.getElementById('fxToggle').addEventListener('change', e => { Store.s.fx = e.target.checked; Store.save(); FX.enabled = e.target.checked; });
  document.getElementById('btnExport').addEventListener('click', () => {
    try {
      const blob = new Blob([Store.exportJSON()], { type: 'application/json' }), a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'oilfield-reviewer-progress.json';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      toast('Progress exported');
    } catch (e) { toast('Downloads are blocked here'); }
  });
  document.getElementById('btnImport').addEventListener('click', () => document.getElementById('fileImport').click());
  document.getElementById('fileImport').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    if (f.size > 2e6) { toast('That file is too large'); return; }
    try { Store.importJSON(await f.text()); applyTheme(); toast('Progress imported'); route(); } catch (err) { toast('That file is not a progress export'); }
    e.target.value = '';
  });
  document.getElementById('btnResetAll').addEventListener('click', () => {
    const b = document.getElementById('btnResetAll');
    if (b.dataset.armed) { Store.reset(); delete b.dataset.armed; b.textContent = 'Reset'; toast('Progress cleared'); route(); return; }
    b.dataset.armed = '1'; b.textContent = 'Click again to clear all progress';
    setTimeout(() => { delete b.dataset.armed; b.textContent = 'Reset'; }, 4000);
  });

  boot();
  return { get data() { return data; }, replaceQuery, toast, help };
})();
