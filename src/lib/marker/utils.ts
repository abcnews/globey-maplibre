const URL_TOKENS = [
  ['https://www.abc.net.au/res/sites/news-projects/', '~1'],
  ['https://abc.net.au/dat/news/', '~2'],
  ['https://live-production.wcms.abc-cdn.net.au/', '~3']
] as const;

/**
 * Validates if a URL is allowed (not a preview URL)
 */
export function isValidUrl(url: string | undefined): boolean {
  if (!url) return false;
  return !url.includes('preview.') && !url.includes('preview-');
}

/**
 * Compresses common URL prefixes into tokens
 */
export function compressUrl(url: string): string {
  if (!url) return url;
  for (const [full, token] of URL_TOKENS) {
    if (url.startsWith(full)) {
      return url.replace(full, token);
    }
  }
  return url;
}

/**
 * Decompresses tokens back into full URLs
 */
export function decompressUrl(compressed: string): string {
  if (!compressed) return compressed;
  for (const [full, token] of URL_TOKENS) {
    if (compressed.startsWith(token)) {
      return compressed.replace(token, full);
    }
  }
  return compressed;
}
