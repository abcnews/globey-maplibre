<script lang="ts">
  let { name, style, isDark = false } = $props<{ name: string; style: string; isDark?: boolean }>();
</script>

<div class="globey__label globey__label--{style}" class:globey__label--dark={isDark}>
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
    --country-large-text-stroke: rgba(255, 255, 255, 0.5);
    --country-small-text-stroke: rgba(255, 255, 255, 0.8);

    // ocean/water labels
    --water-text: #295ca3;
    --water-text-stroke: rgba(255, 255, 255, 0.7);

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

      --country-large-text-stroke: rgba(0, 0, 0, 0.8);
      --country-small-text-stroke: rgba(0, 0, 0, 0.8);
      --water-text-stroke: rgba(0, 0, 0, 0.8);
    }
  }

  .globey__label {
    position: absolute;
    padding: 0 3px;
    font-family: 'ABCSans', sans-serif;
    letter-spacing: 0.03em;
    display: flex;
    column-gap: 6px;
    align-items: center;
    white-space: nowrap;
    translate: -50% -50%;
    opacity: 1;
    justify-content: center;
    opacity: 1;
    transition: opacity 0.2s;
    z-index: 5;
    pointer-events: none; /* Ensure clicks pass through if needed, though marker usually handles it */

    &.globey__domnode--hidden {
      opacity: 0;
    }

    &-text {
      /* In Firefox, shift the span slightly, to counteract the weird font placement */
      span {
        display: inline-block;

        @supports (-moz-appearance: none) {
          transform: translateY(0.05em);
        }
      }

      &--country-small,
      &--country-large,
      &--water-small,
      &--water-large {
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

      &--country-small,
      &--country-large {
        font-weight: 700;
        letter-spacing: 0.15em;
        color: var(--country-text);
        text-transform: uppercase;
      }

      &--country-small {
        font-size: 13px;
        --shadow: var(--country-small-text-stroke);
      }

      &--country-large {
        font-size: 15px;
        --shadow: var(--country-large-text-stroke);
      }

      &--water-small,
      &--water-large {
        font-family: 'ABCSerif', serif;
        font-style: italic;
        letter-spacing: 0.2em;
        color: var(--water-text);
        --shadow: var(--water-text-stroke);
      }

      &--water-small {
        font-size: 12px;
      }

      &--water-large {
        font-size: 14px;
      }
    }
  }
</style>
