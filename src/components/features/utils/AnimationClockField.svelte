<script lang="ts">
  interface Props {
    /** 'immediate' = plays on arrival, holding until the panel is reached; unset/'scroll' = tied to scroll position */
    animationClock?: 'scroll' | 'immediate';
  }

  let { animationClock = $bindable() }: Props = $props();

  function setClock(mode: 'scroll' | 'immediate') {
    animationClock = mode === 'immediate' ? 'immediate' : undefined;
  }
</script>

<fieldset>
  <legend>Animation Clock</legend>
  <!-- Stacked, so the field is narrow enough to sit beside the Symbol fieldset. -->
  <div style:display="flex" style:flex-direction="column" style:gap="0.25rem">
    <label style:display="flex" style:align-items="center" style:gap="0.5rem" style:cursor="pointer">
      <input
        type="radio"
        name="layer-clock-mode"
        value="scroll"
        checked={animationClock !== 'immediate'}
        onchange={() => setClock('scroll')}
      />
      Tied to scroll
    </label>
    <label style:display="flex" style:align-items="center" style:gap="0.5rem" style:cursor="pointer">
      <input
        type="radio"
        name="layer-clock-mode"
        value="immediate"
        checked={animationClock === 'immediate'}
        onchange={() => setClock('immediate')}
      />
      Animate on arrival
    </label>
  </div>
</fieldset>
