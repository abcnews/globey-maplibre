import { safeParseGlobeJsonBlob, type GlobeJsonBlob } from './jsonBlob.ts';
import { fetchDownloadObject } from '../fetchDownloadObject.ts';

/**
 * Fetches a CoreMedia document by CMID and parses it as a GlobeJsonBlob, stamping
 * `sourceCmid` so the loaded blob remembers where it came from. Shared by the Builder's
 * "Load from CMID" flow and the runtime CM bootstrap (`src/index.ts`).
 */
export async function loadGlobeJsonBlobByCmid(cmid: number): Promise<GlobeJsonBlob> {
  const data = await fetchDownloadObject(cmid);
  const res = safeParseGlobeJsonBlob(data);
  if (!res.success) {
    throw new Error(`Data is not a valid Globey JSON schema: ${res.error.message}`);
  }
  return { ...res.data, sourceCmid: cmid };
}
