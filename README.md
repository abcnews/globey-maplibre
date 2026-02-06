# interactive-globey-maplibre

A MapLibre globe scrollyteller and builder

This is a work-in-progress as of 2026-01-28

For an architecture overview or to see how to implement a new feature see [architecture.md](docs/architecture.md).

For implementing into a Scrollyteller, we currently have the ScrollytellerGlobe component, but it's under-tested and we still need to work out a process for using it. Stay tuned.

## Testing
This repo uses Mocha for testing because we can't use Vite(st). Therefore please ensure code follows Node conventions
including relative url imports, and full path imports (index.ts instead of just index).

To run tests:

```bash
npm test
```