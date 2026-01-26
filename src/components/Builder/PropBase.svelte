<script lang="ts">
  import { options } from './store';
  import type { maplibregl } from '../mapLibre/index';

  let { map } = $props<{ map: maplibregl.Map }>();
</script>

<fieldset>
  <legend>Map Base</legend>
  <div style:display="flex" style:gap="1rem">
    <label style:display="flex" style:align-items="center" style:gap="0.5rem" style:cursor="pointer">
      <input
        type="radio"
        name="map-base"
        value="street"
        checked={$options.base === 'street' || !$options.base}
        onchange={() => ($options.base = 'street')}
      />
      Street Map
    </label>
    <label style:display="flex" style:align-items="center" style:gap="0.5rem" style:cursor="pointer">
      <input
        type="radio"
        name="map-base"
        value="countries"
        checked={$options.base === 'countries'}
        onchange={() => ($options.base = 'countries')}
      />
      Countries
    </label>
  </div>
</fieldset>
