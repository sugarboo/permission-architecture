<script setup lang="ts">
import type { MenuNode } from '~/types/permission'
defineProps<{ node: MenuNode, depth: number, expanded: Set<string>, selectedId?: string }>()
const emit = defineEmits<{ select: [node: MenuNode], toggle: [id: string] }>()
</script>

<template>
  <div class="tree-node">
    <div class="tree-row" :class="{ 'is-selected': selectedId === node.id, 'is-group': node.children?.length }" :style="{ '--tree-depth': depth }" @click="emit('select', node)">
      <span class="tree-indent" />
      <button v-if="node.children?.length" type="button" class="tree-toggle" @click.stop="emit('toggle', node.id)"><UIcon :name="expanded.has(node.id) ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" size="13" /></button><span v-else style="width: 22px" />
      <UIcon :name="node.nodeType === 'BOARD' ? 'i-lucide-layout-grid' : node.nodeType === 'DIRECTORY' ? 'i-lucide-folder' : 'i-lucide-panel-top'" size="14" :style="{ color: node.nodeType === 'MENU' ? '#246bfd' : '#72829a' }" />
      <div class="tree-label"><b>{{ node.name }}</b><small>{{ node.nodeType === 'MENU' ? `${node.coreCount || 0} CORE · ${node.optionalCount || 0} OPTIONAL` : node.code }}</small></div>
      <UBadge v-if="node.status !== 'ACTIVE'" color="neutral" variant="subtle" size="sm" label="停用" />
    </div>
    <div v-if="node.children?.length && expanded.has(node.id)" class="tree-children" :style="{ '--tree-parent-depth': depth }">
      <MenuManagementTreeBranch v-for="child in node.children" :key="child.id" :node="child" :depth="depth + 1" :expanded="expanded" :selected-id="selectedId" @select="emit('select', $event)" @toggle="emit('toggle', $event)" />
    </div>
  </div>
</template>
