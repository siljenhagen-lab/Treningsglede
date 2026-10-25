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

// Vektimport fra CSV (Libra-format)
const WeightCsv = require('../js/csvimport.js');
const libra = `#Version: 6
#Units: kg

#date;weight;weight trend;body fat;body fat trend;muscle mass;muscle mass trend;log
2021-05-01T07:40:00.000Z;105.5;105.2;;;;;coronavaksine 2. dose
2021-01-25T07:51:00.000Z;107.0;107.1;;;;;
2021-01-25T07:54:00.000Z;107.4;107.1;;;;;Midje 103 (under bryst). Hofte 130.
2022-11-02T05:54:16.043588Z;108.1;108.3;;;;;
2022-09-09T04:30:00.000Z;113.1;113.7;;;;;Måling=102,134,77
2026-02-14T09:34:11.496Z;109.1;109.1;;;;;Variert mellom 108 og 112. Ny oppstart inositol.`;
const parsed = WeightCsv.parse(libra);
assert.strictEqual(parsed.rows.length, 6);
const days = WeightCsv.byDay(parsed.rows, 'first');
assert.strictEqual(days.length, 5);
assert.strictEqual(days.find((d) => d.date === '2021-01-25').kg, 107.0);
assert.strictEqual(WeightCsv.byDay(parsed.rows, 'avg').find((d) => d.date === '2021-01-25').kg, 107.2);
assert.ok(days.some((d) => d.date === '2022-11-02'), 'mikrosekunder i tidsstempel');
assert.deepStrictEqual(WeightCsv.suggestEvents(days).map((e) => e.label), ['coronavaksine 2. dose', 'Ny oppstart inositol']);
const ms = WeightCsv.findMeasurements(days);
assert.deepStrictEqual(ms[0].named, { waist: 103, hip: 130 });
assert.deepStrictEqual(ms[1].values, [102, 134, 77]);
const simple = WeightCsv.parse('Dato;Vekt\n24.10.2026;71,5\n25.10.2026;71.2');
assert.strictEqual(simple.rows.length, 2);
assert.strictEqual(simple.rows[0].kg, 71.5);
assert.strictEqual(simple.rows[1].date, '2026-10-25');

console.log('CSV-tester OK');
