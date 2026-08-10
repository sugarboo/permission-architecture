import { buildTree } from '../services/tree'
import { useDb } from '../utils/db'

export default defineEventHandler(() => {
  const { sqlite } = useDb()
  const unitRows = sqlite.prepare(`
    SELECT ou.id, ou.parent_id AS parentId, ou.code, ou.name, ou.unit_type AS unitType,
           ou.leader_user_id AS leaderUserId, leader.display_name AS leaderName,
           ou.sort_order AS sortOrder, ou.status,
           (SELECT COUNT(*) FROM org_user_position up WHERE up.org_unit_id = ou.id AND (up.valid_to IS NULL OR up.valid_to > datetime('now'))) AS memberCount,
           (SELECT COUNT(*) FROM org_position p WHERE p.org_unit_id = ou.id AND p.status = 'ACTIVE') AS positionCount
    FROM org_unit ou
    LEFT JOIN iam_user leader ON leader.id = ou.leader_user_id
    ORDER BY ou.sort_order, ou.name
  `).all() as Array<{ id: string, parentId: string | null, sortOrder: number } & Record<string, unknown>>

  const positionRows = sqlite.prepare(`
    SELECT p.id, p.code, p.name, p.org_unit_id AS orgUnitId, ou.name AS orgUnitName,
           p.description, p.suggested_role_id AS suggestedRoleId, r.name AS suggestedRoleName,
           p.status,
           (SELECT COUNT(*) FROM org_user_position up WHERE up.position_id = p.id AND (up.valid_to IS NULL OR up.valid_to > datetime('now'))) AS memberCount
    FROM org_position p
    JOIN org_unit ou ON ou.id = p.org_unit_id
    LEFT JOIN iam_role r ON r.id = p.suggested_role_id
    ORDER BY ou.sort_order, p.name
  `).all()

  const scopeRows = sqlite.prepare(`
    SELECT s.id, s.position_id AS positionId, s.data_domain_code AS dataDomainCode,
           d.name AS dataDomainName, s.scope_type AS scopeType,
           s.include_descendants AS includeDescendants,
           COALESCE(GROUP_CONCAT(sd.org_unit_id), '') AS customOrgUnitIds
    FROM iam_position_data_scope s
    JOIN iam_data_domain d ON d.code = s.data_domain_code
    LEFT JOIN iam_scope_department sd ON sd.scope_id = s.id
    GROUP BY s.id
    ORDER BY s.position_id, s.data_domain_code
  `).all() as Array<Record<string, unknown> & { customOrgUnitIds: string }>

  return {
    units: unitRows,
    unitTree: buildTree(unitRows),
    positions: positionRows,
    scopes: scopeRows.map(row => ({ ...row, customOrgUnitIds: row.customOrgUnitIds ? row.customOrgUnitIds.split(',') : [] })),
    dataDomains: sqlite.prepare('SELECT code, name, description FROM iam_data_domain ORDER BY code').all(),
    roles: sqlite.prepare(`SELECT id, code, name FROM iam_role WHERE status = 'ACTIVE' ORDER BY name`).all()
  }
})
