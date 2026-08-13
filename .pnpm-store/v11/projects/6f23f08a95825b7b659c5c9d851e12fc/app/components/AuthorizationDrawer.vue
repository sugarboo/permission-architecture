<script setup lang="ts">
import type { PermissionTreeNode } from '~/types/permission'
import { resolveMenuPackageReflection } from '~/utils/menu-package-reflection'
import { resolveRoleGrantReflection } from '~/utils/role-grant-reflection'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{
  subjectType: 'user' | 'role'
  subjectId: string
  subjectName: string
}>()
const emit = defineEmits<{ saved: [] }>()

const { showError, showSuccess } = useAppApi()
const { mockFetch } = useMockApi()
const loading = ref(false)
const saving = ref(false)
const catalog = ref<any>(null)
const subject = ref<any>(null)
const roles = ref<any[]>([])
const selectedPermissionIds = ref<string[]>([])
const selectedRoleIds = ref<string[]>([])
const initialPermissionIds = ref<string[]>([])
const initialRoleIds = ref<string[]>([])
const activeTab = ref<'menu' | 'resource' | 'effective'>('menu')
const search = ref('')
const reason = ref('')
const sourceTicket = ref('')
const validToLocal = ref('')

const catalogRef = computed(() => catalog.value)
const { menuTree, resourceTree } = usePermissionCatalog(catalogRef)

const roleGrantReflection = computed(() => resolveRoleGrantReflection(
  props.subjectType === 'user' ? roles.value : [],
  selectedRoleIds.value,
  catalog.value?.menus || [],
  catalog.value?.resources || []
))
const roleMenuPermissionIds = computed(() => [...roleGrantReflection.value.menuSources.keys()])
const roleResourcePermissionIds = computed(() => [...roleGrantReflection.value.resourceSources.keys()])
const reflectedMenuPermissionIds = computed(() => [...new Set([
  ...selectedPermissionIds.value,
  ...roleMenuPermissionIds.value
])])

const menuPackageReflection = computed(() => resolveMenuPackageReflection(
  catalog.value?.menus || [],
  catalog.value?.menuBindings || [],
  reflectedMenuPermissionIds.value
))
const selectedMenuCount = computed(() => menuPackageReflection.value.selectedMenuIds.length)
const menuCoreResourceIds = computed(() => [...menuPackageReflection.value.coreSources.keys()])
const menuOptionalResourceIds = computed(() => [...menuPackageReflection.value.optionalSources.keys()])
const optionalPendingResources = computed(() => {
  const satisfied = new Set([
    ...selectedPermissionIds.value,
    ...roleResourcePermissionIds.value,
    ...menuCoreResourceIds.value
  ])
  const optional = new Set(menuOptionalResourceIds.value.filter(id => !satisfied.has(id)))
  return (catalog.value?.resources || []).filter((item: any) => optional.has(item.id))
})
const optionalSatisfiedCount = computed(() => menuOptionalResourceIds.value.length - optionalPendingResources.value.length)
const selectedMenuNamesLabel = computed(() => {
  const names = menuPackageReflection.value.selectedMenuNames
  return names.length <= 3 ? names.join('、') : `${names.slice(0, 3).join('、')} 等 ${names.length} 个菜单`
})

const menuSelection = computed<string[]>({
  get() {
    return reflectedMenuPermissionIds.value
  },
  set(nextIds) {
    const menuIds = new Set((catalog.value?.menus || [])
      .filter((item: any) => item.nodeType === 'MENU' && item.status === 'ACTIVE' && item.permissionId)
      .map((item: any) => item.permissionId))
    const roleMenuIds = new Set(roleMenuPermissionIds.value)
    const existingDirect = new Set(selectedPermissionIds.value)
    const nextDirect = new Set(selectedPermissionIds.value.filter(id => !menuIds.has(id)))

    for (const id of nextIds) {
      if (!menuIds.has(id)) continue
      // Role-derived checks are a read-only projection. An existing direct
      // duplicate may still be removed without affecting the role source.
      if (!roleMenuIds.has(id) || existingDirect.has(id)) nextDirect.add(id)
    }
    selectedPermissionIds.value = [...nextDirect]
  }
})

function decorateMenuNodes(nodes: PermissionTreeNode[]): PermissionTreeNode[] {
  return nodes.map((node) => {
    if (node.children?.length) return { ...node, children: decorateMenuNodes(node.children) }
    if (!node.permissionId) return node

    const roleSources = roleGrantReflection.value.menuSources.get(node.permissionId)
    if (!roleSources?.length) return node
    const alsoDirect = selectedPermissionIds.value.includes(node.permissionId)
    return {
      ...node,
      disabled: !alsoDirect,
      grantState: 'ROLE',
      grantLabel: alsoDirect ? '角色 + 直接' : '角色菜单',
      grantHint: `由角色模板反显：${roleSources.join('、')}${alsoDirect ? '；同时存在一条用户直接菜单授权' : '；如需取消请取消对应角色'}`
    }
  })
}

const reflectedMenuTree = computed(() => decorateMenuNodes(menuTree.value))

const resourceSelection = computed<string[]>({
  get() {
    return [...new Set([
      ...selectedPermissionIds.value,
      ...roleResourcePermissionIds.value,
      ...menuCoreResourceIds.value
    ])]
  },
  set(nextIds) {
    const resourceIds = new Set((catalog.value?.resources || []).map((item: any) => item.id))
    const coreIds = new Set(menuCoreResourceIds.value)
    const roleResourceIds = new Set(roleResourcePermissionIds.value)
    const existingExplicit = new Set(selectedPermissionIds.value)
    const nextExplicit = new Set(selectedPermissionIds.value.filter(id => !resourceIds.has(id)))

    for (const id of nextIds) {
      if (!resourceIds.has(id)) continue
      // Role and CORE checks are display state, never persisted as user direct
      // grants. Existing explicit duplicates remain removable by the operator.
      if ((!coreIds.has(id) && !roleResourceIds.has(id)) || existingExplicit.has(id)) nextExplicit.add(id)
    }
    selectedPermissionIds.value = [...nextExplicit]
  }
})

function decorateResourceNodes(nodes: PermissionTreeNode[]): PermissionTreeNode[] {
  return nodes.map((node) => {
    if (node.children?.length) return { ...node, children: decorateResourceNodes(node.children) }
    if (!node.permissionId) return node

    const coreSources = menuPackageReflection.value.coreSources.get(node.permissionId)
    const roleSources = roleGrantReflection.value.resourceSources.get(node.permissionId)
    const optionalSources = menuPackageReflection.value.optionalSources.get(node.permissionId)
    const directlySelected = selectedPermissionIds.value.includes(node.permissionId)

    if (coreSources?.length) {
      const labels = ['CORE 自动']
      if (roleSources?.length) labels.push('角色')
      if (directlySelected) labels.push('直授')
      const hints = [`菜单 CORE：${coreSources.join('、')}`]
      if (roleSources?.length) hints.push(`角色：${roleSources.join('、')}`)
      if (directlySelected) hints.push('同时存在一条用户直接资源授权')
      return {
        ...node,
        disabled: !directlySelected,
        grantState: 'CORE',
        grantLabel: labels.join(' + '),
        grantHint: hints.join('；')
      }
    }

    if (optionalSources?.length) {
      const satisfiedByRole = Boolean(roleSources?.length)
      const stateLabel = satisfiedByRole
        ? (directlySelected ? '角色 + 直授' : '角色已授')
        : (directlySelected ? '已直授' : '待选')
      const hints = [`菜单 OPTIONAL：${optionalSources.join('、')}`]
      if (roleSources?.length) hints.push(`已由角色满足：${roleSources.join('、')}`)
      else hints.push(directlySelected ? '已单独授予用户' : '不会随菜单自动授予')
      return {
        ...node,
        disabled: satisfiedByRole && !directlySelected,
        grantState: 'OPTIONAL',
        grantLabel: `OPTIONAL · ${stateLabel}`,
        grantHint: hints.join('；')
      }
    }

    if (roleSources?.length) {
      return {
        ...node,
        disabled: !directlySelected,
        grantState: 'ROLE',
        grantLabel: directlySelected ? '角色 + 直授' : '角色授权',
        grantHint: `由角色模板反显：${roleSources.join('、')}${directlySelected ? '；同时存在一条用户直接资源授权' : '；如需取消请取消对应角色'}`
      }
    }
    return node
  })
}

const reflectedResourceTree = computed(() => decorateResourceNodes(resourceTree.value))

const addedCount = computed(() => selectedPermissionIds.value.filter(id => !initialPermissionIds.value.includes(id)).length + selectedRoleIds.value.filter(id => !initialRoleIds.value.includes(id)).length)
const removedCount = computed(() => initialPermissionIds.value.filter(id => !selectedPermissionIds.value.includes(id)).length + initialRoleIds.value.filter(id => !selectedRoleIds.value.includes(id)).length)
const highRiskSelected = computed(() => {
  return (catalog.value?.resources || []).filter((item: any) => item.riskLevel === 'HIGH' && selectedPermissionIds.value.includes(item.id))
})

const effective = computed(() => subject.value?.effective)

async function load() {
  if (!props.subjectId) return
  loading.value = true
  try {
    const requests: Promise<any>[] = [
      mockFetch<any>('/api/catalog'),
      mockFetch<any>(`/api/subjects/${props.subjectType}/${props.subjectId}`)
    ]
    if (props.subjectType === 'user') requests.push(mockFetch<any[]>('/api/roles'))
    const [catalogData, subjectData, roleData] = await Promise.all(requests)
    catalog.value = catalogData
    subject.value = subjectData
    roles.value = roleData || []
    selectedPermissionIds.value = [...(subjectData.permissionIds || [])]
    initialPermissionIds.value = [...selectedPermissionIds.value]
    selectedRoleIds.value = [...(subjectData.roleIds || [])]
    initialRoleIds.value = [...selectedRoleIds.value]
    const firstDirect = subjectData.directGrants?.[0]
    validToLocal.value = firstDirect?.validTo ? new Date(firstDirect.validTo).toISOString().slice(0, 16) : ''
    reason.value = ''
    sourceTicket.value = firstDirect?.sourceTicket || ''
    search.value = ''
    activeTab.value = 'menu'
  } catch (error) {
    showError(error, '授权数据加载失败')
  } finally {
    loading.value = false
  }
}

watch([open, () => props.subjectId], ([isOpen]) => {
  if (isOpen) load()
})

function toggleRole(roleId: string, checked: boolean) {
  const next = new Set(selectedRoleIds.value)
  checked ? next.add(roleId) : next.delete(roleId)
  selectedRoleIds.value = [...next]
}

async function save() {
  saving.value = true
  try {
    const body = props.subjectType === 'role'
      ? { permissionIds: selectedPermissionIds.value, reason: reason.value }
      : {
        roleIds: selectedRoleIds.value,
        directPermissionIds: selectedPermissionIds.value,
        reason: reason.value,
        validTo: validToLocal.value ? new Date(validToLocal.value).toISOString() : null,
        sourceTicket: sourceTicket.value || null
      }
    const result = await mockFetch<any>(`/api/subjects/${props.subjectType}/${props.subjectId}`, { method: 'PUT', body })
    showSuccess('授权已发布', props.subjectType === 'role' ? `已刷新 ${result.affectedUsers || 0} 名用户的策略版本` : '用户有效权限与审计记录已同步更新')
    open.value = false
    emit('saved')
  } catch (error) {
    showError(error)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <USlideover v-model:open="open" :title="`${subjectType === 'role' ? '角色授权' : '用户授权'} · ${subjectName}`"
    :description="subjectType === 'role' ? '角色是可复用的菜单与资源授权模板。' : '角色模板与用户直接加授叠加；直授仅支持 ALLOW。'" :dismissible="!saving"
    :ui="{ content: 'sm:max-w-3xl' }">
    <template #body>
      <div v-if="loading" class="empty-state">
        <div>
          <UIcon name="i-lucide-loader-circle" class="animate-spin" size="24" />
          <p>正在计算授权来源与菜单包……</p>
        </div>
      </div>
      <div v-else class="grant-shell">
        <div>
          <div class="grant-summary">
            <div class="grant-metric"><b>{{ selectedPermissionIds.length }}</b><span>{{ subjectType === 'role' ? '模板授权项'
              : '用户直授项' }}</span></div>
            <div class="grant-metric"><b>{{ selectedRoleIds.length }}</b><span>角色模板</span></div>
            <div class="grant-metric"><b style="color: var(--app-green)">+{{ addedCount }}</b><span>本次新增</span></div>
            <div class="grant-metric"><b style="color: var(--app-red)">−{{ removedCount }}</b><span>本次移除</span></div>
          </div>

          <div v-if="subjectType === 'user'" class="panel" style="margin-bottom: 14px; box-shadow: none">
            <div class="panel-head">
              <div>
                <h3>角色模板（可多选）</h3>
                <p>勾选后立即在菜单、资源栏反显角色权限；带角色来源的锁定项不会保存为用户直授。</p>
              </div>
              <UBadge color="primary" variant="subtle" :label="`已选 ${selectedRoleIds.length} 个`" />
            </div>
            <div class="panel-body source-list" style="grid-template-columns: repeat(2, minmax(0, 1fr))">
              <label v-for="role in roles" :key="role.id" class="source-card"
                style="display: flex; gap: 10px; align-items: center; cursor: pointer">
                <UCheckbox :model-value="selectedRoleIds.includes(role.id)"
                  :aria-label="`选择角色 ${role.name}`"
                  @update:model-value="toggleRole(role.id, $event === true)" />
                <span><b>{{ role.name }}</b>
                  <p>{{ role.code }} · {{ role.permissionCount }} 项权限</p>
                </span>
              </label>
            </div>
          </div>

          <div class="tab-strip" style="margin-bottom: 14px; overflow-x: auto">
            <button class="tab-button" :class="{ active: activeTab === 'menu' }" @click="activeTab = 'menu'">菜单</button>
            <button class="tab-button" :class="{ active: activeTab === 'resource' }"
              @click="activeTab = 'resource'">资源
              <span v-if="menuCoreResourceIds.length" class="tab-notice core">{{ menuCoreResourceIds.length }} CORE</span>
              <span v-if="menuOptionalResourceIds.length" class="tab-notice optional">{{ menuOptionalResourceIds.length }} OPTIONAL</span>
            </button>
            <button v-if="subjectType === 'user'" class="tab-button" :class="{ active: activeTab === 'effective' }"
              @click="activeTab = 'effective'">有效权限</button>
          </div>
        </div>

        <div class="grant-body">
          <template v-if="['menu', 'resource'].includes(activeTab)">
            <div class="toolbar">
              <UInput v-model="search" class="search-box" icon="i-lucide-search" placeholder="搜索名称或稳定权限码" />
              <UBadge v-if="activeTab === 'menu'" color="primary" variant="subtle" label="父节点仅展开当前叶子" />
              <UBadge v-else color="primary" variant="subtle" label="前后端统一资源码" />
            </div>

            <div v-if="activeTab === 'resource' && selectedMenuCount" class="menu-package-feedback">
              <div class="inline-alert">
                <UIcon name="i-lucide-package-check" size="17" />
                <span><b>{{ menuCoreResourceIds.length }} 项 CORE 已自动反显</b><br>来自 {{ selectedMenuNamesLabel }}。蓝色锁定勾选表示由菜单或角色生效，不会重复保存为用户直授。</span>
              </div>
              <div v-if="menuOptionalResourceIds.length" class="inline-alert warning optional-callout">
                <UIcon name="i-lucide-circle-alert" size="17" />
                <span><b>{{ menuOptionalResourceIds.length }} 项 OPTIONAL 已黄色高亮</b><br><template v-if="optionalSatisfiedCount">其中 {{ optionalSatisfiedCount }} 项已由角色或直授满足；</template><template v-if="optionalPendingResources.length">仍有 {{ optionalPendingResources.length }} 项待选：{{ optionalPendingResources.map((item: any) => item.name).join('、') }}。</template><template v-else>当前均已满足。</template></span>
              </div>
            </div>

            <PermissionTree v-if="activeTab === 'menu'" v-model="menuSelection" :nodes="reflectedMenuTree" :search="search" />
            <PermissionTree v-else v-model="resourceSelection" :nodes="reflectedResourceTree" :search="search" />

            <div v-if="activeTab === 'menu' && selectedMenuCount" class="inline-alert menu-package-summary">
              <UIcon name="i-lucide-package-open" size="17" />
              <span><b>已反显 {{ selectedMenuCount }} 个页面菜单</b><br>将自动带出 {{ menuCoreResourceIds.length }} 项 CORE<span v-if="menuOptionalResourceIds.length">；{{ menuOptionalResourceIds.length }} 项 OPTIONAL 已黄色提示，其中 {{ optionalPendingResources.length }} 项待选</span>。</span>
              <UButton color="primary" variant="soft" size="sm" label="查看资源反显" @click="activeTab = 'resource'" />
            </div>

          </template>

          <template v-else>
            <div class="inline-alert">
              <UIcon name="i-lucide-layers-3" size="16" /><span>有效资源 = 角色授权 ∪ 用户直授 ∪ 菜单 CORE
                展开。相同权限可保留多个来源，撤销一个来源不会误删其他来源。</span>
            </div>
            <div class="source-list" style="margin-top: 12px">
              <div v-for="permission in effective?.permissions || []" :key="permission.id" class="source-card">
                <div style="display: flex; justify-content: space-between; gap: 10px"><b>{{ permission.name }}</b><span
                    class="code">{{ permission.code }}</span></div>
                <p>{{permission.sources.map((source: any) => `${source.sourceType === 'ROLE' ? '角色' : source.sourceType
                  === 'DIRECT' ? '用户直授' : '菜单 CORE'}：${source.sourceName}`).join('；')}}</p>
              </div>
            </div>
          </template>

          <div class="panel" style="margin-top: 14px; box-shadow: none">
            <div class="panel-head">
              <div>
                <h3>发布信息</h3>
                <p>保存后提升策略版本，并写入 before / after 审计。</p>
              </div>
            </div>
            <div class="panel-body form-grid">
              <UFormField label="授权原因" required class="span-2">
                <UTextarea v-model="reason" autoresize placeholder="例如：华东销售季度客户清理专项" />
              </UFormField>
              <template v-if="subjectType === 'user'">
                <UFormField label="失效时间（选填）" description="留空表示长期有效；填写时必须晚于当前时间。">
                  <UInput v-model="validToLocal" type="datetime-local" />
                </UFormField>
                <UFormField label="来源工单">
                  <UInput v-model="sourceTicket" placeholder="AUTH-2026-xxx" />
                </UFormField>
              </template>
            </div>
          </div>

          <div v-if="highRiskSelected.length" class="inline-alert warning" style="margin-top: 12px">
            <UIcon name="i-lucide-triangle-alert" size="16" /><span>当前含 {{ highRiskSelected.length }} 项高风险直授：{{
              highRiskSelected.map((item: any) => item.name).join('、')}}。失效时间可留空；临时授权建议设置。</span>
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="modal-actions">
        <UButton color="neutral" variant="ghost" label="取消" :disabled="saving" @click="open = false" />
        <UButton color="primary" icon="i-lucide-send" label="发布授权" :loading="saving" @click="save" />
      </div>
    </template>
  </USlideover>
</template>
