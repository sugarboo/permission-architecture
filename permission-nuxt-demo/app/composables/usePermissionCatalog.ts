import type { MenuNode, PermissionTreeNode } from '~/types/permission'

type Catalog = {
  functions: Array<{ id: string, code: string, name: string, domain: string, riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' }>
  menuTree: MenuNode[]
}

function groupPermissions(items: Catalog['functions']): PermissionTreeNode[] {
  const groups = new Map<string, PermissionTreeNode[]>()
  for (const item of items) {
    const current = groups.get(item.domain) || []
    current.push({ id: item.id, label: item.name, caption: item.code, permissionId: item.id, riskLevel: item.riskLevel })
    groups.set(item.domain, current)
  }
  return [...groups.entries()].map(([domain, children]) => ({ id: `domain:${domain}`, label: domain, caption: `${children.length} 项`, children }))
}

function mapMenu(nodes: MenuNode[]): PermissionTreeNode[] {
  return nodes.map(node => ({
    id: node.id,
    label: node.name,
    caption: node.nodeType === 'MENU' ? `${node.coreCount || 0} CORE · ${node.optionalCount || 0} OPTIONAL` : node.code,
    permissionId: node.permissionId || undefined,
    children: mapMenu(node.children || [])
  }))
}

export function usePermissionCatalog(catalog: Ref<Catalog | null>) {
  const menuTree = computed(() => catalog.value ? mapMenu(catalog.value.menuTree) : [])
  const functionTree = computed(() => catalog.value ? groupPermissions(catalog.value.functions) : [])
  return { menuTree, functionTree }
}
