import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex
} from 'drizzle-orm/sqlite-core'

const timestamps = {
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
}

export const policyMeta = sqliteTable('policy_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull()
})

export const users = sqliteTable('iam_user', {
  id: text('id').primaryKey(),
  username: text('username').notNull(),
  employeeNo: text('employee_no').notNull(),
  displayName: text('display_name').notNull(),
  email: text('email'),
  phone: text('phone'),
  status: text('status', { enum: ['ACTIVE', 'DISABLED'] }).notNull().default('ACTIVE'),
  authzVersion: integer('authz_version').notNull().default(1),
  ...timestamps
}, table => [
  uniqueIndex('uq_iam_user_username').on(table.username),
  uniqueIndex('uq_iam_user_employee_no').on(table.employeeNo),
  index('idx_iam_user_status').on(table.status)
])

export const roles = sqliteTable('iam_role', {
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  domain: text('domain').notNull(),
  description: text('description').notNull().default(''),
  status: text('status', { enum: ['ACTIVE', 'DISABLED'] }).notNull().default('ACTIVE'),
  ...timestamps
}, table => [
  uniqueIndex('uq_iam_role_code').on(table.code),
  uniqueIndex('uq_iam_role_name').on(table.name),
  index('idx_iam_role_status').on(table.status)
])

export const permissions = sqliteTable('iam_permission', {
  id: text('id').primaryKey(),
  type: text('type', { enum: ['FUNCTION', 'MENU'] }).notNull(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  domain: text('domain').notNull(),
  dataDomainCode: text('data_domain_code'),
  riskLevel: text('risk_level', { enum: ['LOW', 'MEDIUM', 'HIGH'] }).notNull().default('LOW'),
  status: text('status', { enum: ['DRAFT', 'ACTIVE', 'DISABLED'] }).notNull().default('DRAFT'),
  description: text('description').notNull().default(''),
  ...timestamps
}, table => [
  uniqueIndex('uq_iam_permission_code').on(table.code),
  index('idx_iam_permission_type_status').on(table.type, table.status),
  index('idx_iam_permission_domain').on(table.domain)
])

export const functions = sqliteTable('iam_function', {
  permissionId: text('permission_id').primaryKey().references(() => permissions.id, { onDelete: 'cascade' }),
  actionType: text('action_type').notNull(),
  dataScoped: integer('data_scoped', { mode: 'boolean' }).notNull().default(false),
  isSensitive: integer('is_sensitive', { mode: 'boolean' }).notNull().default(false)
})

export const resources = sqliteTable('iam_business_resource', {
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  domain: text('domain').notNull(),
  resourceType: text('resource_type', { enum: ['REPORT', 'TEMPLATE'] }).notNull(),
  status: text('status', { enum: ['DRAFT', 'ACTIVE', 'DISABLED'] }).notNull().default('DRAFT'),
  description: text('description').notNull().default(''),
  ...timestamps
}, table => [
  uniqueIndex('uq_iam_business_resource_code').on(table.code),
  index('idx_iam_business_resource_type_status').on(table.resourceType, table.status),
  index('idx_iam_business_resource_domain').on(table.domain)
])

export const functionResources = sqliteTable('iam_function_business_resource', {
  functionPermissionId: text('function_permission_id').notNull().references(() => functions.permissionId, { onDelete: 'cascade' }),
  resourceId: text('resource_id').notNull().references(() => resources.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull()
}, table => [
  primaryKey({ columns: [table.functionPermissionId, table.resourceId] }),
  index('idx_iam_function_business_resource_resource').on(table.resourceId)
])

export const menus = sqliteTable('iam_menu', {
  id: text('id').primaryKey(),
  parentId: text('parent_id'),
  nodeType: text('node_type', { enum: ['BOARD', 'DIRECTORY', 'MENU'] }).notNull(),
  name: text('name').notNull(),
  code: text('code').notNull(),
  permissionId: text('permission_id').references(() => permissions.id, { onDelete: 'set null' }),
  routePath: text('route_path'),
  componentKey: text('component_key'),
  icon: text('icon'),
  sortOrder: integer('sort_order').notNull().default(0),
  status: text('status', { enum: ['ACTIVE', 'DISABLED'] }).notNull().default('ACTIVE'),
  ...timestamps
}, table => [
  uniqueIndex('uq_iam_menu_code').on(table.code),
  uniqueIndex('uq_iam_menu_permission').on(table.permissionId),
  index('idx_iam_menu_parent_sort').on(table.parentId, table.sortOrder)
])

export const menuBindings = sqliteTable('iam_menu_binding', {
  menuId: text('menu_id').notNull().references(() => menus.id, { onDelete: 'cascade' }),
  permissionId: text('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
  bundleLevel: text('bundle_level', { enum: ['CORE', 'OPTIONAL'] }).notNull(),
  status: text('status', { enum: ['DRAFT', 'PUBLISHED'] }).notNull().default('PUBLISHED'),
  createdAt: text('created_at').notNull()
}, table => [
  primaryKey({ columns: [table.menuId, table.permissionId] }),
  index('idx_iam_menu_binding_permission').on(table.permissionId)
])

export const rolePermissions = sqliteTable('iam_role_permission', {
  roleId: text('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permissionId: text('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
  reason: text('reason').notNull(),
  createdAt: text('created_at').notNull()
}, table => [
  primaryKey({ columns: [table.roleId, table.permissionId] }),
  index('idx_iam_role_permission_permission').on(table.permissionId)
])

export const userRoles = sqliteTable('iam_user_role', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: text('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  validFrom: text('valid_from'),
  validTo: text('valid_to'),
  reason: text('reason').notNull(),
  createdAt: text('created_at').notNull()
}, table => [
  primaryKey({ columns: [table.userId, table.roleId] }),
  index('idx_iam_user_role_role').on(table.roleId)
])

export const userPermissions = sqliteTable('iam_user_permission', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  permissionId: text('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
  validFrom: text('valid_from'),
  validTo: text('valid_to'),
  reason: text('reason').notNull(),
  sourceTicket: text('source_ticket'),
  createdAt: text('created_at').notNull()
}, table => [
  uniqueIndex('uq_iam_user_permission_window').on(table.userId, table.permissionId, table.validFrom),
  index('idx_iam_user_permission_user_valid').on(table.userId, table.validTo),
  index('idx_iam_user_permission_permission').on(table.permissionId)
])

export const orgUnits = sqliteTable('org_unit', {
  id: text('id').primaryKey(),
  parentId: text('parent_id'),
  code: text('code').notNull(),
  name: text('name').notNull(),
  unitType: text('unit_type', { enum: ['COMPANY', 'DEPARTMENT', 'GROUP'] }).notNull(),
  leaderUserId: text('leader_user_id').references(() => users.id, { onDelete: 'set null' }),
  sortOrder: integer('sort_order').notNull().default(0),
  status: text('status', { enum: ['ACTIVE', 'DISABLED'] }).notNull().default('ACTIVE'),
  ...timestamps
}, table => [
  uniqueIndex('uq_org_unit_code').on(table.code),
  index('idx_org_unit_parent_sort').on(table.parentId, table.sortOrder)
])

export const orgClosures = sqliteTable('org_closure', {
  ancestorId: text('ancestor_id').notNull().references(() => orgUnits.id, { onDelete: 'cascade' }),
  descendantId: text('descendant_id').notNull().references(() => orgUnits.id, { onDelete: 'cascade' }),
  depth: integer('depth').notNull()
}, table => [
  primaryKey({ columns: [table.ancestorId, table.descendantId] }),
  index('idx_org_closure_descendant').on(table.descendantId)
])

export const positions = sqliteTable('org_position', {
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  orgUnitId: text('org_unit_id').notNull().references(() => orgUnits.id, { onDelete: 'restrict' }),
  description: text('description').notNull().default(''),
  suggestedRoleId: text('suggested_role_id').references(() => roles.id, { onDelete: 'set null' }),
  status: text('status', { enum: ['ACTIVE', 'DISABLED'] }).notNull().default('ACTIVE'),
  ...timestamps
}, table => [
  uniqueIndex('uq_org_position_code').on(table.code),
  index('idx_org_position_unit').on(table.orgUnitId)
])

export const userPositions = sqliteTable('org_user_position', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  positionId: text('position_id').notNull().references(() => positions.id, { onDelete: 'cascade' }),
  orgUnitId: text('org_unit_id').notNull().references(() => orgUnits.id, { onDelete: 'restrict' }),
  isPrimary: integer('is_primary', { mode: 'boolean' }).notNull().default(false),
  validFrom: text('valid_from'),
  validTo: text('valid_to'),
  createdAt: text('created_at').notNull()
}, table => [
  primaryKey({ columns: [table.userId, table.positionId, table.orgUnitId] }),
  index('idx_org_user_position_position').on(table.positionId),
  index('idx_org_user_position_unit').on(table.orgUnitId)
])

export const dataDomains = sqliteTable('iam_data_domain', {
  code: text('code').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull().default('')
})

export const positionDataScopes = sqliteTable('iam_position_data_scope', {
  id: text('id').primaryKey(),
  positionId: text('position_id').notNull().references(() => positions.id, { onDelete: 'cascade' }),
  dataDomainCode: text('data_domain_code').notNull().references(() => dataDomains.code, { onDelete: 'cascade' }),
  scopeType: text('scope_type', { enum: ['NONE', 'SELF', 'DEPT', 'DEPT_AND_DESCENDANTS', 'CUSTOM_DEPTS', 'ALL'] }).notNull(),
  includeDescendants: integer('include_descendants', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
}, table => [
  uniqueIndex('uq_position_data_scope_domain').on(table.positionId, table.dataDomainCode),
  index('idx_position_data_scope_domain').on(table.dataDomainCode)
])

export const scopeDepartments = sqliteTable('iam_scope_department', {
  scopeId: text('scope_id').notNull().references(() => positionDataScopes.id, { onDelete: 'cascade' }),
  orgUnitId: text('org_unit_id').notNull().references(() => orgUnits.id, { onDelete: 'cascade' })
}, table => [
  primaryKey({ columns: [table.scopeId, table.orgUnitId] })
])

export const demoCustomers = sqliteTable('demo_customer', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  ownerUserId: text('owner_user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  ownerOrgUnitId: text('owner_org_unit_id').notNull().references(() => orgUnits.id, { onDelete: 'restrict' }),
  status: text('status', { enum: ['ACTIVE', 'FOLLOW_UP', 'WON'] }).notNull(),
  createdAt: text('created_at').notNull()
}, table => [
  index('idx_demo_customer_owner_user').on(table.ownerUserId),
  index('idx_demo_customer_owner_org').on(table.ownerOrgUnitId)
])

export const auditLogs = sqliteTable('iam_audit_log', {
  id: text('id').primaryKey(),
  actorUserId: text('actor_user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  summary: text('summary').notNull(),
  detailJson: text('detail_json').notNull().default('{}'),
  createdAt: text('created_at').notNull()
}, table => [
  index('idx_iam_audit_log_created').on(table.createdAt),
  index('idx_iam_audit_log_entity').on(table.entityType, table.entityId)
])

export const schema = {
  policyMeta,
  users,
  roles,
  permissions,
  functions,
  resources,
  functionResources,
  menus,
  menuBindings,
  rolePermissions,
  userRoles,
  userPermissions,
  orgUnits,
  orgClosures,
  positions,
  userPositions,
  dataDomains,
  positionDataScopes,
  scopeDepartments,
  demoCustomers,
  auditLogs
}
