<script lang="ts">
  import AnimationClockField from './AnimationClockField.svelte';
  import LayerIdField from './LayerIdField.svelte';

  interface Props {
    /** 'immediate' = plays on arrival, holding until the panel is reached; unset/'scroll' = tied to scroll position */
    animationClock?: 'scroll' | 'immediate';
    /** Unique lowercase-alphanumeric layer id — also the Builder title and marker `LAYER<id>` token. */
    id?: string;
  }

  let { animationClock = $bindable(), id = $bindable('') }: Props = $props();
</script>

<AnimationClockField bind:animationClock />

<fieldset>
  <legend>Layer ID</legend>
  <LayerIdField bind:id />
</fieldset>
