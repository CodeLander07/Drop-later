import assert from 'node:assert/strict';
import { idempotencyKey } from '../src/index.js';

const noteId = '64b8f8e2c2e1c2a1f0a00000';
const releaseAt = '2020-01-01T00:00:10.000Z';

const key1 = idempotencyKey(noteId, releaseAt);
const key2 = idempotencyKey(noteId, releaseAt);

assert.equal(key1, key2, 'Idempotency key should be stable for same inputs');
assert.equal(key1.length, 64, 'Expect sha256 hex length');
console.log('ok');


