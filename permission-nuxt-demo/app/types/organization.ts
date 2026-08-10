export type OrgNode = {
  id: string
  parentId: string | null
  code: string
  name: string
  unitType: 'COMPANY' | 'DEPARTMENT' | 'GROUP'
  leaderName: string | null
  sortOrder: number
  status: 'ACTIVE' | 'DISABLED'
  memberCount: number
  positionCount: number
  children: OrgNode[]
}
