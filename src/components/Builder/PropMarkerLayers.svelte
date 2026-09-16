<script lang="ts">
  import type { GlobeLayer } from '../../lib/data/jsonBlob.ts';
  import type { MarkerLayerOverride } from '../../lib/data/marker.ts';
  import { layerFeatureRegistry } from '../features';
  import { ArrowCounterclockwise } from 'svelte-bootstrap-icons';

  interface Props {
    /** Master layer list, read-only — order here is fixed, no reordering in Marker Mode. */
    layers: GlobeLayer[];
    /** This marker's current layer overrides. */
    overrides: MarkerLayerOverride[];
    onchange: (next: MarkerLayerOverride[]) => void;
  }

  let { layers, overrides, onchange }: Props = $props();

  // The `LAYER<name>on<duration>ms` grammar still needs a number to stay valid ACTO, but
  // only presence/absence of a duration is meaningful now (immediate vs scroll-tied) — the
  // real fade duration always comes from the shared panel-level clock. See REFACTOR.md.
  const IMMEDIATE_DURATION_SENTINEL = 1;

  /** `LAYER<name>` tokens key off the layer's builder-facing name, falling back to its id. */
  function keyFor(layer: GlobeLayer): string {
    return layer.name ?? layer.id;
  }

  function overrideFor(layer: GlobeLayer): MarkerLayerOverride | undefined {
    return overrides.find(o => o.name === keyFor(layer));
  }

  function isDefault(override: MarkerLayerOverride): boolean {
    return override.state === 'off' && override.duration === undefined && override.colour === undefined;
  }

  /** Finds-or-creates the override for a layer, applies `patch`, and strips it back to
   *  "absent" once it returns to the all-default/off state — keeps emitted ACTO tokens minimal. */
  function updateOverride(layer: GlobeLayer, patch: Partial<MarkerLayerOverride>) {
    const key = keyFor(layer);
    const existing = overrideFor(layer);
    const next: MarkerLayerOverride = { name: key, state: 'off', ...existing, ...patch };

    const withoutThis = overrides.filter(o => o.name !== key);
    onchange(isDefault(next) ? withoutThis : [...withoutThis, next]);
  }
</script>

<ul class="marker-layers">
  {#each layers as layer (layer.id)}
    {@const override = overrideFor(layer)}
    {@const icon = layerFeatureRegistry.find(f => f.kind === layer.type)?.icon}
    <li>
      <div class="row">
        <label class="toggle">
          <input
            type="checkbox"
            checked={override?.state === 'on'}
            onchange={e => updateOverride(layer, { state: e.currentTarget.checked ? 'on' : 'off' })}
          />
          {#if icon}
            {@const Icon = icon}
            <Icon class="layer-icon" />
          {/if}
          <span class="layer-name">{layer.name ?? layer.id}</span>
        </label>
      </div>

      {#if override?.state === 'on'}
        <div class="row sub-row">
          <label>
            <input
              type="radio"
              name={`anim-${layer.id}`}
              checked={override.duration === undefined}
              onchange={() => updateOverride(layer, { duration: undefined })}
            />
            Scroll-tied
          </label>
          <label>
            <input
              type="radio"
              name={`anim-${layer.id}`}
              checked={override.duration !== undefined}
              onchange={() => updateOverride(layer, { duration: IMMEDIATE_DURATION_SENTINEL })}
            />
            Immediate
          </label>
        </div>

        {#if layer.type === 'geojson'}
          <div class="row sub-row">
            <label class="colour-label">
              Colour
              <input
                type="color"
                value={override.colour ? `#${override.colour}` : '#ffffff'}
                onchange={e => updateOverride(layer, { colour: e.currentTarget.value.replace('#', '') })}
              />
            </label>
            <input
              type="text"
              class="hex-input"
              placeholder="layer default"
              value={override.colour ?? ''}
              oninput={e => {
                const hex = e.currentTarget.value.trim().replace(/^#/, '');
                updateOverride(layer, { colour: hex || undefined });
              }}
            />
            {#if override.colour}
              <button
                type="button"
                class="btn-icon"
                title="Reset to layer default colour"
                aria-label="Reset to layer default colour"
                onclick={() => updateOverride(layer, { colour: undefined })}
              >
                <ArrowCounterclockwise />
              </button>
            {/if}
          </div>
        {/if}
      {/if}
    </li>
  {/each}
</ul>

{#if layers.length === 0}
  <small>No layers defined yet — add some in Layout Mode first.</small>
{/if}

<style>
  .marker-layers {
    list-style: none;
    padding: 0;
    margin: 0;
    border: 1px solid var(--border);
    border-radius: 0.2rem;
    overflow: hidden;
  }

  .marker-layers li {
    padding: 0.5rem;
    border-bottom: 1px solid var(--border);
    background: var(--background-alt);
  }

  .marker-layers li:last-child {
    border-bottom: none;
  }

  .row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .sub-row {
    margin-top: 0.4rem;
    padding-left: 1.5rem;
    font-size: 0.85rem;
  }

  .toggle {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    cursor: pointer;
  }

  :global(.layer-icon) {
    flex-shrink: 0;
    opacity: 0.8;
  }

  .layer-name {
    font-weight: 600;
  }

  .colour-label {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .hex-input {
    width: 6rem;
  }
</style>
