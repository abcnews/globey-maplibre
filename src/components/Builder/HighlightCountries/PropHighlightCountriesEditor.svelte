<script lang="ts">
  import { ContextMenu } from '@abcnews/components-builder';
  import type { maplibregl } from '../../mapLibre/index';
  import type { Country } from '../../../lib/marker';

  const {
    map,
    highlightCountries: parentHighlightCountries = [],
    onchange
  }: {
    map: maplibregl.Map;
    highlightCountries?: Country[];
    onchange?: (countries: Country[]) => void;
  } = $props();

  let highlightedCountries = $state<Country[]>([]);

  $effect(() => {
    highlightedCountries = parentHighlightCountries;
  });
  let contextMenu = $state<{
    isOpen: boolean;
    x: number;
    y: number;
    name?: string;
    isoCode?: string;
  }>({
    isOpen: false,
    x: 0,
    y: 0
  });

  function updateSelected(countries: Country[]) {
    highlightedCountries = countries;
    onchange?.(countries);
  }

  function setCountryStyle(isoCode: string, style: 'primary' | 'secondary' | null) {
    const existingIndex = highlightedCountries.findIndex(c => c.code === isoCode);
    let newCountries = [...highlightedCountries];

    if (style === null) {
      if (existingIndex > -1) {
        newCountries.splice(existingIndex, 1);
      }
    } else {
      if (existingIndex > -1) {
        newCountries[existingIndex] = { code: isoCode, style };
      } else {
        newCountries.push({ code: isoCode, style });
      }
    }
    updateSelected(newCountries);
    onWindowClick();
  }

  function getCountryStyle(isoCode?: string): 'primary' | 'secondary' | null {
    if (!isoCode) return null;
    const country = highlightedCountries.find(c => c.code === isoCode);
    return country ? country.style : null;
  }

  $effect(() => {
    if (!map) return;

    const onContextMenu = (e: any) => {
      // Query the countries-fill layer (from natural earth style)
      const features = map.queryRenderedFeatures(e.point, { layers: ['countries-fill'] });

      if (features.length > 0) {
        e.preventDefault(); // Prevent browser context menu
        const feature = features[0];
        const props = feature.properties || {};

        contextMenu = {
          isOpen: true,
          x: e.originalEvent.clientX,
          y: e.originalEvent.clientY,
          name: props.name, // 'name' property from Natural Earth
          isoCode: props.iso_a2_eh // 'iso_a2_eh' property from Natural Earth is more complete
        };
      }
    };

    map.on('contextmenu', onContextMenu);

    return () => {
      map.off('contextmenu', onContextMenu);
    };
  });

  // Handle clicking outside to close
  function onWindowClick() {
    if (contextMenu.isOpen) {
      contextMenu.isOpen = false;
    }
  }
</script>

<svelte:window onclick={onWindowClick} />

{#if contextMenu.isOpen && contextMenu.isoCode}
  <ContextMenu position={[contextMenu.x, contextMenu.y]}>
    <div class="section" style="white-space:pre-wrap;">
      <strong>{contextMenu.name}</strong>
      <small>{contextMenu.isoCode}</small>
    </div>
    <hr />

    {@const currentStyle = getCountryStyle(contextMenu.isoCode)}

    <label class="item">
      <div class="section">
        <input
          type="radio"
          name="country-style"
          checked={currentStyle === null}
          onchange={() => setCountryStyle(contextMenu.isoCode!, null)}
        />
        None
      </div>
    </label>
    <label class="item">
      <div class="section">
        <input
          type="radio"
          name="country-style"
          checked={currentStyle === 'primary'}
          onchange={() => setCountryStyle(contextMenu.isoCode!, 'primary')}
        />
        Primary
      </div>
    </label>
    <label class="item">
      <div class="section">
        <input
          type="radio"
          name="country-style"
          checked={currentStyle === 'secondary'}
          onchange={() => setCountryStyle(contextMenu.isoCode!, 'secondary')}
        />
        Secondary
      </div>
    </label>
  </ContextMenu>
{/if}

{#if highlightedCountries.length === 0}
  <small>Right-click a country to highlight it.</small>
{:else}
  <div style:display="flex" style:gap="0.5rem" style:align-items="center">
    <small>{highlightedCountries.length} selected</small>
    <button onclick={() => updateSelected([])}>Clear</button>
  </div>
{/if}
