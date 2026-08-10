import { getEffectivePermissionContext } from '../../services/policy'

export default defineEventHandler((event) => {
  return getEffectivePermissionContext(getRouterParam(event, 'id')!)
})
