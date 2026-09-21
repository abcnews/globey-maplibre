import { describe, it, expect } from 'vitest';
import {
  searchFeatureSetItems,
  getFeatureFileUrl,
  type FeatureSetDefinition,
  type FeatureSetItem
} from './featureSets.ts';

describe('HighlightFeatures featureSets', () => {
  const dummySet: FeatureSetDefinition = {
    id: 'test-set',
    name: 'Test Set',
    baseUrl: 'https://www.example.com/geojson/10m/'
  };

  const sampleItems: FeatureSetItem[] = [
    { filename: 'AUS.geojson', name: 'Australia' },
    { filename: 'AUT.geojson', name: 'Austria' },
    { filename: 'NZL.geojson', name: 'New Zealand' }
  ];

  it('searches items by name', () => {
    expect(searchFeatureSetItems(sampleItems, 'aus')).toEqual([
      { filename: 'AUS.geojson', name: 'Australia' },
      { filename: 'AUT.geojson', name: 'Austria' }
    ]);

    expect(searchFeatureSetItems(sampleItems, 'zealand')).toEqual([{ filename: 'NZL.geojson', name: 'New Zealand' }]);

    expect(searchFeatureSetItems(sampleItems, '')).toHaveLength(3);
  });

  it('computes correct feature file URL', () => {
    const url = getFeatureFileUrl(dummySet, sampleItems[0]);
    expect(url).toBe('https://www.example.com/geojson/10m/AUS.geojson');
  });
});
