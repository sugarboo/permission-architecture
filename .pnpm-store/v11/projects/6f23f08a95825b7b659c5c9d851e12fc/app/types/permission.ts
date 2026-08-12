export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'
export type PermissionType = 'RESOURCE' | 'MENU'

export type PermissionTreeNode = {
  id: string
  label: string
  caption?: string
  permissionId?: string
  riskLevel?: RiskLevel
  disabled?: boolean
  grantState?: 'CORE' | 'OPTIONAL'
  grantLabel?: string
  grantHint?: string
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
