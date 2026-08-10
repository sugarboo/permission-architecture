import { and, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { orgUnits, positions, roles, userPositions, userRoles, users } from '../../database/schema'
import { bumpPolicyVersion, writeAudit } from '../../services/audit'
import { requireFunction } from '../../services/policy'
import { useDb } from '../../utils/db'
import { readSchema, rethrowDatabaseError } from '../../utils/validation'

const userSchema = z.object({
  displayName: z.string().trim().min(2).max(40),
  username: z.string().trim().regex(/^[a-z][a-z0-9._-]{2,31}$/i, '账号格式不正确'),
  employeeNo: z.string().trim().regex(/^[A-Z0-9_-]{3,24}$/i, '工号格式不正确'),
  email: z.string().trim().email().optional().or(z.literal('')),
  phone: z.string().trim().regex(/^1\d{10}$/).optional().or(z.literal('')),
  orgUnitId: z.string().min(1),
  positionId: z.string().min(1),
  roleIds: z.array(z.string()).default([]),
  status: z.enum(['ACTIVE', 'DISABLED']).default('ACTIVE')
}).refine(data => Boolean(data.email || data.phone), { message: '邮箱和手机号至少填写一项', path: ['email'] })

export default defineEventHandler(async (event) => {
  const actorUserId = requireFunction(event, 'iam.user.manage')
  const body = await readSchema(event, userSchema)
  const { db } = useDb()
  const stamp = new Date().toISOString()
  const id = crypto.randomUUID()

  const org = db.select().from(orgUnits).where(and(eq(orgUnits.id, body.orgUnitId), eq(orgUnits.status, 'ACTIVE'))).get()
  const position = db.select().from(positions).where(and(eq(positions.id, body.positionId), eq(positions.status, 'ACTIVE'))).get()
  if (!org || !position) throw createError({ statusCode: 422, statusMessage: '所选部门或岗位不存在/已停用' })

  try {
    db.transaction((tx) => {
      tx.insert(users).values({
        id,
        username: body.username,
        employeeNo: body.employeeNo.toUpperCase(),
        displayName: body.displayName,
        email: body.email || null,
        phone: body.phone || null,
        status: body.status,
        authzVersion: 1,
        createdAt: stamp,
        updatedAt: stamp
      }).run()
      tx.insert(userPositions).values({
        userId: id,
        positionId: body.positionId,
        orgUnitId: body.orgUnitId,
        isPrimary: true,
        validFrom: stamp,
        validTo: null,
        createdAt: stamp
      }).run()
      if (body.roleIds.length) {
        const activeRoles = tx.select({ id: roles.id }).from(roles).where(and(inArray(roles.id, body.roleIds), eq(roles.status, 'ACTIVE'))).all()
        tx.insert(userRoles).values(activeRoles.map(role => ({ userId: id, roleId: role.id, validFrom: stamp, validTo: null, reason: '新建用户初始角色', createdAt: stamp }))).run()
      }
    })
  } catch (error) {
    rethrowDatabaseError(error, '登录账号或工号已存在')
  }

  bumpPolicyVersion([id])
  writeAudit({ actorUserId, action: 'CREATE_USER', entityType: 'USER', entityId: id, summary: `新建用户“${body.displayName}”`, detail: { roleIds: body.roleIds, orgUnitId: body.orgUnitId, positionId: body.positionId } })
  setResponseStatus(event, 201)
  return { id }
})
