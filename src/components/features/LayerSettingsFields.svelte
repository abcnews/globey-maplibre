<script lang="ts">
  interface Props {
    /** 'immediate' = plays on arrival, holding until the panel is reached; unset/'scroll' = tied to scroll position */
    animationClock?: 'scroll' | 'immediate';
    /** Friendly layer name, lowercase-alphanumeric only. Purely for identifying layers in the Builder UI. */
    name?: string;
  }

  let { animationClock = $bindable(), name = $bindable() }: Props = $props();

  function setClock(mode: 'scroll' | 'immediate') {
    animationClock = mode === 'immediate' ? 'immediate' : undefined;
  }

  // Strips anything outside a-z0-9 and forces lowercase as the reader types,
  // so the friendly name is always already valid rather than just validated on save.
  function handleNameInput(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const sanitised = input.value.toLowerCase().replace(/[^a-z0-9]/g, '');
    name = sanitised || undefined;
    input.value = sanitised;
  }
</script>

<fieldset>
  <legend>Animation Clock</legend>
  <div style:display="flex" style:gap="1rem">
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
  <small class="help-text">
    Scroll-tied layers fade in as the reader scrolls. Arrival layers hold until the panel is reached, then play
    over the panel's animation duration.
  </small>
</fieldset>

<fieldset>
  <legend>Layer Name</legend>
  <div class="field-group">
    <label for="layer-name">Friendly name</label>
    <input id="layer-name" type="text" placeholder="e.g. capitalcities" value={name ?? ''} oninput={handleNameInput} />
    <small class="help-text">Lowercase letters and numbers only (a-z, 0-9). Optional.</small>
  </div>
</fieldset>

<style>
  .field-group {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .field-group label {
    font-size: 0.85rem;
    font-weight: 500;
  }

  .help-text {
    font-size: 0.75rem;
    color: var(--text-light, #888);
  }
</style>
