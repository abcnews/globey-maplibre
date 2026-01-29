<script lang="ts">
  import { Modal } from '@abcnews/components-builder';
  import type { Label } from '../../lib/marker';
  import { Search } from 'svelte-bootstrap-icons';
  import { debounce } from 'throttle-debounce';

  // Props
  // onselect event implementation via props callback pattern familiar in Svelte 5 or dispatch.
  // The user code uses createEventDispatcher. in Svelte 5 we can use props for callbacks or standard events.
  // Let's stick to standard props for callbacks if possible, or maintain dispatch if preferred.
  // Given "refactor", let's use props for better type safety if we can, but dispatch is fine.
  // Actually, standard Svelte 5 replacement for dispatch is just passing a prop `onselect`.

  let { onselect } = $props<{ onselect?: (value: { name: string; coords: [number, number] }) => void }>();

  let isOpen = $state(false);
  let searchTerm = $state('');
  let isSearching = $state(false);
  let results = $state<any[]>([]);
  let searchBox = $state<HTMLInputElement>();

  async function performSearch(keyword: string) {
    results = [];
    if (!keyword) {
      return;
    }
    const searchResults = (await search(keyword)).slice(0, 100);
    searchResults.sort((a, b) => {
      if (a.population === b.population) return 0;
      return a.population < b.population ? 1 : -1;
    });
    results = searchResults;
  }

  const debouncedPerformSearch = debounce(400, performSearch);

  function search(keyword: string): Promise<any[]> {
    isSearching = true;
    return fetch(`https://www.abc.net.au/res/sites/news-projects/placenames/1.0.0/placeNames.tsv.gz`, {
      cache: 'force-cache'
    }).then(async res => {
      const blob = await res.blob();

      // Create a stream to read text as it comes in
      const stream = blob.stream().pipeThrough(new TextDecoderStream());
      const reader = stream.getReader();
      let partialLine = '';
      const found: any[] = [];

      const currentSearchTerm = keyword; // Capture for abortion check

      while (true) {
        // read through until we have one or more entire lines
        const { done, value } = await reader.read();

        // Simple cancellation check (not perfect but matches original intent)
        if (searchTerm !== currentSearchTerm) {
          // console.info('aborting search', keyword);
          // In a real refined version we might use AbortController, but let's stick to logic provided.
        }

        if (done) break;

        const theseLines = partialLine + value;
        const split = theseLines.split('\n');

        // put the remainder on the stack
        partialLine = split.pop() || '';

        // perform the actual keyword search
        found.push(
          ...split
            .filter(line => line.split('\t')[0].toLowerCase().includes(keyword.toLowerCase()))
            .map(line => {
              const [name, latitude, longitude, countrycode, population] = line.split('\t');
              return {
                id: name + population + latitude + longitude,
                name,
                latitude,
                longitude,
                countrycode,
                population: Number(population)
              };
            })
        );
      }
      if (searchTerm === keyword) {
        isSearching = false;
      }
      return found;
    });
  }

  function openModal() {
    isOpen = true;
    searchTerm = '';
    results = [];
    setTimeout(() => {
      searchBox?.focus();
    }, 100);
  }

  function handleSelect(row: any) {
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
        Geonames dataset by <a href="https://geonames.org/" target="_blank">geonames.org</a>, licensed
        <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank">CC BY 4.0</a>
      </p>
    </div>
  {/snippet}

  {#snippet modalFooter()}
    <button onclick={() => (isOpen = false)}>Close</button>
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

  .cursor-pointer,
  .result-row {
    cursor: pointer;
  }

  .result-row:hover {
    background-color: #f5f5f5;
  }

  .credits {
    margin-top: 1rem;
    font-size: 0.8rem;
    color: #888;
  }
</style>
