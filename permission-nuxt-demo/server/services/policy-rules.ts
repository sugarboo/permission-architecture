export type PermissionSource = {
  sourceType: 'ROLE' | 'DIRECT' | 'MENU_CORE'
  sourceId: string
  sourceName: string
}

export type PermissionCandidate = {
  id: string
  code: string
  name: string
  type: 'FUNCTION' | 'MENU'
  domain: string
  dataDomainCode: string | null
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
} & PermissionSource

export type EffectivePermission = Omit<PermissionCandidate, keyof PermissionSource> & {
  sources: PermissionSource[]
}

export type DataAccessRule = {
  all: boolean
  self: boolean
  orgUnitIds: string[]
}

export type OwnedDataRow = {
  ownerUserId: string
  ownerOrgUnitId: string
}

/**
 * The effective capability set is additive. Multiple origins are retained so
 * removing one role or direct grant never erases another still-valid origin.
 */
export function mergePermissionCandidates(rows: PermissionCandidate[]): EffectivePermission[] {
  const permissionMap = new Map<string, EffectivePermission>()

  for (const row of rows) {
    const source: PermissionSource = {
      sourceType: row.sourceType,
      sourceId: row.sourceId,
      sourceName: row.sourceName
    }
    const current = permissionMap.get(row.id)

    if (current) {
      if (!current.sources.some(item => item.sourceType === source.sourceType && item.sourceId === source.sourceId)) {
        current.sources.push(source)
      }
      continue
    }

    permissionMap.set(row.id, {
      id: row.id,
      code: row.code,
      name: row.name,
      type: row.type,
      domain: row.domain,
      dataDomainCode: row.dataDomainCode,
      riskLevel: row.riskLevel,
      sources: [source]
    })
  }

  return [...permissionMap.values()]
}

/**
 * A data row is visible only when the already-authorized capability's data
 * predicate also matches. NONE is represented by all=false, self=false and an
 * empty orgUnitIds list.
 */
export function canAccessOwnedRow(access: DataAccessRule, row: OwnedDataRow, userId: string) {
  return access.all
    || (access.self && row.ownerUserId === userId)
    || access.orgUnitIds.includes(row.ownerOrgUnitId)
}
