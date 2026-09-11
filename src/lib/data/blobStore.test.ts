import { describe, it, beforeEach, afterEach, vi } from 'vitest';
import assert from 'node:assert';
import {
  jsonBlob,
  loadStoredJsonBlob,
  clearStoredJsonBlob,
  hasStoredSession,
  createDefaultJsonBlob,
  JSON_BLOB_STORAGE_KEY
} from './blobStore.ts';
import { formatGlobeJsonBlob } from './jsonBlob.ts';

describe('blobStore', () => {
  const mockStorage: Record<string, string> = {};

  beforeEach(() => {
    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, val: string) => {
        mockStorage[key] = String(val);
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      }
    });
    jsonBlob.set(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('createDefaultJsonBlob should initialize a valid empty blob', () => {
    const blob = createDefaultJsonBlob('Test Blob');
    assert.strictEqual(blob.title, 'Test Blob');
    assert.strictEqual(blob.version, 1);
    assert.deepStrictEqual(blob.layers, []);
  });

  it('initNew should set new blob into store and persist to localStorage', () => {
    const newBlob = jsonBlob.initNew('Fresh Graphic');
    assert.strictEqual(newBlob.title, 'Fresh Graphic');

    const storedStr = mockStorage[JSON_BLOB_STORAGE_KEY];
    assert.ok(storedStr);
    assert.ok(storedStr.includes('Fresh Graphic'));
    assert.strictEqual(hasStoredSession(), true);
  });

  it('restoreSession should restore valid stored data', () => {
    const original = createDefaultJsonBlob('Saved Project');
    mockStorage[JSON_BLOB_STORAGE_KEY] = formatGlobeJsonBlob(original);

    assert.strictEqual(hasStoredSession(), true);
    const restored = jsonBlob.restoreSession();
    assert.strictEqual(restored, true);

    let currentVal: any;
    jsonBlob.subscribe(val => (currentVal = val))();
    assert.strictEqual(currentVal?.title, 'Saved Project');
  });

  it('loadJson should parse, validate and persist valid JSON', () => {
    const loaded = jsonBlob.loadJson({
      version: 1,
      title: 'Imported Project',
      layers: []
    });

    assert.strictEqual(loaded.title, 'Imported Project');
    assert.ok(mockStorage[JSON_BLOB_STORAGE_KEY]?.includes('Imported Project'));
  });

  it('clear should remove from store and localStorage', () => {
    jsonBlob.initNew('To Clear');
    assert.ok(mockStorage[JSON_BLOB_STORAGE_KEY]);

    jsonBlob.clear();
    assert.strictEqual(mockStorage[JSON_BLOB_STORAGE_KEY], undefined);
    assert.strictEqual(hasStoredSession(), false);
  });
});
