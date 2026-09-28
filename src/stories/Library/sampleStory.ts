import { encodeMarker, type MarkerConfig } from '../../lib/data/marker.ts';
import { MARKER_NAME } from '../../lib/constants.ts';

/** Fade length for layers that switch on when a panel arrives rather than tracking scroll. */
const IMMEDIATE_MS = 1000;

const AUSTRALIA: [number, number][] = [
  [110, -9],
  [157, -45]
];
const QUEENSLAND: [number, number][] = [
  [137, -9],
  [154, -29.5]
];
const ROUTE: [number, number][] = [
  [127, -10],
  [141, -36]
];
const SOUTH_EAST: [number, number][] = [
  [134, -24],
  [170, -44]
];

/**
 * Each panel lists every layer that should be visible — anything not switched `on` is hidden.
 * - No `cam` → the camera pans with scroll. `cam` → it flies on arrival over that many ms.
 * - A layer with no `duration` fades with scroll; with a `duration` it fades in on arrival.
 */
const panels: { marker: MarkerConfig; text: string }[] = [
  {
    marker: { bbox: AUSTRALIA, layers: [{ name: 'day', state: 'on' }] },
    text: 'Daytime NASA Blue Marble imagery. Scroll to fade it to night.'
  },
  {
    marker: { bbox: AUSTRALIA, layers: [{ name: 'night', state: 'on' }] },
    text: 'NASA Black Marble cross-fades in with scroll.'
  },
  {
    marker: {
      bbox: AUSTRALIA,
      layers: [
        { name: 'night', state: 'on' },
        { name: 'states', state: 'on', duration: IMMEDIATE_MS }
      ]
    },
    text: 'Custom labels for each state fade in.'
  },
  {
    marker: {
      bbox: QUEENSLAND,
      layers: [
        { name: 'night', state: 'on' },
        { name: 'states', state: 'on' },
        { name: 'qld', state: 'on', duration: IMMEDIATE_MS }
      ]
    },
    text: 'A GeoJSON area, loaded from TopoJSON and filtered to Queensland.'
  },
  {
    marker: {
      bbox: ROUTE,
      layers: [
        { name: 'night', state: 'on' },
        { name: 'route', state: 'on' }
      ]
    },
    text: 'A GeoJSON line drawn on as you scroll (lineAnimationStyle: draw).'
  },
  {
    marker: {
      bbox: SOUTH_EAST,
      cam: 1500,
      layers: [
        { name: 'day', state: 'on' },
        { name: 'route', state: 'on' },
        { name: 'islands', state: 'on', duration: IMMEDIATE_MS, colour: 'ff3366' }
      ]
    },
    text: 'CAM flies the camera on arrival, and a marker can recolour GeoJSON (here, the islands).'
  }
];

/** The same text an editor would write in CoreMedia: opener, `#mark` + copy per panel, closer. */
export const sampleStoryText = [
  `#scrollytellerNAME${MARKER_NAME}1`,
  ...panels.flatMap(({ marker, text }) => [`#mark${encodeMarker(marker)}`, text]),
  '#endscrollyteller'
].join('\n\n');
