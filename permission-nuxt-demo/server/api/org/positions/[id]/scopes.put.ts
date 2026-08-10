import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { positionDataScopes, positions, scopeDepartments, userPositions } from '../../../../database/schema'
import { bumpPolicyVersion, writeAudit } from '../../../../services/audit'
import { requireFunction } from '../../../../services/policy'
import { useDb } from '../../../../utils/db'
import { readSchema } from '../../../../utils/validation'

const bodySchema = z.object({
  reason: z.string().trim().min(4).max(240),
  scopes: z.array(z.object({
    dataDomainCode: z.string().min(1),
    scopeType: z.enum(['NONE', 'SELF', 'DEPT', 'DEPT_AND_DESCENDANTS', 'CUSTOM_DEPTS', 'ALL']),
    includeDescendants: z.boolean().default(false),
    customOrgUnitIds: z.array(z.string()).default([])
  }))
}).superRefine((value, context) => {
  if (value.scopes.some(scope => scope.scopeType === 'CUSTOM_DEPTS' && scope.customOrgUnitIds.length === 0)) context.addIssue({ code: 'custom', message: '指定部门范围不能为空', path: ['scopes'] })
  if (value.scopes.some(scope => scope.scopeType === 'ALL') && value.reason.length < 6) context.addIssue({ code: 'custom', message: 'ALL 范围需要更完整的变更原因', path: ['reason'] })
})

export default defineEventHandler(async (event) => {
  const actorUserId = requireFunction(event, 'iam.org.manage')
  const id = getRouterParam(event, 'id')!
  const body = await readSchema(event, bodySchema)
  const { db } = useDb()
  const position = db.select().from(positions).where(eq(positions.id, id)).get()
  if (!position) throw createError({ statusCode: 404, statusMessage: '岗位不存在' })
  const previous = db.select().from(positionDataScopes).where(eq(positionDataScopes.positionId, id)).all()
  const stamp = new Date().toISOString()

  db.transaction((tx) => {
    tx.delete(positionDataScopes).where(eq(positionDataScopes.positionId, id)).run()
    for (const scope of body.scopes) {
      const scopeId = crypto.randomUUID()
      tx.insert(positionDataScopes).values({ id: scopeId, positionId: id, dataDomainCode: scope.dataDomainCode, scopeType: scope.scopeType, includeDescendants: scope.includeDescendants, createdAt: stamp, updatedAt: stamp }).run()
      if (scope.scopeType === 'CUSTOM_DEPTS') tx.insert(scopeDepartments).values(scope.customOrgUnitIds.map(orgUnitId => ({ scopeId, orgUnitId }))).run()
    }
  })

  const affected = db.select({ userId: userPositions.userId }).from(userPositions).where(eq(userPositions.positionId, id)).all().map(row => row.userId)
  bumpPolicyVersion(affected)
  writeAudit({ actorUserId, action: 'UPDATE_POSITION_SCOPES', entityType: 'POSITION', entityId: id, summary: `更新岗位“${position.name}”数据范围`, detail: { reason: body.reason, before: previous, after: body.scopes } })
  return { affectedUsers: affected.length }
})
