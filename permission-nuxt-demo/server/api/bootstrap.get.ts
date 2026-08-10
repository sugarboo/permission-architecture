import { getDemoActorId, getEffectivePermissionContext } from '../services/policy'
import { useDb } from '../utils/db'

export default defineEventHandler((event) => {
  const { sqlite } = useDb()
  const actorUserId = getDemoActorId(event)
  const counts = sqlite.prepare(`
    SELECT
      (SELECT COUNT(*) FROM iam_user WHERE status = 'ACTIVE') AS users,
      (SELECT COUNT(*) FROM iam_role WHERE status = 'ACTIVE') AS roles,
      (SELECT COUNT(*) FROM iam_permission WHERE type = 'FUNCTION' AND status = 'ACTIVE') AS functions,
      (SELECT COUNT(*) FROM iam_business_resource WHERE status = 'ACTIVE') AS resources,
      (SELECT COUNT(*) FROM iam_menu WHERE node_type = 'MENU' AND status = 'ACTIVE') AS menus,
      (SELECT COUNT(*) FROM org_unit WHERE status = 'ACTIVE') AS orgUnits,
      (SELECT COUNT(*) FROM org_position WHERE status = 'ACTIVE') AS positions,
      (SELECT COUNT(*) FROM iam_user_permission WHERE valid_to IS NULL OR valid_to > datetime('now')) AS directGrants
  `).get()
  const versions = Object.fromEntries((sqlite.prepare('SELECT key, value FROM policy_meta').all() as Array<{ key: string, value: string }>).map(item => [item.key, Number(item.value)]))
  const recentAudit = sqlite.prepare(`
    SELECT a.id, a.action, a.entity_type AS entityType, a.entity_id AS entityId,
           a.summary, a.created_at AS createdAt, u.display_name AS actorName
    FROM iam_audit_log a
    JOIN iam_user u ON u.id = a.actor_user_id
    ORDER BY a.created_at DESC
    LIMIT 6
  `).all()

  return {
    counts,
    versions,
    actor: getEffectivePermissionContext(actorUserId),
    recentAudit
  }
})
