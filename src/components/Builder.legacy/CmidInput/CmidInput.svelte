<script lang="ts">
  import { parseCmid, isValidCmid } from './utils.ts';

  interface Props {
    /** The committed numeric CMID value */
    value?: number;
    /** Label text displayed above the input */
    label?: string;
    /** HTML ID for input and label association */
    id?: string;
    /** Placeholder text for input */
    placeholder?: string;
    /** Whether the input and button are disabled */
    disabled?: boolean;
    /** Whether data is currently loading */
    loading?: boolean;
    /** Callback fired when a CMID is committed via Load button or Enter key */
    onload?: (cmid: number) => void;
  }

  let {
    value = $bindable(0),
    label = 'CoreMedia ID (CMID)',
    id = 'cmid-input',
    placeholder = 'e.g. 106753230',
    disabled = false,
    loading = false,
    onload
  }: Props = $props();

  let draftValue = $state<string>(value ? String(value) : '');
  let lastPropValue = value;

  $effect(() => {
    if (value !== lastPropValue) {
      lastPropValue = value;
      draftValue = value ? String(value) : '';
    }
  });

  const parsedNum = $derived(parseCmid(draftValue));
  const isValid = $derived(isValidCmid(draftValue));

  function handleLoad() {
    const cleaned = draftValue.trim();
    if (cleaned === '') {
      value = 0;
      onload?.(0);
      return;
    }

    const parsed = parseCmid(cleaned);
    if (!parsed) {
      return;
    }

    value = parsed;
    onload?.(parsed);
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleLoad();
    }
  }
</script>

<div class="cmid-input-container">
  {#if label}
    <label for={id}>{label}</label>
  {/if}
  <div class="input-group">
    <input
      {id}
      type="text"
      inputmode="numeric"
      pattern="[0-9]*"
      {placeholder}
      {disabled}
      bind:value={draftValue}
      onkeydown={handleKeyDown}
      onblur={() => {
        if (isValid) handleLoad();
      }}
    />
    <button
      type="button"
      class="load-btn"
      onclick={handleLoad}
      disabled={disabled || !isValid || loading}
    >
      {loading ? 'Loading...' : (value && parsedNum === value ? 'Reload' : 'Load')}
    </button>
  </div>
</div>

<style>
  .cmid-input-container {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    width: 100%;
  }

  label {
    font-size: 0.75rem;
    color: var(--text-light, #888);
    font-weight: bold;
    text-transform: uppercase;
  }

  .input-group {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    width: 100%;
  }

  input {
    flex: 1;
    background: var(--background, #1a1a1a);
    border: 1px solid var(--border, rgba(122, 123, 135, 0.5));
    color: var(--text, #ccc);
    padding: 0.4rem 0.5rem;
    border-radius: 4px;
    font-size: 0.85rem;
    min-width: 0;
  }

  input:focus {
    outline: none;
    border-color: #5b9dd9;
  }

  .load-btn {
    padding: 0.4rem 0.85rem;
    background: var(--background-alt, #2c2c2f);
    border: 1px solid var(--border, rgba(122, 123, 135, 0.5));
    color: var(--text, #ccc);
    border-radius: 4px;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.15s ease, border-color 0.15s ease;
  }

  .load-btn:hover:not(:disabled) {
    background: #3a3a3e;
    border-color: #888;
  }

  .load-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
