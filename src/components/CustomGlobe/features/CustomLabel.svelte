<script lang="ts">
  let {
    name,
    style,
    pointless,
    isDark = false
  } = $props<{ name: string; style: string; pointless?: boolean; isDark?: boolean }>();
</script>

<div class="globey__label globey__label--{style}" class:globey__label--dark={isDark}>
  {#if !pointless}
    <div class="globey__label-marker globey__label-marker--{style}"></div>
  {/if}
  <div class="globey__label-text globey__label-text--{style}">
    <span>{name}</span>
  </div>
</div>

<style lang="scss">
  .globey__label {
    --space: #000;
    --sea: #0b0d0f;
    --land: #22262a;
    --land-stroke: #444c55;
    --land-stroke-width: 0.6px;

    // regular labels
    --text-stroke: #fff;
    --text-color: #d6dde4;

    // country labels
    --country-text: #7d8794;
    --country-text-stroke: var(--text-stroke);

    // ocean/water labels
    --water-text: #5b687c;
    --water-text-stroke: var(--text-stroke);

    --light-ambient-colour: #ffffff;
    --light-ambient-intensity: 1;

    --light-point-colour: #ffffff;
    --light-point-intensity: 0;
    --light-point-distance: 0;
    --light-point-decay: 2;

    // GlobeyDomManager
    --point-border: #1f2225;

    &--dark {
      --text-stroke: rgba(0, 0, 0, 0.8);
      --text-color: #ffffff;
      --country-text: #ffffff;
      --water-text: #ffffff;
    }
  }

  .globey__label {
    position: absolute;
    padding: 0 3px;
    font-family: 'ABC Sans Nova', sans-serif;
    letter-spacing: 0.03em;
    display: flex;
    column-gap: 6px;
    align-items: center;
    white-space: nowrap;
    /* Translate to center the marker.
       Note: maplibregl markers are usually anchored.
       The user CSS has: translate: -5px -50%;
       If we use anchor='center' in MapLibre, the center of this div is placed at the coord.
       So we might need to adjust or rely on CSS.
       The user's CSS seems to assume it's handling the positioning.
    */
    translate: -5px -50%;
    opacity: 1;
    transition: opacity 0.2s;
    z-index: 5;
    pointer-events: none; /* Ensure clicks pass through if needed, though marker usually handles it */

    /* Modifiers for specific styles */
    &--country,
    &--water {
      translate: -50% -50%;
      justify-content: center;

      /* Ensure markers are hidden for these types regardless of prop, if that's the intent.
         Or just rely on centering.
         If marker div exists (pointless=false), it takes up space.
         The user said "types without a marker", implying they shouldn't have one.
      */
      .globey__label-marker {
        display: none;
      }
    }

    &.globey__domnode--reverse {
      flex-direction: row-reverse;
      translate: calc(-100% + 10px) -50%;
    }

    &.globey__domnode--hidden {
      opacity: 0;
    }

    &-marker {
      box-sizing: border-box;

      &--level3 {
        width: 9px;
        height: 9px;
        background: var(--text-color);
        border: 1px solid var(--text-stroke);
      }

      &--level4 {
        width: 8px;
        height: 8px;
        background: var(--text-color);
        border: 1px solid var(--text-stroke);
        border-radius: 100%;
      }

      &--invisible {
        opacity: 0;
      }
    }

    &-text {
      /* In Firefox, shift the span slightly, to counteract the weird font placement */
      span {
        display: inline-block;

        @supports (-moz-appearance: none) {
          transform: translateY(0.05em);
        }
      }

      &--level4,
      &--level3,
      &--country,
      &--water {
        text-shadow:
          -1px -1px 0 var(--shadow),
          1px -1px 0 var(--shadow),
          -1px 1px 0 var(--shadow),
          1px 1px 0 var(--shadow),
          1px 0px 0 var(--shadow),
          0px 1px 0 var(--shadow),
          -1px 0px 0 var(--shadow),
          0px -1px 0 var(--shadow);
      }

      &--level3 {
        font-size: 13px;
        font-weight: 900;
        line-height: 15px;
        color: var(--text-color);
        --shadow: var(--text-stroke);
        text-transform: uppercase;
      }

      &--level4 {
        font-size: 14px;
        font-weight: 700;
        line-height: 18px;
        color: var(--text-color);
        --shadow: var(--text-stroke);
      }

      &--country {
        font-weight: 600;
        font-size: 15px;
        letter-spacing: 0.1em;
        color: var(--country-text);
        --shadow: var(--country-text-stroke);
        text-transform: uppercase;
      }

      &--water {
        font-weight: 700;
        font-size: 13px;
        font-style: italic;
        letter-spacing: 0.1em;
        color: var(--water-text);
        --shadow: var(--water-text-stroke);
      }
    }
  }
</style>
