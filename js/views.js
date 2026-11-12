// ---- Views: each one renders into the main panel ----
// Every string from the data files goes through Lib.rich (allows only sub/sup/i/b/br) or Lib.esc.
const Views = (() => {
  const { esc, rich, plain } = Lib;
  const $ = (sel, el) => (el || document).querySelector(sel);
  const $$ = (sel, el) => Array.from((el || document).querySelectorAll(sel));
  const D = () => App.data;

  // Inline style attributes are blocked by the CSP, so widths are applied after render from data-w.
  function widths(root) { $$('[data-w]', root).forEach(el => { el.style.width = el.dataset.w + '%'; }); }
  const chip = code => `<span class="dchip d-${esc(code)}" title="${esc(D().discMap[code].name)}">${esc(D().discMap[code].name)}</span>`;
  const chipShort = code => `<span class="dchip d-${esc(code)}">${esc(code)}</span>`;
  function header(title, sub, actions) {
    return `<header class="ph"><div><h1>${title}</h1>${sub ? `<p class="ph-sub">${sub}</p>` : ''}</div>${actions ? `<div class="ph-act">${actions}</div>` : ''}</header>`;
  }
  const fmtPct = (a, b) => b ? Math.round(100 * a / b) : 0;

  // Read a term and its definition aloud (browser speech, no network).
  function speak(text) {
    if (!('speechSynthesis' in window)) { App.toast('Read-aloud is not supported in this browser'); return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = 0.95;
    speechSynthesis.speak(u);
  }
  const SPEAKER = '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>';
  const randomTerm = list => list[Math.floor(Math.random() * list.length)];
  // Scroll to an element in a long list whose off-screen cards use estimated heights
  // (content-visibility). Long jumps are instant, then re-aimed once nearby cards have drawn.
  function jumpTo(el, block) {
    const far = Math.abs(el.getBoundingClientRect().top) > 2500;
    el.scrollIntoView({ block, behavior: FX.on() && !far ? 'smooth' : 'auto' });
    if (far) {
      const again = () => el.scrollIntoView({ block, behavior: 'auto' });
      requestAnimationFrame(() => requestAnimationFrame(again));
      setTimeout(again, 160);
    }
  }

  // Field calculators shown on the Tools page (formulas from Lib.calc, oilfield units).
  const C = Lib.calc;
  const CALCS = [
    { id: 'hydro', title: 'Hydrostatic pressure', f: 'P = 0.052 × MW × TVD', inputs: [['mw', 'Mud weight', 'ppg', 10], ['tvd', 'True vertical depth', 'ft', 10000]], outLabel: 'P =', unit: 'psi', run: v => C.hydrostatic(v.mw, v.tvd) },
    { id: 'grad', title: 'Pressure gradient', f: 'G = 0.052 × MW', inputs: [['mw', 'Fluid density', 'ppg', 8.6]], outLabel: 'G =', unit: 'psi/ft', run: v => 0.052 * v.mw, note: 'Fresh water is about 0.433 psi/ft; a typical normal pore-pressure gradient is 0.465 psi/ft.' },
    { id: 'kill', title: 'Kill mud weight', f: 'KMW = OMW + SIDPP ÷ (0.052 × TVD)', inputs: [['omw', 'Original mud weight', 'ppg', 10], ['sidpp', 'Shut-in drillpipe pressure', 'psi', 500], ['tvd', 'True vertical depth', 'ft', 10000]], outLabel: 'KMW =', unit: 'ppg', run: v => C.killMW(v.omw, v.sidpp, v.tvd), note: 'Round up to the next 0.1 ppg in practice.' },
    { id: 'ecd', title: 'Equivalent circulating density', f: 'ECD = MW + APL ÷ (0.052 × TVD)', inputs: [['mw', 'Mud weight', 'ppg', 10], ['apl', 'Annular pressure loss', 'psi', 300], ['tvd', 'True vertical depth', 'ft', 10000]], outLabel: 'ECD =', unit: 'ppg', run: v => C.ecd(v.mw, v.apl, v.tvd) },
    { id: 'api', title: 'API gravity', f: '°API = 141.5 ÷ SG − 131.5', inputs: [['sg', 'Specific gravity at 60 °F', '', 0.85]], outLabel: 'Gravity =', unit: '°API', run: v => C.api(v.sg), note: 'Water (SG 1.0) is 10 °API. Heavy oil is below about 22 °API.' },
    { id: 'ooip', title: 'Volumetric OOIP', f: 'N = 7758 A h φ (1 − S<sub>w</sub>) ÷ B<sub>o</sub>', inputs: [['a', 'Area', 'acres', 640], ['h', 'Net pay', 'ft', 50], ['phi', 'Porosity φ', 'fraction', 0.2], ['sw', 'Water saturation S<sub>w</sub>', 'fraction', 0.3], ['bo', 'B<sub>o</sub>', 'rb/STB', 1.2]], outLabel: 'N =', unit: 'STB', run: v => C.ooip(v.a, v.h, v.phi, v.sw, v.bo), note: '7758 is barrels per acre-foot.' },
    { id: 'ann', title: 'Annular capacity', f: 'C = (D<sub>h</sub>² − D<sub>p</sub>²) ÷ 1029.4', inputs: [['dh', 'Hole or casing ID', 'in', 8.5], ['dp', 'Pipe OD', 'in', 5]], outLabel: 'C =', unit: 'bbl/ft', run: v => C.annCap(v.dh, v.dp), note: 'Set pipe OD to 0 for the capacity of an open hole or a pipe bore.' },
    { id: 'archie', title: 'Archie water saturation', f: 'S<sub>w</sub> = (a R<sub>w</sub> ÷ (φ<sup>m</sup> R<sub>t</sub>))<sup>1/n</sup>', inputs: [['rw', 'R<sub>w</sub>', 'ohm·m', 0.05], ['rt', 'R<sub>t</sub>', 'ohm·m', 20], ['phi', 'Porosity φ', 'fraction', 0.2], ['a', 'Tortuosity a', '', 1], ['m', 'Cementation m', '', 2], ['n', 'Saturation n', '', 2]], outLabel: 'S<sub>w</sub> =', unit: 'fraction', run: v => C.archieSw(v.rw, v.rt, v.phi, v.a, v.m, v.n), note: 'For clean (shale-free) formations only.' },
  ];

  function features() {
    const d = D(), nAbbr = d.acr.length;
    return [
      ['#/glossary', 'Glossary A–Z', `${d.terms.length.toLocaleString()} terms in ${d.disc.length} disciplines. Search, filter, star, add your own notes, hear a term read aloud, follow “see also” links, or cover the definitions to test yourself.`],
      ['#/cards', 'Flashcards', 'Spaced repetition (Leitner boxes). Decks for due, new, starred, not mastered and missed-in-quiz cards, any discipline or letter.'],
      ['#/practice', 'Practice', 'Five modes: name the term, pick the definition, acronyms, concept questions with explanations, and a 15-minute exam drill.'],
      ['#/acronyms', 'Acronyms and symbols', `${nAbbr} abbreviations and symbols from the definitions, searchable, with a quiz.`],
      ['#/tools', 'Tools', `Unit converter (${Object.keys(Lib.UNITS).length} unit groups), ${CALCS.length} field calculators and every cheat-sheet equation on one page.`],
      ['#/notes', 'Cheat sheets', 'One printable page per discipline: key ideas, equations and a tip.'],
      ['#/exercises', 'Exercises', `${d.ex.problems.length} worked problems with step-by-step solutions and ${d.ex.projects.length} mini projects.`],
      ['#/resources', 'Resources', 'Free references collected in one place.'],
      ['help', 'Keyboard shortcuts', 'Press ? anywhere to see them. / searches, R opens a random term.'],
      [null, 'Daily goal and streak', 'Set a target number of reviews a day above. Progress stays in this browser; export or import it from the footer.'],
    ];
  }

  // =====================================================================================
  // Dashboard (stat cards, activity chart, discipline table, letter heat map)
  // =====================================================================================
  function dashboard(root) {
    const s = Store.s, terms = D().terms, today = Store.today();
    const seen = terms.filter(t => s.seen[t.id]).length;
    const mastered = terms.filter(t => Store.mastered(t.id)).length;
    const due = terms.filter(t => Store.isDue(t.id)).length;
    const acc = s.quiz.n ? 100 * s.quiz.ok / s.quiz.n : 0;
    const streak = Lib.streak(s.days, today);
    const todayN = s.days[today] || 0;
    const tod = terms[Math.floor(Lib.rng(today)() * terms.length)];

    const days = Array.from({ length: 14 }, (_, i) => today - 13 + i);
    const vals = days.map(d => s.days[d] || 0), vmax = Math.max(5, ...vals);
    const bw = 100 / 14;
    const bars = days.map((d, i) => {
      const v = vals[i], hgt = 100 * v / vmax, dt = new Date(d * 86400000);
      const lab = dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
      return `<g class="bar${d === today ? ' now' : ''}"><title>${esc(lab)}: ${v} reviews</title><rect x="${(i * bw + bw * 0.18).toFixed(2)}" y="${(100 - hgt).toFixed(2)}" width="${(bw * 0.64).toFixed(2)}" height="${Math.max(0.6, hgt).toFixed(2)}" rx="0.8"></rect></g>`;
    }).join('');
    const dayLabels = days.filter((_, i) => i % 2 === 1).map(d => `<span>${esc(new Date(d * 86400000).toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' }))}</span>`).join('');

    const rows = D().disc.map(dd => {
      const list = terms.filter(t => t.disc.includes(dd.code));
      const m = list.filter(t => Store.mastered(t.id)).length, sn = list.filter(t => s.seen[t.id]).length;
      return { dd, n: list.length, m, sn, p: fmtPct(m, list.length), ps: fmtPct(sn, list.length) };
    });
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(L => {
      const list = terms.filter(t => t.letter === L), m = list.filter(t => Store.mastered(t.id)).length;
      const lvl = !list.length ? 'none' : m === list.length ? 'l4' : m / list.length >= 0.5 ? 'l3' : m > 0 ? 'l2' : list.some(t => s.seen[t.id]) ? 'l1' : 'l0';
      return `<a class="ltile ${lvl}" href="#/glossary?l=${L}" ${list.length ? '' : 'aria-disabled="true" tabindex="-1"'}><b>${L}</b><span>${list.length}</span></a>`;
    }).join('');
    const boxes = [1, 2, 3, 4, 5].map(b => terms.filter(t => s.box[t.id] === b).length);
    const unseen = terms.length - terms.filter(t => s.box[t.id]).length;

    root.innerHTML = `
      <section class="hero glow">
        <canvas class="seis" aria-hidden="true"></canvas>
        <div class="hero-in">
          <p class="eyebrow">a review notebook for petroleum engineering</p>
          <h1 class="hero-h">Oilfield terms,<br><span class="az">A</span> to <span class="az">Z</span></h1>
          <p class="hero-p">${terms.length.toLocaleString()} terms across all ${D().disc.length} disciplines, each with its own short definition. Flip them as flashcards, quiz yourself, read the cheat sheets or work through the exam problems.</p>
          <div class="hero-act"><a class="btn primary" href="#/cards?deck=${due ? 'due' : 'all'}">${due ? `Review ${due} due card${due > 1 ? 's' : ''}` : 'Start flashcards'}</a><a class="btn" href="#/glossary">Browse A–Z</a><a class="btn" href="#/practice">Take a quiz</a></div>
          <div class="goal${todayN >= s.goal ? ' met' : ''}" id="goal">
            <span class="goal-k">Today's goal</span>
            <div class="goal-track"><span id="goalFill" data-w="${Math.min(100, fmtPct(todayN, s.goal))}"></span></div>
            <span class="goal-n"><b>${todayN}</b> of <select id="goalSel" aria-label="Daily goal">${[10, 20, 30, 50, 100, 200].concat([10, 20, 30, 50, 100, 200].includes(s.goal) ? [] : [s.goal]).map(n => `<option value="${n}" ${n === s.goal ? 'selected' : ''}>${n}</option>`).join('')}</select> reviews${todayN >= s.goal ? ' ✓' : ''}</span>
          </div>
        </div>
        <button type="button" class="tod" id="tod" aria-label="Term of the day, click to reveal the definition">
          <span class="tod-k">Term of the day</span>
          <span class="tod-t">${esc(tod.term)}</span>
          <span class="tod-d" id="todDef">Click to reveal</span>
          <span class="tod-c">${tod.disc.map(chipShort).join('')}</span>
        </button>
      </section>

      <section class="stats">
        ${[['Terms', terms.length, 0, `${D().disc.length} disciplines`], ['Studied', seen, 0, `${fmtPct(seen, terms.length)}% of the deck`], ['Mastered', mastered, 0, `${due} due for review`],
           ['Day streak', streak, 0, `best ${Math.max(s.best, streak)} · ${todayN} today`], ['Quiz accuracy', acc, 0, `${s.quiz.ok}/${s.quiz.n} answers`]]
          .map(([k, v, d, sub], i) => `<div class="stat glow"><span class="stat-k">${k}</span><span class="stat-v" data-count="${v}" data-dec="${d}">0</span>${i === 4 ? '<span class="stat-u">%</span>' : ''}<span class="stat-s">${esc(sub)}</span></div>`).join('')}
      </section>

      <div class="grid2">
        <section class="panel">
          <header class="panel-h"><h2>Activity</h2><span class="muted">Reviews and answers, last 14 days</span></header>
          <div class="chartbox"><svg class="chart" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Reviews per day for the last 14 days">${bars}</svg>${vals.some(v => v) ? '' : '<p class="chart-empty muted">No reviews yet. Flip a few flashcards or take a quiz and your activity shows up here.</p>'}</div>
          <div class="chart-x">${dayLabels}</div>
        </section>
        <section class="panel">
          <header class="panel-h"><h2>Flashcard boxes</h2><span class="muted">Leitner spaced repetition</span></header>
          <div class="boxes">${['New', 'Box 1', 'Box 2', 'Box 3', 'Box 4', 'Box 5'].map((b, i) => { const v = i ? boxes[i - 1] : unseen; return `<div class="boxcol"><div class="boxbar"><span class="b${i}" data-h="${fmtPct(v, terms.length)}"></span></div><b>${v}</b><span>${b}</span></div>`; }).join('')}</div>
          <p class="muted small">Cards move up a box when you know them and back to box 1 when you don't. Box 5 counts as mastered.</p>
        </section>
      </div>

      <div class="grid2 wide-right">
        <section class="panel tape">
          <header class="panel-h"><h2>How to use this</h2><span class="muted">a routine that works</span></header>
          <ol class="howto">
            <li><span>Pick a discipline and read its <a href="#/notes">cheat sheet</a> first.</span></li>
            <li><span>Run that discipline's <a href="#/cards">flashcards</a> until most cards reach box 3.</span></li>
            <li><span>Take the <a href="#/practice?mode=concept">concept quiz</a>, then try the <a href="#/exercises">worked problems</a>.</span></li>
            <li><span>Need the exact wording for an exam? Every term links to the official SLB entry.</span></li>
          </ol>
        </section>
        <section class="panel">
          <header class="panel-h"><h2>Features</h2><span class="muted">everything in this notebook</span></header>
          <ul class="features">
            ${features().map(([href, name, text]) => `<li>${href === 'help' ? `<button type="button" class="linkbtn" data-help>${name}</button>` : href ? `<a href="${href}">${name}</a>` : `<b>${name}</b>`}<span>${text}</span></li>`).join('')}
          </ul>
        </section>
      </div>

      <div class="grid2 wide-left">
        <section class="panel">
          <header class="panel-h"><h2>Disciplines</h2><span class="muted">All ${D().disc.length}, as listed in the SLB Energy Glossary</span></header>
          <div class="dtable" role="table">
            <div class="drow dhead" role="row"><span role="columnheader">Discipline</span><span role="columnheader">Terms</span><span role="columnheader">Mastered</span></div>
            ${rows.map(r => `<a class="drow d-${r.dd.code}" role="row" href="#/glossary?d=${r.dd.code}"><span class="dname" role="cell"><i class="dot d-${r.dd.code}"></i>${esc(r.dd.name)}<span class="dfill seen" data-w="${r.ps}"></span><span class="dfill" data-w="${r.p}"></span></span><span role="cell">${r.n}</span><span role="cell">${r.p}%</span></a>`).join('')}
          </div>
        </section>
        <section class="panel">
          <header class="panel-h"><h2>Letters</h2><span class="muted">filled in as you master them</span></header>
          <div class="letters">${letters}</div>
          <div class="legend"><span class="ltile l0 sm"></span>new <span class="ltile l1 sm"></span>seen <span class="ltile l2 sm"></span>started <span class="ltile l3 sm"></span>half <span class="ltile l4 sm"></span>all</div>
        </section>
      </div>`;

    widths(root);
    $$('.boxbar span', root).forEach(el => { el.style.height = Math.max(2, +el.dataset.h) + '%'; });
    $$('[data-count]', root).forEach(el => FX.countUp(el, +el.dataset.count, +el.dataset.dec));
    FX.seismic($('.seis', root));
    $('#goalSel', root).onchange = e => {
      Store.s.goal = +e.target.value; Store.save();
      $('#goalFill', root).style.width = Math.min(100, fmtPct(todayN, Store.s.goal)) + '%';
      $('#goal', root).classList.toggle('met', todayN >= Store.s.goal);
    };
    $$('[data-help]', root).forEach(b => { b.onclick = () => App.help(true); });
    let open = false;
    $('#tod', root).onclick = () => {
      open = !open;
      const el = $('#todDef', root);
      if (open) { FX.typewrite(el, plain(tod.def)); Store.seen(tod.id); } else el.textContent = 'Click to reveal';
      $('#tod', root).classList.toggle('open', open);
    };
  }

  // =====================================================================================
  // Glossary A–Z
  // =====================================================================================
  let coverOn = false;
  function glossary(root, q) {
    const terms = D().terms;
    const sel = new Set((q.d || '').split(',').filter(c => D().discMap[c]));
    let status = ['star', 'todo', 'done'].includes(q.s) ? q.s : 'all';
    let query = q.q || '';
    const counts = {};
    for (const t of terms) for (const c of t.disc) counts[c] = (counts[c] || 0) + 1;

    root.innerHTML = header('Glossary A–Z', `${terms.length.toLocaleString()} terms. Search, filter by discipline, star the ones that keep tripping you up.`,
      `<button type="button" class="btn" id="rand">Random term</button><button type="button" class="btn" id="cover" aria-pressed="${coverOn}">Cover definitions</button><button type="button" class="btn" id="printL">Print list</button><a class="btn" id="toCards" href="#/cards">Study as flashcards</a>`) + `
      <div class="gl">
        <details class="gl-side panel" id="glside" open>
          <summary>Filters<span class="muted small" id="fsum"></span></summary>
          <div class="gl-sec">
            <div class="gl-h"><h2>Discipline</h2><button type="button" class="linkbtn" id="dAll">Clear</button></div>
            <ul class="dlist">${D().disc.map(dd => `<li><label class="dcheck"><input type="checkbox" value="${dd.code}" ${sel.has(dd.code) ? 'checked' : ''}><span class="box d-${dd.code}"></span><span class="nm">${esc(dd.name)}</span><span class="ct">${counts[dd.code] || 0}</span></label></li>`).join('')}</ul>
          </div>
          <div class="gl-sec">
            <div class="gl-h"><h2>Status</h2></div>
            <div class="seg vert" role="group" aria-label="Status">${[['all', 'All terms'], ['star', 'Starred ★'], ['todo', 'Not mastered'], ['done', 'Mastered']].map(([k, l]) => `<button type="button" data-status="${k}" aria-pressed="${k === status}">${l}</button>`).join('')}</div>
          </div>
        </details>
        <div class="gl-main">
          <div class="gl-top">
            <label class="search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input type="search" id="gq" placeholder="Search terms and definitions   ( / )" value="${esc(query)}" aria-label="Search"></label>
            <nav class="azbar" id="azbar" aria-label="Jump to letter">${'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(L => `<button type="button" data-l="${L}">${L}</button>`).join('')}</nav>
            <p class="muted small" id="gcount"></p>
          </div>
          <div id="glist"></div>
        </div>
        <div class="depth" id="depth" aria-hidden="true"><div class="pipe"><span class="bit"></span></div><b class="depth-l">A</b><span class="depth-ft">0 ft</span></div>
      </div>`;

    const list = $('#glist', root);
    list.classList.toggle('cover', coverOn);
    if (window.matchMedia && matchMedia('(max-width: 760px)').matches) $('#glside', root).open = false;
    function filtered() {
      const qq = query.trim().toLowerCase();
      return terms.filter(t =>
        (!sel.size || t.disc.some(c => sel.has(c))) &&
        (status === 'all' || (status === 'star' && Store.s.star[t.id]) || (status === 'done' && Store.mastered(t.id)) || (status === 'todo' && !Store.mastered(t.id))) &&
        (!qq || t.term.toLowerCase().includes(qq) || t.plain.toLowerCase().includes(qq)));
    }
    function mark(text) {
      const qq = query.trim();
      if (!qq) return esc(text);
      const i = text.toLowerCase().indexOf(qq.toLowerCase());
      return i < 0 ? esc(text) : esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + qq.length)) + '</mark>' + esc(text.slice(i + qq.length));
    }
    function card(t) {
      const st = Store.s.star[t.id], kn = Store.mastered(t.id), note = Store.s.notes[t.id];
      const rel = (D().related[t.id] || []).map(id => D().byId[id]).filter(Boolean);
      return `<article class="term glow${kn ? ' known' : ''}" id="t-${t.id}" data-id="${t.id}">
        <header class="term-h"><h3>${mark(t.term)}</h3>
          <div class="acts">
            <button type="button" class="ic say" title="Read aloud" aria-label="Read ${esc(t.term)} aloud">${SPEAKER}</button>
            <button type="button" class="ic star" aria-pressed="${!!st}" title="Star" aria-label="Star ${esc(t.term)}"><svg viewBox="0 0 24 24"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg></button>
            <button type="button" class="ic know" aria-pressed="${kn}" title="Mark as mastered" aria-label="Mark ${esc(t.term)} as mastered"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></button>
          </div></header>
        <p class="def">${rich(t.def)}</p>
        ${rel.length ? `<p class="see">see also ${rel.map(r => `<a href="#/glossary?t=${r.id}" data-goto="${r.id}">${esc(r.term)}</a>`).join(', ')}</p>` : ''}
        <footer class="term-f"><span class="chips">${t.disc.map(chip).join('')}</span>
          <span class="links"><button type="button" class="linkbtn notebtn">${note ? 'My note ✎' : 'Add note'}</button>${t.slb ? `<a class="slb" href="${esc(t.slb)}" target="_blank" rel="noopener noreferrer">official SLB wording ↗</a>` : ''}</span></footer>
        <div class="mynote" ${note ? '' : 'hidden'}><textarea rows="2" maxlength="2000" placeholder="Your own note (saved in this browser)" aria-label="Your note for ${esc(t.term)}"></textarea></div>
      </article>`;
    }
    let current = 'A';
    function render() {
      const ts = filtered();
      $('#gcount', root).textContent = `${ts.length} of ${terms.length} terms` + (sel.size ? ` · ${sel.size} discipline${sel.size > 1 ? 's' : ''}` : '');
      $('#fsum', root).textContent = sel.size || status !== 'all' ? ` · ${sel.size + (status !== 'all' ? 1 : 0)} active` : '';
      const by = {};
      for (const t of ts) (by[t.letter] = by[t.letter] || []).push(t);
      const Ls = Object.keys(by).sort();
      list.innerHTML = Ls.length ? Ls.map(L => `<section class="lsec" data-l="${L}"><h2 class="lhead" id="L-${L}"><span>${L}</span><small>${by[L].length}</small></h2>${by[L].map(card).join('')}</section>`).join('')
        : `<div class="empty panel"><p><b>No terms match.</b></p><p class="muted">Try another spelling, clear the discipline filter, or switch the status to “All terms”.</p></div>`;
      $$('.mynote textarea', list).forEach(ta => { ta.value = Store.s.notes[ta.closest('.term').dataset.id] || ''; });
      $$('#azbar button', root).forEach(b => { b.disabled = !by[b.dataset.l]; });
      const p = new URLSearchParams();
      if (sel.size) p.set('d', [...sel].join(','));
      if (status !== 'all') p.set('s', status);
      $('#toCards', root).href = '#/cards' + (sel.size ? '?deck=' + [...sel].join(',') : '');
      App.replaceQuery('glossary', p.toString() + (query ? (p.toString() ? '&' : '') + 'q=' + encodeURIComponent(query) : ''));
      observe();
      gauge();
    }
    // letter tracking for the depth gauge
    let io = null;
    function observe() {
      if (io) io.disconnect();
      io = new IntersectionObserver(es => { for (const e of es) if (e.isIntersecting) { current = e.target.closest('.lsec').dataset.l; $$('#azbar button', root).forEach(b => b.classList.toggle('cur', b.dataset.l === current)); } }, { rootMargin: '0px 0px -75% 0px' });
      $$('.lhead', list).forEach(h => io.observe(h));
    }
    const gauge = FX.depthGauge($('#depth', root), () => current);

    // events
    $$('.dlist input', root).forEach(cb => cb.onchange = () => { cb.checked ? sel.add(cb.value) : sel.delete(cb.value); render(); });
    $('#dAll', root).onclick = () => { sel.clear(); $$('.dlist input', root).forEach(cb => { cb.checked = false; }); render(); };
    $$('[data-status]', root).forEach(b => b.onclick = () => { status = b.dataset.status; $$('[data-status]', root).forEach(x => x.setAttribute('aria-pressed', x === b)); render(); });
    let deb = 0;
    $('#gq', root).oninput = e => { clearTimeout(deb); deb = setTimeout(() => { query = e.target.value; render(); }, 120); };
    $('#azbar', root).onclick = e => {
      const b = e.target.closest('button'); if (!b || b.disabled) return;
      const h = $('#L-' + b.dataset.l, root);
      if (h) { jumpTo(h, 'start'); FX.pop(h); }
    };
    list.addEventListener('click', e => {
      const art = e.target.closest('.term'); if (!art) return;
      const id = art.dataset.id;
      const go = e.target.closest('[data-goto]');
      if (go) {
        const el = $('#t-' + go.dataset.goto, root);
        if (el) { e.preventDefault(); spot(el); }
        return;
      }
      if (e.target.closest('.say')) { speak(t2s(id)); Store.seen(id); FX.pop(e.target.closest('.say')); return; }
      if (art.closest('.cover') && e.target.closest('.def')) { art.classList.toggle('shown'); if (art.classList.contains('shown')) Store.seen(id); return; }
      if (e.target.closest('.star')) {
        const on = Store.toggle('star', id); e.target.closest('.star').setAttribute('aria-pressed', on); FX.pop(e.target.closest('.star'));
      } else if (e.target.closest('.know')) {
        const btn = e.target.closest('.know'), was = Store.mastered(id);
        if (was) { delete Store.s.known[id]; if (Store.s.box[id] >= 5) Store.s.box[id] = 4; } else { Store.s.known[id] = 1; Store.s.seen[id] = 1; Store.bump(1); }
        Store.save();
        btn.setAttribute('aria-pressed', !was); art.classList.toggle('known', !was);
        if (!was) { FX.stamp(art); FX.gusherFrom(btn, 24); }
      } else if (e.target.closest('.notebtn')) {
        const box = $('.mynote', art); box.hidden = !box.hidden; if (!box.hidden) $('textarea', box).focus();
      } else if (e.target.closest('.slb')) {
        Store.seen(id);
      }
    });
    list.addEventListener('input', e => {
      const ta = e.target.closest('.mynote textarea'); if (!ta) return;
      const id = ta.closest('.term').dataset.id;
      if (ta.value.trim()) Store.s.notes[id] = ta.value.slice(0, 2000); else delete Store.s.notes[id];
      Store.save();
      $('.notebtn', ta.closest('.term')).textContent = ta.value.trim() ? 'My note ✎' : 'Add note';
    });
    const t2s = id => { const t = D().byId[id]; return t.term + '. ' + plain(t.def); };
    function spot(el) {
      jumpTo(el, 'center');
      el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
      Store.seen(el.dataset.id);
    }
    $('#rand', root).onclick = () => {
      const ts = filtered(); if (!ts.length) return;
      const el = $('#t-' + randomTerm(ts).id, root); if (el) spot(el);
    };
    $('#cover', root).onclick = e => {
      coverOn = !coverOn; e.currentTarget.setAttribute('aria-pressed', coverOn);
      list.classList.toggle('cover', coverOn); $$('.term.shown', list).forEach(a => a.classList.remove('shown'));
      App.toast(coverOn ? 'Definitions covered. Click one to check yourself.' : 'Definitions shown');
    };
    $('#printL', root).onclick = () => window.print();
    render();
    if (q.focus) setTimeout(() => $('#gq', root).focus(), 30);
    if (q.l) { const h = $('#L-' + q.l, root); if (h) setTimeout(() => jumpTo(h, 'start'), 30); }
    if (q.t) {
      const el = $('#t-' + q.t, root);
      if (el) setTimeout(() => spot(el), 60);
    }
    return { key(e) { if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') { e.preventDefault(); $('#gq', root).focus(); } } };
  }

  // =====================================================================================
  // Flashcards (Leitner spaced repetition, flip and swipe)
  // =====================================================================================
  function deckTerms(deck) {
    const terms = D().terms;
    if (deck === 'due') return terms.filter(t => Store.isDue(t.id));
    if (deck === 'star') return terms.filter(t => Store.s.star[t.id]);
    if (deck === 'todo') return terms.filter(t => !Store.mastered(t.id));
    if (deck === 'new') return terms.filter(t => !Store.s.box[t.id]);
    if (deck === 'miss') return terms.filter(t => Store.s.miss[t.id]);
    if (/^[A-Z]$/.test(deck)) return terms.filter(t => t.letter === deck);
    const codes = (deck || '').split(',').filter(c => D().discMap[c]);
    if (codes.length) return terms.filter(t => t.disc.some(c => codes.includes(c)));
    return terms.slice();
  }
  function deckOptions(cur) {
    const o = [['all', 'All terms'], ['due', 'Due for review'], ['new', 'New cards'], ['todo', 'Not mastered'], ['star', 'Starred'], ['miss', 'Missed in quizzes']];
    return `<optgroup label="Decks">${o.map(([v, l]) => `<option value="${v}" ${v === cur ? 'selected' : ''}>${l} (${deckTerms(v).length})</option>`).join('')}</optgroup>
      <optgroup label="Disciplines">${D().disc.map(dd => `<option value="${dd.code}" ${dd.code === cur ? 'selected' : ''}>${esc(dd.name)} (${deckTerms(dd.code).length})</option>`).join('')}</optgroup>
      <optgroup label="Letters">${'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').filter(L => deckTerms(L).length).map(L => `<option value="${L}" ${L === cur ? 'selected' : ''}>Letter ${L} (${deckTerms(L).length})</option>`).join('')}</optgroup>`;
  }

  function cards(root, q) {
    let deck = q.deck || 'all';
    if (!/^(all|due|new|todo|star|miss|[A-Z]|[A-Z]{2,3}(,[A-Z]{2,3})*)$/.test(deck)) deck = 'all';
    let reverse = q.rev === '1';
    let queue = [], idx = 0, flipped = false, got = 0, again = 0, requeued = new Set();

    root.innerHTML = header('Flashcards', 'Flip with a click or Space. Swipe or press → when you know it, ← when you don\'t.') + `
      <div class="fc-bar panel">
        <label>Deck <select id="deck">${deckOptions(deck)}</select></label>
        <div class="seg" role="group" aria-label="Card direction"><button type="button" id="dirT" aria-pressed="${!reverse}">Term → definition</button><button type="button" id="dirD" aria-pressed="${reverse}">Definition → term</button></div>
        <button type="button" class="btn" id="shuf">Shuffle</button>
      </div>
      <div class="fc-stage">
        <div class="fc-prog"><span id="fcProg"></span><div class="fc-track"><span id="fcFill"></span></div></div>
        <div class="fc-wrap" id="fcWrap"></div>
        <div class="fc-btns">
          <button type="button" class="btn again" id="bAgain"><kbd>←</kbd> Again</button>
          <button type="button" class="btn" id="bFlip"><kbd>Space</kbd> Flip</button>
          <button type="button" class="btn good" id="bGot">Got it <kbd>→</kbd></button>
        </div>
        <p class="muted small center" id="fcInfo"></p>
      </div>`;

    function build(shuffle) {
      const list = deckTerms(deck);
      queue = shuffle ? Lib.shuffle(list) : list.sort((a, b) => (Store.s.box[a.id] || 0) - (Store.s.box[b.id] || 0) || Math.random() - 0.5);
      idx = 0; got = 0; again = 0; requeued = new Set();
      show();
    }
    function show() {
      const wrap = $('#fcWrap', root);
      flipped = false;
      if (!queue.length) {
        wrap.innerHTML = `<div class="fc-done panel"><h2>Nothing in this deck</h2><p class="muted">${deck === 'due' ? 'No cards are due today. Come back tomorrow, or pick another deck.' : deck === 'miss' ? 'No missed quiz answers right now. Wrong answers in term quizzes land here.' : 'Pick another deck above.'}</p></div>`;
        progress(); return;
      }
      if (idx >= queue.length) {
        wrap.innerHTML = `<div class="fc-done panel"><h2>Deck finished</h2><p class="big">${got} <span class="muted">got it</span> · ${again} <span class="muted">again</span></p><p class="muted">Cards you missed will come back first next time.</p><div class="row"><button type="button" class="btn primary" id="restart">Go again</button><a class="btn" href="#/practice">Quiz yourself</a></div></div>`;
        $('#restart', root).onclick = () => build(true);
        FX.rain(); progress(); return;
      }
      const t = queue[idx], box = Store.s.box[t.id] || 0;
      const front = reverse ? `<p class="fc-def">${rich(t.def)}</p>` : `<h2 class="fc-term">${esc(t.term)}</h2>`;
      const back = reverse ? `<h2 class="fc-term">${esc(t.term)}</h2>` : `<p class="fc-def">${rich(t.def)}</p>`;
      wrap.innerHTML = `<div class="fc" id="fc" tabindex="0" role="button" aria-label="Flashcard. Press Space to flip.">
        <div class="fc-in">
          <div class="face front glow"><span class="fc-k">${reverse ? 'Definition' : 'Term'}</span>${front}<span class="fc-meta">${t.disc.map(chipShort).join('')}<span class="boxtag">${box ? 'Box ' + box : 'New'}</span></span><span class="fc-hint">click to flip</span></div>
          <div class="face back glow"><span class="fc-k">${reverse ? 'Term' : 'Definition'}</span>${back}<span class="fc-meta"><button type="button" class="ic say" title="Read aloud" aria-label="Read aloud">${SPEAKER}</button>${t.slb ? `<a href="${esc(t.slb)}" target="_blank" rel="noopener noreferrer">official SLB wording ↗</a>` : ''}</span></div>
        </div>
        <span class="swipe-l">AGAIN</span><span class="swipe-r">GOT IT</span>
      </div>`;
      Store.seen(t.id);
      $('.say', wrap).onclick = e => { e.stopPropagation(); speak(t.term + '. ' + plain(t.def)); };
      drag($('#fc', root));
      progress();
    }
    function progress() {
      const n = queue.length, k = Math.min(idx, n);
      $('#fcProg', root).textContent = n ? `${k} / ${n}` : '0 / 0';
      $('#fcFill', root).style.width = (n ? 100 * k / n : 0) + '%';
      const t = queue[idx];
      $('#fcInfo', root).textContent = t ? (Store.s.box[t.id] ? `Next review if you get it: in ${Lib.INTERVALS[Math.min(5, (Store.s.box[t.id] || 0) + 1)]} day(s)` : 'New card') : '';
    }
    function flip() { const fc = $('#fc', root); if (!fc) return; flipped = !flipped; fc.classList.toggle('flipped', flipped); }
    function answer(ok) {
      const t = queue[idx], fc = $('#fc', root);
      if (!t || !fc) return;
      const r = Store.review(t.id, ok);
      if (ok) { got++; if (r.box >= 5) { FX.stamp(fc); FX.gusherFrom(fc, 50); } }
      else { again++; FX.shake(fc); if (!requeued.has(t.id)) { requeued.add(t.id); queue.splice(Math.min(queue.length, idx + 4), 0, t); } }
      fc.classList.add(ok ? 'out-r' : 'out-l');
      setTimeout(() => { idx++; show(); }, FX.on() ? 260 : 0);
    }
    function drag(fc) {
      let x0 = 0, dx = 0, down = false, moved = false;
      fc.addEventListener('pointerdown', e => { if (e.target.closest('a, button')) return; down = true; moved = false; x0 = e.clientX; dx = 0; fc.setPointerCapture(e.pointerId); fc.classList.add('dragging'); });
      fc.addEventListener('pointermove', e => {
        if (!down) return;
        dx = e.clientX - x0; if (Math.abs(dx) > 6) moved = true;
        fc.style.setProperty('--dx', dx + 'px'); fc.style.setProperty('--rot', (dx / 18) + 'deg');
        fc.classList.toggle('lean-r', dx > 60); fc.classList.toggle('lean-l', dx < -60);
      });
      const up = () => {
        if (!down) return; down = false; fc.classList.remove('dragging', 'lean-r', 'lean-l');
        fc.style.setProperty('--dx', '0px'); fc.style.setProperty('--rot', '0deg');
        if (!moved) flip(); else if (dx > 110) answer(true); else if (dx < -110) answer(false);
      };
      fc.addEventListener('pointerup', up); fc.addEventListener('pointercancel', up);
    }

    $('#deck', root).onchange = e => { deck = e.target.value; App.replaceQuery('cards', 'deck=' + deck + (reverse ? '&rev=1' : '')); build(false); };
    $('#dirT', root).onclick = () => { reverse = false; $('#dirT', root).setAttribute('aria-pressed', true); $('#dirD', root).setAttribute('aria-pressed', false); show(); };
    $('#dirD', root).onclick = () => { reverse = true; $('#dirT', root).setAttribute('aria-pressed', false); $('#dirD', root).setAttribute('aria-pressed', true); show(); };
    $('#shuf', root).onclick = () => build(true);
    $('#bAgain', root).onclick = () => answer(false);
    $('#bGot', root).onclick = () => answer(true);
    $('#bFlip', root).onclick = flip;
    build(false);
    return { key(e) {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); answer(true); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); answer(false); }
    } };
  }

  // =====================================================================================
  // Practice: term quiz, definition quiz, concept questions, timed exam drill
  // =====================================================================================
  const MODES = {
    term: { name: 'Name the term', desc: 'Read a definition, pick the matching term.', icon: 'Aa' },
    def: { name: 'Pick the definition', desc: 'See a term, choose its definition.', icon: '¶' },
    abbr: { name: 'Acronyms', desc: 'See an abbreviation, pick what it stands for.', icon: 'ABC' },
    concept: { name: 'Concept questions', desc: 'Calculations and ideas, with explanations.', icon: '∑' },
    exam: { name: 'Exam drill', desc: '20 mixed questions against a 15-minute clock.', icon: '15′' },
  };
  function practice(root, q) {
    let mode = MODES[q.mode] ? q.mode : null;
    let disc = D().discMap[q.d] ? q.d : 'all';
    let count = [5, 10, 20].includes(+q.n) ? +q.n : 10;
    let timer = 0;
    const cleanup = () => clearInterval(timer);

    function start() {
      root.innerHTML = header('Practice', 'Pick a mode. Wrong answers show the explanation right away.') + `
        <div class="pr-opts panel">
          <label>Discipline <select id="pd"><option value="all">All disciplines</option>${D().disc.map(dd => `<option value="${dd.code}" ${dd.code === disc ? 'selected' : ''}>${esc(dd.name)}</option>`).join('')}</select></label>
          <label>Questions <select id="pn">${[5, 10, 20].map(n => `<option ${n === count ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        </div>
        <div class="modes">${Object.entries(MODES).map(([k, m]) => `<button type="button" class="mode glow" data-mode="${k}"><span class="mode-i">${m.icon}</span><b>${m.name}</b><span>${m.desc}</span></button>`).join('')}</div>`;
      $('#pd', root).onchange = e => { disc = e.target.value; };
      $('#pn', root).onchange = e => { count = +e.target.value; };
      $$('.mode', root).forEach(b => b.onclick = () => { mode = b.dataset.mode; run(); });
    }

    function makeQuestions() {
      const terms = D().terms.filter(t => disc === 'all' || t.disc.includes(disc));
      const concepts = D().questions.filter(x => disc === 'all' || x.disc === disc);
      const fromTerm = (t, kind) => {
        const opts = Lib.mcq(t, kind === 'term' ? terms.length >= 4 ? terms : D().terms : terms.length >= 4 ? terms : D().terms, 4);
        return kind === 'term'
          ? { prompt: `<p class="q-def">${rich(t.def)}</p>`, kicker: 'Which term is this?', options: opts.map(o => esc(o.term)), answer: opts.indexOf(t), why: `<b>${esc(t.term)}</b>: ${rich(t.def)}`, id: t.id, disc: t.disc[0] }
          : { prompt: `<h2 class="q-term">${esc(t.term)}</h2>`, kicker: 'Which definition matches?', options: opts.map(o => rich(o.def)), answer: opts.indexOf(t), why: '', id: t.id, disc: t.disc[0], long: true };
      };
      const fromConcept = c => {
        const order = Lib.shuffle([0, 1, 2, 3]);
        return { prompt: `<p class="q-text">${rich(c.q)}</p>`, kicker: D().discMap[c.disc].name, options: order.map(i => rich(c.options[i])), answer: order.indexOf(c.answer), why: rich(c.why), disc: c.disc };
      };
      if (mode === 'term' || mode === 'def') return Lib.shuffle(terms).slice(0, count).map(t => fromTerm(t, mode));
      if (mode === 'abbr') {
        const pool = D().acr.filter(a => a.kind === 'abbr');
        const mine = pool.filter(a => disc === 'all' || a.disc.includes(disc));
        return Lib.shuffle(mine.length >= 4 ? mine : pool).slice(0, count).map(a => {
          const fulls = new Set([a.full.toLowerCase()]), others = [];
          for (const b of Lib.shuffle(pool)) { if (others.length === 3) break; if (!fulls.has(b.full.toLowerCase())) { fulls.add(b.full.toLowerCase()); others.push(b); } }
          const opts = Lib.shuffle([a, ...others]);
          return { prompt: `<h2 class="q-term">${esc(a.abbr)}</h2>`, kicker: 'What does it stand for?', options: opts.map(o => esc(o.full)), answer: opts.indexOf(a), why: `<b>${esc(a.abbr)}</b> = ${esc(a.full)}`, id: a.id, disc: a.disc[0] };
        });
      }
      if (mode === 'concept') return Lib.shuffle(concepts).slice(0, count).map(fromConcept);
      const nC = Math.min(10, concepts.length), out = Lib.shuffle(concepts).slice(0, nC).map(fromConcept);
      Lib.shuffle(terms).slice(0, 20 - nC).forEach((t, i) => out.push(fromTerm(t, i % 2 ? 'def' : 'term')));
      return Lib.shuffle(out);
    }

    function run() {
      cleanup();
      const qs = makeQuestions();
      if (!qs.length) { start(); App.toast('No questions for that choice yet.'); return; }
      let i = 0, score = 0, streak = 0, answered = false;
      const missed = [];
      const exam = mode === 'exam';
      let left = 15 * 60;
      root.innerHTML = header(MODES[mode].name, disc === 'all' ? 'All disciplines' : esc(D().discMap[disc].name), `<button type="button" class="btn" id="quit">End</button>`) + `
        <div class="qz">
          <div class="qz-top"><div class="dots" id="dots">${qs.map(() => '<span></span>').join('')}</div><span class="flame" id="flame" title="Streak">streak <b id="streak">0</b></span>${exam ? '<span class="clock" id="clock">15:00</span>' : ''}</div>
          <div class="qz-card panel" id="qcard"></div>
        </div>`;
      $('#quit', root).onclick = finish;
      if (exam) timer = setInterval(() => {
        left--; const c = $('#clock', root); if (!c) return cleanup();
        c.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
        c.classList.toggle('low', left <= 60);
        if (left <= 0) { cleanup(); finish(); }
      }, 1000);

      function show() {
        answered = false;
        const x = qs[i];
        $('#qcard', root).innerHTML = `<p class="kicker">${esc(x.kicker)}</p>${x.prompt}
          <div class="opts${x.long ? ' long' : ''}">${x.options.map((o, k) => `<button type="button" class="opt" data-k="${k}"><kbd>${k + 1}</kbd><span>${o}</span></button>`).join('')}</div>
          <div class="why" id="why" hidden></div>
          <div class="qz-next" hidden id="nextRow"><button type="button" class="btn primary" id="next">${i + 1 < qs.length ? 'Next' : 'See results'} <kbd>Enter</kbd></button></div>`;
        $$('.opt', root).forEach(b => b.onclick = () => pick(+b.dataset.k));
        $('#next', root).onclick = next;
        $$('#dots span', root).forEach((d, k) => d.classList.toggle('cur', k === i));
      }
      function pick(k) {
        if (answered) return;
        answered = true;
        const x = qs[i], ok = k === x.answer, opts = $$('.opt', root);
        opts.forEach((b, j) => { b.disabled = true; if (j === x.answer) b.classList.add('right'); });
        Store.answer(ok, x.id);
        if (x.id) Store.seen(x.id);
        const dot = $$('#dots span', root)[i];
        if (ok) {
          score++; streak++; dot.classList.add('ok'); FX.gusherFrom(opts[k], 30 + Math.min(40, streak * 6));
          if (streak > Store.s.best) { Store.s.best = streak; Store.save(); }
        } else {
          streak = 0; dot.classList.add('bad'); opts[k].classList.add('wrong'); FX.shake($('#qcard', root)); missed.push(x);
        }
        $('#streak', root).textContent = streak;
        $('#flame', root).classList.toggle('hot', streak >= 3);
        FX.pop($('#flame', root));
        const why = $('#why', root);
        if (x.why || !ok) { why.hidden = false; why.innerHTML = `<b>${ok ? 'Correct.' : 'Not quite.'}</b> ${x.why || 'The right answer is highlighted.'}`; why.className = 'why ' + (ok ? 'good' : 'bad'); }
        $('#nextRow', root).hidden = false;
        $('#next', root).focus({ preventScroll: true });
      }
      function next() { if (!answered) return; i++; if (i >= qs.length) finish(); else show(); }
      function finish() {
        cleanup();
        const n = Math.max(1, Math.min(qs.length, i + (answered ? 1 : 0))), pct = Math.round(100 * score / n);
        const R = 52, C = 2 * Math.PI * R;
        root.innerHTML = header('Results', MODES[mode].name) + `
          <div class="res panel">
            <svg class="ring" viewBox="0 0 120 120" role="img" aria-label="${pct}% correct"><circle class="ring-bg" cx="60" cy="60" r="${R}"/><circle class="ring-fg" cx="60" cy="60" r="${R}" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${C.toFixed(1)}"/><text x="60" y="66">${pct}%</text></svg>
            <div><h2>${score} of ${n} correct</h2><p class="muted">${pct >= 90 ? 'Excellent: you know this material.' : pct >= 70 ? 'Solid. Review the misses below.' : pct >= 50 ? 'Getting there. Run the flashcards for this discipline.' : 'Start with the cheat sheet and flashcards, then try again.'}</p>
            <div class="row"><button type="button" class="btn primary" id="again">Try again</button><button type="button" class="btn" id="other">Change mode</button><a class="btn" href="#/cards?deck=${disc === 'all' ? 'todo' : disc}">Flashcards</a></div></div>
          </div>
          ${missed.length ? `<section class="panel"><header class="panel-h"><h2>Review these</h2></header>${missed.map(x => `<div class="miss"><div class="miss-q">${x.prompt}</div><p><b>Answer:</b> ${x.options[x.answer]}</p>${x.why ? `<p class="muted">${x.why}</p>` : ''}</div>`).join('')}</section>` : ''}`;
        requestAnimationFrame(() => { const fg = $('.ring-fg', root); if (fg) fg.style.strokeDashoffset = (C * (1 - pct / 100)).toFixed(1); });
        if (pct >= 80) FX.rain();
        $('#again', root).onclick = run;
        $('#other', root).onclick = start;
      }
      api.key = e => {
        if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
        if (/^[1-4]$/.test(e.key) && !answered && $('.opt', root)) pick(+e.key - 1);
        else if (e.key === 'Enter' && answered) { e.preventDefault(); next(); }
      };
      show();
    }
    const api = { key() {}, leave: cleanup };
    if (mode) run(); else start();
    return api;
  }

  // =====================================================================================
  // Cheat sheets
  // =====================================================================================
  function notes(root, q) {
    const code = D().discMap[q.d] ? q.d : D().disc[0].code;
    const n = D().notes.find(x => x.disc === code), dd = D().discMap[code];
    const cnt = D().terms.filter(t => t.disc.includes(code)).length;
    root.innerHTML = header('Study notes and cheat sheets', 'One page per discipline: key ideas, the equations to memorize and a tip.', `<button type="button" class="btn" id="print">Print / save as PDF</button>`) + `
      <div class="nt">
        <nav class="nt-list panel" aria-label="Disciplines">${D().disc.map(x => `<a href="#/notes?d=${x.code}" class="${x.code === code ? 'cur' : ''}"><i class="dot d-${x.code}"></i>${esc(x.name)}</a>`).join('')}</nav>
        <article class="sheet panel">
          <header class="sheet-h"><span class="dchip d-${code}">${esc(dd.name)}</span><h2>${rich(n ? n.title : dd.name)}</h2></header>
          ${n ? `<h3>Key ideas</h3><ul class="pts">${n.points.map(p => `<li>${rich(p)}</li>`).join('')}</ul>
          ${n.equations.length ? `<h3>Equations</h3><div class="eqs">${n.equations.map(([l, e]) => `<div class="eqrow"><span class="eql">${rich(l)}</span><span class="eq">${rich(e)}</span></div>`).join('')}</div>` : ''}
          <div class="tip"><b>Tip</b> ${rich(n.tip)}</div>` : '<p class="muted">Notes coming soon.</p>'}
          <footer class="sheet-f"><span class="muted">${cnt} terms in this discipline</span><a class="btn" href="#/glossary?d=${code}">Browse terms</a><a class="btn" href="#/cards?deck=${code}">Flashcards</a><a class="btn primary" href="#/practice?mode=concept&d=${code}">Quiz</a></footer>
        </article>
      </div>`;
    $('#print', root).onclick = () => window.print();
  }

  // =====================================================================================
  // Exercises: worked problems with step reveal, projects with task checklists
  // =====================================================================================
  function cashflowSVG(cf) {
    const n = cf.length, max = Math.max(...cf.map(Math.abs)), W = 100 / (n + 1), AX = 34;
    const arrows = cf.map((v, i) => {
      const x = (i + 1) * W, len = 24 * Math.abs(v) / max, up = v > 0, y2 = up ? AX - len : AX + len;
      return `<g class="${up ? 'cf-in' : 'cf-out'}"><line x1="${x}" y1="${AX}" x2="${x}" y2="${y2}"/><path d="M${x - 1.6},${up ? y2 + 3 : y2 - 3} L${x},${y2} L${x + 1.6},${up ? y2 + 3 : y2 - 3}"/><text x="${x}" y="${up ? y2 - 2.5 : y2 + 5.5}">${v > 0 ? '+' : '−'}${Math.abs(v)}</text><text class="t" x="${x + 2.6}" y="${AX + 4.5}">${i}</text></g>`;
    }).join('');
    return `<figure class="cf"><svg viewBox="0 0 100 66" role="img" aria-label="Cash-flow diagram"><line class="axis" x1="${W * 0.5}" y1="${AX}" x2="${100 - W * 0.3}" y2="${AX}"/>${arrows}</svg><figcaption>Cash-flow diagram ($MM). Up = money in, down = money out; numbers on the axis are years.</figcaption></figure>`;
  }
  function exercises(root, q) {
    const ex = D().ex;
    const tab = ['problems', 'projects', 'tips'].includes(q.tab) ? q.tab : 'problems';
    const disc = D().discMap[q.d] ? q.d : 'all';
    if (q.id) return problem(root, ex.problems.find(p => p.id === q.id) || ex.problems[0]);
    const tabs = `<div class="seg tabs" role="tablist">${[['problems', `Worked problems (${ex.problems.length})`], ['projects', `Projects (${ex.projects.length})`], ['tips', 'Exam tips']].map(([k, l]) => `<a role="tab" href="#/exercises?tab=${k}" aria-selected="${k === tab}">${l}</a>`).join('')}</div>`;
    const filt = `<label class="inline">Discipline <select id="xd"><option value="all">All</option>${D().disc.map(dd => `<option value="${dd.code}" ${dd.code === disc ? 'selected' : ''}>${esc(dd.name)}</option>`).join('')}</select></label>`;
    let body = '';
    if (tab === 'problems') {
      const ps = ex.problems.filter(p => disc === 'all' || p.disc.includes(disc));
      body = `<div class="xgrid">${ps.map(p => `<a class="xcard glow" href="#/exercises?id=${p.id}"><span class="lvl lvl-${p.level.toLowerCase()}">${esc(p.level)}</span><h3>${rich(p.title)}</h3><p class="muted">${rich(p.find)}</p><span class="chips">${p.disc.map(chipShort).join('')}</span></a>`).join('') || '<p class="muted">No problems for this discipline yet.</p>'}</div>`;
    } else if (tab === 'projects') {
      const ps = ex.projects.filter(p => disc === 'all' || p.disc.includes(disc));
      body = ps.map(p => `<article class="proj panel" data-id="${p.id}"><header class="panel-h"><h2>${rich(p.title)}</h2><span class="chips">${p.disc.map(chip).join('')}</span></header>
        <p>${rich(p.brief)}</p>
        <div class="proj-cols"><div><h3>Data</h3><ul>${p.data.map(d => `<li>${rich(d)}</li>`).join('')}</ul></div>
        <div><h3>Tasks</h3><ul class="tasks">${p.tasks.map((t, i) => { const k = `${p.id}-${i}`; return `<li><label><input type="checkbox" data-task="${k}" ${Store.s.tasks[k] ? 'checked' : ''}> <span>${rich(t)}</span></label></li>`; }).join('')}</ul></div></div>
        <h3>Deliverables</h3><ul class="deliv">${p.deliverables.map(d => `<li>${rich(d)}</li>`).join('')}</ul>
        ${p.check ? `<details><summary>Check yourself</summary><p>${rich(p.check)}</p></details>` : ''}</article>`).join('') || '<p class="muted">No projects for this discipline yet.</p>';
    } else {
      body = `<section class="panel"><ol class="tips">${ex.exam_tips.map(t => `<li>${rich(t)}</li>`).join('')}</ol></section>
        <section class="panel"><header class="panel-h"><h2>Exam drill</h2></header><p>Twenty mixed questions (concepts and terms) against a 15-minute clock.</p><a class="btn primary" href="#/practice?mode=exam">Start the exam drill</a></section>`;
    }
    root.innerHTML = header('Projects and exam exercises', 'Worked problems you can check step by step, plus mini projects for coursework.') + `<div class="xbar">${tabs}${tab !== 'tips' ? filt : ''}</div>` + body;
    const xd = $('#xd', root);
    if (xd) xd.onchange = e => { location.hash = `#/exercises?tab=${tab}${e.target.value !== 'all' ? '&d=' + e.target.value : ''}`; };
    $$('[data-task]', root).forEach(cb => cb.onchange = () => {
      if (cb.checked) Store.s.tasks[cb.dataset.task] = 1; else delete Store.s.tasks[cb.dataset.task];
      Store.save();
      const art = cb.closest('.proj');
      if (cb.checked && $$('[data-task]', art).every(x => x.checked)) { FX.gusherFrom(cb, 40); App.toast('Project checklist complete'); }
    });
  }
  function problem(root, p) {
    let shown = 0;
    root.innerHTML = header(rich(p.title), `${p.disc.map(c => esc(D().discMap[c].name)).join(' · ')} · ${esc(p.level)}`, `<a class="btn" href="#/exercises">All exercises</a>`) + `
      <div class="pb">
        <section class="panel">
          <h3>Given</h3><ul class="given">${p.given.map(g => `<li>${rich(g)}</li>`).join('')}</ul>
          <h3>Find</h3><p>${rich(p.find)}</p>
          ${p.cashflow ? cashflowSVG(p.cashflow) : ''}
          <div class="try" id="try"><label for="ans">${rich(p.answer.label)}${p.answer.unit && p.answer.unit !== 'fraction' ? ` (${rich(p.answer.unit)})` : ''}</label><input type="number" step="any" id="ans" inputmode="decimal"><button type="button" class="btn primary" id="chk">Check</button><span class="tryfb" id="tryfb" aria-live="polite"></span></div>
        </section>
        <section class="panel">
          <header class="panel-h"><h2>Solution</h2><span class="muted" id="stepCount">0 / ${p.steps.length} steps</span></header>
          <ol class="steps" id="steps"></ol>
          <div class="row"><button type="button" class="btn primary" id="nextStep">Show next step</button><button type="button" class="btn" id="allSteps">Show all</button></div>
          <div class="final" id="final" hidden><b>Answer</b> ${rich(p.final)}</div>
        </section>
      </div>`;
    const stepsEl = $('#steps', root);
    function reveal(k) {
      while (shown < Math.min(k, p.steps.length)) {
        const s = p.steps[shown];
        const li = document.createElement('li');
        li.className = 'step';
        li.innerHTML = `<h4>${rich(s.h)}</h4>${s.eq.map(e => `<div class="eq">${rich(e)}</div>`).join('')}${s.note ? `<p class="muted small">${rich(s.note)}</p>` : ''}`;
        stepsEl.appendChild(li);
        shown++;
      }
      $('#stepCount', root).textContent = `${shown} / ${p.steps.length} steps`;
      if (shown >= p.steps.length) { $('#final', root).hidden = false; $('#nextStep', root).disabled = true; $('#allSteps', root).disabled = true; }
    }
    $('#nextStep', root).onclick = () => reveal(shown + 1);
    $('#allSteps', root).onclick = () => reveal(p.steps.length);
    const check = () => {
      const v = parseFloat($('#ans', root).value), fb = $('#tryfb', root);
      if (!isFinite(v)) { fb.textContent = 'Enter a number.'; return; }
      const ok = Lib.close(v, p.answer.value, p.answer.tol);
      Store.answer(ok);
      fb.textContent = ok ? `Correct: ${p.answer.value} ${plain(p.answer.unit === 'fraction' ? '' : p.answer.unit)}` : 'Not yet. Check your units, or open the next step.';
      fb.className = 'tryfb ' + (ok ? 'good' : 'bad');
      if (ok) FX.gusherFrom($('#chk', root), 50); else FX.shake($('#try', root));
    };
    $('#chk', root).onclick = check;
    $('#ans', root).onkeydown = e => { if (e.key === 'Enter') check(); };
  }

  // =====================================================================================
  // Resources
  // =====================================================================================
  function resources(root) {
    root.innerHTML = header('Useful resources', 'Free references worth bookmarking, all in one place.') +
      D().res.map(g => `<section class="panel"><header class="panel-h"><h2>${esc(g.group)}</h2></header><div class="rgrid">${g.items.map(it => {
        let host = ''; try { host = new URL(it.url).hostname.replace(/^www\./, ''); } catch (e) { host = ''; }
        return `<a class="rcard glow" href="${esc(it.url)}" target="_blank" rel="noopener noreferrer"><span class="rmono" aria-hidden="true">${esc(it.name.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase())}</span><span class="rbody"><b>${esc(it.name)} ↗</b><span class="muted small">${esc(host)}</span><span>${esc(it.note)}</span></span></a>`;
      }).join('')}</div></section>`).join('');
  }

  // =====================================================================================
  // Tools: unit converter, field calculators, formula sheet
  // =====================================================================================
  function fmtNum(x) {
    if (!isFinite(x)) return '—';
    const a = Math.abs(x);
    if (a !== 0 && (a < 1e-3 || a >= 1e9)) return x.toExponential(4).replace('e', ' × 10^').replace('^+', '^');
    if (a >= 1000) return Math.round(x).toLocaleString();
    return String(+x.toPrecision(5));
  }
  function tools(root, q) {
    const tab = ['convert', 'calc', 'formulas'].includes(q.tab) ? q.tab : 'convert';
    const tabs = `<div class="seg tabs" role="tablist">${[['convert', 'Unit converter'], ['calc', `Calculators (${CALCS.length})`], ['formulas', 'Formula sheet']].map(([k, l]) => `<a role="tab" href="#/tools?tab=${k}" aria-selected="${k === tab}">${l}</a>`).join('')}</div>`;
    root.innerHTML = header('Tools', 'Oilfield units, quick field calculations and every equation from the cheat sheets.') + `<div class="xbar">${tabs}</div><div id="tbody"></div>`;
    const body = $('#tbody', root);

    if (tab === 'convert') {
      let group = Lib.UNITS[q.g] ? q.g : 'pressure';
      const draw = () => {
        const u = Object.keys(Lib.UNITS[group].u);
        body.innerHTML = `<section class="panel conv">
          <div class="conv-in">
            <label>Quantity <select id="cg">${Object.entries(Lib.UNITS).map(([k, g]) => `<option value="${k}" ${k === group ? 'selected' : ''}>${esc(g.label)}</option>`).join('')}</select></label>
            <label>Value <input type="number" step="any" id="cv" value="${group === 'temperature' ? 212 : group === 'density' ? 10 : 1}" inputmode="decimal"></label>
            <label>Unit <select id="cu">${u.map(x => `<option>${esc(x)}</option>`).join('')}</select></label>
          </div>
          <div class="conv-out" id="co"></div>
          <p class="muted small">${group === 'density' ? 'psi/ft is the pressure gradient of a column of that fluid (0.052 × ppg). SG and g/cm³ use fresh water = 8.345 ppg.' : group === 'gas' ? 'Standard cubic feet at 60 °F and 14.696 psia; m³ here means standard m³ at the same conditions.' : group === 'perm' ? '1 darcy = 0.9869 µm².' : 'Click a result to copy it.'}</p>
        </section>`;
        const out = () => {
          const v = parseFloat($('#cv', body).value), from = $('#cu', body).value;
          $('#co', body).innerHTML = u.map(x => `<button type="button" class="conv-r${x === from ? ' from' : ''}" data-v="${esc(fmtNum(Lib.convert(v, group, from, x)))} ${esc(x)}"><b>${esc(fmtNum(Lib.convert(v, group, from, x)))}</b><span>${esc(x)}</span></button>`).join('');
        };
        $('#cg', body).onchange = e => { group = e.target.value; App.replaceQuery('tools', 'tab=convert&g=' + group); draw(); };
        $('#cv', body).oninput = out; $('#cu', body).onchange = out;
        $('#co', body).onclick = e => {
          const b = e.target.closest('.conv-r'); if (!b) return;
          try { navigator.clipboard.writeText(b.dataset.v).then(() => App.toast('Copied ' + b.dataset.v), () => App.toast(b.dataset.v)); } catch (err) { App.toast(b.dataset.v); }
          FX.pop(b);
        };
        out();
      };
      draw();
    } else if (tab === 'calc') {
      body.innerHTML = `<div class="calcs">${CALCS.map(c => `<section class="calc panel glow" data-id="${c.id}">
          <header class="panel-h"><h2>${esc(c.title)}</h2></header>
          <p class="eq calc-f">${rich(c.f)}</p>
          <div class="calc-in">${c.inputs.map(([k, l, unit, v]) => `<label><span>${rich(l)}${unit ? ` <i class="muted">(${rich(unit)})</i>` : ''}</span><input type="number" step="any" data-k="${k}" value="${v}" inputmode="decimal"></label>`).join('')}</div>
          <p class="calc-out"><span class="muted">${rich(c.outLabel)}</span> <b data-out></b> <span>${rich(c.unit)}</span></p>
          ${c.note ? `<p class="muted small">${rich(c.note)}</p>` : ''}
        </section>`).join('')}</div>`;
      $$('.calc', body).forEach(sec => {
        const c = CALCS.find(x => x.id === sec.dataset.id);
        const run = () => {
          const v = {}; $$('[data-k]', sec).forEach(i => { v[i.dataset.k] = parseFloat(i.value); });
          const r = Object.values(v).every(isFinite) ? c.run(v) : NaN;
          $('[data-out]', sec).textContent = fmtNum(r);
        };
        sec.addEventListener('input', run); run();
      });
    } else {
      const rows = [];
      for (const n of D().notes) for (const [l, e] of n.equations) rows.push({ code: n.disc, l, e, txt: (plain(l) + ' ' + plain(e) + ' ' + D().discMap[n.disc].name).toLowerCase() });
      body.innerHTML = `<section class="panel">
          <div class="gl-top"><label class="search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input type="search" id="fq" placeholder="Filter equations (e.g. Archie, decline, ECD)" aria-label="Filter equations"></label><p class="muted small" id="fcount"></p><button type="button" class="btn" id="fprint">Print</button></div>
          <div class="eqs" id="flist"></div></section>`;
      const draw = () => {
        const qq = $('#fq', body).value.trim().toLowerCase();
        const rs = rows.filter(r => !qq || r.txt.includes(qq));
        $('#fcount', body).textContent = `${rs.length} of ${rows.length} equations`;
        $('#flist', body).innerHTML = rs.map(r => `<div class="eqrow fx-row"><span class="eql">${chipShort(r.code)} ${rich(r.l)}</span><span class="eq">${rich(r.e)}</span></div>`).join('') || '<p class="muted">No equations match.</p>';
      };
      $('#fq', body).oninput = draw; $('#fprint', body).onclick = () => window.print();
      draw();
    }
  }

  // =====================================================================================
  // Acronyms and symbols
  // =====================================================================================
  function acronyms(root, q) {
    const all = D().acr;
    root.innerHTML = header('Acronyms and symbols', `${all.length} abbreviations and symbols taken from the definitions. Click one to open its term.`, `<a class="btn primary" href="#/practice?mode=abbr">Quiz me on acronyms</a>`) + `
      <section class="panel">
        <div class="gl-top"><label class="search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input type="search" id="aq" placeholder="Search (e.g. BOP, AVO, kill)" value="${esc(q.q || '')}" aria-label="Search acronyms"></label>
        <label class="inline">Discipline <select id="ad"><option value="all">All</option>${D().disc.map(dd => `<option value="${dd.code}">${esc(dd.name)}</option>`).join('')}</select></label>
        <p class="muted small" id="acount"></p></div>
        <div class="acr" id="alist"></div>
      </section>`;
    const draw = () => {
      const qq = $('#aq', root).value.trim().toLowerCase(), d = $('#ad', root).value;
      const rs = all.filter(a => (d === 'all' || a.disc.includes(d)) && (!qq || a.abbr.toLowerCase().includes(qq) || a.full.toLowerCase().includes(qq)));
      $('#acount', root).textContent = `${rs.length} of ${all.length}`;
      let last = '';
      $('#alist', root).innerHTML = rs.map(a => {
        const L = /[a-z]/i.test(a.abbr[0]) ? a.abbr[0].toUpperCase() : '#';
        const head = L !== last ? `<h2 class="acr-h">${L}</h2>` : ''; last = L;
        return `${head}<a class="acr-r" href="#/glossary?t=${a.id}"><b>${esc(a.abbr)}</b><span>${esc(a.full)}${a.kind === 'symbol' ? ' <i class="muted">(symbol)</i>' : ''}</span><span class="chips">${a.disc.map(chipShort).join('')}</span></a>`;
      }).join('') || '<p class="muted">Nothing matches.</p>';
      App.replaceQuery('acronyms', qq ? 'q=' + encodeURIComponent(qq) : '');
    };
    $('#aq', root).oninput = draw; $('#ad', root).onchange = draw;
    draw();
    return { key(e) { if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) { e.preventDefault(); $('#aq', root).focus(); } } };
  }

  return { dashboard, glossary, cards, practice, notes, exercises, resources, tools, acronyms };
})();
