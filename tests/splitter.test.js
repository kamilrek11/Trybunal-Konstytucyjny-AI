const test = require('node:test');
const assert = require('node:assert');
const { splitArticles, batchArticles } = require('../js/splitter.js');

test('dzieli na Art. 1 i Art. 2', () => {
  const r = splitArticles('Art. 1. Pierwszy przepis.\nArt. 2. Drugi przepis.');
  assert.deepStrictEqual(r.map((a) => a.label), ['Art. 1', 'Art. 2']);
  assert.ok(r[1].text.includes('Drugi przepis'));
});

test('rozpoznaje Art. 12a', () => {
  const r = splitArticles('Art. 12. A.\nArt. 12a. B.\nArt. 13. C.');
  assert.deepStrictEqual(r.map((a) => a.label), ['Art. 12', 'Art. 12a', 'Art. 13']);
});

test('ustawa bez numeracji daje Fragment 1..n', () => {
  const para = 'Zdanie testowe. '.repeat(100); // ok. 1600 znaków
  const text = [para, para, para, para].join('\n\n');
  const r = splitArticles(text);
  assert.ok(r.length >= 2);
  assert.deepStrictEqual(r.map((a) => a.label), r.map((_, i) => `Fragment ${i + 1}`));
  assert.ok(r.every((a) => a.text.length <= 4000));
});

test('tekst przed pierwszym Art. (tytuł) nie ginie', () => {
  const r = splitArticles('USTAWA o czymś\nz dnia 1 stycznia\nArt. 1. Treść.');
  assert.strictEqual(r[0].label, 'Wstęp');
  assert.ok(r[0].text.includes('USTAWA o czymś'));
  assert.strictEqual(r[1].label, 'Art. 1');
});

test('batchArticles nie przekracza limitu poza pojedynczym długim artykułem', () => {
  const arts = [
    { label: 'Art. 1', text: 'a'.repeat(400) },
    { label: 'Art. 2', text: 'b'.repeat(400) },
    { label: 'Art. 3', text: 'c'.repeat(400) },
    { label: 'Art. 4', text: 'd'.repeat(2000) },
  ];
  const batches = batchArticles(arts, 1000);
  assert.deepStrictEqual(batches.map((b) => b.map((a) => a.label)), [['Art. 1', 'Art. 2'], ['Art. 3'], ['Art. 4']]);
});

test('artykuły w cytowanej nowelizacji nie są osobnymi artykułami ustawy', () => {
  const t = 'Art. 1. W ustawie dodaje się art. 3a i 3b w brzmieniu:\n„Art. 3a. Treść a.\nArt. 3b. Treść b.”;\nArt. 2. Drugi.\nArt. 3. Trzeci.';
  assert.deepStrictEqual(splitArticles(t).map((a) => a.label), ['Art. 1', 'Art. 2', 'Art. 3']);
});

test('niedomknięty cudzysłów nie połyka kolejnych artykułów', () => {
  const t = 'Art. 1. Tekst z „pojedynczym cudzysłowem.\nArt. 2. Drugi.\nArt. 3. Trzeci.';
  assert.deepStrictEqual(splitArticles(t).map((a) => a.label), ['Art. 1', 'Art. 2', 'Art. 3']);
});

test('powtórzone numery artykułów dostają unikalne etykiety', () => {
  const r = splitArticles('Art. 1. A.\nArt. 2. B.\nArt. 1. C.');
  assert.deepStrictEqual(r.map((a) => a.label), ['Art. 1', 'Art. 2', 'Art. 1 (2)']);
});

test('rozpoznaje Art. 22¹ (indeks górny)', () => {
  const r = splitArticles('Art. 22. a\nArt. 22¹. b\nArt. 23. c');
  assert.deepStrictEqual(r.map((a) => a.label), ['Art. 22', 'Art. 22¹', 'Art. 23']);
});

test('batchArticles domyślnie mieści 3 artykuły po 12 tys. znaków', () => {
  const arts = [1, 2, 3].map((i) => ({ label: `Art. ${i}`, text: 'x'.repeat(12000) }));
  assert.strictEqual(batchArticles(arts).length, 1);
});
