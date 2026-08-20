import { fetchOne } from '@abcnews/terminus-fetch';

/**
 * Fetches a CoreMedia document via Terminus and retrieves the parsed JSON from its downloadURL.
 *
 * @param cmid The numeric CoreMedia ID of the document
 * @returns Parsed JSON object from the document's download URL
 */
export async function fetchDownloadObject<T = any>(cmid: number | string): Promise<T> {
  const id = typeof cmid === 'string' ? Number(cmid) : cmid;
  if (!id || isNaN(id)) {
    throw new Error(`Invalid CMID provided: ${cmid}`);
  }

  const doc: any = await fetchOne({ id }, import.meta.env.VITE_TERMINUS_FETCH_API_KEY);
  if (doc?.downloadURL) {
    const res = await fetch(doc.downloadURL);
    if (!res.ok) {
      throw new Error(`Failed to fetch downloadURL: ${res.status}`);
    }
    return res.json();
  }

  throw new Error('No downloadURL found in CMID document');
}
