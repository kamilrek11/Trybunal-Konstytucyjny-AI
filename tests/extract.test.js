const test = require('node:test');
const assert = require('node:assert');
const { assertHasText } = require('../js/extract.js');

test('pusty tekst rzuca błąd z "OCR"', () => assert.throws(() => assertHasText('   \n '), /OCR/));
test('dłuższy tekst przechodzi bez zmian', () => {
  const t = 'Art. 1. Treść ustawy. '.repeat(20);
  assert.strictEqual(assertHasText(t), t);
});

const { joinTextItems } = require('../js/extract.js');
const it = (str, y, height = 11) => ({ str, transform: [1, 0, 0, 1, 0, y], height });

test('joinTextItems: zmiana linii daje \\n', () =>
  assert.strictEqual(joinTextItems([it('Art. 1.', 700), it('Treść', 686)]), 'Art. 1.\nTreść'));
test('joinTextItems: ta sama linia bez \\n', () =>
  assert.strictEqual(joinTextItems([it('Art. 1.', 700), it(' Treść', 700)]), 'Art. 1. Treść'));
test('joinTextItems: indeks górny zamieniany na znak Unicode i bez łamania linii', () =>
  assert.strictEqual(joinTextItems([it('Art. 22', 700), it('1', 704, 7), it('. Treść', 700)]), 'Art. 22¹. Treść'));
