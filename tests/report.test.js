const test = require('node:test');
const assert = require('node:assert');
const { buildReport } = require('../js/report.js');

const articles = [
  { label: 'Art. 1', text: 'Art. 1. Alfa beta gamma.' },
  { label: 'Art. 2', text: 'Art. 2. Delta epsilon.' },
  { label: 'Art. 3', text: 'Art. 3. Zeta eta.' },
  { label: 'Art. 4', text: 'Art. 4. Theta iota.' },
];
const f = (label, level, quote) => ({ articleLabel: label, level, quote, constitutionArticles: ['2'], reasoning: 'r' });

test('procent: 4 artykuły, 1 niezgodny, 1 wątpliwy → 62,5', () => {
  const r = buildReport(articles, [f('Art. 1', 'niezgodny', 'alfa'), f('Art. 2', 'watpliwy', 'delta')], []);
  assert.strictEqual(r.score, 62.5);
  assert.deepStrictEqual(r.counts, { niezgodny: 1, watpliwy: 1, zgodny: 2, rejected: 0 });
});

test('dwa zarzuty do jednego artykułu liczą się raz, wg najgorszego', () => {
  const r = buildReport(articles, [f('Art. 1', 'watpliwy', 'alfa'), f('Art. 1', 'niezgodny', 'beta')], []);
  assert.strictEqual(r.counts.niezgodny, 1);
  assert.strictEqual(r.counts.watpliwy, 0);
  assert.strictEqual(r.score, 75);
});

test('etykieta w innym zapisie ("art.2") jest rozpoznana', () => {
  const r = buildReport(articles, [f('art.2', 'niezgodny', 'delta')], []);
  assert.strictEqual(r.counts.niezgodny, 1);
  assert.strictEqual(r.findings[0].articleLabel, 'Art. 2');
});

test('nieznana etykieta: artykuł wskazuje cytat', () => {
  const r = buildReport(articles, [f('Rozdział 9', 'niezgodny', 'zeta eta')], []);
  assert.strictEqual(r.findings[0].articleLabel, 'Art. 3');
  assert.strictEqual(r.counts.niezgodny, 1);
});

test('zarzuty posortowane: niezgodne przed wątpliwymi; liczba odrzuconych', () => {
  const r = buildReport(articles, [f('Art. 1', 'watpliwy', 'alfa'), f('Art. 2', 'niezgodny', 'delta')], [{}, {}]);
  assert.deepStrictEqual(r.findings.map((x) => x.level), ['niezgodny', 'watpliwy']);
  assert.strictEqual(r.counts.rejected, 2);
});
