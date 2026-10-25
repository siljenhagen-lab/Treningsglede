// Kjør med: node tests/parser.test.js
const assert = require('assert');
const Parser = require('../js/parser.js');
const Figures = require('../js/figures.js');

const line = (s) => Parser.parseLine(s);
assert.deepStrictEqual(line('Knebøy 3x10 40kg'), { name: 'Knebøy', sets: '3', reps: '10', weight: '40', rest: '', note: '' });
assert.deepStrictEqual(line('Rumensk markløft 3 x 8-12 @ 30 kg, pause 90 sek'), { name: 'Rumensk markløft', sets: '3', reps: '8-12', weight: '30', rest: '90 sek', note: '' });
assert.strictEqual(line('Planke 3 x 30 sek').reps, '30 sek');
assert.strictEqual(line('Benkpress 4x6-8 @ 22,5kg').weight, '22.5');
const ht = line('- Hip thrust – 4 sett á 12 reps, 60 kg (fokus på topp)');
assert.strictEqual(ht.name, 'Hip thrust');
assert.strictEqual(ht.sets, '4');
assert.strictEqual(ht.reps, '12');
assert.strictEqual(ht.note, 'fokus på topp');

const sections = Parser.parse('Dag 1 – Bein:\nKnebøy 3x10\n\nDag 2:\nNedtrekk 3x12\nSykkel 10 min');
assert.strictEqual(sections.length, 2);
assert.strictEqual(sections[0].title, 'Dag 1 – Bein');
assert.strictEqual(sections[1].items.length, 2);
assert.strictEqual(sections[1].items[1].reps, '10 min');

assert.strictEqual(Figures.guess('Rumensk markløft'), 'hinge');
assert.strictEqual(Figures.guess('Liggende lårcurl'), 'legcurl');
assert.strictEqual(Figures.guess('Bicepscurl'), 'curl');
assert.strictEqual(Figures.guess('Bulgarsk utfall'), 'lunge');
for (const { key } of Figures.list()) assert.ok(Figures.render(key).startsWith('<svg'), key);

console.log('Alle tester OK');
