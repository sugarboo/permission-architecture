const baseUrl = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000'
const suffix = Date.now().toString().slice(-8)

type JsonRecord = Record<string, any>

async function request<T = JsonRecord>(path: string, init: RequestInit = {}, expectedStatus?: number): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...init.headers
    }
  })
  const text = await response.text()
  const body = text ? JSON.parse(text) : null
  const expected = expectedStatus ?? (init.method && init.method !== 'GET' ? 201 : 200)

  if (response.status !== expected) {
    throw new Error(`${init.method || 'GET'} ${path}: expected ${expected}, got ${response.status}\n${text}`)
  }
  return body as T
}

function post<T = JsonRecord>(path: string, body: unknown, expectedStatus = 201) {
  return request<T>(path, { method: 'POST', body: JSON.stringify(body) }, expectedStatus)
}

function put<T = JsonRecord>(path: string, body: unknown, expectedStatus = 200) {
  return request<T>(path, { method: 'PUT', body: JSON.stringify(body) }, expectedStatus)
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Contract assertion failed: ${message}`)
}

console.log(`Running write contract against ${baseUrl}`)

const bootstrapBefore = await request<JsonRecord>('/api/bootstrap')
const catalogBefore = await request<JsonRecord>('/api/catalog')
const organizationBefore = await request<JsonRecord>('/api/org')
const rootUnit = organizationBefore.units.find((unit: JsonRecord) => unit.parentId === null)
const highRiskPermission = catalogBefore.functions.find((permission: JsonRecord) => permission.riskLevel === 'HIGH' && permission.status === 'ACTIVE')
assert(rootUnit, 'seed organization must have a root unit')
assert(highRiskPermission, 'seed catalog must contain an active high-risk function')

const functionPermission = await post('/api/catalog/functions', {
  name: `查看测试合同 ${suffix}`,
  code: `qa${suffix}.contract.read`,
  domain: 'qa-contract',
  dataDomainCode: 'crm.customer',
  riskLevel: 'LOW',
  actionType: 'read',
  dataScoped: true,
  isSensitive: false,
  description: 'API contract test function',
  status: 'ACTIVE'
})

const resource = await post('/api/catalog/resources', {
  name: `契约测试合同报表 ${suffix}`,
  code: `report.qa${suffix}.contract_summary`,
  domain: 'qa-contract',
  resourceType: 'REPORT',
  description: 'API contract test business resource',
  status: 'ACTIVE',
  functionPermissionIds: [functionPermission.id]
})

await put(`/api/catalog/functions/${functionPermission.id}`, {
  name: `查看测试合同（已编辑）${suffix}`,
  domain: 'qa-contract',
  dataDomainCode: 'crm.customer',
  riskLevel: 'LOW',
  actionType: 'read',
  dataScoped: true,
  isSensitive: false,
  description: 'edited function through PUT contract',
  status: 'ACTIVE',
  reason: '验证功能编辑、审计与版本更新'
})

await put(`/api/catalog/resources/${resource.id}`, {
  name: `契约测试合同报表（已编辑）${suffix}`,
  domain: 'qa-contract',
  resourceType: 'REPORT',
  description: 'edited non-grantable business resource',
  status: 'ACTIVE',
  functionPermissionIds: [functionPermission.id],
  reason: '验证业务资源编辑与单向功能关联'
})

await put(`/api/catalog/functions/${functionPermission.id}`, {
  name: `查看测试合同（已编辑）${suffix}`,
  domain: 'qa-contract',
  dataDomainCode: 'crm.customer',
  riskLevel: 'LOW',
  actionType: 'update',
  dataScoped: true,
  isSensitive: false,
  description: 'must not change stable action semantics',
  status: 'ACTIVE',
  reason: '验证动作类型创建后不可修改'
}, 422)

await put(`/api/catalog/resources/${resource.id}`, {
  name: `契约测试合同报表（已编辑）${suffix}`,
  domain: 'qa-contract',
  resourceType: 'TEMPLATE',
  description: 'must not change stable resource identity',
  status: 'ACTIVE',
  functionPermissionIds: [functionPermission.id],
  reason: '验证资源类型创建后不可修改'
}, 422)

const board = await post('/api/menus', {
  nodeType: 'BOARD',
  name: `测试板块 ${suffix}`,
  code: `BOARD_QA_${suffix}`,
  parentId: null,
  sortOrder: 900,
  status: 'ACTIVE'
})
const directory = await post('/api/menus', {
  nodeType: 'DIRECTORY',
  name: `合同目录 ${suffix}`,
  code: `DIR_QA_${suffix}`,
  parentId: board.id,
  sortOrder: 10,
  status: 'ACTIVE'
})
const menu = await post('/api/menus', {
  nodeType: 'MENU',
  name: `合同列表 ${suffix}`,
  code: `MENU_QA_${suffix}`,
  parentId: directory.id,
  permissionCode: `menu.qa${suffix}.contract.list`,
  routePath: `/qa/${suffix}/contracts`,
  componentKey: `qa-contract-${suffix}`,
  sortOrder: 10,
  status: 'ACTIVE'
})

await put(`/api/menus/${menu.id}/bindings`, {
  corePermissionIds: [resource.id],
  optionalPermissionIds: [],
  reason: '验证业务资源不能进入菜单权限包'
}, 422)

await put(`/api/menus/${menu.id}/bindings`, {
  corePermissionIds: [highRiskPermission.id],
  optionalPermissionIds: [],
  reason: '验证高风险 CORE 拒绝规则'
}, 422)

await put(`/api/menus/${menu.id}/bindings`, {
  corePermissionIds: [functionPermission.id],
  optionalPermissionIds: [highRiskPermission.id],
  reason: '发布契约测试菜单权限包'
})

const role = await post('/api/roles', {
  name: `契约测试角色 ${suffix}`,
  code: `QA_CONTRACT_${suffix}`,
  domain: 'qa-contract',
  description: 'API contract test role',
  status: 'ACTIVE'
})
await put(`/api/subjects/role/${role.id}`, {
  permissionIds: [menu.permissionId],
  reason: '1'
})

const orgUnit = await post('/api/org/units', {
  name: `契约测试组 ${suffix}`,
  code: `ORG_QA_${suffix}`,
  parentId: rootUnit.id,
  unitType: 'GROUP',
  leaderUserId: null,
  sortOrder: 900,
  status: 'ACTIVE'
})
const position = await post('/api/org/positions', {
  name: `契约测试岗位 ${suffix}`,
  code: `POSITION_QA_${suffix}`,
  orgUnitId: orgUnit.id,
  description: 'API contract test position',
  suggestedRoleId: role.id,
  status: 'ACTIVE',
  scopes: [{ dataDomainCode: 'crm.customer', scopeType: 'SELF', includeDescendants: false, customOrgUnitIds: [] }]
})

const user = await post('/api/users', {
  displayName: `契约测试用户 ${suffix}`,
  username: `qa.${suffix}`,
  employeeNo: `QA${suffix}`,
  email: `qa.${suffix}@example.com`,
  phone: '',
  orgUnitId: orgUnit.id,
  positionId: position.id,
  roleIds: [role.id],
  status: 'ACTIVE'
})

await put(`/api/subjects/user/${user.id}`, {
  roleIds: [role.id],
  directPermissionIds: [highRiskPermission.id],
  reason: '1',
  validTo: null,
  sourceTicket: `QA-${suffix}`
})

await put(`/api/subjects/user/${user.id}`, {
  roleIds: [role.id],
  directPermissionIds: [highRiskPermission.id],
  reason: '验证已填失效时间必须有效',
  validTo: new Date(Date.now() - 60 * 1000).toISOString(),
  sourceTicket: `QA-${suffix}`
}, 422)

const validTo = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
await put(`/api/subjects/user/${user.id}`, {
  roleIds: [role.id],
  directPermissionIds: [highRiskPermission.id],
  reason: '契约测试临时高风险加授',
  validTo,
  sourceTicket: `QA-${suffix}`
})

await put(`/api/org/positions/${position.id}/scopes`, {
  reason: '契约测试岗位范围调整',
  scopes: [{ dataDomainCode: 'crm.customer', scopeType: 'DEPT_AND_DESCENDANTS', includeDescendants: true, customOrgUnitIds: [] }]
})

const effective = await request<JsonRecord>(`/api/effective/${user.id}`)
const inheritedFunction = effective.permissions.find((permission: JsonRecord) => permission.id === functionPermission.id)
const directHighRisk = effective.permissions.find((permission: JsonRecord) => permission.id === highRiskPermission.id)
const customerAccess = effective.dataAccess.find((access: JsonRecord) => access.dataDomainCode === 'crm.customer')
assert(inheritedFunction?.sources.some((source: JsonRecord) => source.sourceType === 'MENU_CORE'), 'menu permission must expand its CORE function')
assert(directHighRisk?.sources.some((source: JsonRecord) => source.sourceType === 'DIRECT'), 'valid high-risk direct grant must be effective')
assert(customerAccess?.orgUnitIds.includes(orgUnit.id), 'department scope must include the position organization')

const deniedSimulation = await post<JsonRecord>('/api/simulate', {
  userId: 'u_alice',
  permissionCode: 'crm.customer.read',
  dataDomainCode: 'crm.customer',
  customerId: 'c_003'
}, 200)
assert(deniedSimulation.capabilityAllowed === true && deniedSimulation.rowAllowed === false && deniedSimulation.allowed === false, 'capability and row scope must be combined with AND')

const usersAfter = await request<JsonRecord[]>('/api/users')
const catalogAfter = await request<JsonRecord>('/api/catalog')
const organizationAfter = await request<JsonRecord>('/api/org')
const auditAfter = await request<JsonRecord[]>('/api/audit')
const bootstrapAfter = await request<JsonRecord>('/api/bootstrap')

assert(usersAfter.some(item => item.id === user.id), 'created user must be returned by the list endpoint')
assert(catalogAfter.functions.some((item: JsonRecord) => item.id === functionPermission.id && item.description === 'edited function through PUT contract'), 'edited function must be returned by the catalog')
assert(catalogAfter.resources.some((item: JsonRecord) => item.id === resource.id && item.description === 'edited non-grantable business resource' && item.functionIds.includes(functionPermission.id)), 'edited business resource and its function mapping must be returned by the catalog')
assert(catalogAfter.menus.some((item: JsonRecord) => item.id === menu.id), 'created menu leaf must be returned by the catalog')
assert(organizationAfter.units.some((item: JsonRecord) => item.id === orgUnit.id), 'created organization unit must be returned by the organization endpoint')
assert(organizationAfter.positions.some((item: JsonRecord) => item.id === position.id), 'created position must be returned by the organization endpoint')
assert(auditAfter.some(item => item.entityId === user.id && item.action === 'CREATE_USER'), 'create flow must write an audit event')
assert(bootstrapAfter.versions.policy_version > bootstrapBefore.versions.policy_version, 'mutations must advance policy_version')
assert(bootstrapAfter.versions.catalog_version > bootstrapBefore.versions.catalog_version, 'catalog mutations must advance catalog_version')

console.log(JSON.stringify({
  created: { resource: resource.id, function: functionPermission.id, menu: menu.id, role: role.id, orgUnit: orgUnit.id, position: position.id, user: user.id },
  checks: ['real create/edit persistence', 'stable code/action/type semantics', 'business resource is not grantable', 'high-risk CORE rejection', 'optional direct expiry and supplied-date validation', 'menu CORE expansion', 'position data scope', 'capability AND row scope', 'audit and versions']
}, null, 2))
