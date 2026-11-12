// ---- Pure helpers (no DOM): tested in tests/js/lib.test.mjs ----
(function (root) {
  'use strict';

  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ESC[c]); }

  // Data files may use only <sub>, <sup>, <i>, <b>, <br>. Everything else is escaped,
  // so a bad edit to a JSON file can never inject markup or script.
  function rich(s) {
    return esc(s).replace(/&lt;(\/?)(sub|sup|i|b|br)&gt;/g, '<$1$2>');
  }

  // Plain text (for search and comparisons).
  function plain(s) { return String(s == null ? '' : s).replace(/<[^>]*>/g, ''); }

  // Stable id for a term: lowercase, words joined by "-".
  function termId(term) {
    return plain(term).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  // Link to the term's page in the SLB Energy Glossary.
  // Pattern: https://glossary.slb.com/en/terms/<first letter>/<slug>, slug = lowercase,
  // spaces -> "_", hyphens kept, other punctuation dropped. `override` is a slug string,
  // or false when the glossary has no entry under that name.
  function slbUrl(term, override) {
    if (override === false) return null;
    const slug = override || plain(term).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9 -]+/g, '').trim().replace(/\s+/g, '_');
    if (!slug) return null;
    const first = /[a-z]/.test(slug[0]) ? slug[0] : '0-9';
    return 'https://glossary.slb.com/en/terms/' + first + '/' + slug;
  }

  function letterOf(term) {
    const c = plain(term).trim().charAt(0).toUpperCase();
    return /[A-Z]/.test(c) ? c : '#';
  }

  // Deterministic PRNG so tests (and "term of the day") are repeatable.
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(arr, rand) {
    const a = arr.slice(), r = rand || Math.random;
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  // Calendar day number in local time (days since 1970-01-01).
  function dayNumber(d) {
    const x = d || new Date();
    return Math.floor((Date.UTC(x.getFullYear(), x.getMonth(), x.getDate())) / 86400000);
  }

  // Leitner boxes 1–5. "Got it" moves a card up one box, "again" sends it to box 1.
  const INTERVALS = [0, 1, 3, 7, 16, 35]; // days until due, by box (index 0 unused)
  function review(box, gotIt, today) {
    const b = gotIt ? Math.min(5, (box || 0) + 1) : 1;
    return { box: b, due: today + (gotIt ? INTERVALS[b] : 0) };
  }

  // Multiple-choice options: the right answer plus distractors, preferring terms from the same discipline.
  function mcq(target, pool, n, rand) {
    const r = rand || Math.random;
    const same = pool.filter(t => t.id !== target.id && t.disc.some(d => target.disc.includes(d)));
    const other = pool.filter(t => t.id !== target.id && !same.includes(t));
    const picks = shuffle(same, r).slice(0, n - 1);
    if (picks.length < n - 1) picks.push(...shuffle(other, r).slice(0, n - 1 - picks.length));
    return shuffle([target, ...picks], r);
  }

  // Answer check with a relative tolerance (absolute for values near zero).
  function close(guess, value, tol) {
    if (!isFinite(guess)) return false;
    const t = tol == null ? 0.01 : tol;
    return Math.abs(guess - value) <= Math.max(Math.abs(value) * t, t * 0.5);
  }

  // Consecutive study days ending today (or yesterday, if today has no activity yet).
  function streak(days, today) {
    let d = days[today] ? today : today - 1, n = 0;
    while (days[d]) { n++; d--; }
    return n;
  }

  // Abbreviations and symbols named in the definitions ("Abbreviated AVO." / "Symbol Rw.")
  // plus acronym entries whose definition starts "Full name: ...".
  function acronyms(terms) {
    const out = [], seen = new Set();
    const add = (abbr, full, t, kind) => {
      abbr = plain(abbr).trim();
      if (!abbr || abbr.length > 14) return;
      const k = abbr.toLowerCase() + '|' + plain(full).toLowerCase();
      if (seen.has(k)) return;
      seen.add(k); out.push({ abbr, full, id: t.id, disc: t.disc, kind });
    };
    for (const t of terms) {
      const d = plain(t.def);
      let m = /\bAbbreviated ([^.]+)\./.exec(d);
      if (m) m[1].replace(/\s*\(.*$/, '').split(/,\s*| or /).forEach(a => add(a, t.term, t, 'abbr'));
      m = /\bSymbols? ([^.]+)\./.exec(d);
      if (m) m[1].split(/,\s*| or | and /).forEach(a => add(a, t.term, t, 'symbol'));
      if (/^[A-Z0-9&/-]{2,10}$/.test(t.term)) {
        m = /^([^:.]{4,80}):/.exec(d);
        add(t.term, m ? m[1] : t.term, t, 'abbr');
      }
    }
    return out.sort((a, b) => a.abbr.localeCompare(b.abbr, 'en', { sensitivity: 'base' }));
  }

  // "See also": other glossary terms whose names appear in a definition (longest match first).
  const GENERIC = new Set(['water', 'fluid', 'fluids', 'pressure', 'depth', 'layer', 'surface', 'phase', 'sample', 'energy', 'volume', 'field', 'stage', 'source', 'signal', 'plant', 'force', 'model', 'point', 'curve', 'value', 'rate', 'zone', 'grade', 'drive', 'block', 'crude', 'string', 'joint', 'scale', 'trace', 'sweep', 'slug', 'fines', 'pill', 'line', 'plug', 'gauge', 'match', 'stand', 'trip', 'target', 'lead', 'play']);
  function relatedIndex(terms) {
    const ids = new Set(terms.map(t => t.id));
    const words = s => plain(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/).filter(Boolean);
    const out = {};
    for (const t of terms) {
      const w = words(t.def), found = [];
      for (let i = 0; i < w.length; i++) {
        for (let n = Math.min(5, w.length - i); n >= 1; n--) {
          const g = w.slice(i, i + n), key = g.join('-'), key2 = key.replace(/s$/, '');
          const hit = ids.has(key) ? key : ids.has(key2) ? key2 : null;
          if (!hit || hit === t.id || found.includes(hit)) continue;
          if (n === 1 && (hit.length < 5 || GENERIC.has(hit))) continue;
          found.push(hit); i += n - 1; break;
        }
      }
      if (found.length) out[t.id] = found.slice(0, 4);
    }
    return out;
  }

  // Oilfield unit conversion. Factors convert one unit to the group's first unit.
  const UNITS = {
    pressure: { label: 'Pressure', u: { psi: 1, kPa: 0.1450377, bar: 14.50377, MPa: 145.0377, atm: 14.69595, 'kg/cm²': 14.22334 } },
    length: { label: 'Length / depth', u: { ft: 1, m: 3.280840, in: 1 / 12, cm: 0.0328084, km: 3280.840, mi: 5280 } },
    liquid: { label: 'Liquid volume', u: { bbl: 1, 'm³': 6.289811, gal: 1 / 42, L: 0.006289811, 'ft³': 0.1781076 } },
    gas: { label: 'Gas volume', u: { scf: 1, Mscf: 1e3, MMscf: 1e6, 'm³': 35.31467, 'thousand m³': 35314.67 } },
    rate: { label: 'Liquid rate', u: { 'bbl/d': 1, 'm³/d': 6.289811, 'bbl/min': 1440, gpm: 1440 / 42, 'L/min': 9.057328 } },
    density: { label: 'Mud weight / density', u: { ppg: 1, SG: 8.345404, 'g/cm³': 8.345404, 'kg/m³': 0.008345404, 'lb/ft³': 0.1336806, 'psi/ft': 1 / 0.052 } },
    perm: { label: 'Permeability', u: { mD: 1, D: 1000, 'µm²': 1013.250, 'm²': 1.013250e15 } },
    viscosity: { label: 'Viscosity', u: { cP: 1, 'mPa·s': 1, 'Pa·s': 1000, P: 100 } },
    mass: { label: 'Mass', u: { lb: 1, kg: 2.204623, 'short ton': 2000, tonne: 2204.623 } },
    temperature: { label: 'Temperature', u: { '°F': 1, '°C': 1, K: 1, '°R': 1 } },
  };
  function convert(v, group, from, to) {
    if (!isFinite(v) || !UNITS[group]) return NaN;
    if (group === 'temperature') {
      const toF = { '°F': x => x, '°C': x => x * 9 / 5 + 32, K: x => (x - 273.15) * 9 / 5 + 32, '°R': x => x - 459.67 };
      const fromF = { '°F': x => x, '°C': x => (x - 32) * 5 / 9, K: x => (x - 32) * 5 / 9 + 273.15, '°R': x => x + 459.67 };
      return toF[from] && fromF[to] ? fromF[to](toF[from](v)) : NaN;
    }
    const u = UNITS[group].u;
    return u[from] && u[to] ? v * u[from] / u[to] : NaN;
  }

  // Field-unit calculators (oilfield units: ppg, ft, psi, bbl, in).
  const calc = {
    hydrostatic: (mw, tvd) => 0.052 * mw * tvd,                               // psi
    killMW: (omw, sidpp, tvd) => omw + sidpp / (0.052 * tvd),                  // ppg
    ecd: (mw, apl, tvd) => mw + apl / (0.052 * tvd),                           // ppg
    api: sg => 141.5 / sg - 131.5,                                             // °API
    sgFromApi: api => 141.5 / (api + 131.5),
    ooip: (area, h, phi, sw, bo) => 7758 * area * h * phi * (1 - sw) / bo,     // STB (acres, ft)
    annCap: (dh, dp) => (dh * dh - dp * dp) / 1029.4,                          // bbl/ft (in)
    archieSw: (rw, rt, phi, a, m, n) => Math.pow(a * rw / (Math.pow(phi, m) * rt), 1 / n),
  };

  const api = { esc, rich, plain, termId, slbUrl, letterOf, rng, shuffle, dayNumber, review, INTERVALS, mcq, close, streak, acronyms, relatedIndex, UNITS, convert, calc };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Lib = api;
})(typeof self !== 'undefined' ? self : this);
