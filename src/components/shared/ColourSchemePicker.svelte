<script lang="ts">
  import { resolveSchemeColour, type ColourSchemeName } from '../../lib/colourScheme.ts';

  interface Props {
    /** Currently selected scheme. */
    scheme: ColourSchemeName;
    /** Hex colour (with or without '#') used only when `scheme === 'custom'`. */
    customColour?: string;
    /** Fired with the full next state on any change — callers just assign it. */
    onchange: (next: { scheme: ColourSchemeName; customColour?: string }) => void;
    /** Unique id prefix, so multiple pickers on one page don't clash. */
    idPrefix?: string;
  }

  let { scheme, customColour, onchange, idPrefix = 'colour-scheme' }: Props = $props();
</script>

<div class="colour-scheme-picker">
  <select
    id="{idPrefix}-select"
    value={scheme}
    onchange={e => onchange({ scheme: e.currentTarget.value as ColourSchemeName, customColour })}
  >
    <option value="normal">Normal</option>
    <option value="highlighted">Highlighted</option>
    <option value="custom">Custom</option>
  </select>
  {#if scheme === 'custom'}
    <input
      id="{idPrefix}-custom"
      type="color"
      value={resolveSchemeColour(scheme, customColour)}
      onchange={e => onchange({ scheme, customColour: e.currentTarget.value })}
    />
  {/if}
</div>

<style>
  .colour-scheme-picker {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }
</style>
