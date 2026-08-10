import { getEffectivePermissionContext, requireFunction, resolveDataAccess } from '../../services/policy'
import { canAccessOwnedRow } from '../../services/policy-rules'
import { useDb } from '../../utils/db'

export default defineEventHandler((event) => {
  requireFunction(event, 'iam.audit.read')
  const userId = getQuery(event).userId?.toString()
  if (!userId) throw createError({ statusCode: 422, statusMessage: '缺少 userId' })
  const context = getEffectivePermissionContext(userId)
  const canRead = context.permissions.some(permission => permission.code === 'crm.customer.read')
  if (!canRead) return { allowed: false, reason: '缺少 crm.customer.read', rows: [] }

  const access = resolveDataAccess(userId, 'crm.customer')
  const { sqlite } = useDb()
  const rows = sqlite.prepare(`
    SELECT c.id, c.name, c.status, c.owner_user_id AS ownerUserId,
           c.owner_org_unit_id AS ownerOrgUnitId, u.display_name AS ownerName, ou.name AS ownerOrgUnitName
    FROM demo_customer c
    JOIN iam_user u ON u.id = c.owner_user_id
    JOIN org_unit ou ON ou.id = c.owner_org_unit_id
    ORDER BY c.name
  `).all() as Array<{ ownerUserId: string, ownerOrgUnitId: string }>
  const visible = rows.filter(row => canAccessOwnedRow(access, row, userId))
  return { allowed: true, dataAccess: access, rows: visible, totalBeforeFilter: rows.length }
})
