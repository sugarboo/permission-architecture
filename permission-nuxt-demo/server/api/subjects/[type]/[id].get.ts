import { getEffectivePermissionContext } from '../../../services/policy'
import { useDb } from '../../../utils/db'

export default defineEventHandler((event) => {
  const type = getRouterParam(event, 'type')
  const id = getRouterParam(event, 'id')!
  const { sqlite } = useDb()

  if (type === 'role') {
    const role = sqlite.prepare(`SELECT id, code, name, domain, description, status FROM iam_role WHERE id = ?`).get(id)
    if (!role) throw createError({ statusCode: 404, statusMessage: '角色不存在' })
    const grants = sqlite.prepare(`
      SELECT p.id, p.code, p.name, p.type, p.domain, p.risk_level AS riskLevel
      FROM iam_role_permission rp
      JOIN iam_permission p ON p.id = rp.permission_id
      WHERE rp.role_id = ? AND p.type IN ('FUNCTION', 'MENU')
      ORDER BY p.domain, p.code
    `).all(id)
    return { type, subject: role, permissionIds: grants.map((item: any) => item.id), grants }
  }

  if (type === 'user') {
    const user = sqlite.prepare(`SELECT id, username, display_name AS displayName, employee_no AS employeeNo, status FROM iam_user WHERE id = ?`).get(id)
    if (!user) throw createError({ statusCode: 404, statusMessage: '用户不存在' })
    const roleRows = sqlite.prepare(`
      SELECT r.id, r.code, r.name, ur.valid_from AS validFrom, ur.valid_to AS validTo
      FROM iam_user_role ur JOIN iam_role r ON r.id = ur.role_id WHERE ur.user_id = ?
    `).all(id) as Array<{ id: string }>
    const directRows = sqlite.prepare(`
      SELECT up.id AS grantId, p.id, p.code, p.name, p.type, p.domain, p.risk_level AS riskLevel,
             up.reason, up.source_ticket AS sourceTicket, up.valid_from AS validFrom, up.valid_to AS validTo
      FROM iam_user_permission up
      JOIN iam_permission p ON p.id = up.permission_id
      WHERE up.user_id = ? AND p.type IN ('FUNCTION', 'MENU')
      ORDER BY p.domain, p.code
    `).all(id) as Array<{ id: string }>
    return {
      type,
      subject: user,
      roleIds: roleRows.map(item => item.id),
      roles: roleRows,
      permissionIds: directRows.map(item => item.id),
      directGrants: directRows,
      effective: getEffectivePermissionContext(id)
    }
  }

  throw createError({ statusCode: 400, statusMessage: '主体类型仅支持 user 或 role' })
})
