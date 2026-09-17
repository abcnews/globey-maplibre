<script lang="ts">
  type Mode = 'newmap' | 'layout' | 'markers' | 'paste';

  interface Props {
    /** Which step is currently active. */
    activeMode: Mode;
    /** Whether a JSON blob is loaded — gates the Markers & Preview steps. */
    hasBlob: boolean;
    /** Navigate to a given step. */
    onSetMode: (mode: Mode) => void;
  }

  let { activeMode, hasBlob, onSetMode }: Props = $props();

  const steps: { mode: Mode; number: number; label: string }[] = [
    { mode: 'newmap', number: 1, label: 'New map' },
    { mode: 'layout', number: 2, label: 'Layout' },
    { mode: 'markers', number: 3, label: 'Markers' },
    { mode: 'paste', number: 4, label: 'Preview scrollyteller' }
  ];

  function isDisabled(mode: Mode) {
    return (mode === 'markers' || mode === 'paste') && !hasBlob;
  }
</script>

<div class="top-bar">
  {#each steps as step, i (step.mode)}
    <button
      type="button"
      class="step"
      class:selected={activeMode === step.mode}
      style:z-index={steps.length - i}
      disabled={isDisabled(step.mode)}
      onclick={() => onSetMode(step.mode)}
    >
      <span class="step-number">{step.number}</span>
      {step.label}
    </button>
  {/each}
</div>

<style>
  .top-bar {
    display: flex;
    align-items: stretch;
    height: 2.75rem;
    padding-left: 0.75rem;
    background: var(--background-alt, #2c2c2f);
    border-bottom: 1px solid var(--border, #444);
    flex-shrink: 0;
  }

  /* Right-pointing arrow/chevron steps: a point on the right edge and a matching
     notch on the left edge, so consecutive steps interlock like a breadcrumb. The
     first step has a flat left edge since there's nothing to notch into. */
  .step {
    --notch: 0.9rem;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    border: none;
    padding: 0 1.1rem 0 calc(0.9rem + var(--notch));
    margin-left: calc(-1 * var(--notch));
    background: var(--background, #1c1c1e);
    color: var(--text-light, #888);
    cursor: pointer;
    font-size: 0.85rem;
    white-space: nowrap;
    clip-path: polygon(
      0 0,
      calc(100% - var(--notch)) 0,
      100% 50%,
      calc(100% - var(--notch)) 100%,
      0 100%,
      var(--notch) 50%
    );
  }

  .step:first-child {
    margin-left: 0;
    padding-left: 0.9rem;
    clip-path: polygon(0 0, calc(100% - var(--notch)) 0, 100% 50%, calc(100% - var(--notch)) 100%, 0 100%);
  }

  .step:disabled {
    cursor: not-allowed;
    opacity: 0.4;
  }

  .step.selected {
    background: var(--builder-color-primary, #007bff);
    color: #fff;
  }

  .step-number {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.1rem;
    height: 1.1rem;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.15);
    font-size: 0.7rem;
    font-weight: 600;
  }
</style>
