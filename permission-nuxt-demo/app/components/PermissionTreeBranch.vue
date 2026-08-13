<script setup lang="ts">
import type { PermissionTreeNode } from '~/types/permission'

const props = defineProps<{
  node: PermissionTreeNode
  depth: number
  expanded: Set<string>
  selected: string[]
  stateOf: (node: PermissionTreeNode) => { ids: string[], checked: boolean, indeterminate: boolean }
  riskColor: (risk?: string) => string
}>()

const emit = defineEmits<{
  toggle: [node: PermissionTreeNode, checked: boolean]
  'toggle-expanded': [id: string]
}>()

const state = computed(() => props.stateOf(props.node))
const hasChildren = computed(() => Boolean(props.node.children?.length))
</script>

<template>
  <div class="tree-node" role="treeitem" :aria-expanded="hasChildren ? expanded.has(node.id) : undefined">
    <div class="tree-row" :class="{ 'is-group': hasChildren, 'is-leaf': !hasChildren, 'is-derived-role': node.grantState === 'ROLE', 'is-derived-core': node.grantState === 'CORE', 'is-menu-optional': node.grantState === 'OPTIONAL' }" :style="{ '--tree-depth': depth }" :title="node.grantHint">
      <span class="tree-indent" />
      <button v-if="hasChildren" type="button" class="tree-toggle" :aria-label="expanded.has(node.id) ? '收起' : '展开'" @click="emit('toggle-expanded', node.id)">
        <UIcon :name="expanded.has(node.id) ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" size="13" />
      </button>
      <span v-else style="width: 22px" />
      <UCheckbox
        :model-value="state.checked"
        :indeterminate="state.indeterminate"
        :disabled="node.disabled"
        :aria-label="`选择 ${node.label}`"
        @update:model-value="emit('toggle', node, $event === true)"
      />
      <div class="tree-label">
        <b>{{ node.label }}</b>
        <small v-if="node.caption">{{ node.caption }}</small>
      </div>
      <div v-if="node.grantState || node.riskLevel" class="tree-badges">
        <UBadge v-if="node.grantState" :color="node.grantState === 'OPTIONAL' ? 'warning' : 'primary'" variant="subtle" size="sm" :label="node.grantLabel || node.grantState" :title="node.grantHint" />
        <UBadge v-if="node.riskLevel" :color="riskColor(node.riskLevel) as any" variant="subtle" size="sm" :label="node.riskLevel" />
      </div>
      <span v-else-if="hasChildren" class="tree-count">{{ state.ids.length }}</span>
    </div>
    <div v-if="hasChildren && expanded.has(node.id)" class="tree-children" :style="{ '--tree-parent-depth': depth }" role="group">
      <PermissionTreeBranch
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
        :expanded="expanded"
        :selected="selected"
        :state-of="stateOf"
        :risk-color="riskColor"
        @toggle="(value, checked) => emit('toggle', value, checked)"
        @toggle-expanded="id => emit('toggle-expanded', id)"
      />
    </div>
  </div>
</template>
