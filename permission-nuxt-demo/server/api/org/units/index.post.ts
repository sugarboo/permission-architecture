import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { orgClosures, orgUnits } from '../../../database/schema'
import { bumpPolicyVersion, writeAudit } from '../../../services/audit'
import { requireFunction } from '../../../services/policy'
import { useDb } from '../../../utils/db'
import { readSchema, rethrowDatabaseError } from '../../../utils/validation'

const unitSchema = z.object({
  name: z.string().trim().min(2).max(60),
  code: z.string().trim().regex(/^[A-Z][A-Z0-9_]{2,39}$/),
  parentId: z.string().min(1),
  unitType: z.enum(['DEPARTMENT', 'GROUP']),
  leaderUserId: z.string().optional().nullable(),
  sortOrder: z.number().int().min(0).max(9999).default(100),
  status: z.enum(['ACTIVE', 'DISABLED']).default('ACTIVE')
})

export default defineEventHandler(async (event) => {
  const actorUserId = requireFunction(event, 'iam.org.manage')
  const body = await readSchema(event, unitSchema)
  const { db } = useDb()
  const parent = db.select().from(orgUnits).where(eq(orgUnits.id, body.parentId)).get()
  if (!parent || parent.status !== 'ACTIVE') throw createError({ statusCode: 422, statusMessage: '上级组织不存在或已停用' })
  if (parent.unitType === 'GROUP') throw createError({ statusCode: 422, statusMessage: '小组下不能继续创建下级组织' })

  const id = crypto.randomUUID()
  const stamp = new Date().toISOString()
  const ancestors = db.select().from(orgClosures).where(eq(orgClosures.descendantId, body.parentId)).all()

  try {
    db.transaction((tx) => {
      tx.insert(orgUnits).values({ id, parentId: body.parentId, code: body.code, name: body.name, unitType: body.unitType, leaderUserId: body.leaderUserId || null, sortOrder: body.sortOrder, status: body.status, createdAt: stamp, updatedAt: stamp }).run()
      tx.insert(orgClosures).values([
        { ancestorId: id, descendantId: id, depth: 0 },
        ...ancestors.map(row => ({ ancestorId: row.ancestorId, descendantId: id, depth: row.depth + 1 }))
      ]).run()
    })
  } catch (error) {
    rethrowDatabaseError(error, '组织编码已存在，或负责人无效')
  }

  bumpPolicyVersion()
  writeAudit({ actorUserId, action: 'CREATE_ORG_UNIT', entityType: 'ORG_UNIT', entityId: id, summary: `在“${parent.name}”下新建“${body.name}”`, detail: body })
  setResponseStatus(event, 201)
  return { id }
})
