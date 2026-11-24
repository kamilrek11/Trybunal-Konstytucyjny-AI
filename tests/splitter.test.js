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
