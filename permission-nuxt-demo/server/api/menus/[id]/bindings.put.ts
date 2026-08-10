import { and, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { menuBindings, menus, permissions } from '../../../database/schema'
import { bumpCatalogVersion, writeAudit } from '../../../services/audit'
import { requireFunction } from '../../../services/policy'
import { useDb } from '../../../utils/db'
import { readSchema } from '../../../utils/validation'

const bindingSchema = z.object({
  corePermissionIds: z.array(z.string()).default([]),
  optionalPermissionIds: z.array(z.string()).default([]),
  reason: z.string().trim().min(4).max(240)
})

export default defineEventHandler(async (event) => {
  const actorUserId = requireFunction(event, 'iam.menu.manage')
  const menuId = getRouterParam(event, 'id')!
  const body = await readSchema(event, bindingSchema)
  const { db } = useDb()
  const menu = db.select().from(menus).where(and(eq(menus.id, menuId), eq(menus.nodeType, 'MENU'))).get()
  if (!menu) throw createError({ statusCode: 404, statusMessage: '页面菜单不存在' })

  const allIds = [...new Set([...body.corePermissionIds, ...body.optionalPermissionIds])]
  if (allIds.length !== body.corePermissionIds.length + body.optionalPermissionIds.length) {
    throw createError({ statusCode: 422, statusMessage: '同一权限不能同时设为 CORE 和 OPTIONAL' })
  }

  const selected = allIds.length ? db.select().from(permissions).where(inArray(permissions.id, allIds)).all() : []
  if (selected.length !== allIds.length || selected.some(item => item.type !== 'FUNCTION' || item.status !== 'ACTIVE')) {
    throw createError({ statusCode: 422, statusMessage: '菜单包只能绑定已启用的业务功能' })
  }
  const highRiskCore = selected.filter(item => body.corePermissionIds.includes(item.id) && item.riskLevel === 'HIGH')
  if (highRiskCore.length) {
    throw createError({ statusCode: 422, statusMessage: `高风险权限不能设为 CORE：${highRiskCore.map(item => item.name).join('、')}` })
  }

  const previous = db.select().from(menuBindings).where(eq(menuBindings.menuId, menuId)).all()
  const stamp = new Date().toISOString()
  db.transaction((tx) => {
    tx.delete(menuBindings).where(eq(menuBindings.menuId, menuId)).run()
    if (allIds.length) {
      tx.insert(menuBindings).values([
        ...body.corePermissionIds.map(permissionId => ({ menuId, permissionId, bundleLevel: 'CORE' as const, status: 'PUBLISHED' as const, createdAt: stamp })),
        ...body.optionalPermissionIds.map(permissionId => ({ menuId, permissionId, bundleLevel: 'OPTIONAL' as const, status: 'PUBLISHED' as const, createdAt: stamp }))
      ]).run()
    }
  })

  bumpCatalogVersion()
  writeAudit({ actorUserId, action: 'PUBLISH_MENU_PACKAGE', entityType: 'MENU', entityId: menuId, summary: `发布“${menu.name}”权限包`, detail: { reason: body.reason, before: previous, after: { core: body.corePermissionIds, optional: body.optionalPermissionIds } } })
  return { coreCount: body.corePermissionIds.length, optionalCount: body.optionalPermissionIds.length }
})
