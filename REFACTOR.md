Currently Globeyteller stores data in markers. These markers are self-contained units of config that have no relation to previous markers. But this causes problems, so we need to unify our config into a global JSON which has all the layers and all the data up front. Then in the Scrollyteller we can toggle these layers while keeping the Z index and data consistently in one place in the json blob.

We must use as much of the current builder code to create a new builder that lets the user:

1. LAYOUT MODE: create or load a JSON blob containing all the layers they wish to use in the scrollyteller, with the correct z-indexes. The user can toggle layers on and off in this mode to make things clearer, but this setting does not persist anywhere. The user may add a human readable name to each layer. Layers will be given UUIDs. JSON can be pasted in or loaded by CMID, same as geojson currently gets loaded. The CustomGlobe component will just takes a JSON config argument, so in future we can expose it as a library, or bootstrap it from CM index.ts. JSON will be persisted in localStorage, but the user must manually persist it to CM or save a copy before entering marker mode.
2. MARKER MODE: THEN switch to a mark editing mode where they can create named markers, toggle layers on & off, change the colour of a json layer (this means we can eventually remove the auto-split animation layers in GeoJSONHandler), configure animation type between markers (duration, immediate, scroll-tied per-layer & for globe movement), and set the globe position for the given marker. The user can NOT rearrange layers in this mode.

## Marker ACTO Specification

Markers are encoded as ACTO strings and are (mostly) human-readable. All layers are **off by default**; if a layer is not explicitly marked as `on`, it fades out using default transitions.

### 1. Camera & Framing

- `BBOX<geohashes>`: Geographic bounds encoded as concatenated geohash strings.
- `CAM<duration>ms`: Camera animation duration (e.g. `CAM2000ms` triggers an immediate fly-to on arrival). Absence indicates scroll-tied tracking.
- `FITGLOBE<on|off>`: Force-fits the whole globe to the viewport, overriding `BBOX`. Absent means inherit whatever the previous marker/master config set.
- `CENTER<geohash>`: Single-point rotation centre `[lng, lat]`, encoded as one geohash. Only meaningful alongside `FITGLOBE<on>` — a `BBOX` already implies its own centre from its extents. Captured from the live map's centre at the moment `FITGLOBE` is turned on in the Builder, since fit-globe mode locks map interaction afterwards.

### 2. Layer Overrides

Format: `LAYER<name><on|off>[<duration>ms][<hex>]`

- **Name**: Layer ID / slug as defined in the master JSON blob.
- **State**:
  - `on`: Turn layer on. Absence of duration implies **scroll-tied** animation.
  - `off`: Turn layer off with custom or default fade.
- **Duration (Optional)**:
  - `[0-9]+ms`: Presence indicates an **immediate** animation over the specified duration on arrival (e.g. `2000ms`). Absence indicates scroll-tied fade.
- **Colour (Optional)**:
  - `[0-9a-f]{6}`: 6-character hex colour override for the layer (e.g. `ff0000`).

#### Layer Override Examples:

- `LAYERfireson` — Scroll-tied fade in, default layer colour.
- `LAYERfireson2000ms` — Immediate fade in over 2000ms on arrival.
- `LAYERfiresonff3300` — Scroll-tied fade in, colour overridden to `#ff3300`.
- `LAYERfireson2000msff3300` — Immediate fade in over 2000ms, colour `#ff3300`.
- `LAYERfiresoff` — Default fade out.
- `LAYERfiresoff500ms` — Immediate fade out over 500ms.

### 3. Base & Environment Toggles (Optional)

- `BASE<satellite|street|dark>`: Switch base style for the panel.
- `LABELS<on|off>`: Toggle base vector labels (cities/countries/water).
- `MINIMAP<on|off>`: Toggle locator inset minimap.

### Full Example

```text
#markBBOXxxxxxxCAM1500msLAYERsatelliteonLAYERfireson2000msff3300LAYERevacoff
```
