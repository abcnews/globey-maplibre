# ImageSource

Support for adding imagery (satellite imagery, historical### 1. Schema & State
- Add `imageSources` to the configuration schema.
- Each item should have:
  - `id`: Unique identifier.
  - `url`: Path or URL to the image.
  - `opacity`: 0 to 1.
  - `coordinates`: Either `[TL, TR, BR, BL]` or `[W, S, E, N]`.

### 2. CustomGlobe Handler
- Create `src/components/CustomGlobe/features/ImageSourceHandler.svelte`.
- This component will:
  - Add a `source` of type `image`.
  - Add a `layer` of type `raster`.
  - Update coordinates/url reactively.

### 3. Builder UI
- Create `src/components/Builder/ImageSource/PropImageSource.svelte`.
- Sidebar section to add/edit/remove image sources.
- Fields for URL, Opacity, and a coordinate picker/input field.
- Visual helper? Maybe a way to "paste" a BBox or 4-corner JSON.ctified (top-down view) for the best fit using MapLibre's 4-point coordinate system.

## Polar & Whole-Earth Imagery

Handling the poles requires special consideration because the standard Web Mercator projection used in tiles cuts off at ~85.05°.

### 1. Whole-Earth Mode
For images that cover the entire globe (e.g., global ice coverage, cloud maps, or land textures), we will provide a "Whole Earth" preset.
- **Source Projection**: The image should be in **Equirectangular (Plate Carrée)** projection. In this projection, pixels map linearly to longitude and latitude.

### 2. Polar Images
If an image is specifically a polar projection (e.g., an Arctic-centered circular map):
- It **must** be reprojected to Equirectangular or Mercator before being added to MapLibre.
- MapLibre's `ImageSource` always warps the image into a rectangle defined by the 4 corners. It cannot natively "unwarp" a circular polar projection into the globe.
- Designers should use tools like **QGIS** or **GDAL** to reproject polar data into a global Equirectangular strip or a Mercator square before uploading.

### 3. Coordinate Formats
We will support three input methods in the Builder:
- **2 Corners (GeoJSON/JSON)**: top left, bottom right. Given the imagery is always square we can assume it's always equirectangular and therefore calculate the remaining points outselves.
- **Bounding Box**: `[West, South, East, North]` (e.g., `[-180, -90, 180, 90]` for whole world)
- **Whole Earth Preset**: A single toggle that sets the bounds to the full global range.

## Input Format for Bounds

Out interface takes eithe ra bounding box in MapLibre format, or two coordinates:
- **Top Left** `[lng, lat]`
- **Bottom Right** `[lng, lat]`