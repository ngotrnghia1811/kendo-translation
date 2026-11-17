// VW107: pure logic, deterministic random cases, and markup. No server, no model call.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { checker, htmlText, installAppHooks } from "./vw-test-kit.mjs";
import path from "node:path";
const app = path.resolve(import.meta.dirname, "..");
installAppHooks(app);
const require = createRequire(path.join(app, 'package.json'));
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const h = (C, props) => renderToStaticMarkup(React.createElement(C, props));
const D = await import('../lib/vector-map-detail.ts');
const R = await import('../lib/vector-map-rules.ts');
const Chart = (await import('../components/VectorMapChart.tsx')).default;
const Prompt = (await import('../components/VectorMapPrompt.tsx')).default;
const kit = checker();
let count = 0;
const check = (name, fn) => { count++; return kit.check(name, fn); };
const join = (parts) => parts.map((p) => p.text).join('');
const input = (version, parent, text) => ({ version, parent, text, sha1: version, created_utc: null, update_point: null, group_ids: [], critique_ids: [], marks: [] });
const map = R.buildBoxMap('QA_1', [
  input('v2.1.0', null, 'Intro\n1. Never skip a line.\n2. Read the whole page.\n'),
  input('v2.1.1', 'v2.1.0', 'Intro\n1. Never skip a word.\n2. Read the whole page.\n3. Always use the dictionary.\n'),
  input('v2.1.2', 'v2.1.1', 'Intro\n2. Read the whole page.\n3. Always use the dictionary.\n'),
]);

await check('word diff: insertion, deletion, replacement, exact whitespace and identical text', () => {
  for (const [a, b] of [['', ''], ['', 'new words'], ['old words', ''], ['a b c', 'a x c'], ['  a\n b  ', 'a \t b'], ['a a a', 'a a'], ['Case.', 'case!'], [' ', '\n']]) {
    const d = D.wordDiff(a, b);
    assert.equal(join(d.start), a);
    assert.equal(join(d.end), b);
  }
  const d = D.wordDiff('read the old line', 'read the new line');
  assert.equal(d.start.filter((p) => p.kind === 'removed').map((p) => p.text.trim()).join(' '), 'old');
  assert.equal(d.end.filter((p) => p.kind === 'added').map((p) => p.text.trim()).join(' '), 'new');
  assert.ok(D.wordDiff('same words', 'same words').start.every((p) => p.kind === 'same'));
});

await check('word diff: seeded random words agree with an independent LCS length oracle', () => {
  let seed = 107;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const oracle = (a, b) => {
    const row = Array(b.length + 1).fill(0);
    for (const word of a) {
      let prev = 0;
      for (let j = 1; j <= b.length; j++) {
        const old = row[j];
        row[j] = word === b[j-1] ? prev + 1 : Math.max(row[j], row[j-1]);
        prev = old;
      }
    }
    return row[b.length];
  };
  for (let k = 0; k < 200; k++) {
    const words = () => Array.from({ length: Math.floor(random()*30) }, () => ['must', 'never', 'read', 'line', 'page'][Math.floor(random()*5)]);
    const a = words(), b = words(), d = D.wordDiff(a.join(' '), b.join(' '));
    assert.equal(join(d.start), a.join(' '));
    assert.equal(join(d.end), b.join(' '));
    const same = d.start.filter((p) => p.kind === 'same' && p.text.trim()).map((p) => p.text.trim());
    assert.equal(same.length, oracle(a, b));
    assert.deepEqual(same, d.end.filter((p) => p.kind === 'same' && p.text.trim()).map((p) => p.text.trim()));
  }
});

await check('word diff: long identical and disjoint text', () => {
  const a = Array(400).fill('read').join(' '), b = Array(400).fill('write').join(' ');
  assert.ok(D.wordDiff(a, a).start.every((p) => p.kind === 'same'));
  assert.ok(D.wordDiff(a, b).start.every((p) => p.kind === 'removed'));
  assert.ok(D.wordDiff(a, b).end.every((p) => p.kind === 'added'));
});

await check('point ends: first prompt, hard add, live point, removed point, unknown point', () => {
  const removed = D.pointEnds(map, 'v2.1.0#1');
  assert.equal(removed.start.version, 'v2.1.0');
  assert.equal(removed.end.version, 'v2.1.1');
  assert.equal(removed.removedIn, 'v2.1.2');
  const added = D.pointEnds(map, 'v2.1.1#3');
  assert.equal(added.start.version, 'v2.1.1');
  assert.equal(added.end.version, 'v2.1.2');
  assert.equal(added.removedIn, null);
  assert.equal(D.pointEnds(map, 'v2.1.0#2').start.version, 'v2.1.0');
  assert.equal(D.pointEnds(map, 'missing'), null);
});

const point = (n, comp, imp = 0, extra = {}) => ({ id: `id${n}`, num: String(n), text: `${n}. Read the line.`, comp, imp, prev: { comp: 0, imp: 0, num: String(n) }, added: false, changed: false, model: null, modelPrev: null, ...extra });
await check('biggest moves: descending distance, at most 10, signed deltas, ties, no previous values', () => {
  const points = Array.from({ length: 15 }, (_, i) => point(i + 1, i + 1));
  const result = D.biggestMoves(points, 'program');
  assert.equal(result.length, 10);
  assert.deepEqual(result.map((m) => m.point.num), ['15','14','13','12','11','10','9','8','7','6']);
  assert.equal(D.biggestMoves([point(1, 0.09), point(2, 20, 0, { prev: null })], 'program').length, 0);
  assert.deepEqual(D.biggestMoves([point(10, 3, 4), point(2, 5)], 'program').map((m) => m.point.num), ['2','10']);
  assert.equal(D.biggestMoves([point(1, 0, 0, { prev: { comp: 3, imp: 4, num: '1' } })], 'program')[0].comp, -3);
  assert.equal(D.biggestMoves([], 'program').length, 0);
});

await check('filters: all, moved only, new only, threshold 0.1 pp, model scores absent', () => {
  const points = [point(1, 0.09), point(2, 0.1), point(3, 4, 0, { added: true, prev: null }), point(4, 0, 0, { changed: true })];
  assert.equal(D.filterPoints(points, 'all', 'program').length, 4);
  assert.deepEqual(D.filterPoints(points, 'moved', 'program').map((p) => p.num), ['2']);
  assert.deepEqual(D.filterPoints(points, 'new', 'program').map((p) => p.num), ['3']);
  assert.equal(D.filterPoints(points, 'all', 'model').length, 0);
  const p = point(1, 0, 0, { model: { comp: 8, imp: 2 }, modelPrev: { comp: 5, imp: 2 } });
  assert.equal(D.filterPoints([p], 'moved', 'model').length, 1);
  assert.equal(D.biggestMoves([p], 'model')[0].distance, 3);
});

await check('zoom math: reversed drag, clamped edge, nested zoom, tiny and flat drags', () => {
  const plot = { left: 40, top: 10, width: 200, height: 100 }, full = { x0: 0, x1: 20, y0: 0, y1: 10 };
  assert.deepEqual(D.zoomBox({x: 90,y: 35}, {x: 190,y: 85}, plot, full), {x0:5,x1:15,y0:2.5,y1:7.5});
  assert.deepEqual(D.zoomBox({x: 190,y: 85}, {x: 90,y: 35}, plot, full), {x0:5,x1:15,y0:2.5,y1:7.5});
  assert.deepEqual(D.zoomBox({x:-100,y:-100}, {x:500,y:500}, plot, full), full);
  assert.deepEqual(D.zoomBox({x:40,y:10}, {x:240,y:110}, plot, {x0:5,x1:15,y0:2,y1:6}), {x0:5,x1:15,y0:2,y1:6});
  assert.equal(D.zoomBox({x:50,y:30}, {x:52,y:35}, plot, full), null);
  assert.equal(D.zoomBox({x:50,y:30}, {x:100,y:30}, plot, full), null);
});

await check('crowded corner: outliers do not hide the 80% cluster, zero and empty values stay valid', () => {
  const full = { x0:0,x1:40,y0:0,y1:40 };
  const bounds = D.crowdedCorner([...Array.from({length:8}, (_,i)=>point(i, 2, 3)), point(9,30,30), point(10,40,40)], 'program', full);
  assert.equal(bounds.x1, 2.2);
  assert.ok(Math.abs(bounds.y1 - 3.3) < 1e-9);
  assert.equal(D.crowdedCorner([point(1,0,0)], 'program', full).x1, 1);
  assert.deepEqual(D.crowdedCorner([], 'program', full), full);
});

await check('hover text: at most 80 characters, short and Unicode text', () => {
  assert.equal(D.hoverText('x'.repeat(100)), 'x'.repeat(80));
  assert.equal(D.hoverText('short'), 'short');
  assert.equal(Array.from(D.hoverText('𠮷'.repeat(100))).length, 80);
  assert.equal(D.hoverText(''), '');
});

await check('whole prompt: exact text and numbered point boundaries, including multiline and last point', () => {
  const text = 'Before\n1. Read\n  the line.\n\n1.2. Never skip.\n2. End.\n';
  const r = D.promptRange(text, '1.2');
  assert.equal(r.before+r.point+r.after, text);
  assert.ok(r.point.includes('1.2. Never skip.'));
  assert.ok(!r.point.includes('2. End.'));
  assert.ok(D.promptRange(text, '1').point.includes('the line.'));
  assert.ok(D.promptRange(text, '2').point.endsWith('End.\n'));
  assert.equal(D.promptRange(text, '9'), null);
  assert.equal(D.promptRange('unnumbered', '1'), null);
});

await check('chart markup: exact labels, legend shapes, filter buttons, removed cross and 10 move links', () => {
  const points = Array.from({length:15}, (_,i)=>point(i+1,i+1));
  const html = h(Chart, { points, removed:[point(30,3)], axes:'program', top:{comp:20,imp:10}, selected:null, hrefOf:(id)=>`/x?p=${id}`, prevVersion:'v2.1.0' });
  const text = htmlText(html);
  for (const label of ['Zoom to the crowded corner','Show all','Biggest moves in this version','More detail (comprehensiveness, % of the prompt) →','More emphasis (importance, % of the prompt) ↑','Red cross: removed point']) assert.ok(text.includes(label), label);
  assert.equal([...html.matchAll(/data-vm-filter=/g)].length, 3);
  assert.equal([...html.matchAll(/data-vm-move-row=/g)].length, 10);
  assert.ok(html.includes('data-vm-cross="30"'));
  assert.ok(!html.includes('data-vm-dot="30"'));
});

await check('start/end markup: two versions, green ins and red del, two real whole-prompt buttons', () => {
  const d = D.wordDiff('1. Read the old line.', '1. Read the new line.');
  const html = h(Prompt, {start:{version:'v2.1.0',num:'1',prompt:'1. Read the old line.',parts:d.start},end:{version:'v2.1.1',num:'1',prompt:'1. Read the new line.',parts:d.end}});
  assert.ok(/<del[^>]*data-vm-word="removed"/.test(html));
  assert.ok(/<ins[^>]*data-vm-word="added"/.test(html));
  assert.equal([...html.matchAll(/data-vm-open-prompt=/g)].length, 2);
  assert.ok(html.includes('data-vm-prompt-dialog'));
});

const failed = kit.done();
console.log(`Total: ${count-failed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
