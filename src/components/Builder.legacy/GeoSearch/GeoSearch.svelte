<script lang="ts">
  import { debounce } from 'throttle-debounce';
  import { searchGeoNames, type GeoNameResult } from './utils';
  import SearchInput from '../shared/SearchInput.svelte';

  interface Props {
    /** Callback fired when a location is selected */
    onselect?: (value: { name: string; coords: [number, number] }) => void;
    /** Optional placeholder text */
    placeholder?: string;
    /** Whether to automatically focus the search input */
    autofocus?: boolean;
  }

  let { onselect, placeholder = 'Search location (e.g. Sydney, Tokyo)...', autofocus = true }: Props = $props();

  let searchTerm = $state('');
  let isSearching = $state(false);
  let results = $state<GeoNameResult[]>([]);
  let isDropdownOpen = $state(false);
  let containerEl = $state<HTMLDivElement>();

  async function performSearch(keyword: string) {
    if (!keyword.trim()) {
      results = [];
      isSearching = false;
      return;
    }

    isSearching = true;
    const currentSearchTerm = keyword;

    try {
      const searchResults = await searchGeoNames(keyword, progressResults => {
        if (searchTerm !== currentSearchTerm) return;
        results = progressResults.sort((a, b) => b.population - a.population).slice(0, 15);
      });

      if (searchTerm === currentSearchTerm) {
        results = searchResults.sort((a, b) => b.population - a.population).slice(0, 15);
        isSearching = false;
      }
    } catch (error) {
      console.error('GeoSearch error:', error);
      isSearching = false;
    }
  }

  const debouncedPerformSearch = debounce(300, performSearch);

  function handleSearchInput(val: string) {
    if (val.trim()) {
      isDropdownOpen = true;
      debouncedPerformSearch(val);
    } else {
      results = [];
      isDropdownOpen = false;
    }
  }

  function handleSelect(row: GeoNameResult) {
    const value = {
      coords: [Number(row.longitude), Number(row.latitude)] as [number, number],
      name: row.name
    };
    searchTerm = '';
    results = [];
    isDropdownOpen = false;
    onselect?.(value);
  }

  function handleDocumentClick(e: MouseEvent) {
    if (containerEl && !containerEl.contains(e.target as Node)) {
      isDropdownOpen = false;
    }
  }
</script>

<svelte:document onclick={handleDocumentClick} />

<div class="geo-search-container" bind:this={containerEl}>
  <SearchInput
    bind:value={searchTerm}
    {placeholder}
    {autofocus}
    oninput={handleSearchInput}
    onclear={() => {
      results = [];
      isDropdownOpen = false;
    }}
  />


  {#if isDropdownOpen && (isSearching || results.length > 0 || searchTerm.trim().length > 1)}
    <div class="results-dropdown">
      {#if isSearching && results.length === 0}
        <div class="dropdown-status">Searching locations...</div>
      {:else if results.length === 0}
        <div class="dropdown-status">No matching locations found.</div>
      {:else}
        <ul class="results-list">
          {#each results as row (row.id)}
            <li>
              <button
                type="button"
                class="result-item"
                onclick={() => handleSelect(row)}
              >
                <div class="result-main">
                  <strong class="result-name">{row.name}</strong>
                  {#if row.countrycode}
                    <span class="result-country">{row.countrycode}</span>
                  {/if}
                </div>
                {#if row.population > 0}
                  <span class="result-pop">Pop: {row.population.toLocaleString()}</span>
                {/if}
              </button>
            </li>
          {/each}
        </ul>
      {/if}
      <div class="dropdown-footer">
        Geonames dataset (<a href="https://geonames.org/" target="_blank" rel="noopener noreferrer">geonames.org</a>)
      </div>
    </div>
  {/if}
</div>

<style>
  .geo-search-container {
    position: relative;
    width: 100%;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
  }

  .results-dropdown {
    position: static;
    margin-top: 0.5rem;
    width: 100%;
    box-sizing: border-box;
    background: var(--background-alt, #2c2c2f);
    border: 1px solid var(--border, rgba(122, 123, 135, 0.5));
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    max-height: 260px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  .dropdown-status {
    padding: 0.6rem 0.75rem;
    font-size: 0.8rem;
    color: var(--text-light, #888);
    font-style: italic;
  }

  .results-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
  }

  .results-list li {
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .results-list li:last-child {
    border-bottom: none;
  }

  .result-item {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.45rem 0.75rem;
    background: none;
    border: none;
    color: var(--text, #ccc);
    text-align: left;
    cursor: pointer;
    font-size: 0.82rem;
    border-radius: 0;
  }

  .result-item:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
  }

  .result-main {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .result-country {
    font-size: 0.75rem;
    color: var(--text-light, #888);
    background: rgba(255, 255, 255, 0.08);
    padding: 0.1rem 0.3rem;
    border-radius: 3px;
  }

  .result-pop {
    font-size: 0.75rem;
    color: var(--text-light, #888);
  }

  .dropdown-footer {
    padding: 0.3rem 0.6rem;
    font-size: 0.7rem;
    color: var(--text-light, #888);
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    background: rgba(0, 0, 0, 0.15);
  }

  .dropdown-footer a {
    color: inherit;
    text-decoration: underline;
  }
</style>
