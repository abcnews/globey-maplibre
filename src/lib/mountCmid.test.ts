import { describe, it } from 'vitest';
import assert from 'node:assert';
import { getMountCmid } from './mountCmid.ts';

describe('getMountCmid', () => {
  it('reads a numeric cmid off the mount id', () => {
    assert.strictEqual(getMountCmid({ id: 'scrollytellerNAMEglobeyCMID106753230' }), 106753230);
  });

  it('returns undefined when there is no cmid token', () => {
    assert.strictEqual(getMountCmid({ id: 'scrollytellerNAMEglobey' }), undefined);
  });

  it('returns undefined for a non-numeric cmid', () => {
    assert.strictEqual(getMountCmid({ id: 'scrollytellerNAMEglobeyCMIDabc' }), undefined);
  });
});
