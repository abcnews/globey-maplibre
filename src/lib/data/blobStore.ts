import { writable, type Writable } from 'svelte/store';
import {
  globeJsonBlobSchema,
  parseGlobeJsonBlob,
  safeParseGlobeJsonBlob,
  formatGlobeJsonBlob,
  type GlobeJsonBlob
} from './jsonBlob.ts';

export const JSON_BLOB_STORAGE_KEY = 'globey:jsonBlob:draft';

function getLocalStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    if (typeof localStorage !== 'undefined') {
      return localStorage;
    }
  } catch {
    // Ignore environments where localStorage is restricted
  }
  return null;
}

/**
 * Reads and validates any existing draft GlobeJsonBlob from localStorage.
 * Returns null if no draft exists or if the stored draft is invalid.
 */
export function loadStoredJsonBlob(): GlobeJsonBlob | null {
  const storage = getLocalStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(JSON_BLOB_STORAGE_KEY);
    if (!raw) return null;
    const res = safeParseGlobeJsonBlob(raw);
    if (res.success) {
      return res.data;
    }
    console.warn('[blobStore] Invalid stored JSON blob found in localStorage:', res.error);
    return null;
  } catch (err) {
    console.warn('[blobStore] Failed to load JSON blob from localStorage:', err);
    return null;
  }
}

/**
 * Checks whether a saved session exists in localStorage.
 */
export function hasStoredSession(): boolean {
  return loadStoredJsonBlob() !== null;
}

/**
 * Clears the stored draft JSON blob from localStorage.
 */
export function clearStoredJsonBlob(): void {
  const storage = getLocalStorage();
  if (storage) {
    try {
      storage.removeItem(JSON_BLOB_STORAGE_KEY);
    } catch (err) {
      console.warn('[blobStore] Failed to remove stored JSON blob:', err);
    }
  }
}

/**
 * Creates a default GlobeJsonBlob object with version 1 and default map settings.
 */
export function createDefaultJsonBlob(title?: string): GlobeJsonBlob {
  return parseGlobeJsonBlob({
    version: 1,
    title: title ?? '',
    layers: []
  });
}

function createBlobStore(): Writable<GlobeJsonBlob | null> & {
  initNew: (title?: string) => GlobeJsonBlob;
  restoreSession: () => boolean;
  loadJson: (json: unknown) => GlobeJsonBlob;
  clear: () => void;
} {
  const initial = loadStoredJsonBlob();
  const { subscribe, set, update } = writable<GlobeJsonBlob | null>(initial);

  // Sync mutations to localStorage
  subscribe(blob => {
    const storage = getLocalStorage();
    if (!storage) return;
    try {
      if (blob) {
        storage.setItem(JSON_BLOB_STORAGE_KEY, formatGlobeJsonBlob(blob));
      }
    } catch (err) {
      console.warn('[blobStore] Failed to sync to localStorage:', err);
    }
  });

  return {
    subscribe,
    set,
    update,

    /**
     * Initializes a brand new blob and saves to localStorage.
     */
    initNew(title?: string): GlobeJsonBlob {
      const newBlob = createDefaultJsonBlob(title);
      set(newBlob);
      return newBlob;
    },

    /**
     * Attempts to restore the previous session from localStorage.
     * Returns true if successfully restored, false otherwise.
     */
    restoreSession(): boolean {
      const stored = loadStoredJsonBlob();
      if (stored) {
        set(stored);
        return true;
      }
      return false;
    },

    /**
     * Validates and sets a loaded JSON blob (e.g. from CMID or pasted JSON).
     */
    loadJson(json: unknown): GlobeJsonBlob {
      const validated = parseGlobeJsonBlob(json);
      set(validated);
      return validated;
    },

    /**
     * Clears both the active store state and localStorage.
     */
    clear() {
      clearStoredJsonBlob();
      set(null);
    }
  };
}

export const jsonBlob = createBlobStore();
