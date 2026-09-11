<script lang="ts">
  import VerticalTabs from '../../Builder.legacy/shared/VerticalTabs.svelte';

  let props = $props();
</script>

<VerticalTabs {...props}>
  {@render props.children?.()}
</VerticalTabs>
