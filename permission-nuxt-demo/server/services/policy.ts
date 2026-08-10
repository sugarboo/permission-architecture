import { createError, type H3Event } from 'h3'
import { useDb } from '../utils/db'
import { mergePermissionCandidates, type PermissionCandidate } from './policy-rules'

type PermissionRow = PermissionCandidate

export type DataAccess = {
  dataDomainCode: string
  all: boolean
  self: boolean
  orgUnitIds: string[]
  scopes: Array<{
    positionId: string
    positionName: string
    orgUnitId: string
    orgUnitName: string
    scopeType: string
  }>
}

const activeWindowSql = `(valid_from IS NULL OR valid_from <= @now) AND (valid_to IS NULL OR valid_to > @now)`

export function getEffectivePermissionContext(userId: string) {
  const { sqlite } = useDb()
  const stamp = new Date().toISOString()
  const user = sqlite.prepare(`
    SELECT id, username, display_name AS displayName, status, authz_version AS authzVersion
    FROM iam_user WHERE id = ?
  `).get(userId) as { id: string, username: string, displayName: string, status: string, authzVersion: number } | undefined

  if (!user || user.status !== 'ACTIVE') {
    throw createError({ statusCode: 403, statusMessage: '用户不存在或已停用' })
  }

  const roleRows = sqlite.prepare(`
    SELECT p.id, p.code, p.name, p.type, p.domain,
           p.data_domain_code AS dataDomainCode, p.risk_level AS riskLevel,
           'ROLE' AS sourceType, r.id AS sourceId, r.name AS sourceName
    FROM iam_user_role ur
    JOIN iam_role r ON r.id = ur.role_id AND r.status = 'ACTIVE'
    JOIN iam_role_permission rp ON rp.role_id = r.id
    JOIN iam_permission p ON p.id = rp.permission_id AND p.status = 'ACTIVE' AND p.type IN ('FUNCTION', 'MENU')
    WHERE ur.user_id = @userId AND ${activeWindowSql}
  `).all({ userId, now: stamp }) as PermissionRow[]

  const directRows = sqlite.prepare(`
    SELECT p.id, p.code, p.name, p.type, p.domain,
           p.data_domain_code AS dataDomainCode, p.risk_level AS riskLevel,
           'DIRECT' AS sourceType, up.id AS sourceId, '用户直授' AS sourceName
    FROM iam_user_permission up
    JOIN iam_permission p ON p.id = up.permission_id AND p.status = 'ACTIVE' AND p.type IN ('FUNCTION', 'MENU')
    WHERE up.user_id = @userId AND ${activeWindowSql}
  `).all({ userId, now: stamp }) as PermissionRow[]

  const baseRows = [...roleRows, ...directRows]
  const menuPermissionIds = [...new Set(baseRows.filter(row => row.type === 'MENU').map(row => row.id))]
  const menuCoreRows: PermissionRow[] = []

  if (menuPermissionIds.length > 0) {
    const placeholders = menuPermissionIds.map(() => '?').join(', ')
    const rows = sqlite.prepare(`
      SELECT p.id, p.code, p.name, p.type, p.domain,
             p.data_domain_code AS dataDomainCode, p.risk_level AS riskLevel,
             'MENU_CORE' AS sourceType, m.id AS sourceId, m.name AS sourceName
      FROM iam_menu m
      JOIN iam_menu_binding mb ON mb.menu_id = m.id
        AND mb.bundle_level = 'CORE' AND mb.status = 'PUBLISHED'
      JOIN iam_permission p ON p.id = mb.permission_id AND p.status = 'ACTIVE' AND p.type = 'FUNCTION'
      WHERE m.permission_id IN (${placeholders}) AND m.status = 'ACTIVE'
    `).all(...menuPermissionIds) as PermissionRow[]
    menuCoreRows.push(...rows)
  }

  const effectivePermissions = mergePermissionCandidates([...baseRows, ...menuCoreRows])

  const policyVersion = sqlite.prepare(`SELECT value FROM policy_meta WHERE key = 'policy_version'`).get() as { value: string }
  const directGrantCount = directRows.length
  const roleIds = [...new Set(roleRows.map(row => row.sourceId))]
  const dataDomains = sqlite.prepare('SELECT code FROM iam_data_domain ORDER BY code').all() as Array<{ code: string }>
  const dataAccess = dataDomains.map(domain => resolveDataAccess(userId, domain.code))

  return {
    user,
    policyVersion: Number(policyVersion?.value ?? 1),
    roleIds,
    directGrantCount,
    permissions: effectivePermissions.sort((a, b) => a.domain.localeCompare(b.domain, 'zh-CN') || a.code.localeCompare(b.code)),
    dataAccess
  }
}

export function resolveDataAccess(userId: string, dataDomainCode: string): DataAccess {
  const { sqlite } = useDb()
  const stamp = new Date().toISOString()
  const scopes = sqlite.prepare(`
    SELECT pds.id, pds.scope_type AS scopeType, pds.include_descendants AS includeDescendants,
           p.id AS positionId, p.name AS positionName,
           up.org_unit_id AS orgUnitId, ou.name AS orgUnitName
    FROM org_user_position up
    JOIN org_position p ON p.id = up.position_id AND p.status = 'ACTIVE'
    JOIN org_unit ou ON ou.id = up.org_unit_id AND ou.status = 'ACTIVE'
    JOIN iam_position_data_scope pds ON pds.position_id = p.id
    WHERE up.user_id = @userId AND pds.data_domain_code = @dataDomainCode
      AND ${activeWindowSql.replaceAll('valid_', 'up.valid_')}
  `).all({ userId, dataDomainCode, now: stamp }) as Array<{
    id: string
    scopeType: string
    includeDescendants: number
    positionId: string
    positionName: string
    orgUnitId: string
    orgUnitName: string
  }>

  let all = false
  let self = false
  const orgUnitIds = new Set<string>()

  for (const scope of scopes) {
    if (scope.scopeType === 'ALL') {
      all = true
      continue
    }
    if (scope.scopeType === 'SELF') {
      self = true
      continue
    }
    if (scope.scopeType === 'DEPT') {
      orgUnitIds.add(scope.orgUnitId)
      continue
    }
    if (scope.scopeType === 'DEPT_AND_DESCENDANTS') {
      const descendants = sqlite.prepare('SELECT descendant_id AS id FROM org_closure WHERE ancestor_id = ?').all(scope.orgUnitId) as Array<{ id: string }>
      descendants.forEach(row => orgUnitIds.add(row.id))
      continue
    }
    if (scope.scopeType === 'CUSTOM_DEPTS') {
      const configured = sqlite.prepare('SELECT org_unit_id AS id FROM iam_scope_department WHERE scope_id = ?').all(scope.id) as Array<{ id: string }>
      for (const row of configured) {
        orgUnitIds.add(row.id)
        if (scope.includeDescendants) {
          const descendants = sqlite.prepare('SELECT descendant_id AS id FROM org_closure WHERE ancestor_id = ?').all(row.id) as Array<{ id: string }>
          descendants.forEach(item => orgUnitIds.add(item.id))
        }
      }
    }
  }

  return {
    dataDomainCode,
    all,
    self,
    orgUnitIds: [...orgUnitIds],
    scopes: scopes.map(scope => ({
      positionId: scope.positionId,
      positionName: scope.positionName,
      orgUnitId: scope.orgUnitId,
      orgUnitName: scope.orgUnitName,
      scopeType: scope.scopeType
    }))
  }
}

export function hasPermission(userId: string, code: string) {
  return getEffectivePermissionContext(userId).permissions.some(permission => permission.type === 'FUNCTION' && permission.code === code)
}

export function getDemoActorId(event: H3Event) {
  // This fixed identity is private server configuration for the local demo.
  // Production must replace it with a verified SSO/session principal.
  return useRuntimeConfig(event).demoActorId
}

export function requireFunction(event: H3Event, code: string) {
  const actorUserId = getDemoActorId(event)
  if (!hasPermission(actorUserId, code)) {
    throw createError({ statusCode: 403, statusMessage: `缺少功能权限：${code}` })
  }
  return actorUserId
}
