import { createError } from 'h3'
import type { ZodType } from 'zod'

export async function readSchema<T>(event: Parameters<typeof readBody>[0], schema: ZodType<T>): Promise<T> {
  const result = schema.safeParse(await readBody(event))
  if (!result.success) {
    throw createError({
      statusCode: 422,
      statusMessage: '提交内容校验失败',
      data: result.error.flatten()
    })
  }
  return result.data
}

export function rethrowDatabaseError(error: unknown, uniqueMessage = '编码或名称已存在'): never {
  if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
    throw createError({ statusCode: 409, statusMessage: uniqueMessage })
  }
  throw error
}
