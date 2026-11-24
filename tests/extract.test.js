const test = require('node:test');
const assert = require('node:assert');
const { assertHasText } = require('../js/extract.js');

test('pusty tekst rzuca błąd z "OCR"', () => assert.throws(() => assertHasText('   \n '), /OCR/));
test('dłuższy tekst przechodzi bez zmian', () => {
  const t = 'Art. 1. Treść ustawy. '.repeat(20);
  assert.strictEqual(assertHasText(t), t);
});
