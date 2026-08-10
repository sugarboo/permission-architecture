import { useDb } from '../../utils/db'

export default defineEventHandler(() => {
  const { sqlite } = useDb()
  const rows = sqlite.prepare(`
    SELECT u.id, u.username, u.employee_no AS employeeNo, u.display_name AS displayName,
           u.email, u.phone, u.status, u.authz_version AS authzVersion,
           ou.id AS orgUnitId, ou.name AS orgUnitName,
           p.id AS positionId, p.name AS positionName,
           COALESCE(GROUP_CONCAT(DISTINCT r.name), '') AS roleNames,
           (SELECT COUNT(*) FROM iam_user_permission up
            WHERE up.user_id = u.id AND (up.valid_to IS NULL OR up.valid_to > datetime('now'))) AS directGrantCount
    FROM iam_user u
    LEFT JOIN org_user_position upos ON upos.user_id = u.id AND upos.is_primary = 1
    LEFT JOIN org_unit ou ON ou.id = upos.org_unit_id
    LEFT JOIN org_position p ON p.id = upos.position_id
    LEFT JOIN iam_user_role ur ON ur.user_id = u.id
    LEFT JOIN iam_role r ON r.id = ur.role_id
    GROUP BY u.id
    ORDER BY CASE u.id WHEN 'u_admin' THEN 0 ELSE 1 END, u.created_at DESC
  `).all() as Array<Record<string, unknown> & { roleNames: string }>

  return rows.map(row => ({
    ...row,
    roleNames: row.roleNames ? row.roleNames.split(',') : []
  }))
})
