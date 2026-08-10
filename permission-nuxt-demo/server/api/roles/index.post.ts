import { z } from 'zod'
import { roles } from '../../database/schema'
import { bumpPolicyVersion, writeAudit } from '../../services/audit'
import { requireFunction } from '../../services/policy'
import { useDb } from '../../utils/db'
import { readSchema, rethrowDatabaseError } from '../../utils/validation'

const roleSchema = z.object({
  name: z.string().trim().min(2).max(40),
  code: z.string().trim().regex(/^[A-Z][A-Z0-9_]{2,39}$/),
  domain: z.string().trim().min(2).max(40),
  description: z.string().trim().max(200).default(''),
  status: z.enum(['ACTIVE', 'DISABLED']).default('ACTIVE')
})

export default defineEventHandler(async (event) => {
  const actorUserId = requireFunction(event, 'iam.role.manage')
  const body = await readSchema(event, roleSchema)
  const { db } = useDb()
  const id = crypto.randomUUID()
  const stamp = new Date().toISOString()
  try {
    db.insert(roles).values({ id, ...body, createdAt: stamp, updatedAt: stamp }).run()
  } catch (error) {
    rethrowDatabaseError(error, '角色名称或编码已存在')
  }
  bumpPolicyVersion()
  writeAudit({ actorUserId, action: 'CREATE_ROLE', entityType: 'ROLE', entityId: id, summary: `新建角色“${body.name}”`, detail: { code: body.code, domain: body.domain } })
  setResponseStatus(event, 201)
  return { id }
})
