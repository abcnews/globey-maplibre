<script lang="ts">
  let { Viz, Sidebar } = $props();

  let vizAreaWidth = $state();
  let vizAreaHeight = $state();

  let vizDimensions: [number, number] = $state([Infinity, Infinity]);
  let presetValue: [number, number] | 'custom' | 'auto' = $state('auto');

  $effect(() => {
    if (Array.isArray(presetValue)) {
      vizDimensions = [presetValue[0], presetValue[1]];
    }
  });

  $effect(() => {
    const match = commonViewports.values().find(d => d[0] === vizDimensions[0] && d[1] === vizDimensions[1]);

    if (!match) {
      presetValue = vizAreaWidth === vizDimensions[0] && vizAreaHeight === vizDimensions[1] ? 'auto' : 'custom';
    }
  });

  const commonViewports = new Map<string, [number, number]>([
    ['Desktop (large)', [1920, 1080]],
    ['Desktop (small)', [1280, 720]],
    ['iPad Pro', [1024, 1366]],
    ['Surface Pro 7', [912, 1368]],
    ['Gallaxy Note 20', [412, 915]],
    ['iPhone 14 Pro Max', [430, 932]],
    ['iPhone SE', [375, 667]]
  ]);
</script>

<div class="builder-frame">
  <div class="builder-frame__viz">
    <div class="tools">
      <select name="resize-options" bind:value={presetValue}>
        <option value={'auto'} selected>Auto</option>
        <option value={'custom'}>Custom</option>
        {#each commonViewports.entries() as [name, dimensions]}
          <option value={dimensions}>{name}</option>
        {/each}
      </select>
      <input disabled={presetValue === 'auto'} id="viz-width" type="number" bind:value={vizDimensions[0]} />
      x
      <input disabled={presetValue === 'auto'} id="viz-height" type="number" bind:value={vizDimensions[1]} />
    </div>
    <div class="content-area" bind:offsetWidth={vizAreaWidth} bind:offsetHeight={vizAreaHeight}>
      <div
        class="resize-frame"
        bind:offsetWidth={vizDimensions[0]}
        bind:offsetHeight={vizDimensions[1]}
        style:width={presetValue === 'auto' ? '100%' : `${vizDimensions[0]}px`}
        style:height={presetValue === 'auto' ? '100%' : `${vizDimensions[1]}px`}
      >
        {@render Viz?.()}
      </div>
    </div>
  </div>

  <div class="builder-frame__sidebar">{@render Sidebar?.()}</div>
</div>

<style>
  .builder-frame {
    display: flex;
    height: 100vh;
    width: 100%;
    position: absolute;
    left: 0;
    top: 0;
    background: var(--background);
    color: var(--text);
  }
  .builder-frame__viz {
    display: grid;
    grid-template-columns: 100%;
    grid-template-rows: min-content 1fr;
    flex: 1;
    min-width: 50%;
    position: relative;
    overflow: hidden;
    background: var(--background-alt);
    color: black;

    > * {
      margin: 5px;
    }

    .tools {
      width: 100%;
      text-align: left;
      font-size: 0.8em;
      margin-bottom: 0;
      select {
        width: 8em;
      }

      input[type='number'] {
        width: 5em;
        &[disabled] {
          opacity: 0.3;
        }
      }
    }

    .content-area {
      overflow: auto;
      display: block;

      .resize-frame {
        resize: both;
        overflow: auto;
        background-color: var(--background);
        border: 1px solid hsl(from var(--border) h s l / 0.2);
        box-shadow: hsl(from var(--border) h s l / 0.1) 0 0 5px;
      }
    }
  }

  .builder-frame__sidebar {
    width: 22rem;
    padding: 2rem 1rem;
    background: rgba(128, 128, 128, 0.05);
    border-left: 1px solid var(--border);
    height: 100vh;
    overflow: auto;
    @media (min-width: 1920px) {
      width: 25rem;
    }
  }
</style>
