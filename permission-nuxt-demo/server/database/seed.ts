import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type Database from 'better-sqlite3'
import {
  auditLogs,
  dataDomains,
  demoCustomers,
  functions,
  functionResources,
  menuBindings,
  menus,
  orgClosures,
  orgUnits,
  permissions,
  policyMeta,
  positionDataScopes,
  positions,
  resources,
  rolePermissions,
  roles,
  userPermissions,
  userPositions,
  userRoles,
  users
} from './schema'

type Db = BetterSQLite3Database<Record<string, never>>

const now = () => new Date().toISOString()

const functionSeeds = [
  ['p_iam_user_manage', 'iam.user.manage', '管理用户', '权限中心', null, 'MEDIUM', 'manage', false, true, '新建、编辑、停用用户与任职'],
  ['p_iam_role_manage', 'iam.role.manage', '管理角色', '权限中心', null, 'HIGH', 'manage', false, true, '维护角色模板及角色授权'],
  ['p_iam_catalog_manage', 'iam.catalog.manage', '管理权限目录', '权限中心', null, 'HIGH', 'manage', false, true, '维护功能目录与业务资源'],
  ['p_iam_menu_manage', 'iam.menu.manage', '管理菜单权限包', '权限中心', null, 'HIGH', 'manage', false, true, '维护菜单与 CORE / OPTIONAL 绑定'],
  ['p_iam_org_manage', 'iam.org.manage', '管理组织岗位', '权限中心', null, 'HIGH', 'manage', false, true, '维护部门、岗位及数据策略'],
  ['p_iam_audit_read', 'iam.audit.read', '查看授权审计', '权限中心', null, 'LOW', 'read', false, false, '查询权限变更审计'],
  ['p_crm_read', 'crm.customer.read', '查看客户', '信息板块', 'crm.customer', 'LOW', 'read', true, false, '查看客户列表和详情'],
  ['p_crm_create', 'crm.customer.create', '新建客户', '信息板块', 'crm.customer', 'MEDIUM', 'create', true, false, '创建客户并校验归属部门'],
  ['p_crm_update', 'crm.customer.update', '编辑客户', '信息板块', 'crm.customer', 'MEDIUM', 'update', true, false, '编辑可见范围内客户'],
  ['p_crm_export', 'crm.customer.export', '导出客户', '信息板块', 'crm.customer', 'HIGH', 'export', true, true, '导出仍复用客户数据范围'],
  ['p_crm_delete', 'crm.customer.delete', '删除客户', '信息板块', 'crm.customer', 'HIGH', 'delete', true, true, '删除可见范围内客户'],
  ['p_sc_read', 'sc.purchase_order.read', '查看采购单', '供应链板块', 'sc.purchase_order', 'LOW', 'read', true, false, '查看采购订单'],
  ['p_sc_create', 'sc.purchase_order.create', '新建采购单', '供应链板块', 'sc.purchase_order', 'MEDIUM', 'create', true, false, '创建采购订单'],
  ['p_sc_approve', 'sc.purchase_order.approve', '审批采购单', '供应链板块', 'sc.purchase_order', 'HIGH', 'approve', true, true, '审批采购订单'],
  ['p_design_read', 'designer.asset.read', '查看设计任务', '设计师板块', 'designer.asset', 'LOW', 'read', true, false, '查看设计任务和素材'],
  ['p_design_submit', 'designer.asset.submit', '提交设计稿', '设计师板块', 'designer.asset', 'MEDIUM', 'submit', true, false, '提交设计稿'],
  ['p_design_review', 'designer.asset.review', '评审设计稿', '设计师板块', 'designer.asset', 'HIGH', 'review', true, true, '评审设计稿']
] as const

const resourceSeeds = [
  ['br_customer_overview', 'report.crm.customer_overview', '客户经营概览', '信息板块', 'REPORT', 'ACTIVE', '面向销售管理的客户经营汇总报表'],
  ['br_purchase_order', 'template.sc.purchase_order', '采购订单标准模板', '供应链板块', 'TEMPLATE', 'ACTIVE', '采购订单打印与导出的标准模板'],
  ['br_design_progress', 'report.designer.delivery_progress', '设计交付进度', '设计师板块', 'REPORT', 'ACTIVE', '设计任务与交付进度汇总报表']
] as const

const functionResourceSeeds = [
  ['p_crm_read', 'br_customer_overview'],
  ['p_crm_export', 'br_customer_overview'],
  ['p_sc_read', 'br_purchase_order'],
  ['p_design_read', 'br_design_progress']
] as const

const menuPermissionSeeds = [
  ['p_menu_customer', 'menu.info.customer.list', '客户列表菜单', '信息板块'],
  ['p_menu_purchase', 'menu.supply.purchase.list', '采购订单菜单', '供应链板块'],
  ['p_menu_design', 'menu.designer.task.list', '设计任务菜单', '设计师板块']
] as const

export function seedDatabase(db: Db, sqlite: Database.Database) {
  const existing = sqlite.prepare('SELECT COUNT(*) AS count FROM iam_user').get() as { count: number }
  const stamp = now()

  if (existing.count > 0) {
    const ensureBusinessResources = sqlite.transaction(() => {
      const insertResource = sqlite.prepare(`
        INSERT OR IGNORE INTO iam_business_resource
          (id, code, name, domain, resource_type, status, description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      for (const [id, code, name, domain, resourceType, status, description] of resourceSeeds) {
        insertResource.run(id, code, name, domain, resourceType, status, description, stamp, stamp)
      }
      const insertMapping = sqlite.prepare(`
        INSERT OR IGNORE INTO iam_function_business_resource
          (function_permission_id, resource_id, created_at)
        VALUES (?, ?, ?)
      `)
      for (const [functionPermissionId, resourceId] of functionResourceSeeds) {
        insertMapping.run(functionPermissionId, resourceId, stamp)
      }
    })
    ensureBusinessResources()
    sqlite.pragma('optimize')
    return
  }

  db.transaction((tx) => {
    tx.insert(policyMeta).values([
      { key: 'policy_version', value: '7', updatedAt: stamp },
      { key: 'catalog_version', value: '3', updatedAt: stamp }
    ]).run()

    tx.insert(dataDomains).values([
      { code: 'crm.customer', name: '客户', description: '客户负责人及归属部门范围' },
      { code: 'crm.contract', name: '合同', description: '合同负责人及归属部门范围' },
      { code: 'sc.purchase_order', name: '采购订单', description: '采购订单归属部门范围' },
      { code: 'designer.asset', name: '设计稿', description: '设计任务负责人及团队范围' }
    ]).run()

    tx.insert(users).values([
      { id: 'u_admin', username: 'admin', employeeNo: 'EMP0001', displayName: '周睿', email: 'admin@example.com', phone: '13800000001', status: 'ACTIVE', authzVersion: 7, createdAt: stamp, updatedAt: stamp },
      { id: 'u_alice', username: 'lin.yue', employeeNo: 'EMP0108', displayName: '林悦', email: 'lin.yue@example.com', phone: '13800000108', status: 'ACTIVE', authzVersion: 4, createdAt: stamp, updatedAt: stamp },
      { id: 'u_bob', username: 'chen.feng', employeeNo: 'EMP0066', displayName: '陈峰', email: 'chen.feng@example.com', phone: '13800000066', status: 'ACTIVE', authzVersion: 6, createdAt: stamp, updatedAt: stamp },
      { id: 'u_carol', username: 'wang.qi', employeeNo: 'EMP0216', displayName: '王琪', email: 'wang.qi@example.com', phone: '13800000216', status: 'ACTIVE', authzVersion: 3, createdAt: stamp, updatedAt: stamp },
      { id: 'u_diana', username: 'zhao.ning', employeeNo: 'EMP0312', displayName: '赵宁', email: 'zhao.ning@example.com', phone: '13800000312', status: 'ACTIVE', authzVersion: 5, createdAt: stamp, updatedAt: stamp }
    ]).run()

    tx.insert(roles).values([
      { id: 'r_admin', code: 'SUPER_ADMIN', name: '系统权限管理员', domain: '权限中心', description: '仅用于演示的权限中心管理员角色', status: 'ACTIVE', createdAt: stamp, updatedAt: stamp },
      { id: 'r_sales_rep', code: 'SALES_REP', name: '销售专员', domain: '信息板块', description: '客户日常维护模板，不携带数据范围', status: 'ACTIVE', createdAt: stamp, updatedAt: stamp },
      { id: 'r_sales_manager', code: 'SALES_MANAGER', name: '销售主管', domain: '信息板块', description: '销售主管功能模板；上下级数据来自岗位', status: 'ACTIVE', createdAt: stamp, updatedAt: stamp },
      { id: 'r_purchase', code: 'PURCHASE_SPECIALIST', name: '采购专员', domain: '供应链板块', description: '采购订单查看与创建', status: 'ACTIVE', createdAt: stamp, updatedAt: stamp },
      { id: 'r_designer', code: 'DESIGNER', name: '设计师', domain: '设计师板块', description: '设计任务查看与稿件提交', status: 'ACTIVE', createdAt: stamp, updatedAt: stamp }
    ]).run()

    tx.insert(permissions).values([
      ...functionSeeds.map(([id, code, name, domain, dataDomainCode, riskLevel, , , , description]) => ({ id, type: 'FUNCTION' as const, code, name, domain, dataDomainCode, riskLevel, status: 'ACTIVE' as const, description, createdAt: stamp, updatedAt: stamp })),
      ...menuPermissionSeeds.map(([id, code, name, domain]) => ({ id, type: 'MENU' as const, code, name, domain, dataDomainCode: null, riskLevel: 'LOW' as const, status: 'ACTIVE' as const, description: '页面菜单叶子授权', createdAt: stamp, updatedAt: stamp }))
    ]).run()

    tx.insert(functions).values(functionSeeds.map(([permissionId, , , , , , actionType, dataScoped, isSensitive]) => ({ permissionId, actionType, dataScoped, isSensitive }))).run()
    tx.insert(resources).values(resourceSeeds.map(([id, code, name, domain, resourceType, status, description]) => ({ id, code, name, domain, resourceType, status, description, createdAt: stamp, updatedAt: stamp }))).run()
    tx.insert(functionResources).values(functionResourceSeeds.map(([functionPermissionId, resourceId]) => ({ functionPermissionId, resourceId, createdAt: stamp }))).run()

    tx.insert(menus).values([
      { id: 'm_info', parentId: null, nodeType: 'BOARD', name: '信息板块', code: 'BOARD_INFO', permissionId: null, routePath: null, componentKey: null, icon: 'i-lucide-contact-round', sortOrder: 10, status: 'ACTIVE', createdAt: stamp, updatedAt: stamp },
      { id: 'm_customer_dir', parentId: 'm_info', nodeType: 'DIRECTORY', name: '客户管理', code: 'DIR_INFO_CUSTOMER', permissionId: null, routePath: null, componentKey: null, icon: 'i-lucide-folder-kanban', sortOrder: 10, status: 'ACTIVE', createdAt: stamp, updatedAt: stamp },
      { id: 'm_customer', parentId: 'm_customer_dir', nodeType: 'MENU', name: '客户列表', code: 'MENU_CRM_CUSTOMER_LIST', permissionId: 'p_menu_customer', routePath: '/info/customer/list', componentKey: 'crm-customer-list', icon: 'i-lucide-users-round', sortOrder: 10, status: 'ACTIVE', createdAt: stamp, updatedAt: stamp },
      { id: 'm_supply', parentId: null, nodeType: 'BOARD', name: '供应链板块', code: 'BOARD_SUPPLY', permissionId: null, routePath: null, componentKey: null, icon: 'i-lucide-truck', sortOrder: 20, status: 'ACTIVE', createdAt: stamp, updatedAt: stamp },
      { id: 'm_purchase_dir', parentId: 'm_supply', nodeType: 'DIRECTORY', name: '采购管理', code: 'DIR_SUPPLY_PURCHASE', permissionId: null, routePath: null, componentKey: null, icon: 'i-lucide-folder-kanban', sortOrder: 10, status: 'ACTIVE', createdAt: stamp, updatedAt: stamp },
      { id: 'm_purchase', parentId: 'm_purchase_dir', nodeType: 'MENU', name: '采购订单', code: 'MENU_SC_PURCHASE_LIST', permissionId: 'p_menu_purchase', routePath: '/supply/purchase/list', componentKey: 'sc-purchase-list', icon: 'i-lucide-clipboard-list', sortOrder: 10, status: 'ACTIVE', createdAt: stamp, updatedAt: stamp },
      { id: 'm_design', parentId: null, nodeType: 'BOARD', name: '设计师板块', code: 'BOARD_DESIGNER', permissionId: null, routePath: null, componentKey: null, icon: 'i-lucide-palette', sortOrder: 30, status: 'ACTIVE', createdAt: stamp, updatedAt: stamp },
      { id: 'm_design_dir', parentId: 'm_design', nodeType: 'DIRECTORY', name: '项目协作', code: 'DIR_DESIGN_PROJECT', permissionId: null, routePath: null, componentKey: null, icon: 'i-lucide-folder-kanban', sortOrder: 10, status: 'ACTIVE', createdAt: stamp, updatedAt: stamp },
      { id: 'm_design_tasks', parentId: 'm_design_dir', nodeType: 'MENU', name: '设计任务', code: 'MENU_DESIGN_TASK_LIST', permissionId: 'p_menu_design', routePath: '/designer/tasks', componentKey: 'designer-task-list', icon: 'i-lucide-panels-top-left', sortOrder: 10, status: 'ACTIVE', createdAt: stamp, updatedAt: stamp }
    ]).run()

    tx.insert(menuBindings).values([
      { menuId: 'm_customer', permissionId: 'p_crm_read', bundleLevel: 'CORE', status: 'PUBLISHED', createdAt: stamp },
      { menuId: 'm_customer', permissionId: 'p_crm_create', bundleLevel: 'OPTIONAL', status: 'PUBLISHED', createdAt: stamp },
      { menuId: 'm_customer', permissionId: 'p_crm_update', bundleLevel: 'OPTIONAL', status: 'PUBLISHED', createdAt: stamp },
      { menuId: 'm_customer', permissionId: 'p_crm_export', bundleLevel: 'OPTIONAL', status: 'PUBLISHED', createdAt: stamp },
      { menuId: 'm_customer', permissionId: 'p_crm_delete', bundleLevel: 'OPTIONAL', status: 'PUBLISHED', createdAt: stamp },
      { menuId: 'm_purchase', permissionId: 'p_sc_read', bundleLevel: 'CORE', status: 'PUBLISHED', createdAt: stamp },
      { menuId: 'm_purchase', permissionId: 'p_sc_create', bundleLevel: 'OPTIONAL', status: 'PUBLISHED', createdAt: stamp },
      { menuId: 'm_purchase', permissionId: 'p_sc_approve', bundleLevel: 'OPTIONAL', status: 'PUBLISHED', createdAt: stamp },
      { menuId: 'm_design_tasks', permissionId: 'p_design_read', bundleLevel: 'CORE', status: 'PUBLISHED', createdAt: stamp },
      { menuId: 'm_design_tasks', permissionId: 'p_design_submit', bundleLevel: 'OPTIONAL', status: 'PUBLISHED', createdAt: stamp },
      { menuId: 'm_design_tasks', permissionId: 'p_design_review', bundleLevel: 'OPTIONAL', status: 'PUBLISHED', createdAt: stamp }
    ]).run()

    tx.insert(orgUnits).values([
      { id: 'o_company', parentId: null, code: 'ORG_ROOT', name: '示例科技有限公司', unitType: 'COMPANY', leaderUserId: 'u_admin', sortOrder: 1, status: 'ACTIVE', createdAt: stamp, updatedAt: stamp },
      { id: 'o_info', parentId: 'o_company', code: 'ORG_INFO', name: '客户成功部', unitType: 'DEPARTMENT', leaderUserId: 'u_bob', sortOrder: 10, status: 'ACTIVE', createdAt: stamp, updatedAt: stamp },
      { id: 'o_east', parentId: 'o_info', code: 'ORG_INFO_EAST', name: '华东客户组', unitType: 'GROUP', leaderUserId: 'u_bob', sortOrder: 10, status: 'ACTIVE', createdAt: stamp, updatedAt: stamp },
      { id: 'o_south', parentId: 'o_info', code: 'ORG_INFO_SOUTH', name: '华南客户组', unitType: 'GROUP', leaderUserId: null, sortOrder: 20, status: 'ACTIVE', createdAt: stamp, updatedAt: stamp },
      { id: 'o_supply', parentId: 'o_company', code: 'ORG_SUPPLY', name: '供应链中心', unitType: 'DEPARTMENT', leaderUserId: 'u_carol', sortOrder: 20, status: 'ACTIVE', createdAt: stamp, updatedAt: stamp },
      { id: 'o_design', parentId: 'o_company', code: 'ORG_DESIGN', name: '设计中心', unitType: 'DEPARTMENT', leaderUserId: 'u_diana', sortOrder: 30, status: 'ACTIVE', createdAt: stamp, updatedAt: stamp }
    ]).run()

    const closureRows = [
      ['o_company', 'o_company', 0], ['o_info', 'o_info', 0], ['o_east', 'o_east', 0], ['o_south', 'o_south', 0], ['o_supply', 'o_supply', 0], ['o_design', 'o_design', 0],
      ['o_company', 'o_info', 1], ['o_company', 'o_east', 2], ['o_company', 'o_south', 2], ['o_company', 'o_supply', 1], ['o_company', 'o_design', 1],
      ['o_info', 'o_east', 1], ['o_info', 'o_south', 1]
    ] as const
    tx.insert(orgClosures).values(closureRows.map(([ancestorId, descendantId, depth]) => ({ ancestorId, descendantId, depth }))).run()

    tx.insert(positions).values([
      { id: 'pos_admin', code: 'POSITION_IAM_ADMIN', name: '权限管理员', orgUnitId: 'o_company', description: '权限中心日常管理', suggestedRoleId: 'r_admin', status: 'ACTIVE', createdAt: stamp, updatedAt: stamp },
      { id: 'pos_sales_rep', code: 'POSITION_SALES_REP', name: '销售专员', orgUnitId: 'o_east', description: '负责本人名下客户', suggestedRoleId: 'r_sales_rep', status: 'ACTIVE', createdAt: stamp, updatedAt: stamp },
      { id: 'pos_sales_manager', code: 'POSITION_SALES_MANAGER', name: '销售主管', orgUnitId: 'o_info', description: '管理本部门及下级客户组', suggestedRoleId: 'r_sales_manager', status: 'ACTIVE', createdAt: stamp, updatedAt: stamp },
      { id: 'pos_purchase', code: 'POSITION_PURCHASE', name: '采购专员', orgUnitId: 'o_supply', description: '负责供应链中心采购订单', suggestedRoleId: 'r_purchase', status: 'ACTIVE', createdAt: stamp, updatedAt: stamp },
      { id: 'pos_designer', code: 'POSITION_DESIGNER', name: '设计师', orgUnitId: 'o_design', description: '负责本人设计任务', suggestedRoleId: 'r_designer', status: 'ACTIVE', createdAt: stamp, updatedAt: stamp }
    ]).run()

    tx.insert(userPositions).values([
      { userId: 'u_admin', positionId: 'pos_admin', orgUnitId: 'o_company', isPrimary: true, validFrom: stamp, validTo: null, createdAt: stamp },
      { userId: 'u_alice', positionId: 'pos_sales_rep', orgUnitId: 'o_east', isPrimary: true, validFrom: stamp, validTo: null, createdAt: stamp },
      { userId: 'u_bob', positionId: 'pos_sales_manager', orgUnitId: 'o_info', isPrimary: true, validFrom: stamp, validTo: null, createdAt: stamp },
      { userId: 'u_carol', positionId: 'pos_purchase', orgUnitId: 'o_supply', isPrimary: true, validFrom: stamp, validTo: null, createdAt: stamp },
      { userId: 'u_diana', positionId: 'pos_designer', orgUnitId: 'o_design', isPrimary: true, validFrom: stamp, validTo: null, createdAt: stamp }
    ]).run()

    tx.insert(positionDataScopes).values([
      { id: 'scope_admin_crm', positionId: 'pos_admin', dataDomainCode: 'crm.customer', scopeType: 'ALL', includeDescendants: true, createdAt: stamp, updatedAt: stamp },
      { id: 'scope_admin_sc', positionId: 'pos_admin', dataDomainCode: 'sc.purchase_order', scopeType: 'ALL', includeDescendants: true, createdAt: stamp, updatedAt: stamp },
      { id: 'scope_admin_design', positionId: 'pos_admin', dataDomainCode: 'designer.asset', scopeType: 'ALL', includeDescendants: true, createdAt: stamp, updatedAt: stamp },
      { id: 'scope_sales_rep_crm', positionId: 'pos_sales_rep', dataDomainCode: 'crm.customer', scopeType: 'SELF', includeDescendants: false, createdAt: stamp, updatedAt: stamp },
      { id: 'scope_sales_manager_crm', positionId: 'pos_sales_manager', dataDomainCode: 'crm.customer', scopeType: 'DEPT_AND_DESCENDANTS', includeDescendants: true, createdAt: stamp, updatedAt: stamp },
      { id: 'scope_purchase_sc', positionId: 'pos_purchase', dataDomainCode: 'sc.purchase_order', scopeType: 'DEPT', includeDescendants: false, createdAt: stamp, updatedAt: stamp },
      { id: 'scope_designer_asset', positionId: 'pos_designer', dataDomainCode: 'designer.asset', scopeType: 'SELF', includeDescendants: false, createdAt: stamp, updatedAt: stamp }
    ]).run()

    const allPermissionIds = [...functionSeeds, ...menuPermissionSeeds].map(item => item[0])
    tx.insert(rolePermissions).values([
      ...allPermissionIds.map(permissionId => ({ roleId: 'r_admin', permissionId, reason: '系统权限管理员基线', createdAt: stamp })),
      ...['p_menu_customer', 'p_crm_create', 'p_crm_update'].map(permissionId => ({ roleId: 'r_sales_rep', permissionId, reason: '销售专员角色模板', createdAt: stamp })),
      ...['p_menu_customer', 'p_crm_create', 'p_crm_update', 'p_crm_export'].map(permissionId => ({ roleId: 'r_sales_manager', permissionId, reason: '销售主管角色模板', createdAt: stamp })),
      ...['p_menu_purchase', 'p_sc_create'].map(permissionId => ({ roleId: 'r_purchase', permissionId, reason: '采购专员角色模板', createdAt: stamp })),
      ...['p_menu_design', 'p_design_submit'].map(permissionId => ({ roleId: 'r_designer', permissionId, reason: '设计师角色模板', createdAt: stamp }))
    ]).run()

    tx.insert(userRoles).values([
      { userId: 'u_admin', roleId: 'r_admin', validFrom: stamp, validTo: null, reason: '系统初始化', createdAt: stamp },
      { userId: 'u_alice', roleId: 'r_sales_rep', validFrom: stamp, validTo: null, reason: '岗位基线角色', createdAt: stamp },
      { userId: 'u_bob', roleId: 'r_sales_manager', validFrom: stamp, validTo: null, reason: '岗位基线角色', createdAt: stamp },
      { userId: 'u_carol', roleId: 'r_purchase', validFrom: stamp, validTo: null, reason: '岗位基线角色', createdAt: stamp },
      { userId: 'u_diana', roleId: 'r_designer', validFrom: stamp, validTo: null, reason: '岗位基线角色', createdAt: stamp }
    ]).run()

    tx.insert(userPermissions).values([
      { id: 'up_bob_delete', userId: 'u_bob', permissionId: 'p_crm_delete', validFrom: stamp, validTo: '2026-12-31T23:59:59.000Z', reason: '季度客户清理专项', sourceTicket: 'AUTH-2026-018', createdAt: stamp },
      { id: 'up_diana_review', userId: 'u_diana', permissionId: 'p_design_review', validFrom: stamp, validTo: '2026-10-31T23:59:59.000Z', reason: '临时代行设计评审', sourceTicket: 'AUTH-2026-021', createdAt: stamp }
    ]).run()

    tx.insert(demoCustomers).values([
      { id: 'c_001', name: '云帆零售', ownerUserId: 'u_alice', ownerOrgUnitId: 'o_east', status: 'FOLLOW_UP', createdAt: stamp },
      { id: 'c_002', name: '盛景智能', ownerUserId: 'u_alice', ownerOrgUnitId: 'o_east', status: 'ACTIVE', createdAt: stamp },
      { id: 'c_003', name: '南岸文创', ownerUserId: 'u_bob', ownerOrgUnitId: 'o_south', status: 'WON', createdAt: stamp },
      { id: 'c_004', name: '启明供应链', ownerUserId: 'u_bob', ownerOrgUnitId: 'o_info', status: 'ACTIVE', createdAt: stamp },
      { id: 'c_005', name: '远岚设计', ownerUserId: 'u_diana', ownerOrgUnitId: 'o_design', status: 'FOLLOW_UP', createdAt: stamp }
    ]).run()

    tx.insert(auditLogs).values([
      { id: 'audit_001', actorUserId: 'u_admin', action: 'SYSTEM_SEED', entityType: 'SYSTEM', entityId: 'permission-center', summary: '初始化权限中心演示数据', detailJson: JSON.stringify({ policyVersion: 7 }), createdAt: stamp },
      { id: 'audit_002', actorUserId: 'u_admin', action: 'DIRECT_GRANT', entityType: 'USER', entityId: 'u_bob', summary: '向陈峰临时加授“删除客户”', detailJson: JSON.stringify({ permissionCode: 'crm.customer.delete', validTo: '2026-12-31T23:59:59.000Z' }), createdAt: stamp }
    ]).run()
  })

  sqlite.pragma('optimize')
}
