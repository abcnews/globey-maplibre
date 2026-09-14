<script lang="ts">
  import { Modal } from '@abcnews/components-builder';
  import { untrack } from 'svelte';

  interface Props {
    /** The layer item's data object being edited. Shared shape across every multi-item layer kind. */
    config: { animationClock?: 'scroll' | 'immediate'; name?: string; [key: string]: any };
    /** Callback fired when the modal requests to close */
    onclose?: () => void;
  }

  let { config = $bindable(), onclose }: Props = $props();

  let draftClock = $state<'scroll' | 'immediate'>(
    untrack(() => ($state.snapshot(config)?.animationClock === 'immediate' ? 'immediate' : 'scroll'))
  );
  let draftName = $state<string>(untrack(() => $state.snapshot(config)?.name ?? ''));

  // Strips anything outside a-z0-9 and forces lowercase as the reader types,
  // so the friendly name is always already valid rather than just validated on save.
  function handleNameInput(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const sanitised = input.value.toLowerCase().replace(/[^a-z0-9]/g, '');
    draftName = sanitised;
    input.value = sanitised;
  }

  function handleSave() {
    if (draftClock === 'immediate') {
      config.animationClock = 'immediate';
    } else {
      delete config.animationClock;
    }

    if (draftName) {
      config.name = draftName;
    } else {
      delete config.name;
    }

    onclose?.();
  }
</script>

{#snippet footerChildren()}
  <button onclick={handleSave}>Save</button>
  <button onclick={() => onclose?.()}>Cancel</button>
{/snippet}

<Modal onClose={() => onclose?.()} title="Layer Settings" {footerChildren}>
  <fieldset>
    <legend>Animation Clock</legend>
    <div style:display="flex" style:gap="1rem">
      <label style:display="flex" style:align-items="center" style:gap="0.5rem" style:cursor="pointer">
        <input type="radio" name="clock-mode" value="scroll" bind:group={draftClock} />
        Tied to scroll
      </label>
      <label style:display="flex" style:align-items="center" style:gap="0.5rem" style:cursor="pointer">
        <input type="radio" name="clock-mode" value="immediate" bind:group={draftClock} />
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
      <input
        id="layer-name"
        type="text"
        placeholder="e.g. capitalcities"
        value={draftName}
        oninput={handleNameInput}
      />
      <small class="help-text">Lowercase letters and numbers only (a-z, 0-9). Optional.</small>
    </div>
  </fieldset>
</Modal>

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
