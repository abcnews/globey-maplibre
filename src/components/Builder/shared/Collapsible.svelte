<script lang="ts">
  import Collapsible from '../../Builder.legacy/shared/Collapsible.svelte';

  let props = $props();
</script>

<Collapsible {...props}>
  {#snippet header()}
    {@render props.header?.()}
  {/snippet}
  {#snippet actions()}
    {@render props.actions?.()}
  {/snippet}
  {@render props.children?.()}
</Collapsible>
