export interface GeoNameResult {
  id: string;
  name: string;
  latitude: string;
  longitude: string;
  countrycode: string;
  population: number;
}

/**
 * Searches the GeoNames dataset for a keyword.
 *
 * This fetchses a compressed TSV from the ABC's placenames service and streams
 * its contents to filter for the search term.
 *
 * @param keyword - The search term to filter by.
 * @param onProgress - Optional callback to receive results as they are found.
 * @returns A promise resolving to the full list of matching GeoName results.
 */
export async function searchGeoNames(
  keyword: string,
  onProgress?: (results: GeoNameResult[]) => void
): Promise<GeoNameResult[]> {
  const url = `https://www.abc.net.au/res/sites/news-projects/placenames/1.0.0/placeNames.tsv.gz`;
  const res = await fetch(url, { cache: 'force-cache' });

  if (!res.ok || !res.body) {
    throw new Error(`Failed to fetch GeoNames data: ${res.statusText}`);
  }

  const stream = res.body.pipeThrough(new TextDecoderStream());
  const reader = stream.getReader();
  let partialLine = '';
  const found: GeoNameResult[] = [];

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    const theseLines = partialLine + value;
    const split = theseLines.split('\n');

    // Keep the last incomplete line for the next chunk
    partialLine = split.pop() || '';

    const matches = split
      .filter(line => line.split('\t')[0].toLowerCase().includes(keyword.toLowerCase()))
      .map(line => {
        const [name, latitude, longitude, countrycode, population] = line.split('\t');
        return {
          id: `${name}${population}${latitude}${longitude}`,
          name,
          latitude,
          longitude,
          countrycode,
          population: Number(population)
        };
      });

    if (matches.length > 0) {
      found.push(...matches);
      onProgress?.([...found]);
    }
  }

  return found;
}
