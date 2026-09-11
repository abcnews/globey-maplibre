<script lang="ts">
  import { Search, XCircleFill } from 'svelte-bootstrap-icons';

  interface Props {
    /** Bound search query string */
    value?: string;
    /** Placeholder text displayed inside the search input */
    placeholder?: string;
    /** Whether to autofocus the input on mount */
    autofocus?: boolean;
    /** Callback when input value changes */
    oninput?: (val: string) => void;
    /** Callback when user clears search */
    onclear?: () => void;
  }

  let {
    value = $bindable(''),
    placeholder = 'Search...',
    autofocus = false,
    oninput: onInputProp,
    onclear: onClearProp
  }: Props = $props();

  let inputEl = $state<HTMLInputElement>();

  $effect(() => {
    if (autofocus && inputEl) {
      inputEl.focus();
    }
  });

  function handleInput(e: Event) {
    const val = (e.currentTarget as HTMLInputElement).value;
    value = val;
    onInputProp?.(val);
  }

  function handleClear() {
    value = '';
    onClearProp?.();
    onInputProp?.('');
    inputEl?.focus();
  }
</script>

<div class="search-input-wrapper">
  <Search class="search-icon" />
  <input
    bind:this={inputEl}
    type="text"
    {placeholder}
    {value}
    oninput={handleInput}
    class="search-input"
  />
  {#if value.trim().length > 0}
    <button
      type="button"
      class="clear-button"
      aria-label="Clear search"
      title="Clear search"
      onclick={handleClear}
    >
      <XCircleFill />
    </button>
  {/if}
</div>

<style>
  .search-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
    box-sizing: border-box;
  }

  :global(.search-icon) {
    position: absolute;
    left: 0.6rem;
    pointer-events: none;
    opacity: 0.6;
    font-size: 0.85rem;
    color: var(--text-light, #888);
  }

  .search-input {
    width: 100%;
    box-sizing: border-box;
    padding: 0.45rem 1.8rem 0.45rem 2rem;
    background: var(--background-alt, #2c2c2f);
    border: 1px solid var(--border, rgba(122, 123, 135, 0.5));
    border-radius: 4px;
    color: var(--text, #ccc);
    font-size: 0.85rem;
  }

  .search-input:focus {
    outline: none;
    border-color: #64b5f6;
    background: #252528;
  }

  .clear-button {
    position: absolute;
    right: 0.5rem;
    background: none;
    border: none;
    padding: 0.2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-light, #888);
    cursor: pointer;
    border-radius: 50%;
  }

  .clear-button:hover {
    color: var(--text, #ccc);
  }
</style>
