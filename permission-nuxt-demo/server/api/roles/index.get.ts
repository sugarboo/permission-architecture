import { useDb } from '../../utils/db'

export default defineEventHandler(() => {
  const { sqlite } = useDb()
  return sqlite.prepare(`
    SELECT r.id, r.code, r.name, r.domain, r.description, r.status,
           COUNT(DISTINCT ur.user_id) AS memberCount,
           COUNT(DISTINCT rp.permission_id) AS permissionCount,
           SUM(CASE WHEN p.type = 'MENU' THEN 1 ELSE 0 END) AS menuCount,
           SUM(CASE WHEN p.type = 'FUNCTION' THEN 1 ELSE 0 END) AS functionCount
    FROM iam_role r
    LEFT JOIN iam_user_role ur ON ur.role_id = r.id
    LEFT JOIN iam_role_permission rp ON rp.role_id = r.id
    LEFT JOIN iam_permission p ON p.id = rp.permission_id
    GROUP BY r.id
    ORDER BY r.created_at DESC
  `).all()
})
