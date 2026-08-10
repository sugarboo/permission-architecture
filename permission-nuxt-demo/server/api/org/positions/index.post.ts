import { z } from 'zod'
import { positionDataScopes, positions, scopeDepartments } from '../../../database/schema'
import { bumpPolicyVersion, writeAudit } from '../../../services/audit'
import { requireFunction } from '../../../services/policy'
import { useDb } from '../../../utils/db'
import { readSchema, rethrowDatabaseError } from '../../../utils/validation'

const scopeSchema = z.object({
  dataDomainCode: z.string().min(1),
  scopeType: z.enum(['NONE', 'SELF', 'DEPT', 'DEPT_AND_DESCENDANTS', 'CUSTOM_DEPTS', 'ALL']),
  includeDescendants: z.boolean().default(false),
  customOrgUnitIds: z.array(z.string()).default([])
}).superRefine((value, context) => {
  if (value.scopeType === 'CUSTOM_DEPTS' && value.customOrgUnitIds.length === 0) context.addIssue({ code: 'custom', message: '指定部门范围不能为空', path: ['customOrgUnitIds'] })
})

const positionSchema = z.object({
  name: z.string().trim().min(2).max(60),
  code: z.string().trim().regex(/^[A-Z][A-Z0-9_]{2,39}$/),
  orgUnitId: z.string().min(1),
  description: z.string().trim().max(240).default(''),
  suggestedRoleId: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'DISABLED']).default('ACTIVE'),
  scopes: z.array(scopeSchema).default([]),
  highRiskReason: z.string().trim().optional()
}).superRefine((value, context) => {
  if (value.scopes.some(scope => scope.scopeType === 'ALL') && (!value.highRiskReason || value.highRiskReason.length < 6)) {
    context.addIssue({ code: 'custom', message: 'ALL 为高风险范围，请填写至少 6 个字的原因', path: ['highRiskReason'] })
  }
})

export default defineEventHandler(async (event) => {
  const actorUserId = requireFunction(event, 'iam.org.manage')
  const body = await readSchema(event, positionSchema)
  const { db } = useDb()
  const id = crypto.randomUUID()
  const stamp = new Date().toISOString()

  try {
    db.transaction((tx) => {
      tx.insert(positions).values({ id, code: body.code, name: body.name, orgUnitId: body.orgUnitId, description: body.description, suggestedRoleId: body.suggestedRoleId || null, status: body.status, createdAt: stamp, updatedAt: stamp }).run()
      for (const scope of body.scopes) {
        const scopeId = crypto.randomUUID()
        tx.insert(positionDataScopes).values({ id: scopeId, positionId: id, dataDomainCode: scope.dataDomainCode, scopeType: scope.scopeType, includeDescendants: scope.includeDescendants, createdAt: stamp, updatedAt: stamp }).run()
        if (scope.scopeType === 'CUSTOM_DEPTS') {
          tx.insert(scopeDepartments).values(scope.customOrgUnitIds.map(orgUnitId => ({ scopeId, orgUnitId }))).run()
        }
      }
    })
  } catch (error) {
    rethrowDatabaseError(error, '岗位编码已存在，或部门/角色/数据域无效')
  }

  bumpPolicyVersion()
  writeAudit({ actorUserId, action: 'CREATE_POSITION', entityType: 'POSITION', entityId: id, summary: `新建岗位“${body.name}”`, detail: { ...body, highRiskReason: body.highRiskReason || null } })
  setResponseStatus(event, 201)
  return { id }
})
