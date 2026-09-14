# interactive-globey-maplibre

A MapLibre globe scrollyteller and builder

This is a work-in-progress as of 2026-01-28

## Developing

1. `npm run dev` and visit /builder for the builder.
2. `npm run build`/`npx aunty release` to build/release.

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md): An overview of the project structure, including the `CustomGlobe` and `Builder` components, data flow via URL hash serialization, and a guide for adding new features.

## Builder

- https://www.abc.net.au/res/sites/news-projects/interactive-globey-maplibre/0.1.14/builder/

## Globes in your own project

Import `CustomGlobe` or `ScrollytellerGlobe`:

```svelte
<script>
  import { CustomGlobe, ScrollytellerGlobe } from 'globey-maplibre/lib';
</script>

<CustomGlobe {options} interactive onmap={map => console.log('ready', map)} />
<ScrollytellerGlobe {panels} onmap={map => console.log('ready', map)} />
```

`onmap` fires with the MapLibre `map` instance once constructed.

### Custom layers

Register custom layer components via `plugins`:

```svelte
<CustomGlobe {options} plugins={[{ id: 'my-layer', component: MyLayer, config }]} />
```

Plugins receive `{ map, config, zIndex }`. See [`src/plugins/GeoJsonSpikes/`](src/plugins/GeoJsonSpikes/README.md) for an example.
