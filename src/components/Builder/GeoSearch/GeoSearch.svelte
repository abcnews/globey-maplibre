<script lang="ts">
  import { Modal } from '@abcnews/components-builder';
  import { Search } from 'svelte-bootstrap-icons';
  import { debounce } from 'throttle-debounce';
  import { searchGeoNames, type GeoNameResult } from './utils';

  let { onselect } = $props<{ onselect?: (value: { name: string; coords: [number, number] }) => void }>();

  let isOpen = $state(false);
  let searchTerm = $state('');
  let isSearching = $state(false);
  let results = $state<GeoNameResult[]>([]);
  let searchBox = $state<HTMLInputElement>();

  async function performSearch(keyword: string) {
    if (!keyword) {
      results = [];
      return;
    }

    isSearching = true;
    const currentSearchTerm = keyword;

    try {
      const searchResults = await searchGeoNames(keyword, (progressResults) => {
        // Abortive update check: if the user has typed something else, don't update
        if (searchTerm !== currentSearchTerm) return;
        results = progressResults.sort((a, b) => b.population - a.population).slice(0, 100);
      });

      if (searchTerm === currentSearchTerm) {
        results = searchResults.sort((a, b) => b.population - a.population).slice(0, 100);
        isSearching = false;
      }
    } catch (error) {
      console.error('GeoSearch error:', error);
      isSearching = false;
    }
  }

  const debouncedPerformSearch = debounce(400, performSearch);

  function openModal() {
    isOpen = true;
    searchTerm = '';
    results = [];
    setTimeout(() => {
      searchBox?.focus();
    }, 100);
  }

  function handleSelect(row: GeoNameResult) {
    const value = {
      coords: [Number(row.longitude), Number(row.latitude)] as [number, number],
      name: row.name
    };
    isOpen = false;
    onselect?.(value);
  }

  // Effect to trigger search when searchTerm changes
  $effect(() => {
    if (searchTerm) {
      debouncedPerformSearch(searchTerm);
    }
  });
</script>

<button class="btn-icon" type="button" onclick={openModal} title="Find a place" aria-label="Find a place">
  <Search />
</button>

{#if isOpen}
  {#snippet modalContent()}
    <div class="search-container">
      <input
        type="search"
        bind:value={searchTerm}
        bind:this={searchBox}
        placeholder="Search for a city..."
        class="search-input"
      />

      {#if isSearching}
        <div class="loading">Searching...</div>
      {/if}

      {#if results.length > 0}
        <div class="results-table-container">
          <table class="results-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Country</th>
                <th>Pop.</th>
              </tr>
            </thead>
            <tbody>
              {#each results as row (row.id)}
                <tr onclick={() => handleSelect(row)} class="result-row">
                  <td>{row.name}</td>
                  <td>{row.countrycode}</td>
                  <td>{row.population.toLocaleString()}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}

      <p class="credits">
        Geonames dataset by <a href="https://geonames.org/" target="_blank" rel="noopener noreferrer">geonames.org</a>,
        licensed
        <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>
      </p>
    </div>
  {/snippet}

  {#snippet modalFooter()}
    <button type="button" onclick={() => (isOpen = false)}>Close</button>
  {/snippet}

  <Modal title="Find a place" children={modalContent} footerChildren={modalFooter} />
{/if}

<style>
  .search-input {
    width: 100%;
    padding: 0.5rem;
    margin-bottom: 1rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 1rem;
    background: white;
    color: black;
  }

  .loading {
    padding: 0.5rem;
    color: #666;
    font-style: italic;
  }

  .results-table-container {
    max-height: 300px;
    overflow-y: auto;
    border: 1px solid #eee;
  }

  .results-table {
    width: 100%;
    border-collapse: collapse;
  }

  .results-table th,
  .results-table td {
    text-align: left;
    padding: 0.5rem;
    border-bottom: 1px solid #eee;
  }

  .result-row {
    cursor: pointer;
  }

  .result-row:hover {
    background-color: #f5f5f5;
    color: black;
  }

  .credits {
    margin-top: 1rem;
    font-size: 0.8rem;
    color: #888;
  }
</style>
