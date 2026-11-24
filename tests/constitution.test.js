const test = require('node:test');
const assert = require('node:assert');
const C = require('../js/constitution.js').CONSTITUTION;

const art = (n) => C.articles.find((a) => a.num === String(n));

test('ma 243 artykuły', () => assert.strictEqual(C.articles.length, 243));
test('art. 1 zawiera "dobrem wspólnym wszystkich obywateli"', () =>
  assert.ok(art(1).text.includes('dobrem wspólnym wszystkich obywateli')));
test('art. 2 zawiera "demokratycznym państwem prawnym"', () =>
  assert.ok(art(2).text.includes('demokratycznym państwem prawnym')));
test('fullText zawiera "Art. 243"', () => assert.ok(C.fullText.includes('Art. 243')));

test('artykuły nie zawierają nagłówków rozdziałów', () =>
  assert.deepStrictEqual(C.articles.filter((a) => /Rozdział [IVX]+/.test(a.text)).map((a) => a.num), []));

test('art. 29 nie kończy się nagłówkiem działu', () => assert.ok(art(29).text.endsWith('jest Warszawa.')));
