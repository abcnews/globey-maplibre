import { describe, it, assert } from 'vitest';
import { parseCmid, isValidCmid } from './utils.ts';

describe('CmidInput utils', () => {
  describe('parseCmid', () => {
    it('parses valid numeric strings and numbers', () => {
      assert.strictEqual(parseCmid('106753230'), 106753230);
      assert.strictEqual(parseCmid(106753230), 106753230);
      assert.strictEqual(parseCmid('  12345678  '), 12345678);
    });

    it('returns null for empty, non-numeric, or negative inputs', () => {
      assert.strictEqual(parseCmid(''), null);
      assert.strictEqual(parseCmid('   '), null);
      assert.strictEqual(parseCmid('abc'), null);
      assert.strictEqual(parseCmid('-123'), null);
      assert.strictEqual(parseCmid('0'), null);
      assert.strictEqual(parseCmid(0), null);
      assert.strictEqual(parseCmid(undefined), null);
      assert.strictEqual(parseCmid(null), null);
    });

    it('returns null for float values', () => {
      assert.strictEqual(parseCmid('123.45'), null);
    });
  });

  describe('isValidCmid', () => {
    it('returns true for valid CMIDs', () => {
      assert.strictEqual(isValidCmid('106753230'), true);
      assert.strictEqual(isValidCmid(12345678), true);
    });

    it('returns false for invalid CMIDs', () => {
      assert.strictEqual(isValidCmid(''), false);
      assert.strictEqual(isValidCmid('not-a-number'), false);
      assert.strictEqual(isValidCmid(0), false);
    });
  });
});
