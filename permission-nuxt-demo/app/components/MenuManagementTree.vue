<script setup lang="ts">
import type { MenuNode } from '~/types/permission'
const props = defineProps<{ nodes: MenuNode[], selectedId?: string }>()
const emit = defineEmits<{ select: [node: MenuNode] }>()
const expanded = ref(new Set<string>())
watchEffect(() => {
  const walk = (nodes: MenuNode[]) => nodes.forEach(node => { if (node.children?.length) { expanded.value.add(node.id); walk(node.children) } })
  walk(props.nodes || [])
})
function toggle(id: string) { const next = new Set(expanded.value); next.has(id) ? next.delete(id) : next.add(id); expanded.value = next }
</script>

<template>
  <div class="tree-box">
    <MenuManagementTreeBranch v-for="node in nodes" :key="node.id" :node="node" :depth="0" :expanded="expanded" :selected-id="selectedId" @select="emit('select', $event)" @toggle="toggle" />
  </div>
</template>
