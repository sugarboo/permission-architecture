import { requireFunction } from '../services/policy'
import { useDb } from '../utils/db'

export default defineEventHandler((event) => {
  requireFunction(event, 'iam.audit.read')
  const { sqlite } = useDb()
  return sqlite.prepare(`
    SELECT a.id, a.action, a.entity_type AS entityType, a.entity_id AS entityId,
           a.summary, a.detail_json AS detailJson, a.created_at AS createdAt,
           u.display_name AS actorName, u.username AS actorUsername
    FROM iam_audit_log a
    JOIN iam_user u ON u.id = a.actor_user_id
    ORDER BY a.created_at DESC
    LIMIT 100
  `).all()
})
