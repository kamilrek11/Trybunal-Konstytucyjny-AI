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
  assert.deepStrictEqual(r.counts, { niezgodny: 1, watpliwy: 1, zgodny: 2, rejected: 0, unanalyzed: 0 });
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

const { analyzeBatches } = require('../js/report.js');

test('Wstęp nie liczy się do procentu, gdy nie ma na nim zarzutu', () => {
  const arts = [{ label: 'Wstęp', text: 'tytuł' }, ...articles.slice(0, 3)];
  const r = buildReport(arts, [f('Art. 2', 'niezgodny', 'delta')], []);
  assert.strictEqual(r.total, 3);
  assert.strictEqual(r.score, 66.7);
});

test('nieprzeanalizowane artykuły nie podnoszą procentu i są policzone', () => {
  const r = buildReport(articles, [f('Art. 1', 'niezgodny', 'alfa')], [], ['Art. 3', 'Art. 4']);
  assert.strictEqual(r.counts.unanalyzed, 2);
  assert.strictEqual(r.total, 2);
  assert.strictEqual(r.score, 50);
});

test('analyzeBatches: bad_json w jednej paczce nie wyrzuca reszty', async () => {
  const batches = [[{ label: 'Art. 1' }], [{ label: 'Art. 2' }], [{ label: 'Art. 3' }]];
  const analyze = async (b) => {
    if (b[0].label === 'Art. 2') { const e = new Error('x'); e.kind = 'bad_json'; throw e; }
    return [{ articleLabel: b[0].label }];
  };
  const r = await analyzeBatches(batches, analyze);
  assert.deepStrictEqual(r.findings.map((x) => x.articleLabel), ['Art. 1', 'Art. 3']);
  assert.deepStrictEqual(r.unanalyzed, ['Art. 2']);
});

test('analyzeBatches: inne błędy (np. auth) przerywają całość', async () => {
  const analyze = async () => { const e = new Error('klucz'); e.kind = 'auth'; throw e; };
  await assert.rejects(analyzeBatches([[{ label: 'Art. 1' }]], analyze), /klucz/);
});
