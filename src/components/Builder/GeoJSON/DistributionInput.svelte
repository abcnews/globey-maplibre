<script lang="ts">
  /**
   * @file DistributionInput.svelte
   *
   * This component visualises a dataset's distribution as a histogram and provides
   * draggable handles to select a numeric range (min/max). It's useful for
   * configuring colour scales or data filters with immediate visual context.
   *
   * @example
   * ```svelte
   * <DistributionInput
   *   values={[10, 20, 20, 35, 50, 100]}
   *   bind:min={myMin}
   *   bind:max={myMax}
   * />
   * ```
   */
  import { LayerCake, Svg, bin } from 'layercake';
  import { scaleLinear, scaleSqrt } from 'd3-scale';

  let {
    values = [],
    min = $bindable(),
    max = $bindable()
  } = $props<{
    values: number[];
    min: number | undefined;
    max: number | undefined;
  }>();

  // Create histogram bins with fixed granularity
  let binnedData = $derived.by(() => {
    // Exactly 100 bins as requested
    const b = bin(values, (d: any) => d as number, { thresholds: 100 });
    return b;
  });

  // Calculate the bounds of the actual data
  let dataDomain = $derived.by(() => {
    if (values.length === 0) return [0, 0];
    return [Math.min(...values), Math.max(...values)];
  });

  // Helper to get bar width
  const getWidth = (d: any, xScale: any) => {
    const w = xScale(d.x1) - xScale(d.x0);
    return Math.max(0, w - 1); // 1px gap
  };

  /**
   * Helper to get bar height.
   * Ensures small non-zero values have a minimum visual height.
   */
  const getHeight = (d: any, yScale: any, totalHeight: number) => {
    if (d.length === 0) return 0;
    const h = totalHeight - yScale(d.length);
    return Math.max(2, h); // Minimum 2px height for any non-zero bin
  };

  // Draggable logic
  let container = $state<HTMLElement>();
  let dragging = $state<'min' | 'max' | null>(null);
  let currentXScale = $state<any>();

  function onPointerMove(e: PointerEvent) {
    if (!dragging || !container || !currentXScale) return;

    const rect = container.getBoundingClientRect();
    // Subtract 10px padding from the left
    const x = e.clientX - rect.left - 10;
    const val = currentXScale.invert(x);

    // Clamp to data domain for the slider interaction
    const clampedVal = Math.max(dataDomain[0], Math.min(dataDomain[1], val));

    // Round to nearest whole number as requested
    const roundedVal = Math.round(clampedVal);

    if (dragging === 'min') {
      // Don't cross max
      min = Math.min(roundedVal, max ?? Infinity);
    } else if (dragging === 'max') {
      // Don't cross min
      max = Math.max(roundedVal, min ?? -Infinity);
    }
  }

  function onPointerUp() {
    dragging = null;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
  }

  function startDragging(e: PointerEvent, type: 'min' | 'max', xScale: any) {
    e.preventDefault();
    dragging = type;
    currentXScale = xScale;
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }
</script>

<div class="distribution-container" style="touch-action: none">
  <div class="chart-wrapper" bind:this={container}>
    {#if values.length > 0}
      <LayerCake
        data={binnedData}
        x={(d: any) => [d.x0, d.x1]}
        y={(d: any) => d.length}
        xScale={scaleLinear()}
        yScale={scaleSqrt()}
        padding={{ top: 5, right: 10, bottom: 0, left: 10 }}
        let:data={cakeData}
        let:xScale
        let:yScale
        let:height
      >
        <Svg>
          <g class="bars">
            {#each cakeData as any[] as d}
              <rect
                x={xScale(d.x0)}
                y={height - getHeight(d, yScale, height)}
                width={getWidth(d, xScale)}
                height={getHeight(d, yScale, height)}
                fill="var(--builder-color-primary, #0070c9)"
                fill-opacity="0.5"
              />
            {/each}
          </g>

          {#if min !== undefined && max !== undefined}
            {@const x1 = xScale(min)}
            {@const x2 = xScale(max)}
            <rect
              x={Math.min(x1, x2)}
              y="0"
              width={Math.abs(x2 - x1)}
              {height}
              fill="var(--builder-color-primary, #0070c9)"
              fill-opacity="0.1"
            />

            <!-- Min handle -->
            <g class="handle-group" onpointerdown={e => startDragging(e, 'min', xScale)}>
              <line {x1} y1="0" x2={x1} y2={height} class="handle-line" />
              <line {x1} y1="0" x2={x1} y2={height} class="hit-area" />
            </g>

            <!-- Max handle -->
            <g class="handle-group" onpointerdown={e => startDragging(e, 'max', xScale)}>
              <line x1={x2} y1="0" {x2} y2={height} class="handle-line" />
              <line x1={x2} y1="0" {x2} y2={height} class="hit-area" />
            </g>
          {/if}
        </Svg>
      </LayerCake>
    {:else}
      <div class="no-data">No numeric data to display</div>
    {/if}
  </div>

  <div class="inputs">
    <div class="input-group">
      <label for="dist-min">Min</label>
      <input id="dist-min" type="number" bind:value={min} step="any" />
    </div>
    <div class="input-group">
      <label for="dist-max">Max</label>
      <input id="dist-max" type="number" bind:value={max} step="any" />
    </div>
  </div>
</div>

<style>
  .distribution-container {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-block: 0.5rem;
    width: 100%;
  }
  .chart-wrapper {
    height: 60px;
    width: 100%;
    border-radius: 4px;
    border: 1px solid var(--border);
    opacity: 0.8;
    overflow: hidden;
    padding-bottom: 5px;
  }
  .no-data {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .handle-group {
    cursor: col-resize;
  }
  .handle-line {
    stroke: currentColor;
    stroke-width: 1.5;
    stroke-dasharray: 2, 2;
    transition:
      stroke-width 0.2s,
      stroke-dasharray 0.2s;
  }
  .hit-area {
    stroke: transparent;
    stroke-width: 16;
  }
  .handle-group:hover .handle-line {
    stroke-width: 2.5;
    stroke-dasharray: none;
  }
  .inputs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }
  .input-group {
    display: flex;
    flex-direction: column;
  }
  .input-group label {
    margin-bottom: 2px;
  }
  .input-group input {
    width: 100%;
  }
</style>
