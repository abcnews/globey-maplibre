<script lang="ts">
  import { untrack } from 'svelte';
  import { Typeahead } from '@abcnews/components-builder';
  import type { GeoJsonConfig } from '../../../lib/marker';

  let {
    config = $bindable(),
    properties,
    getUniqueValues
  } = $props<{
    config: GeoJsonConfig;
    properties: string[];
    getUniqueValues: (prop: string) => string[];
  }>();

  let allValues = $derived(config.filter?.prop ? getUniqueValues(config.filter.prop) : []);
  let isTooMany = $derived(allValues.length > 1000);

  let filterOptions = $derived(allValues.map(v => ({ label: v, value: v })));

  let manualText = $state('');

  $effect(() => {
    if (isTooMany && config.filter) {
      untrack(() => {
        manualText = config.filter!.values.join(', ');
      });
    }
  });

  function onManualInput(e: Event) {
    const val = (e.currentTarget as HTMLTextAreaElement).value;
    manualText = val;
    if (config.filter) {
      config.filter.values = val
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    }
  }
</script>

<fieldset>
  <legend>Filter</legend>
  <label for="gj-filter-prop">Property</label>
  <select
    id="gj-filter-prop"
    value={config.filter?.prop || ''}
    onchange={e => {
      const val = e.currentTarget.value;
      if (val) {
        const unique = getUniqueValues(val);
        config.filter = { prop: val, values: unique.length > 50 ? [] : unique };
      } else {
        config.filter = undefined;
      }
    }}
  >
    <option value="">(None)</option>
    {#each properties as p}
      <option value={p}>{p}</option>
    {/each}
  </select>

  {#if config.filter?.prop}
    {#if isTooMany}
      <div
        style:background="rgba(0,0,0,0.05)"
        style:padding="0.5rem"
        style:border-radius="4px"
        style:margin="0.5rem 0"
        style:font-size="0.85em"
      >
        <strong>Note:</strong> This property has {allValues.length} unique values. Filtering is easier on fields with fewer
        options, like a "category" or "class".
      </div>
      <label for="gj-filter-manual">Comma-separated values</label>
      <textarea
        id="gj-filter-manual"
        value={manualText}
        oninput={onManualInput}
        placeholder="Value 1, Value 2..."
        style:width="100%"
        style:min-height="60px"
        style:box-sizing="border-box"
      ></textarea>
    {:else}
      <div>
        Values ({config.filter.values.length} chosen)
      </div>
      <div style:display="flex" style:gap="0.5rem" style:margin-bottom="0.5rem">
        <button onclick={() => (config.filter!.values = allValues)}>Show All</button>
        <button onclick={() => (config.filter!.values = [])}>Hide All</button>
      </div>
      <Typeahead
        values={filterOptions}
        value={config.filter.values}
        onChange={vals => (config.filter!.values = vals)}
        disabled={false}
      />
    {/if}
  {/if}
</fieldset>
