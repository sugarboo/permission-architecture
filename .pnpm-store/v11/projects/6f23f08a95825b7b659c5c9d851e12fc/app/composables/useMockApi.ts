import { canAccessOwnedRow, mergePermissionCandidates, type PermissionCandidate } from '~/utils/policy-rules'

type Status = 'DRAFT' | 'ACTIVE' | 'DISABLED'
type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'
type ScopeType = 'NONE' | 'SELF' | 'DEPT' | 'DEPT_AND_DESCENDANTS' | 'CUSTOM_DEPTS' | 'ALL'

type MockResource = {
  id: string
  code: string
  name: string
  domain: string
  dataDomainCode: string | null
  riskLevel: RiskLevel
  status: Status
}

type MockMenu = {
  id: string
  parentId: string | null
  nodeType: 'BOARD' | 'DIRECTORY' | 'MENU'
  name: string
  code: string
  permissionId: string | null
  permissionCode: string | null
  routePath: string | null
  sortOrder: number
  status: 'ACTIVE' | 'DISABLED'
}

type MockScope = {
  id: string
  positionId: string
  dataDomainCode: string
  scopeType: ScopeType
  includeDescendants: boolean
  customOrgUnitIds: string[]
}

type DirectGrant = {
  id: string
  permissionId: string
  reason: string
  sourceTicket: string | null
  validFrom: string
  validTo: string | null
}

type MockDatabase = {
  schemaVersion: 2
  policyVersion: number
  catalogVersion: number
  users: Array<{
    id: string
    username: string
    employeeNo: string
    displayName: string
    status: 'ACTIVE' | 'DISABLED'
    authzVersion: number
    orgUnitId: string | null
    positionId: string | null
    roleIds: string[]
    directGrants: DirectGrant[]
  }>
  roles: Array<{
    id: string
    code: string
    name: string
    domain: string
    status: 'ACTIVE' | 'DISABLED'
    permissionIds: string[]
  }>
  resources: MockResource[]
  menus: MockMenu[]
  menuBindings: Array<{
    menuId: string
    permissionId: string
    bundleLevel: 'CORE' | 'OPTIONAL'
    status: 'PUBLISHED'
  }>
  units: Array<{
    id: string
    parentId: string | null
    name: string
    unitType: 'COMPANY' | 'DEPARTMENT' | 'GROUP'
    leaderUserId: string | null
    sortOrder: number
    status: 'ACTIVE' | 'DISABLED'
  }>
  positions: Array<{
    id: string
    name: string
    orgUnitId: string
    status: 'ACTIVE' | 'DISABLED'
  }>
  scopes: MockScope[]
  dataDomains: Array<{ code: string, name: string, description: string }>
  customers: Array<{
    id: string
    name: string
    status: string
    ownerUserId: string
    ownerOrgUnitId: string
  }>
  audits: Array<{
    id: string
    action: string
    entityType: string
    entityId: string
    summary: string
    detailJson: string
    createdAt: string
    actorName: string
    actorUsername: string
  }>
}

type MockFetchOptions = {
  method?: string
  body?: unknown
}

const STORAGE_KEY = 'permission-center-static-demo-v2'
const STAMP = '2026-08-10T08:30:00.000Z'

const resourceSeeds: MockResource[] = [
  { id: 'p_iam_user_manage', code: 'iam.user.manage', name: '管理用户', domain: '权限中心', dataDomainCode: null, riskLevel: 'MEDIUM', status: 'ACTIVE' },
  { id: 'p_iam_role_manage', code: 'iam.role.manage', name: '管理角色', domain: '权限中心', dataDomainCode: null, riskLevel: 'HIGH', status: 'ACTIVE' },
  { id: 'p_iam_catalog_manage', code: 'iam.catalog.manage', name: '管理资源目录', domain: '权限中心', dataDomainCode: null, riskLevel: 'HIGH', status: 'ACTIVE' },
  { id: 'p_iam_menu_manage', code: 'iam.menu.manage', name: '管理菜单权限包', domain: '权限中心', dataDomainCode: null, riskLevel: 'HIGH', status: 'ACTIVE' },
  { id: 'p_iam_org_manage', code: 'iam.org.manage', name: '管理组织岗位', domain: '权限中心', dataDomainCode: null, riskLevel: 'HIGH', status: 'ACTIVE' },
  { id: 'p_iam_audit_read', code: 'iam.audit.read', name: '查看授权审计', domain: '权限中心', dataDomainCode: null, riskLevel: 'LOW', status: 'ACTIVE' },
  { id: 'p_crm_read', code: 'crm.customer.read', name: '查看客户', domain: '信息板块', dataDomainCode: 'crm.customer', riskLevel: 'LOW', status: 'ACTIVE' },
  { id: 'p_crm_create', code: 'crm.customer.create', name: '新建客户', domain: '信息板块', dataDomainCode: 'crm.customer', riskLevel: 'MEDIUM', status: 'ACTIVE' },
  { id: 'p_crm_update', code: 'crm.customer.update', name: '编辑客户', domain: '信息板块', dataDomainCode: 'crm.customer', riskLevel: 'MEDIUM', status: 'ACTIVE' },
  { id: 'p_crm_export', code: 'crm.customer.export', name: '导出客户', domain: '信息板块', dataDomainCode: 'crm.customer', riskLevel: 'HIGH', status: 'ACTIVE' },
  { id: 'p_crm_delete', code: 'crm.customer.delete', name: '删除客户', domain: '信息板块', dataDomainCode: 'crm.customer', riskLevel: 'HIGH', status: 'ACTIVE' },
  { id: 'p_sc_read', code: 'sc.purchase_order.read', name: '查看采购单', domain: '供应链板块', dataDomainCode: 'sc.purchase_order', riskLevel: 'LOW', status: 'ACTIVE' },
  { id: 'p_sc_create', code: 'sc.purchase_order.create', name: '新建采购单', domain: '供应链板块', dataDomainCode: 'sc.purchase_order', riskLevel: 'MEDIUM', status: 'ACTIVE' },
  { id: 'p_sc_approve', code: 'sc.purchase_order.approve', name: '审批采购单', domain: '供应链板块', dataDomainCode: 'sc.purchase_order', riskLevel: 'HIGH', status: 'ACTIVE' },
  { id: 'p_design_read', code: 'designer.asset.read', name: '查看设计任务', domain: '设计师板块', dataDomainCode: 'designer.asset', riskLevel: 'LOW', status: 'ACTIVE' },
  { id: 'p_design_submit', code: 'designer.asset.submit', name: '提交设计稿', domain: '设计师板块', dataDomainCode: 'designer.asset', riskLevel: 'MEDIUM', status: 'ACTIVE' },
  { id: 'p_design_review', code: 'designer.asset.review', name: '评审设计稿', domain: '设计师板块', dataDomainCode: 'designer.asset', riskLevel: 'HIGH', status: 'ACTIVE' }
]

function createSeedDatabase(): MockDatabase {
  const allResourceIds = resourceSeeds.map(item => item.id)
  const allMenuPermissionIds = ['p_menu_customer', 'p_menu_purchase', 'p_menu_design']

  return {
    schemaVersion: 2,
    policyVersion: 7,
    catalogVersion: 3,
    users: [
      { id: 'u_admin', username: 'admin', employeeNo: 'EMP0001', displayName: '周睿', status: 'ACTIVE', authzVersion: 7, orgUnitId: 'o_company', positionId: 'pos_admin', roleIds: ['r_admin'], directGrants: [] },
      { id: 'u_alice', username: 'lin.yue', employeeNo: 'EMP0108', displayName: '林悦', status: 'ACTIVE', authzVersion: 4, orgUnitId: 'o_east', positionId: 'pos_sales_rep', roleIds: ['r_sales_rep'], directGrants: [] },
      { id: 'u_bob', username: 'chen.feng', employeeNo: 'EMP0066', displayName: '陈峰', status: 'ACTIVE', authzVersion: 6, orgUnitId: 'o_info', positionId: 'pos_sales_manager', roleIds: ['r_sales_manager'], directGrants: [{ id: 'grant_bob_delete', permissionId: 'p_crm_delete', reason: '季度客户清理专项', sourceTicket: 'AUTH-2026-021', validFrom: STAMP, validTo: null }] },
      { id: 'u_carol', username: 'wang.qi', employeeNo: 'EMP0216', displayName: '王琪', status: 'ACTIVE', authzVersion: 3, orgUnitId: 'o_supply', positionId: 'pos_purchase', roleIds: ['r_purchase'], directGrants: [] },
      { id: 'u_diana', username: 'zhao.ning', employeeNo: 'EMP0312', displayName: '赵宁', status: 'ACTIVE', authzVersion: 5, orgUnitId: 'o_design', positionId: 'pos_designer', roleIds: ['r_designer'], directGrants: [{ id: 'grant_diana_review', permissionId: 'p_design_review', reason: '设计评审轮值', sourceTicket: null, validFrom: STAMP, validTo: null }] }
    ],
    roles: [
      { id: 'r_admin', code: 'SUPER_ADMIN', name: '系统权限管理员', domain: '权限中心', status: 'ACTIVE', permissionIds: [...allResourceIds, ...allMenuPermissionIds] },
      { id: 'r_sales_rep', code: 'SALES_REP', name: '销售专员', domain: '信息板块', status: 'ACTIVE', permissionIds: ['p_menu_customer', 'p_crm_create', 'p_crm_update'] },
      { id: 'r_sales_manager', code: 'SALES_MANAGER', name: '销售主管', domain: '信息板块', status: 'ACTIVE', permissionIds: ['p_menu_customer', 'p_crm_create', 'p_crm_update', 'p_crm_export'] },
      { id: 'r_purchase', code: 'PURCHASE_SPECIALIST', name: '采购专员', domain: '供应链板块', status: 'ACTIVE', permissionIds: ['p_menu_purchase', 'p_sc_create'] },
      { id: 'r_designer', code: 'DESIGNER', name: '设计师', domain: '设计师板块', status: 'ACTIVE', permissionIds: ['p_menu_design', 'p_design_submit'] }
    ],
    resources: structuredClone(resourceSeeds),
    menus: [
      { id: 'm_info', parentId: null, nodeType: 'BOARD', name: '信息板块', code: 'BOARD_INFO', permissionId: null, permissionCode: null, routePath: null, sortOrder: 10, status: 'ACTIVE' },
      { id: 'm_customer_dir', parentId: 'm_info', nodeType: 'DIRECTORY', name: '客户管理', code: 'DIR_INFO_CUSTOMER', permissionId: null, permissionCode: null, routePath: null, sortOrder: 10, status: 'ACTIVE' },
      { id: 'm_customer', parentId: 'm_customer_dir', nodeType: 'MENU', name: '客户列表', code: 'MENU_CRM_CUSTOMER_LIST', permissionId: 'p_menu_customer', permissionCode: 'menu.info.customer.list', routePath: '/info/customer/list', sortOrder: 10, status: 'ACTIVE' },
      { id: 'm_supply', parentId: null, nodeType: 'BOARD', name: '供应链板块', code: 'BOARD_SUPPLY', permissionId: null, permissionCode: null, routePath: null, sortOrder: 20, status: 'ACTIVE' },
      { id: 'm_purchase_dir', parentId: 'm_supply', nodeType: 'DIRECTORY', name: '采购管理', code: 'DIR_SUPPLY_PURCHASE', permissionId: null, permissionCode: null, routePath: null, sortOrder: 10, status: 'ACTIVE' },
      { id: 'm_purchase', parentId: 'm_purchase_dir', nodeType: 'MENU', name: '采购订单', code: 'MENU_SC_PURCHASE_LIST', permissionId: 'p_menu_purchase', permissionCode: 'menu.supply.purchase.list', routePath: '/supply/purchase/list', sortOrder: 10, status: 'ACTIVE' },
      { id: 'm_design', parentId: null, nodeType: 'BOARD', name: '设计师板块', code: 'BOARD_DESIGNER', permissionId: null, permissionCode: null, routePath: null, sortOrder: 30, status: 'ACTIVE' },
      { id: 'm_design_dir', parentId: 'm_design', nodeType: 'DIRECTORY', name: '项目协作', code: 'DIR_DESIGN_PROJECT', permissionId: null, permissionCode: null, routePath: null, sortOrder: 10, status: 'ACTIVE' },
      { id: 'm_design_tasks', parentId: 'm_design_dir', nodeType: 'MENU', name: '设计任务', code: 'MENU_DESIGN_TASK_LIST', permissionId: 'p_menu_design', permissionCode: 'menu.designer.task.list', routePath: '/designer/tasks', sortOrder: 10, status: 'ACTIVE' }
    ],
    menuBindings: [
      { menuId: 'm_customer', permissionId: 'p_crm_read', bundleLevel: 'CORE', status: 'PUBLISHED' },
      { menuId: 'm_customer', permissionId: 'p_crm_create', bundleLevel: 'OPTIONAL', status: 'PUBLISHED' },
      { menuId: 'm_customer', permissionId: 'p_crm_update', bundleLevel: 'OPTIONAL', status: 'PUBLISHED' },
      { menuId: 'm_customer', permissionId: 'p_crm_export', bundleLevel: 'OPTIONAL', status: 'PUBLISHED' },
      { menuId: 'm_customer', permissionId: 'p_crm_delete', bundleLevel: 'OPTIONAL', status: 'PUBLISHED' },
      { menuId: 'm_purchase', permissionId: 'p_sc_read', bundleLevel: 'CORE', status: 'PUBLISHED' },
      { menuId: 'm_purchase', permissionId: 'p_sc_create', bundleLevel: 'OPTIONAL', status: 'PUBLISHED' },
      { menuId: 'm_purchase', permissionId: 'p_sc_approve', bundleLevel: 'OPTIONAL', status: 'PUBLISHED' },
      { menuId: 'm_design_tasks', permissionId: 'p_design_read', bundleLevel: 'CORE', status: 'PUBLISHED' },
      { menuId: 'm_design_tasks', permissionId: 'p_design_submit', bundleLevel: 'OPTIONAL', status: 'PUBLISHED' },
      { menuId: 'm_design_tasks', permissionId: 'p_design_review', bundleLevel: 'OPTIONAL', status: 'PUBLISHED' }
    ],
    units: [
      { id: 'o_company', parentId: null, name: '示例科技有限公司', unitType: 'COMPANY', leaderUserId: 'u_admin', sortOrder: 1, status: 'ACTIVE' },
      { id: 'o_info', parentId: 'o_company', name: '客户成功部', unitType: 'DEPARTMENT', leaderUserId: 'u_bob', sortOrder: 10, status: 'ACTIVE' },
      { id: 'o_east', parentId: 'o_info', name: '华东客户组', unitType: 'GROUP', leaderUserId: 'u_bob', sortOrder: 10, status: 'ACTIVE' },
      { id: 'o_south', parentId: 'o_info', name: '华南客户组', unitType: 'GROUP', leaderUserId: null, sortOrder: 20, status: 'ACTIVE' },
      { id: 'o_supply', parentId: 'o_company', name: '供应链中心', unitType: 'DEPARTMENT', leaderUserId: 'u_carol', sortOrder: 20, status: 'ACTIVE' },
      { id: 'o_design', parentId: 'o_company', name: '设计中心', unitType: 'DEPARTMENT', leaderUserId: 'u_diana', sortOrder: 30, status: 'ACTIVE' }
    ],
    positions: [
      { id: 'pos_admin', name: '权限管理员', orgUnitId: 'o_company', status: 'ACTIVE' },
      { id: 'pos_sales_rep', name: '销售专员', orgUnitId: 'o_east', status: 'ACTIVE' },
      { id: 'pos_sales_manager', name: '销售主管', orgUnitId: 'o_info', status: 'ACTIVE' },
      { id: 'pos_purchase', name: '采购专员', orgUnitId: 'o_supply', status: 'ACTIVE' },
      { id: 'pos_designer', name: '设计师', orgUnitId: 'o_design', status: 'ACTIVE' }
    ],
    scopes: [
      { id: 'scope_admin_crm', positionId: 'pos_admin', dataDomainCode: 'crm.customer', scopeType: 'ALL', includeDescendants: true, customOrgUnitIds: [] },
      { id: 'scope_admin_sc', positionId: 'pos_admin', dataDomainCode: 'sc.purchase_order', scopeType: 'ALL', includeDescendants: true, customOrgUnitIds: [] },
      { id: 'scope_admin_design', positionId: 'pos_admin', dataDomainCode: 'designer.asset', scopeType: 'ALL', includeDescendants: true, customOrgUnitIds: [] },
      { id: 'scope_sales_rep_crm', positionId: 'pos_sales_rep', dataDomainCode: 'crm.customer', scopeType: 'SELF', includeDescendants: false, customOrgUnitIds: [] },
      { id: 'scope_sales_manager_crm', positionId: 'pos_sales_manager', dataDomainCode: 'crm.customer', scopeType: 'DEPT_AND_DESCENDANTS', includeDescendants: true, customOrgUnitIds: [] },
      { id: 'scope_purchase_sc', positionId: 'pos_purchase', dataDomainCode: 'sc.purchase_order', scopeType: 'DEPT', includeDescendants: false, customOrgUnitIds: [] },
      { id: 'scope_designer_asset', positionId: 'pos_designer', dataDomainCode: 'designer.asset', scopeType: 'SELF', includeDescendants: false, customOrgUnitIds: [] }
    ],
    dataDomains: [
      { code: 'crm.customer', name: '客户', description: '客户负责人及归属部门范围' },
      { code: 'crm.contract', name: '合同', description: '合同负责人及归属部门范围' },
      { code: 'sc.purchase_order', name: '采购订单', description: '采购订单归属部门范围' },
      { code: 'designer.asset', name: '设计稿', description: '设计任务负责人及团队范围' }
    ],
    customers: [
      { id: 'c_001', name: '云帆零售', status: 'FOLLOW_UP', ownerUserId: 'u_alice', ownerOrgUnitId: 'o_east' },
      { id: 'c_002', name: '盛景智能', status: 'ACTIVE', ownerUserId: 'u_alice', ownerOrgUnitId: 'o_east' },
      { id: 'c_003', name: '南岸文创', status: 'WON', ownerUserId: 'u_bob', ownerOrgUnitId: 'o_south' },
      { id: 'c_004', name: '启明供应链', status: 'ACTIVE', ownerUserId: 'u_bob', ownerOrgUnitId: 'o_info' },
      { id: 'c_005', name: '远岚设计', status: 'FOLLOW_UP', ownerUserId: 'u_diana', ownerOrgUnitId: 'o_design' }
    ],
    audits: [
      { id: 'audit_002', action: 'DIRECT_GRANT', entityType: 'USER', entityId: 'u_bob', summary: '向陈峰加授“删除客户”', detailJson: JSON.stringify({ permissionCode: 'crm.customer.delete', validTo: null }), createdAt: '2026-08-10T08:42:00.000Z', actorName: '周睿', actorUsername: 'admin' },
      { id: 'audit_001', action: 'SYSTEM_SEED', entityType: 'SYSTEM', entityId: 'permission-center', summary: '初始化浏览器端 Mock 数据', detailJson: JSON.stringify({ policyVersion: 7, persistence: 'localStorage' }), createdAt: STAMP, actorName: '周睿', actorUsername: 'admin' }
    ]
  }
}

function clone<T>(value: T): T {
  // Vue wraps useState data and component form values in reactive proxies.
  // structuredClone rejects those proxies, while this demo's mock transport is
  // intentionally JSON-only, so serialize it exactly like an HTTP payload.
  if (value === undefined || value === null) return value
  return JSON.parse(JSON.stringify(value)) as T
}

function id(prefix: string) {
  const value = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `${prefix}_${value}`
}

function ensureText(value: unknown, fallback: string) {
  const result = String(value || '').trim()
  return result || fallback
}

export function useMockApi() {
  const database = useState<MockDatabase>('permission-static-mock-db-v2', createSeedDatabase)
  const hydrated = useState<boolean>('permission-static-mock-hydrated-v2', () => false)

  if (import.meta.client && !hydrated.value) {
    hydrated.value = true
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      const parsed = saved ? JSON.parse(saved) as MockDatabase : null
      if (parsed?.schemaVersion === 2) database.value = parsed
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  function persist() {
    if (import.meta.client) localStorage.setItem(STORAGE_KEY, JSON.stringify(database.value))
  }

  function resetMockData() {
    database.value = createSeedDatabase()
    persist()
  }

  function bumpPolicy(userIds: string[] = []) {
    database.value.policyVersion += 1
    for (const user of database.value.users) {
      if (userIds.includes(user.id)) user.authzVersion += 1
    }
  }

  function bumpCatalog() {
    database.value.catalogVersion += 1
    database.value.policyVersion += 1
  }

  function writeAudit(action: string, entityType: string, entityId: string, summary: string, detail: unknown) {
    database.value.audits.unshift({
      id: id('audit'),
      action,
      entityType,
      entityId,
      summary,
      detailJson: JSON.stringify(detail),
      createdAt: new Date().toISOString(),
      actorName: '周睿',
      actorUsername: 'admin'
    })
    database.value.audits = database.value.audits.slice(0, 100)
  }

  function menuPermission(menu: MockMenu) {
    if (!menu.permissionId || !menu.permissionCode) return null
    return {
      id: menu.permissionId,
      code: menu.permissionCode,
      name: `${menu.name}菜单`,
      type: 'MENU' as const,
      domain: database.value.menus.find(item => item.id === database.value.menus.find(parent => parent.id === menu.parentId)?.parentId)?.name || '菜单',
      dataDomainCode: null,
      riskLevel: 'LOW' as const,
      status: menu.status
    }
  }

  function permission(permissionId: string) {
    const resource = database.value.resources.find(item => item.id === permissionId)
    if (resource) return { ...resource, type: 'RESOURCE' as const }
    const menu = database.value.menus.find(item => item.permissionId === permissionId)
    return menu ? menuPermission(menu) : null
  }

  function descendants(unitId: string) {
    const result = new Set<string>([unitId])
    let changed = true
    while (changed) {
      changed = false
      for (const unit of database.value.units) {
        if (unit.parentId && result.has(unit.parentId) && !result.has(unit.id)) {
          result.add(unit.id)
          changed = true
        }
      }
    }
    return [...result]
  }

  function resolveDataAccess(userId: string, dataDomainCode: string) {
    const user = database.value.users.find(item => item.id === userId)
    const position = user ? database.value.positions.find(item => item.id === user.positionId) : null
    const unit = user ? database.value.units.find(item => item.id === user.orgUnitId) : null
    const rules = position ? database.value.scopes.filter(item => item.positionId === position.id && item.dataDomainCode === dataDomainCode) : []
    const orgUnitIds = new Set<string>()
    let all = false
    let self = false

    for (const rule of rules) {
      if (rule.scopeType === 'ALL') all = true
      if (rule.scopeType === 'SELF') self = true
      if (rule.scopeType === 'DEPT' && unit) orgUnitIds.add(unit.id)
      if (rule.scopeType === 'DEPT_AND_DESCENDANTS' && unit) descendants(unit.id).forEach(item => orgUnitIds.add(item))
      if (rule.scopeType === 'CUSTOM_DEPTS') {
        for (const target of rule.customOrgUnitIds) {
          const expanded = rule.includeDescendants ? descendants(target) : [target]
          expanded.forEach(item => orgUnitIds.add(item))
        }
      }
    }

    return {
      dataDomainCode,
      all,
      self,
      orgUnitIds: [...orgUnitIds],
      scopes: rules.map(rule => ({
        positionId: position!.id,
        positionName: position!.name,
        orgUnitId: unit?.id || '',
        orgUnitName: unit?.name || '未分配组织',
        scopeType: rule.scopeType
      }))
    }
  }

  function effective(userId: string) {
    const user = database.value.users.find(item => item.id === userId)
    if (!user) throw new Error('用户不存在')
    const rows: PermissionCandidate[] = []
    const menuPermissionIds = new Set<string>()

    for (const roleId of user.roleIds) {
      const role = database.value.roles.find(item => item.id === roleId && item.status === 'ACTIVE')
      if (!role) continue
      for (const permissionId of role.permissionIds) {
        const item = permission(permissionId)
        if (!item || item.status !== 'ACTIVE') continue
        rows.push({ ...item, sourceType: 'ROLE', sourceId: role.id, sourceName: role.name })
        if (item.type === 'MENU') menuPermissionIds.add(item.id)
      }
    }

    for (const grant of user.directGrants) {
      if (grant.validTo && new Date(grant.validTo) <= new Date()) continue
      const item = permission(grant.permissionId)
      if (!item || item.status !== 'ACTIVE') continue
      rows.push({ ...item, sourceType: 'DIRECT', sourceId: grant.id, sourceName: '用户直授' })
      if (item.type === 'MENU') menuPermissionIds.add(item.id)
    }

    for (const menuPermissionId of menuPermissionIds) {
      const menu = database.value.menus.find(item => item.permissionId === menuPermissionId)
      if (!menu) continue
      for (const binding of database.value.menuBindings.filter(item => item.menuId === menu.id && item.bundleLevel === 'CORE')) {
        const item = permission(binding.permissionId)
        if (item?.type === 'RESOURCE' && item.status === 'ACTIVE') {
          rows.push({ ...item, sourceType: 'MENU_CORE', sourceId: menu.id, sourceName: menu.name })
        }
      }
    }

    const permissions = mergePermissionCandidates(rows).sort((a, b) => `${a.domain}:${a.code}`.localeCompare(`${b.domain}:${b.code}`))
    return {
      user: { id: user.id, username: user.username, displayName: user.displayName, status: user.status, authzVersion: user.authzVersion },
      policyVersion: database.value.policyVersion,
      roleIds: [...user.roleIds],
      directGrantCount: user.directGrants.length,
      permissions,
      dataAccess: database.value.dataDomains.map(domain => resolveDataAccess(user.id, domain.code))
    }
  }

  function buildTree<T extends { id: string, parentId: string | null, sortOrder: number }>(items: T[]) {
    type TreeItem = T & { children: TreeItem[] }
    const map = new Map<string, TreeItem>()
    for (const item of items) map.set(item.id, { ...clone(item), children: [] })
    const roots: TreeItem[] = []
    for (const item of map.values()) {
      const parent = item.parentId ? map.get(item.parentId) : null
      if (parent) parent.children.push(item)
      else roots.push(item)
    }
    const sort = (nodes: TreeItem[]) => {
      nodes.sort((a, b) => a.sortOrder - b.sortOrder || String((a as { name?: string }).name || '').localeCompare(String((b as { name?: string }).name || '')))
      nodes.forEach(item => sort(item.children))
    }
    sort(roots)
    return roots
  }

  function catalogView() {
    const resources = database.value.resources.map(item => ({
      ...item,
      menuCount: new Set(database.value.menuBindings.filter(binding => binding.permissionId === item.id).map(binding => binding.menuId)).size
    })).sort((a, b) => `${a.domain}:${a.code}`.localeCompare(`${b.domain}:${b.code}`))
    const menus = database.value.menus.map(item => ({
      ...item,
      coreCount: database.value.menuBindings.filter(binding => binding.menuId === item.id && binding.bundleLevel === 'CORE').length,
      optionalCount: database.value.menuBindings.filter(binding => binding.menuId === item.id && binding.bundleLevel === 'OPTIONAL').length
    }))
    const menuBindings = database.value.menuBindings.map(item => {
      const resource = database.value.resources.find(candidate => candidate.id === item.permissionId)
      return { ...item, name: resource?.name || '未知资源', code: resource?.code || item.permissionId, type: 'RESOURCE', riskLevel: resource?.riskLevel || 'LOW' }
    })
    return {
      resources,
      menus,
      menuTree: buildTree(menus),
      menuBindings,
      dataDomains: clone(database.value.dataDomains),
      versions: { policy_version: database.value.policyVersion, catalog_version: database.value.catalogVersion }
    }
  }

  function usersView() {
    return database.value.users.map(user => {
      const unit = database.value.units.find(item => item.id === user.orgUnitId)
      const position = database.value.positions.find(item => item.id === user.positionId)
      const roleNames = user.roleIds.map(roleId => database.value.roles.find(item => item.id === roleId)?.name).filter(Boolean)
      return { ...user, directGrants: undefined, roleIds: undefined, orgUnitName: unit?.name || null, positionName: position?.name || null, roleNames, directGrantCount: user.directGrants.length }
    }).sort((a, b) => a.displayName.localeCompare(b.displayName))
  }

  function rolesView() {
    return database.value.roles.map(role => ({
      ...role,
      permissionIds: undefined,
      memberCount: database.value.users.filter(user => user.roleIds.includes(role.id)).length,
      permissionCount: role.permissionIds.length,
      menuCount: role.permissionIds.filter(permissionId => database.value.menus.some(menu => menu.permissionId === permissionId)).length,
      resourceCount: role.permissionIds.filter(permissionId => database.value.resources.some(resource => resource.id === permissionId)).length
    })).sort((a, b) => `${a.domain}:${a.name}`.localeCompare(`${b.domain}:${b.name}`))
  }

  function orgView() {
    const units = database.value.units.map(unit => ({
      ...unit,
      leaderName: database.value.users.find(user => user.id === unit.leaderUserId)?.displayName || null,
      memberCount: database.value.users.filter(user => user.orgUnitId === unit.id).length,
      positionCount: database.value.positions.filter(position => position.orgUnitId === unit.id && position.status === 'ACTIVE').length
    }))
    const positions = database.value.positions.map(position => ({
      ...position,
      orgUnitName: database.value.units.find(unit => unit.id === position.orgUnitId)?.name || '未知组织',
      memberCount: database.value.users.filter(user => user.positionId === position.id).length,
      members: database.value.users.filter(user => user.positionId === position.id).map(user => ({ id: user.id, name: user.displayName, employeeNo: user.employeeNo }))
    }))
    const scopes = database.value.scopes.map(scope => ({
      ...scope,
      includeDescendants: scope.includeDescendants ? 1 : 0,
      dataDomainName: database.value.dataDomains.find(domain => domain.code === scope.dataDomainCode)?.name || scope.dataDomainCode
    }))
    return {
      units,
      unitTree: buildTree(units),
      positions,
      scopes,
      dataDomains: clone(database.value.dataDomains),
      users: database.value.users.filter(user => user.status === 'ACTIVE').map(user => ({ id: user.id, displayName: user.displayName, employeeNo: user.employeeNo, orgUnitId: user.orgUnitId, positionId: user.positionId }))
    }
  }

  function customerRows() {
    return database.value.customers.map(customer => ({
      ...customer,
      ownerName: database.value.users.find(user => user.id === customer.ownerUserId)?.displayName || '未知用户',
      ownerOrgUnitName: database.value.units.find(unit => unit.id === customer.ownerOrgUnitId)?.name || '未知组织'
    })).sort((a, b) => a.name.localeCompare(b.name))
  }

  function subjectView(type: string, subjectId: string) {
    if (type === 'role') {
      const role = database.value.roles.find(item => item.id === subjectId)
      if (!role) throw new Error('角色不存在')
      const grants = role.permissionIds.map(permission).filter(Boolean)
      return { type, subject: { ...role, permissionIds: undefined }, permissionIds: [...role.permissionIds], grants }
    }
    if (type === 'user') {
      const user = database.value.users.find(item => item.id === subjectId)
      if (!user) throw new Error('用户不存在')
      const directGrants = user.directGrants.map(grant => ({ ...permission(grant.permissionId), ...grant, grantId: grant.id, id: grant.permissionId }))
      return {
        type,
        subject: { id: user.id, username: user.username, displayName: user.displayName, employeeNo: user.employeeNo, status: user.status },
        roleIds: [...user.roleIds],
        roles: user.roleIds.map(roleId => database.value.roles.find(role => role.id === roleId)).filter(Boolean),
        permissionIds: directGrants.map(item => item.id),
        directGrants,
        effective: effective(user.id)
      }
    }
    throw new Error('主体类型仅支持 user 或 role')
  }

  function bootstrapView() {
    return {
      counts: {
        users: database.value.users.filter(item => item.status === 'ACTIVE').length,
        roles: database.value.roles.filter(item => item.status === 'ACTIVE').length,
        resources: database.value.resources.length,
        menus: database.value.menus.filter(item => item.nodeType === 'MENU').length,
        orgUnits: database.value.units.length,
        positions: database.value.positions.length,
        directGrants: database.value.users.reduce((total, user) => total + user.directGrants.length, 0)
      },
      versions: { policy_version: database.value.policyVersion, catalog_version: database.value.catalogVersion },
      actor: effective('u_admin'),
      recentAudit: clone(database.value.audits.slice(0, 6))
    }
  }

  async function mockFetch<T = unknown>(input: string, options: MockFetchOptions = {}): Promise<T> {
    const request = new URL(input, 'https://permission-demo.local')
    const path = request.pathname
    const method = (options.method || 'GET').toUpperCase()
    const body = clone((options.body || {}) as Record<string, any>)
    let result: unknown

    if (method === 'GET' && path === '/api/bootstrap') result = bootstrapView()
    else if (method === 'GET' && path === '/api/users') result = usersView()
    else if (method === 'GET' && path === '/api/roles') result = rolesView()
    else if (method === 'GET' && path === '/api/catalog') result = catalogView()
    else if (method === 'GET' && path === '/api/org') result = orgView()
    else if (method === 'GET' && path === '/api/audit') result = clone(database.value.audits)
    else if (method === 'GET' && path.startsWith('/api/effective/')) result = effective(decodeURIComponent(path.split('/').pop() || ''))
    else if (method === 'GET' && path.startsWith('/api/subjects/')) {
      const [, , , type, subjectId] = path.split('/')
      result = subjectView(type || '', decodeURIComponent(subjectId || ''))
    }
    else if (method === 'GET' && path === '/api/demo/customers') {
      const userId = request.searchParams.get('userId') || 'u_admin'
      const context = effective(userId)
      const canRead = context.permissions.some(item => item.code === 'crm.customer.read')
      const rows = customerRows()
      if (!canRead) result = { allowed: false, reason: '缺少 crm.customer.read', rows: [], totalBeforeFilter: rows.length }
      else {
        const access = resolveDataAccess(userId, 'crm.customer')
        result = { allowed: true, dataAccess: access, rows: rows.filter(row => canAccessOwnedRow(access, row, userId)), totalBeforeFilter: rows.length }
      }
    }
    else if (method === 'POST' && path === '/api/users') {
      const userId = id('u')
      const displayName = ensureText(body.displayName, `演示用户 ${database.value.users.length + 1}`)
      database.value.users.push({
        id: userId,
        username: ensureText(body.username, `demo.${database.value.users.length + 1}`),
        employeeNo: ensureText(body.employeeNo, `DEMO${String(database.value.users.length + 1).padStart(4, '0')}`),
        displayName,
        status: body.status === 'DISABLED' ? 'DISABLED' : 'ACTIVE',
        authzVersion: 1,
        orgUnitId: null,
        positionId: null,
        roleIds: [],
        directGrants: []
      })
      bumpPolicy([userId])
      writeAudit('CREATE_USER', 'USER', userId, `新建用户“${displayName}”`, { assignment: null, grants: [], storage: 'localStorage' })
      persist()
      result = { id: userId }
    }
    else if (method === 'POST' && path === '/api/roles') {
      const roleId = id('r')
      const name = ensureText(body.name, `演示角色 ${database.value.roles.length + 1}`)
      database.value.roles.push({ id: roleId, code: ensureText(body.code, `DEMO_ROLE_${database.value.roles.length + 1}`), name, domain: ensureText(body.domain, '信息板块'), status: body.status === 'DISABLED' ? 'DISABLED' : 'ACTIVE', permissionIds: [] })
      bumpPolicy()
      writeAudit('CREATE_ROLE', 'ROLE', roleId, `新建角色“${name}”`, { code: body.code || null, domain: body.domain || null, storage: 'localStorage' })
      persist()
      result = { id: roleId }
    }
    else if (method === 'POST' && path === '/api/catalog/resources') {
      const resourceId = id('p')
      const name = ensureText(body.name, `演示资源 ${database.value.resources.length + 1}`)
      database.value.resources.push({ id: resourceId, code: ensureText(body.code, `demo.resource.${database.value.resources.length + 1}`), name, domain: ensureText(body.domain, '信息板块'), dataDomainCode: body.dataDomainCode || null, riskLevel: ['LOW', 'MEDIUM', 'HIGH'].includes(body.riskLevel) ? body.riskLevel : 'LOW', status: ['DRAFT', 'ACTIVE'].includes(body.status) ? body.status : 'DRAFT' })
      bumpCatalog()
      writeAudit('CREATE_RESOURCE', 'RESOURCE', resourceId, `新建资源“${name}”`, { code: body.code || null, status: body.status || 'DRAFT', storage: 'localStorage' })
      persist()
      result = { id: resourceId }
    }
    else if (method === 'PUT' && /^\/api\/catalog\/resources\/[^/]+$/.test(path)) {
      const resourceId = decodeURIComponent(path.split('/').pop() || '')
      const target = database.value.resources.find(item => item.id === resourceId)
      if (!target) throw new Error('资源不存在')
      const before = clone(target)
      Object.assign(target, { name: ensureText(body.name, target.name), domain: ensureText(body.domain, target.domain), dataDomainCode: body.dataDomainCode || null, riskLevel: ['LOW', 'MEDIUM', 'HIGH'].includes(body.riskLevel) ? body.riskLevel : target.riskLevel, status: ['DRAFT', 'ACTIVE', 'DISABLED'].includes(body.status) ? body.status : target.status })
      bumpCatalog()
      writeAudit('UPDATE_RESOURCE', 'RESOURCE', resourceId, `编辑资源“${target.name}”`, { reason: body.reason || '静态 Demo 调整', before, after: clone(target) })
      persist()
      result = { id: resourceId }
    }
    else if (method === 'POST' && path === '/api/menus') {
      const menuId = id('m')
      const nodeType = ['BOARD', 'DIRECTORY', 'MENU'].includes(body.nodeType) ? body.nodeType as MockMenu['nodeType'] : 'MENU'
      const name = ensureText(body.name, `演示菜单 ${database.value.menus.length + 1}`)
      const permissionId = nodeType === 'MENU' ? id('p_menu') : null
      database.value.menus.push({ id: menuId, parentId: nodeType === 'BOARD' ? null : body.parentId || null, nodeType, name, code: ensureText(body.code, `MENU_DEMO_${database.value.menus.length + 1}`), permissionId, permissionCode: nodeType === 'MENU' ? ensureText(body.permissionCode, `menu.demo.${database.value.menus.length + 1}`) : null, routePath: nodeType === 'MENU' ? ensureText(body.routePath, `/demo/${database.value.menus.length + 1}`) : null, sortOrder: 100, status: 'ACTIVE' })
      bumpCatalog()
      writeAudit('CREATE_MENU', 'MENU', menuId, `新建${nodeType === 'MENU' ? '页面菜单' : nodeType === 'DIRECTORY' ? '目录' : '板块'}“${name}”`, { ...body, storage: 'localStorage' })
      persist()
      result = { id: menuId, permissionId }
    }
    else if (method === 'PUT' && /^\/api\/menus\/[^/]+\/bindings$/.test(path)) {
      const menuId = decodeURIComponent(path.split('/')[3] || '')
      const menu = database.value.menus.find(item => item.id === menuId)
      if (!menu || menu.nodeType !== 'MENU') throw new Error('页面菜单不存在')
      const previous = clone(database.value.menuBindings.filter(item => item.menuId === menuId))
      const requestedCore = Array.isArray(body.corePermissionIds) ? body.corePermissionIds : []
      const safeCore = requestedCore.filter((permissionId: string) => database.value.resources.find(item => item.id === permissionId)?.riskLevel !== 'HIGH')
      const optional = new Set<string>(Array.isArray(body.optionalPermissionIds) ? body.optionalPermissionIds : [])
      requestedCore.filter((permissionId: string) => !safeCore.includes(permissionId)).forEach((permissionId: string) => optional.add(permissionId))
      database.value.menuBindings = database.value.menuBindings.filter(item => item.menuId !== menuId)
      database.value.menuBindings.push(...safeCore.map((permissionId: string) => ({ menuId, permissionId, bundleLevel: 'CORE' as const, status: 'PUBLISHED' as const })), ...[...optional].map(permissionId => ({ menuId, permissionId, bundleLevel: 'OPTIONAL' as const, status: 'PUBLISHED' as const })))
      bumpCatalog()
      writeAudit('PUBLISH_MENU_PACKAGE', 'MENU', menuId, `发布“${menu.name}”权限包`, { reason: body.reason || '静态 Demo 调整', before: previous, after: { core: safeCore, optional: [...optional] } })
      persist()
      result = { coreCount: safeCore.length, optionalCount: optional.size }
    }
    else if (method === 'POST' && path === '/api/org/units') {
      const unitId = id('o')
      const name = ensureText(body.name, `演示组织 ${database.value.units.length + 1}`)
      database.value.units.push({ id: unitId, parentId: body.parentId || 'o_company', name, unitType: body.unitType === 'GROUP' ? 'GROUP' : 'DEPARTMENT', leaderUserId: body.leaderUserId || null, sortOrder: database.value.units.length * 10, status: 'ACTIVE' })
      bumpPolicy()
      writeAudit('CREATE_ORG_UNIT', 'ORG_UNIT', unitId, `新建组织“${name}”`, { ...body, storage: 'localStorage' })
      persist()
      result = { id: unitId }
    }
    else if (method === 'POST' && path === '/api/org/positions') {
      const positionId = id('pos')
      const name = ensureText(body.name, `演示岗位 ${database.value.positions.length + 1}`)
      database.value.positions.push({ id: positionId, name, orgUnitId: body.orgUnitId || 'o_info', status: 'ACTIVE' })
      const scopes = Array.isArray(body.scopes) ? body.scopes : []
      database.value.scopes.push(...scopes.map((scope: any) => ({ id: id('scope'), positionId, dataDomainCode: scope.dataDomainCode, scopeType: scope.scopeType || 'NONE', includeDescendants: Boolean(scope.includeDescendants), customOrgUnitIds: Array.isArray(scope.customOrgUnitIds) ? scope.customOrgUnitIds : [] })))
      bumpPolicy()
      writeAudit('CREATE_POSITION', 'POSITION', positionId, `新建岗位“${name}”`, { ...body, storage: 'localStorage' })
      persist()
      result = { id: positionId }
    }
    else if (method === 'PUT' && path.startsWith('/api/org/assignments/')) {
      const userId = decodeURIComponent(path.split('/').pop() || '')
      const user = database.value.users.find(item => item.id === userId)
      if (!user) throw new Error('用户不存在')
      const position = database.value.positions.find(item => item.id === body.positionId && item.status === 'ACTIVE')
      if (!position) throw new Error('请选择有效岗位')
      if (position.orgUnitId !== body.orgUnitId) throw new Error('所选岗位不属于当前组织')
      const before = { orgUnitId: user.orgUnitId, positionId: user.positionId }
      user.orgUnitId = position.orgUnitId
      user.positionId = position.id
      bumpPolicy([user.id])
      writeAudit('ASSIGN_POSITION', 'USER', user.id, `设置“${user.displayName}”的组织与岗位`, { reason: body.reason || '组织岗位维护', before, after: { orgUnitId: user.orgUnitId, positionId: user.positionId } })
      persist()
      result = { userId: user.id, orgUnitId: user.orgUnitId, positionId: user.positionId }
    }
    else if (method === 'PUT' && /^\/api\/org\/positions\/[^/]+\/scopes$/.test(path)) {
      const positionId = decodeURIComponent(path.split('/')[4] || '')
      const position = database.value.positions.find(item => item.id === positionId)
      if (!position) throw new Error('岗位不存在')
      const previous = clone(database.value.scopes.filter(item => item.positionId === positionId))
      database.value.scopes = database.value.scopes.filter(item => item.positionId !== positionId)
      const scopes = Array.isArray(body.scopes) ? body.scopes : []
      database.value.scopes.push(...scopes.map((scope: any) => ({ id: id('scope'), positionId, dataDomainCode: scope.dataDomainCode, scopeType: scope.scopeType || 'NONE', includeDescendants: Boolean(scope.includeDescendants), customOrgUnitIds: Array.isArray(scope.customOrgUnitIds) ? scope.customOrgUnitIds : [] })))
      const affectedUsers = database.value.users.filter(user => user.positionId === positionId).map(user => user.id)
      bumpPolicy(affectedUsers)
      writeAudit('UPDATE_POSITION_SCOPES', 'POSITION', positionId, `更新岗位“${position.name}”数据范围`, { reason: body.reason || '静态 Demo 调整', before: previous, after: scopes })
      persist()
      result = { affectedUsers: affectedUsers.length }
    }
    else if (method === 'PUT' && path.startsWith('/api/subjects/')) {
      const [, , , type, subjectIdRaw] = path.split('/')
      const subjectId = decodeURIComponent(subjectIdRaw || '')
      if (type === 'role') {
        const role = database.value.roles.find(item => item.id === subjectId)
        if (!role) throw new Error('角色不存在')
        const before = [...role.permissionIds]
        role.permissionIds = Array.isArray(body.permissionIds) ? [...new Set(body.permissionIds)] : []
        const affectedUsers = database.value.users.filter(user => user.roleIds.includes(role.id)).map(user => user.id)
        bumpPolicy(affectedUsers)
        writeAudit('UPDATE_ROLE_GRANTS', 'ROLE', role.id, `更新角色“${role.name}”授权`, { reason: body.reason || '静态 Demo 调整', before, after: role.permissionIds, affectedUsers: affectedUsers.length })
        persist()
        result = { affectedUsers: affectedUsers.length }
      } else if (type === 'user') {
        const user = database.value.users.find(item => item.id === subjectId)
        if (!user) throw new Error('用户不存在')
        const before = { roles: [...user.roleIds], direct: user.directGrants.map(item => item.permissionId) }
        user.roleIds = Array.isArray(body.roleIds) ? [...new Set(body.roleIds)] : []
        const validTo = body.validTo || null
        user.directGrants = (Array.isArray(body.directPermissionIds) ? [...new Set<string>(body.directPermissionIds)] : []).map(permissionId => ({ id: id('grant'), permissionId, reason: ensureText(body.reason, '静态 Demo 调整'), sourceTicket: body.sourceTicket || null, validFrom: new Date().toISOString(), validTo }))
        bumpPolicy([user.id])
        writeAudit('UPDATE_USER_GRANTS', 'USER', user.id, `更新用户“${user.displayName}”授权`, { reason: body.reason || '静态 Demo 调整', sourceTicket: body.sourceTicket || null, validTo, before, after: { roles: user.roleIds, direct: user.directGrants.map(item => item.permissionId) } })
        persist()
        result = { userId: user.id }
      } else throw new Error('主体类型仅支持 user 或 role')
    }
    else if (method === 'POST' && path === '/api/simulate') {
      const context = effective(body.userId)
      const selectedPermission = context.permissions.find(item => item.code === body.permissionCode) || null
      const dataDomainCode = body.dataDomainCode || selectedPermission?.dataDomainCode || null
      const dataAccess = dataDomainCode ? resolveDataAccess(body.userId, dataDomainCode) : null
      const customer = body.customerId ? customerRows().find(item => item.id === body.customerId) || null : null
      const rowAllowed = customer ? Boolean(dataAccess && canAccessOwnedRow(dataAccess, customer, body.userId)) : null
      result = { allowed: Boolean(selectedPermission) && (rowAllowed ?? true), capabilityAllowed: Boolean(selectedPermission), rowAllowed, permission: selectedPermission, dataAccess, customer }
    }
    else throw new Error(`静态 Mock 尚未实现：${method} ${path}`)

    return clone(result) as T
  }

  return { mockFetch, resetMockData, database }
}
