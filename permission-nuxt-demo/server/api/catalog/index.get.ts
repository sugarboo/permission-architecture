import { buildTree } from '../../services/tree'
import { useDb } from '../../utils/db'

export default defineEventHandler(() => {
  const { sqlite } = useDb()
  const functionRows = sqlite.prepare(`
    SELECT p.id, p.code, p.name, p.domain, p.data_domain_code AS dataDomainCode,
           p.risk_level AS riskLevel, p.status, p.description,
           f.action_type AS actionType, f.data_scoped AS dataScoped, f.is_sensitive AS isSensitive,
           COUNT(DISTINCT fr.resource_id) AS resourceCount,
           COUNT(DISTINCT mb.menu_id) AS menuCount
    FROM iam_permission p
    JOIN iam_function f ON f.permission_id = p.id
    LEFT JOIN iam_function_business_resource fr ON fr.function_permission_id = p.id
    LEFT JOIN iam_menu_binding mb ON mb.permission_id = p.id
    WHERE p.type = 'FUNCTION'
    GROUP BY p.id
    ORDER BY p.domain, p.code
  `).all()

  const resourceRows = sqlite.prepare(`
    SELECT r.id, r.code, r.name, r.domain, r.status, r.description,
           r.resource_type AS resourceType,
           COUNT(DISTINCT fr.function_permission_id) AS functionCount,
           COALESCE(GROUP_CONCAT(DISTINCT fp.id), '') AS functionIds,
           COALESCE(GROUP_CONCAT(DISTINCT fp.name), '') AS functionNames
    FROM iam_business_resource r
    LEFT JOIN iam_function_business_resource fr ON fr.resource_id = r.id
    LEFT JOIN iam_permission fp ON fp.id = fr.function_permission_id
    GROUP BY r.id
    ORDER BY r.domain, r.code
  `).all() as Array<Record<string, unknown> & { functionIds: string, functionNames: string }>

  const menuRows = sqlite.prepare(`
    SELECT m.id, m.parent_id AS parentId, m.node_type AS nodeType, m.name, m.code,
           m.permission_id AS permissionId, m.route_path AS routePath,
           m.component_key AS componentKey, m.icon, m.sort_order AS sortOrder, m.status,
           COUNT(DISTINCT mb.permission_id) AS bindingCount,
           SUM(CASE WHEN mb.bundle_level = 'CORE' THEN 1 ELSE 0 END) AS coreCount,
           SUM(CASE WHEN mb.bundle_level = 'OPTIONAL' THEN 1 ELSE 0 END) AS optionalCount
    FROM iam_menu m
    LEFT JOIN iam_menu_binding mb ON mb.menu_id = m.id AND mb.status = 'PUBLISHED'
    GROUP BY m.id
    ORDER BY m.sort_order, m.name
  `).all() as Array<{ id: string, parentId: string | null, sortOrder: number } & Record<string, unknown>>

  const menuBindingRows = sqlite.prepare(`
    SELECT mb.menu_id AS menuId, mb.permission_id AS permissionId, mb.bundle_level AS bundleLevel,
           p.code, p.name, p.type, p.risk_level AS riskLevel
    FROM iam_menu_binding mb
    JOIN iam_permission p ON p.id = mb.permission_id
    WHERE mb.status = 'PUBLISHED'
    ORDER BY mb.bundle_level, p.code
  `).all()

  const dataDomainRows = sqlite.prepare('SELECT code, name, description FROM iam_data_domain ORDER BY code').all()
  const versions = Object.fromEntries((sqlite.prepare('SELECT key, value FROM policy_meta').all() as Array<{ key: string, value: string }>).map(item => [item.key, Number(item.value)]))

  return {
    functions: functionRows,
    resources: resourceRows.map(row => ({
      ...row,
      functionIds: row.functionIds ? row.functionIds.split(',') : [],
      functionNames: row.functionNames ? row.functionNames.split(',') : []
    })),
    menus: menuRows,
    menuTree: buildTree(menuRows),
    menuBindings: menuBindingRows,
    dataDomains: dataDomainRows,
    versions
  }
})
