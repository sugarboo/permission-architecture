export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'
export type PermissionType = 'FUNCTION' | 'MENU'

export type PermissionTreeNode = {
  id: string
  label: string
  caption?: string
  permissionId?: string
  riskLevel?: RiskLevel
  children?: PermissionTreeNode[]
}

export type MenuNode = {
  id: string
  parentId: string | null
  nodeType: 'BOARD' | 'DIRECTORY' | 'MENU'
  name: string
  code: string
  permissionId: string | null
  routePath: string | null
  componentKey: string | null
  sortOrder: number
  status: 'ACTIVE' | 'DISABLED'
  coreCount: number
  optionalCount: number
  children: MenuNode[]
}
