const test = require('node:test');
const assert = require('node:assert');
const { normalize, validateFindings, computeScore } = require('../js/validate.js');

const constitution = { articles: [{ num: '2', text: 'Art. 2. ...' }, { num: '32', text: 'Art. 32. ...' }] };
const law = 'Art. 5. Minister może   w drodze decyzji\nodmówić wydania zezwolenia bez podania przyczyn.';
const base = {
  articleLabel: 'Art. 5',
  level: 'niezgodny',
  quote: 'Minister może w drodze decyzji odmówić wydania zezwolenia',
  constitutionArticles: ['2'],
  reasoning: 'Arbitralność.',
};

test('computeScore: (zgodne + 0,5 × wątpliwe) / wszystkie × 100', () =>
  assert.strictEqual(computeScore(['zgodny', 'watpliwy', 'niezgodny', 'zgodny']), 62.5));
test('computeScore: pusta lista daje 100', () => assert.strictEqual(computeScore([]), 100));
test('normalize zwija odstępy i dzieli-wyrazy', () =>
  assert.strictEqual(normalize('Mini-\nster   MOŻE'), 'minister może'));

test('cytat z innymi odstępami i łamaniem wiersza jest akceptowany', () => {
  const r = validateFindings([base], law, constitution);
  assert.strictEqual(r.valid.length, 1);
  assert.strictEqual(r.rejected.length, 0);
});
test('cytat nieobecny w ustawie jest odrzucony z reason "cytat"', () => {
  const r = validateFindings([{ ...base, quote: 'zmyślony cytat którego nie ma' }], law, constitution);
  assert.strictEqual(r.rejected[0].reason, 'cytat');
});
test('art. Konstytucji 999 odrzucony z reason "artykuł"', () => {
  const r = validateFindings([{ ...base, constitutionArticles: ['999'] }], law, constitution);
  assert.strictEqual(r.rejected[0].reason, 'artykuł');
});
test('"Art. 2" i "2" rozpoznane jako ten sam artykuł Konstytucji', () => {
  const r = validateFindings([{ ...base, constitutionArticles: ['Art. 2', '32'] }], law, constitution);
  assert.strictEqual(r.valid.length, 1);
});
test('finding bez wymaganych pól odrzucony', () => {
  const r = validateFindings([{ level: 'niezgodny' }, null], law, constitution);
  assert.strictEqual(r.valid.length, 0);
  assert.strictEqual(r.rejected.length, 2);
  assert.strictEqual(r.rejected[0].reason, 'format');
});
test('nieznany poziom odrzucony', () => {
  const r = validateFindings([{ ...base, level: 'super' }], law, constitution);
  assert.strictEqual(r.rejected[0].reason, 'format');
});
