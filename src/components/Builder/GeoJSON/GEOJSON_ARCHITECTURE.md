# GeoJSON Architecture & Styling System

This document outlines the architecture of the GeoJSON styling system, focusing on the multi-style implementation, theme presets, and MapLibre expression generation.

## Overview

The GeoJSON system is designed to handle multiple, prioritized styling rules for a single data source. It transforms high-level configuration (filters, scales, overrides) into high-performance MapLibre GL JS expressions that run natively on the GPU.

## Core Components

### 1. Data Models (`src/lib/marker/types.ts`)

- **`GeoJsonConfig`**: The root configuration for a GeoJSON layer. It contains a `url`, a `type` (points, lines, areas), and an array of `styles`.
- **`GeoJsonStyleConfig`**: A single styling rule.
  - `filter`: Optional property-based filter (e.g., `status == "hit"`).
  - `colourMode`: `simple`, `scale`, or `basic`.
  - `colourConfig`: Specific parameters for the chosen mode, including `basicType` for presets.

### 2. Centralized Themes (`src/components/CustomGlobe/features/GeoJson/themes.ts`)

The `THEMES` object is the single source of truth for visual presets:

- **`normal`**: The default ABC-branded style.
- **`highlighted`**: A high-visibility "red" style with increased stroke and radius.

**Developer Note**: To add a new preset (e.g., "Warning"), add it to this file first. The UI and renderers will automatically pick it up via the `THEMES` lookup.

### 3. Expression Generation (`src/components/CustomGlobe/features/GeoJson/utils.ts`)

This is the "engine" of the styling system. It iterates through the `styles` array to build complex MapLibre expressions.

#### Key Functions:

- `getColourExpression`: Builds a `['case', ...]` expression that evaluates filters in order.
- `getCircleRadiusExpression` / `getStrokeWidthExpression`: Handles theme-based sizes.
- `getFillOpacityExpression`: Manages layering of base opacity and theme-specific alpha factors.

#### The `coalesce` Pattern:

To prevent map crashes when features lack expected properties, we wrap all lookups in `coalesce`:

```json
["coalesce", ["get", "prop"], "fallback-value"]
```

## Styling Lifecycle

1.  **Selection**: The user selects a preset (Normal/Highlighted) in the Builder (`PropGeoJsonColour.svelte`).
2.  **Configuration**: The `GeoJsonStyleConfig` is updated with the `basicType`.
3.  **Compilation**: `utils.ts` generates a MapLibre expression (e.g., a `case` for filters).
4.  **Rendering**: The renderer snippets (`RenderPoint.svelte`, etc.) apply these expressions to the MapLibre layers.
5.  **Execution**: MapLibre evaluates these expressions on every frame at 60fps.

## Testing & Verification

Comprehensive unit tests are located in `src/components/CustomGlobe/features/GeoJson/utils.test.ts`.

- **Mocking**: Tests use a mock MapLibre environment via `@maplibre/maplibre-gl-style-spec`.
- **Validation**: Every generated expression is validated against the official style-spec using `createExpression`.
- **Evaluation**: We test the _result_ of expressions against mock features to ensure logic correctness.

## Best Practices for Future Development

- **Prefer Themes**: Avoid hardcoding hex codes or pixel values outside of `themes.ts`.
- **Order Matters**: The `styles` array is processed in order. The first filter that matches "wins". Always put the catch-all (no filter) style at the end of the array.
- **Type Safety**: Use the TypeScript interfaces in `types.ts` to ensure the builder and renderer stay in sync.
- **Performance**: Keep expressions as flat as possible. Avoid deep nesting of `case` or `interpolate` blocks where a single flat structure suffices.
