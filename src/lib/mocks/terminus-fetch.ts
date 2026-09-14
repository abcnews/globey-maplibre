// Mock for @abcnews/terminus-fetch used in tests.
// The real package pulls in an old, nested @abcnews/env-utils (CJS) that
// accesses `document`/`window` at module load time, which throws outside a
// browser. Nothing under test exercises real Terminus fetch behaviour, so we
// stub the two functions actually imported from this package.

export const fetchOne = async () => null;
export const getImages = async () => [];
