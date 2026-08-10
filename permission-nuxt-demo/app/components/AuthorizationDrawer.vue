<script setup lang="ts">
import type { PermissionTreeNode } from '~/types/permission'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{
  subjectType: 'user' | 'role'
  subjectId: string
  subjectName: string
}>()
const emit = defineEmits<{ saved: [] }>()

const { showError, showSuccess } = useAppApi()
const loading = ref(false)
const saving = ref(false)
const catalog = ref<any>(null)
const subject = ref<any>(null)
const roles = ref<any[]>([])
const selectedPermissionIds = ref<string[]>([])
const selectedRoleIds = ref<string[]>([])
const initialPermissionIds = ref<string[]>([])
const initialRoleIds = ref<string[]>([])
const activeTab = ref<'menu' | 'function' | 'scope' | 'effective'>('menu')
const search = ref('')
const reason = ref('')
const sourceTicket = ref('')
const validToLocal = ref('')

const catalogRef = computed(() => catalog.value)
const { menuTree, functionTree } = usePermissionCatalog(catalogRef)

const addedCount = computed(() => selectedPermissionIds.value.filter(id => !initialPermissionIds.value.includes(id)).length + selectedRoleIds.value.filter(id => !initialRoleIds.value.includes(id)).length)
const removedCount = computed(() => initialPermissionIds.value.filter(id => !selectedPermissionIds.value.includes(id)).length + initialRoleIds.value.filter(id => !selectedRoleIds.value.includes(id)).length)
const highRiskSelected = computed(() => {
  return (catalog.value?.functions || []).filter((item: any) => item.riskLevel === 'HIGH' && selectedPermissionIds.value.includes(item.id))
})

const currentTree = computed<PermissionTreeNode[]>(() => {
  if (activeTab.value === 'menu') return menuTree.value
  if (activeTab.value === 'function') return functionTree.value
  return []
})

const effective = computed(() => subject.value?.effective)

async function load() {
  if (!props.subjectId) return
  loading.value = true
  try {
    const requests: Promise<any>[] = [
      $fetch<any>('/api/catalog'),
      $fetch<any>(`/api/subjects/${props.subjectType}/${props.subjectId}`)
    ]
    if (props.subjectType === 'user') requests.push($fetch<any[]>('/api/roles'))
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
    const result = await $fetch<any>(`/api/subjects/${props.subjectType}/${props.subjectId}`, { method: 'PUT', body })
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
    :description="subjectType === 'role' ? '角色是可复用模板；不在这里配置数据范围。' : '角色模板与用户直接加授叠加；直授仅支持 ALLOW。'" :dismissible="!saving"
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

          <div class="tab-strip" style="margin-bottom: 14px; overflow-x: auto">
            <button class="tab-button" :class="{ active: activeTab === 'menu' }" @click="activeTab = 'menu'">菜单</button>
            <button class="tab-button" :class="{ active: activeTab === 'function' }"
              @click="activeTab = 'function'">功能</button>
            <button v-if="subjectType === 'user'" class="tab-button" :class="{ active: activeTab === 'scope' }"
              @click="activeTab = 'scope'">数据范围</button>
            <button v-if="subjectType === 'user'" class="tab-button" :class="{ active: activeTab === 'effective' }"
              @click="activeTab = 'effective'">有效权限</button>
          </div>
        </div>

        <div class="grant-body">
          <template v-if="['menu', 'function'].includes(activeTab)">
            <div class="toolbar">
              <UInput v-model="search" class="search-box" icon="i-lucide-search" placeholder="搜索名称或稳定权限码" />
              <UBadge v-if="activeTab === 'menu'" color="primary" variant="subtle" label="父节点仅展开当前叶子" />
              <UBadge v-else color="primary" variant="subtle" label="前后端统一功能码" />
            </div>
            <PermissionTree v-model="selectedPermissionIds" :nodes="currentTree" :search="search" />

            <div v-if="subjectType === 'user' && activeTab === 'menu'" class="panel"
              style="margin-top: 14px; box-shadow: none">
              <div class="panel-head">
                <div>
                  <h3>叠加角色模板</h3>
                  <p>若要让用户少于角色权限，应拆分或移除角色，不使用 DENY。</p>
                </div>
              </div>
              <div class="panel-body source-list">
                <label v-for="role in roles" :key="role.id" class="source-card"
                  style="display: flex; gap: 10px; align-items: center">
                  <UCheckbox :model-value="selectedRoleIds.includes(role.id)"
                    @update:model-value="toggleRole(role.id, $event === true)" />
                  <span><b>{{ role.name }}</b>
                    <p>{{ role.code }} · {{ role.domain }} · {{ role.permissionCount }} 项</p>
                  </span>
                </label>
              </div>
            </div>
          </template>

          <template v-else-if="activeTab === 'scope'">
            <div class="inline-alert">
              <UIcon name="i-lucide-info" size="16" /><span>数据范围不可在用户或角色上直接编辑。以下结果来自用户的有效任职，并按数据域分别合并。</span>
            </div>
            <div style="margin-top: 12px">
              <div v-for="scope in effective?.dataAccess || []" :key="scope.dataDomainCode" class="scope-card">
                <div class="scope-title"><b>{{ scope.dataDomainCode }}</b>
                  <UBadge :color="scope.all ? 'success' : scope.self || scope.orgUnitIds.length ? 'primary' : 'neutral'"
                    variant="subtle"
                    :label="scope.all ? 'ALL' : scope.self && !scope.orgUnitIds.length ? 'SELF' : scope.orgUnitIds.length ? `${scope.orgUnitIds.length} 个部门` : 'NONE'" />
                </div>
                <p v-if="scope.scopes.length">{{scope.scopes.map((item: any) => `${item.positionName} @
                  ${item.orgUnitName}：${item.scopeType}`).join('；')}}</p>
                <p v-else>该数据域没有岗位策略，受控功能按 NONE 处理。</p>
              </div>
            </div>
          </template>

          <template v-else>
            <div class="inline-alert">
              <UIcon name="i-lucide-layers-3" size="16" /><span>有效能力 = 角色授权 ∪ 用户直授 ∪ 菜单 CORE
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
