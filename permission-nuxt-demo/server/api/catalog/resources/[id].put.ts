import { and, eq, inArray, ne } from 'drizzle-orm'
import { z } from 'zod'
import { functionResources, permissions, resources } from '../../../database/schema'
import { bumpCatalogVersion, writeAudit } from '../../../services/audit'
import { requireFunction } from '../../../services/policy'
import { useDb } from '../../../utils/db'
import { readSchema } from '../../../utils/validation'

const updateResourceSchema = z.object({
  name: z.string().trim().min(2).max(60),
  domain: z.string().trim().min(2).max(40),
  resourceType: z.enum(['REPORT', 'TEMPLATE']),
  description: z.string().trim().max(240).default(''),
  status: z.enum(['DRAFT', 'ACTIVE', 'DISABLED']),
  functionPermissionIds: z.array(z.string()).default([]),
  reason: z.string().trim().min(4).max(240)
})

export default defineEventHandler(async (event) => {
  const actorUserId = requireFunction(event, 'iam.catalog.manage')
  const id = getRouterParam(event, 'id')!
  const body = await readSchema(event, updateResourceSchema)
  const { db, sqlite } = useDb()
  const beforeResource = db.select().from(resources).where(eq(resources.id, id)).get()
  if (!beforeResource) throw createError({ statusCode: 404, statusMessage: '业务资源不存在' })
  if (body.resourceType !== beforeResource.resourceType) {
    throw createError({ statusCode: 422, statusMessage: '资源类型与稳定资源码共同定义资源身份，创建后不可修改；请新建资源并迁移关联' })
  }
  const beforeMappings = sqlite.prepare(`
    SELECT function_permission_id AS functionPermissionId
    FROM iam_function_business_resource
    WHERE resource_id = ?
    ORDER BY function_permission_id
  `).all(id) as Array<{ functionPermissionId: string }>

  const functionIds = [...new Set(body.functionPermissionIds)]
  const selectedFunctions = functionIds.length
    ? db.select({ id: permissions.id }).from(permissions).where(and(
      inArray(permissions.id, functionIds),
      eq(permissions.type, 'FUNCTION'),
      ne(permissions.status, 'DISABLED')
    )).all()
    : []
  if (selectedFunctions.length !== functionIds.length) {
    throw createError({ statusCode: 422, statusMessage: '关联项包含不存在或已停用的功能' })
  }

  const stamp = new Date().toISOString()
  db.transaction((tx) => {
    tx.update(resources).set({
      name: body.name,
      domain: body.domain,
      description: body.description,
      status: body.status,
      updatedAt: stamp
    }).where(eq(resources.id, id)).run()
    tx.delete(functionResources).where(eq(functionResources.resourceId, id)).run()
    if (functionIds.length) {
      tx.insert(functionResources).values(functionIds.map(functionPermissionId => ({ functionPermissionId, resourceId: id, createdAt: stamp }))).run()
    }
  })

  bumpCatalogVersion()
  writeAudit({
    actorUserId,
    action: 'UPDATE_RESOURCE',
    entityType: 'BUSINESS_RESOURCE',
    entityId: id,
    summary: `编辑业务资源“${body.name}”`,
    detail: {
      reason: body.reason,
      before: { ...beforeResource, functionPermissionIds: beforeMappings.map(item => item.functionPermissionId) },
      after: { code: beforeResource.code, ...body, functionPermissionIds: functionIds }
    }
  })
  return { id, code: beforeResource.code }
})
