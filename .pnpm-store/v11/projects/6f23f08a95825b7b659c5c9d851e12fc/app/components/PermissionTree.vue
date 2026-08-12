<script setup lang="ts">
import type { PermissionTreeNode } from '~/types/permission'

const props = defineProps<{
  nodes: PermissionTreeNode[]
  modelValue: string[]
  search?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()
const expanded = ref(new Set<string>())

watch(() => props.nodes, (nodes) => {
  const collect = (items: PermissionTreeNode[]) => items.forEach(item => {
    if (item.children?.length) {
      expanded.value.add(item.id)
      collect(item.children)
    }
  })
  collect(nodes)
}, { immediate: true })

const normalizedSearch = computed(() => props.search?.trim().toLowerCase() || '')

function filteredNode(node: PermissionTreeNode): PermissionTreeNode | null {
  if (!normalizedSearch.value) return node
  const children = (node.children || []).map(filteredNode).filter(Boolean) as PermissionTreeNode[]
  const matches = `${node.label} ${node.caption || ''}`.toLowerCase().includes(normalizedSearch.value)
  return matches || children.length ? { ...node, children } : null
}

const visibleNodes = computed(() => props.nodes.map(filteredNode).filter(Boolean) as PermissionTreeNode[])

function leafIds(node: PermissionTreeNode): string[] {
  const own = node.permissionId ? [node.permissionId] : []
  return [...own, ...(node.children || []).flatMap(leafIds)]
}

function editableLeafIds(node: PermissionTreeNode): string[] {
  const own = node.permissionId && !node.disabled ? [node.permissionId] : []
  return [...own, ...(node.children || []).flatMap(editableLeafIds)]
}

function stateOf(node: PermissionTreeNode) {
  const ids = leafIds(node)
  const selectedCount = ids.filter(id => props.modelValue.includes(id)).length
  return { ids, checked: ids.length > 0 && selectedCount === ids.length, indeterminate: selectedCount > 0 && selectedCount < ids.length }
}

function toggle(node: PermissionTreeNode, checked: boolean) {
  const ids = editableLeafIds(node)
  if (!ids.length) return
  const next = new Set(props.modelValue)
  ids.forEach(id => checked ? next.add(id) : next.delete(id))
  emit('update:modelValue', [...next])
}

function toggleExpanded(id: string) {
  const next = new Set(expanded.value)
  next.has(id) ? next.delete(id) : next.add(id)
  expanded.value = next
}

function riskColor(risk?: string) {
  return risk === 'HIGH' ? 'error' : risk === 'MEDIUM' ? 'warning' : 'neutral'
}
</script>

<template>
  <div class="tree-box" role="tree">
    <template v-if="visibleNodes.length">
      <PermissionTreeBranch
        v-for="node in visibleNodes"
        :key="node.id"
        :node="node"
        :depth="0"
        :expanded="expanded"
        :selected="modelValue"
        :state-of="stateOf"
        :risk-color="riskColor"
        @toggle="toggle"
        @toggle-expanded="toggleExpanded"
      />
    </template>
    <div v-else class="empty-state" style="min-height: 180px"><div><b>没有匹配项</b><p>换一个名称或权限码搜索。</p></div></div>
  </div>
</template>
