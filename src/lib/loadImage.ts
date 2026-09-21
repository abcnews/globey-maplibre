/**
 * @file Svelte store factory that fetches CoreMedia documents via Terminus.
 * Provides responsive image selection based on targetWidth.
 */

import { fetchOne, getImages } from '@abcnews/terminus-fetch';

export type LoadImageStatus = 'loading' | 'loaded' | 'error';

export interface ImageState {
  status: LoadImageStatus;
  url?: string;
  width?: number;
  height?: number;
  alt?: string;
  error?: Error;
}

export type Unsubscriber = () => void;
export type Subscriber<T> = (value: T) => void;

export interface ReadableStore<T> {
  subscribe(run: Subscriber<T>): Unsubscriber;
}

export interface LoadImageOptions {
  /** Target display width in pixels to pick the best rendition */
  targetWidth?: number;
  /** Preferred aspect ratio, e.g. '16x9', '3x2', '1x1', 'original' */
  preferredRatio?: string;
  /** Whether to populate the alt text from the document */
  includeAlt?: boolean;
  /** Custom Terminus API key if required */
  apiKey?: string;
}

/** Standard breakpoints in pixels corresponding to CoreMedia/Odyssey alt keys */
const BREAKPOINT_WIDTHS: Record<string, number> = {
  gt_sm: 700,
  gt_md: 980,
  gt_lg: 1800
};

/** In-memory document cache to avoid duplicate network requests for the same CMID */
const documentCache = new Map<number, Promise<any>>();

/** In-memory image state cache to immediately serve resolved images on subsequent calls */
const imageStateCache = new Map<string, ImageState>();

/**
 * Fetches a CoreMedia document via Terminus with caching and error handling.
 */
function fetchTerminusDocument(cmid: number, apiKey?: string): Promise<any> {
  if (!documentCache.has(cmid)) {
    const fetchPromise = fetchOne({ id: cmid }, apiKey || import.meta.env.VITE_TERMINUS_FETCH_API_KEY).catch(
      (err: unknown) => {
        documentCache.delete(cmid);
        throw err instanceof Error ? err : new Error(String(err));
      }
    );
    documentCache.set(cmid, fetchPromise);
  }
  return documentCache.get(cmid)!;
}

/**
 * Selects the best rendition for a given target width and preferred aspect ratio.
 */
function pickRendition(
  renditions: Array<{ width: number; height: number; ratio: string; url: string }>,
  targetWidth?: number,
  preferredRatio?: string
) {
  if (!renditions || renditions.length === 0) return null;

  // Filter by preferred ratio if specified
  const filtered = renditions.filter(r => preferredRatio === undefined || r.ratio === preferredRatio);
  const pool = filtered.length > 0 ? filtered : renditions;

  if (!targetWidth) {
    // Return largest rendition if no target width is specified
    return pool.reduce((prev, curr) => (curr.width > prev.width ? curr : prev), pool[0]);
  }

  // Find the smallest rendition that satisfies targetWidth, or the largest available
  const largerOrEqual = pool.filter(r => r.width >= targetWidth);
  if (largerOrEqual.length > 0) {
    return largerOrEqual.reduce((prev, curr) => (curr.width < prev.width ? curr : prev), largerOrEqual[0]);
  }

  return pool.reduce((prev, curr) => (curr.width > prev.width ? curr : prev), pool[0]);
}

/**
 * Svelte store factory adhering to the plain JS Svelte store contract ({ subscribe }).
 *
 * Fetches CoreMedia documents and handles art-directed responsive imagery based on targetWidth.
 * If targetWidth can be satisfied by the default mobile image, responsive alts documents are not fetched.
 *
 * @param cmid CoreMedia document ID
 * @param options Target width, preferred ratio, and alt text preferences
 */
export function loadImage(cmid: number | string, options: LoadImageOptions = {}): ReadableStore<ImageState> {
  const { targetWidth, preferredRatio, includeAlt = false, apiKey } = options;
  const numericCmid = typeof cmid === 'string' ? Number(cmid) : cmid;

  const cacheKey = `${numericCmid}:${targetWidth || ''}:${preferredRatio || ''}:${includeAlt}:${apiKey || ''}`;
  const cached = numericCmid ? imageStateCache.get(cacheKey) : undefined;

  let state: ImageState = cached || { status: 'loading' };
  const subscribers = new Set<Subscriber<ImageState>>();

  const notify = () => {
    subscribers.forEach(run => run(state));
  };

  const setState = (nextState: ImageState) => {
    state = nextState;
    if (nextState.status === 'loaded') {
      imageStateCache.set(cacheKey, nextState);
    }
    notify();
  };

  if (cached && cached.status === 'loaded') {
    // Already cached and loaded, no further fetch needed
  } else if (!numericCmid || isNaN(numericCmid)) {
    state = {
      status: 'error',
      error: new Error(`Invalid CMID provided: ${cmid}`)
    };
  } else {
    // Initiate document fetching and responsive resolution
    (async () => {
      try {
        const baseDoc = await fetchTerminusDocument(numericCmid, apiKey);
        const alts: Array<{ width: string; image: { id: number } }> = baseDoc?.contextSettings?.odyssey?.alts || [];

        let chosenDoc = baseDoc;

        // Check if any responsive alternative breakpoint is eligible based on targetWidth
        if (targetWidth && alts.length > 0) {
          // Sort alternatives by breakpoint threshold descending to find highest matching breakpoint
          const matchingAlts = alts
            .map(altItem => ({
              ...altItem,
              threshold: BREAKPOINT_WIDTHS[altItem.width.toLowerCase()] ?? 0
            }))
            .filter(altItem => altItem.threshold > 0 && targetWidth >= altItem.threshold)
            .sort((a, b) => b.threshold - a.threshold);

          if (matchingAlts.length > 0) {
            const bestAlt = matchingAlts[0];
            chosenDoc = await fetchTerminusDocument(bestAlt.image.id, apiKey);
          }
        }

        const imagesData = getImages(chosenDoc);
        const renditions = imagesData?.renditions || [];
        const bestRendition = pickRendition(renditions, targetWidth, preferredRatio);

        if (!bestRendition) {
          setState({
            status: 'error',
            error: new Error(`No suitable rendition found for CMID: ${numericCmid}`)
          });
          return;
        }

        setState({
          status: 'loaded',
          url: bestRendition.url,
          width: bestRendition.width,
          height: bestRendition.height,
          alt: includeAlt ? chosenDoc.alt || baseDoc.alt || '' : undefined
        });
      } catch (err: unknown) {
        setState({
          status: 'error',
          error: err instanceof Error ? err : new Error(String(err))
        });
      }
    })();
  }

  return {
    subscribe(run: Subscriber<ImageState>): Unsubscriber {
      subscribers.add(run);
      run(state);

      return () => {
        subscribers.delete(run);
      };
    }
  };
}
