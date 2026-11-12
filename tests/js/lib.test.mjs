// Tests for js/lib.js. Run: node --test tests/js/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const Lib = require('../../js/lib.js');
const data = name => JSON.parse(readFileSync(new URL(`../../data/${name}.json`, import.meta.url), 'utf8'));

test('rich() keeps only sub/sup/i/b/br and escapes everything else', () => {
  assert.equal(Lib.rich('B<sub>g</sub> and x<sup>2</sup>'), 'B<sub>g</sub> and x<sup>2</sup>');
  assert.equal(Lib.rich('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
  assert.equal(Lib.rich('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
  assert.equal(Lib.rich('<b onclick="x">'), '&lt;b onclick=&quot;x&quot;&gt;');
});

test('SLB links follow the glossary URL pattern', () => {
  assert.equal(Lib.slbUrl('water cut'), 'https://glossary.slb.com/en/terms/w/water_cut');
  assert.equal(Lib.slbUrl('bottomhole pressure'), 'https://glossary.slb.com/en/terms/b/bottomhole_pressure');
  assert.equal(Lib.slbUrl('water-cut meter'), 'https://glossary.slb.com/en/terms/w/water-cut_meter');
  assert.equal(Lib.slbUrl('3D seismic'), 'https://glossary.slb.com/en/terms/0-9/3d_seismic');
  assert.equal(Lib.slbUrl('kill the well', 'kill'), 'https://glossary.slb.com/en/terms/k/kill');
  assert.equal(Lib.slbUrl('anything', false), null);
});

test('term ids match the Python rule and are unique across the data', () => {
  assert.equal(Lib.termId('P90, P50 and P10'), 'p90-p50-and-p10');
  const terms = data('terms');
  const ids = new Set(terms.map(t => Lib.termId(t.term)));
  assert.equal(ids.size, terms.length);
  for (const t of terms) {
    const u = Lib.slbUrl(t.term, t.slb);
    if (t.slb !== false) assert.match(u, /^https:\/\/glossary\.slb\.com\/en\/terms\/([a-z]|0-9)\/[a-z0-9_-]+$/);
  }
});

test('Leitner review moves boxes and schedules due days', () => {
  assert.deepEqual(Lib.review(undefined, true, 100), { box: 1, due: 101 });
  assert.deepEqual(Lib.review(3, true, 100), { box: 4, due: 116 });
  assert.deepEqual(Lib.review(5, true, 100), { box: 5, due: 135 });
  assert.deepEqual(Lib.review(4, false, 100), { box: 1, due: 100 });
});

test('mcq() returns the target plus distinct distractors', () => {
  const terms = data('terms').map(t => ({ ...t, id: Lib.termId(t.term) }));
  const r = Lib.rng(42);
  for (let k = 0; k < 50; k++) {
    const target = terms[Math.floor(r() * terms.length)];
    const opts = Lib.mcq(target, terms, 4, r);
    assert.equal(opts.length, 4);
    assert.equal(new Set(opts.map(o => o.id)).size, 4);
    assert.ok(opts.includes(target));
  }
});

test('close() applies relative tolerance', () => {
  assert.ok(Lib.close(3.27, 3.27, 0.01));
  assert.ok(Lib.close(3.3, 3.27, 0.01));
  assert.ok(!Lib.close(3.5, 3.27, 0.01));
  assert.ok(Lib.close(-0.123, -0.123, 0.02));
  assert.ok(!Lib.close(NaN, 1, 0.01));
});

test('streak counts consecutive days ending today or yesterday', () => {
  assert.equal(Lib.streak({ 10: 1, 9: 2, 8: 1, 6: 1 }, 10), 3);
  assert.equal(Lib.streak({ 9: 2, 8: 1 }, 10), 2);
  assert.equal(Lib.streak({}, 10), 0);
});

test('every discipline in the data has a cheat sheet and questions', () => {
  const codes = data('disciplines').disciplines.map(d => d.code);
  assert.equal(codes.length, 20);
  const notes = new Set(data('notes').map(n => n.disc));
  const qs = new Set(data('questions').map(q => q.disc));
  for (const c of codes) { assert.ok(notes.has(c), c); assert.ok(qs.has(c), c); }
});

test('acronyms() reads "Abbreviated X." and acronym entries from the data', () => {
  const terms = data('terms').map(t => ({ ...t, id: Lib.termId(t.term) }));
  const ac = Lib.acronyms(terms);
  const find = a => ac.find(x => x.abbr === a);
  assert.equal(find('BOP').full, 'blowout preventer');
  assert.equal(find('AVO').full, 'amplitude variation with offset');
  assert.ok(ac.length > 150);
  for (const a of ac) { assert.ok(a.abbr.length <= 14); assert.ok(terms.some(t => t.id === a.id)); }
});

test('relatedIndex() links to existing terms only, never to itself', () => {
  const terms = data('terms').map(t => ({ ...t, id: Lib.termId(t.term) }));
  const ids = new Set(terms.map(t => t.id));
  const rel = Lib.relatedIndex(terms);
  assert.ok(Object.keys(rel).length > 1000);
  for (const [id, list] of Object.entries(rel)) { assert.ok(list.length <= 4); for (const r of list) { assert.ok(ids.has(r)); assert.notEqual(r, id); } }
  assert.ok(rel['sagd'].includes('steam-assisted-gravity-drainage'));
});

test('unit conversions round-trip and match known values', () => {
  const near = (a, b, tol = 1e-4) => assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${a} vs ${b}`);
  near(Lib.convert(1, 'pressure', 'bar', 'psi'), 14.50377);
  near(Lib.convert(1, 'length', 'm', 'ft'), 3.28084);
  near(Lib.convert(1, 'liquid', 'm³', 'bbl'), 6.289811);
  near(Lib.convert(1, 'density', 'SG', 'ppg'), 8.345404);
  near(Lib.convert(10, 'density', 'ppg', 'psi/ft'), 0.52);
  near(Lib.convert(100, 'temperature', '°C', '°F'), 212);
  near(Lib.convert(0, 'temperature', '°F', 'K'), 255.3722);
  near(Lib.convert(1, 'perm', 'D', 'mD'), 1000);
  for (const [g, def] of Object.entries(Lib.UNITS)) for (const a of Object.keys(def.u)) for (const b of Object.keys(def.u)) near(Lib.convert(Lib.convert(37.5, g, a, b), g, b, a), 37.5);
  assert.ok(Number.isNaN(Lib.convert(1, 'pressure', 'psi', 'ft')));
});

test('field calculators give textbook answers', () => {
  const near = (a, b, tol = 1e-3) => assert.ok(Math.abs(a - b) <= tol * Math.abs(b), `${a} vs ${b}`);
  near(Lib.calc.hydrostatic(10, 10000), 5200);
  near(Lib.calc.killMW(10, 520, 10000), 11);
  near(Lib.calc.ecd(10, 260, 10000), 10.5);
  near(Lib.calc.api(1), 10);
  near(Lib.calc.sgFromApi(10), 1);
  near(Lib.calc.ooip(640, 50, 0.2, 0.3, 1.2), 28963200);
  near(Lib.calc.annCap(8.5, 5), 0.04590);
  near(Lib.calc.archieSw(0.05, 20, 0.2, 1, 2, 2), 0.25);
});
