export type TreeRecord = {
  id: string
  parentId: string | null
  sortOrder?: number
  [key: string]: unknown
}

export type TreeNode<T extends TreeRecord> = T & { children: TreeNode<T>[] }

export function buildTree<T extends TreeRecord>(records: T[]): TreeNode<T>[] {
  const nodes = new Map<string, TreeNode<T>>()
  records.forEach(record => nodes.set(record.id, { ...record, children: [] }))

  const roots: TreeNode<T>[] = []
  for (const node of nodes.values()) {
    if (node.parentId && nodes.has(node.parentId)) {
      nodes.get(node.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  const sort = (items: TreeNode<T>[]) => {
    items.sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0))
    items.forEach(item => sort(item.children))
  }
  sort(roots)
  return roots
}
