const test = require('node:test');
const assert = require('node:assert');
const { execSync } = require('node:child_process');
const fs = require('node:fs');

test('repo nie zawiera kluczy API', () => {
  const files = execSync('git ls-files -co --exclude-standard', { encoding: 'utf8' }).split('\n').filter(Boolean);
  const re = /AIza[0-9A-Za-z_-]{30,}/;
  const hits = files.filter((f) => fs.existsSync(f) && fs.statSync(f).isFile() && re.test(fs.readFileSync(f, 'utf8')));
  assert.deepStrictEqual(hits, []);
});
