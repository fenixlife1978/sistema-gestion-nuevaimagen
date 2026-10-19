const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { verifyHash, modernHash, sign, verify, getCookie } = require('../lib/auth');

test('PBKDF2 password hashes accept the correct password only', () => {
  const hash = modernHash('UnaClaveFuerte-2026!');
  assert.match(hash, /^pbkdf2\$210000\$/);
  assert.equal(verifyHash('UnaClaveFuerte-2026!', hash), true);
  assert.equal(verifyHash('otra-clave', hash), false);
});

test('legacy SHA-256 hashes remain verifiable for migration', () => {
  const hash = crypto.createHash('sha256').update('c1x10_v1_clave-antigua', 'utf8').digest('hex');
  assert.equal(verifyHash('clave-antigua', hash), true);
  assert.equal(verifyHash('clave-incorrecta', hash), false);
});

test('malformed hashes fail closed without throwing', () => {
  for (const hash of ['', null, 'pbkdf2$210000$salt$short', 'pbkdf2$1$salt$AAAA', 'not-a-hash']) {
    assert.doesNotThrow(() => verifyHash('password', hash));
    assert.equal(verifyHash('password', hash), false);
  }
});

test('signed sessions reject tampering and expired payloads', () => {
  const previous = process.env.SESSION_SECRET;
  process.env.SESSION_SECRET = 'test-only-session-secret';
  try {
    const token = sign({ uid: 7, usuario: 'tester', rol: 'A', exp: Date.now() + 60_000 });
    assert.equal(verify(token)?.uid, 7);
    const tampered = token.slice(0, -1) + (token.endsWith('a') ? 'b' : 'a');
    assert.equal(verify(tampered), null);
    const expired = sign({ uid: 7, usuario: 'tester', rol: 'A', exp: Date.now() - 1 });
    assert.equal(verify(expired), null);
  } finally {
    if (previous === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previous;
  }
});

test('malformed percent-encoded cookies do not crash request handling', () => {
  assert.equal(getCookie({ headers: { cookie: 'erp_session=%E0%A4%A' } }, 'erp_session'), '');
  assert.equal(getCookie({ headers: { cookie: 'other=x; erp_session=abc%2Edef' } }, 'erp_session'), 'abc.def');
});
