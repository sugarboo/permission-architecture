<script setup lang="ts">
definePageMeta({ title: '功能与资源' })

type CatalogStatus = 'DRAFT' | 'ACTIVE' | 'DISABLED'
type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'
type ResourceType = 'REPORT' | 'TEMPLATE'

const { showError, showSuccess } = useAppApi()
const { data: catalog, refresh, pending } = await useAsyncData('catalog', () => $fetch<any>('/api/catalog'))
const activeTab = ref<'function' | 'resource'>('function')
const search = ref('')
const functionOpen = ref(false)
const resourceOpen = ref(false)
const editingFunctionId = ref<string | null>(null)
const editingResourceId = ref<string | null>(null)
const functionReason = ref('')
const resourceReason = ref('')
const saving = ref(false)

const domains = ['信息板块', '供应链板块', '设计师板块', '权限中心']
const riskItems = [{ label: '低风险', value: 'LOW' }, { label: '中风险', value: 'MEDIUM' }, { label: '高风险', value: 'HIGH' }]
const actionItems = ['read', 'create', 'update', 'delete', 'import', 'export', 'approve', 'assign', 'publish', 'manage', 'submit', 'review']
const createStatusItems = [{ label: '草稿', value: 'DRAFT' }, { label: '启用', value: 'ACTIVE' }]
const editStatusItems = [...createStatusItems, { label: '停用', value: 'DISABLED' }]
const resourceTypeItems = [{ label: '报表', value: 'REPORT' }, { label: '模板', value: 'TEMPLATE' }]

const functionForm = reactive({
  name: '', code: '', domain: '信息板块', dataDomainCode: null as string | null,
  riskLevel: 'LOW' as RiskLevel, actionType: 'read', dataScoped: false,
  isSensitive: false, description: '', status: 'DRAFT' as CatalogStatus
})
const resourceForm = reactive({
  name: '', code: '', domain: '信息板块', resourceType: 'REPORT' as ResourceType,
  description: '', status: 'DRAFT' as CatalogStatus, functionPermissionIds: [] as string[]
})

const filteredFunctions = computed(() => (catalog.value?.functions || []).filter((item: any) => `${item.name} ${item.code} ${item.domain} ${item.actionType}`.toLowerCase().includes(search.value.toLowerCase())))
const filteredResources = computed(() => (catalog.value?.resources || []).filter((item: any) => `${item.name} ${item.code} ${item.domain} ${item.resourceType}`.toLowerCase().includes(search.value.toLowerCase())))
const domainOptions = computed(() => (catalog.value?.dataDomains || []).map((item: any) => ({ label: `${item.name} · ${item.code}`, value: item.code })))
const availableFunctions = computed(() => (catalog.value?.functions || []).filter((item: any) => item.status !== 'DISABLED'))
const functionModalTitle = computed(() => editingFunctionId.value ? '编辑业务功能' : '新建业务功能')
const resourceModalTitle = computed(() => editingResourceId.value ? '编辑业务资源' : '新建业务资源')

function riskColor(risk: string): 'error' | 'warning' | 'neutral' { return risk === 'HIGH' ? 'error' : risk === 'MEDIUM' ? 'warning' : 'neutral' }
function statusColor(status: string): 'success' | 'warning' | 'neutral' { return status === 'ACTIVE' ? 'success' : status === 'DRAFT' ? 'warning' : 'neutral' }
function statusLabel(status: string) { return status === 'ACTIVE' ? '已启用' : status === 'DRAFT' ? '草稿' : '已停用' }
function resourceTypeLabel(type: string) { return type === 'REPORT' ? '报表' : '模板' }
function toggleArray(target: string[], id: string, checked: boolean) { const next = new Set(target); checked ? next.add(id) : next.delete(id); target.splice(0, target.length, ...next) }

function resetFunction() {
  editingFunctionId.value = null
  functionReason.value = ''
  Object.assign(functionForm, { name: '', code: '', domain: '信息板块', dataDomainCode: null, riskLevel: 'LOW', actionType: 'read', dataScoped: false, isSensitive: false, description: '', status: 'DRAFT' })
}

function resetResource() {
  editingResourceId.value = null
  resourceReason.value = ''
  Object.assign(resourceForm, { name: '', code: '', domain: '信息板块', resourceType: 'REPORT', description: '', status: 'DRAFT', functionPermissionIds: [] })
}

function createFunction() { resetFunction(); functionOpen.value = true }
function createResource() { resetResource(); resourceOpen.value = true }

function editFunction(item: any) {
  editingFunctionId.value = item.id
  functionReason.value = ''
  Object.assign(functionForm, {
    name: item.name,
    code: item.code,
    domain: item.domain,
    dataDomainCode: item.dataDomainCode || null,
    riskLevel: item.riskLevel,
    actionType: item.actionType,
    dataScoped: Boolean(item.dataScoped),
    isSensitive: Boolean(item.isSensitive),
    description: item.description || '',
    status: item.status
  })
  functionOpen.value = true
}

function editResource(item: any) {
  editingResourceId.value = item.id
  resourceReason.value = ''
  Object.assign(resourceForm, {
    name: item.name,
    code: item.code,
    domain: item.domain,
    resourceType: item.resourceType,
    description: item.description || '',
    status: item.status,
    functionPermissionIds: [...(item.functionIds || [])]
  })
  resourceOpen.value = true
}

async function saveFunction() {
  saving.value = true
  try {
    const payload = {
      name: functionForm.name,
      domain: functionForm.domain,
      dataDomainCode: functionForm.dataDomainCode,
      riskLevel: functionForm.riskLevel,
      actionType: functionForm.actionType,
      dataScoped: functionForm.dataScoped,
      isSensitive: functionForm.isSensitive,
      description: functionForm.description,
      status: functionForm.status
    }
    if (editingFunctionId.value) {
      await $fetch(`/api/catalog/functions/${editingFunctionId.value}`, { method: 'PUT', body: { ...payload, reason: functionReason.value } })
      showSuccess('功能已更新', '功能码保持不变；目录与策略版本已刷新。')
    } else {
      await $fetch('/api/catalog/functions', { method: 'POST', body: { ...payload, code: functionForm.code } })
      showSuccess('功能已登记', '该功能码可直接供前端按钮、路由和后端执行点共同使用。')
    }
    functionOpen.value = false
    resetFunction()
    await refresh()
  } catch (error) { showError(error) } finally { saving.value = false }
}

async function saveResource() {
  saving.value = true
  try {
    const payload = {
      name: resourceForm.name,
      domain: resourceForm.domain,
      resourceType: resourceForm.resourceType,
      description: resourceForm.description,
      status: resourceForm.status,
      functionPermissionIds: resourceForm.functionPermissionIds
    }
    if (editingResourceId.value) {
      await $fetch(`/api/catalog/resources/${editingResourceId.value}`, { method: 'PUT', body: { ...payload, reason: resourceReason.value } })
      showSuccess('业务资源已更新', '资源清单和功能关联已同步更新；它不会产生新的授权项。')
    } else {
      await $fetch('/api/catalog/resources', { method: 'POST', body: { ...payload, code: resourceForm.code } })
      showSuccess('业务资源已登记', '资源仅用于研发与产品追踪，不会授予角色或用户。')
    }
    resourceOpen.value = false
    resetResource()
    await refresh()
  } catch (error) { showError(error) } finally { saving.value = false }
}
</script>

<template>
  <div>
    <PageHeader title="统一功能码，精简资源层" description="菜单和角色只授权业务功能；前端按钮、路由与后端执行点共同使用稳定功能码。资源仅保留报表、模板两类不可授权的业务资源。">
      <UButton color="neutral" variant="outline" icon="i-lucide-files" label="新建业务资源" @click="createResource" />
      <UButton color="primary" icon="i-lucide-box" label="新建功能" @click="createFunction" />
    </PageHeader>

    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>功能目录与业务资源</h2>
          <p>功能是唯一能力权限语言；业务资源不进入授权树。</p>
        </div>
        <div class="tab-strip">
          <button class="tab-button" :class="{ active: activeTab === 'function' }" @click="activeTab = 'function'">功能 {{
            catalog?.functions?.length || 0 }}</button>
          <button class="tab-button" :class="{ active: activeTab === 'resource' }" @click="activeTab = 'resource'">业务资源
            {{ catalog?.resources?.length || 0 }}</button>
        </div>
      </div>
      <div class="panel-body">
        <div class="toolbar">
          <UInput v-model="search" class="search-box" icon="i-lucide-search" placeholder="搜索名称、稳定码或板块" />
          <UButton color="neutral" variant="ghost" icon="i-lucide-refresh-cw" :loading="pending" @click="refresh()" />
        </div>

        <div v-if="activeTab === 'function'" class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>业务功能</th>
                <th>业务板块</th>
                <th>数据域</th>
                <th>风险</th>
                <th>关联资源</th>
                <th>菜单绑定</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in filteredFunctions" :key="item.id">
                <td>
                  <div class="primary-cell">
                    <div class="row-avatar">
                      <UIcon name="i-lucide-zap" size="15" />
                    </div>
                    <div><b>{{ item.name }}</b><small class="code">{{ item.code }}</small></div>
                  </div>
                </td>
                <td>{{ item.domain }}</td>
                <td><span class="code">{{ item.dataDomainCode || '—' }}</span></td>
                <td>
                  <UBadge :color="riskColor(item.riskLevel)" variant="subtle" :label="item.riskLevel" />
                </td>
                <td>{{ item.resourceCount }} 项</td>
                <td>{{ item.menuCount }} 个</td>
                <td>
                  <UBadge :color="statusColor(item.status)" variant="subtle" :label="statusLabel(item.status)" />
                </td>
                <td>
                  <UButton color="primary" variant="ghost" size="sm" icon="i-lucide-pencil" label="编辑"
                    @click="editFunction(item)" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>业务资源</th>
                <th>类型</th>
                <th>业务板块</th>
                <th>关联功能</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in filteredResources" :key="item.id">
                <td>
                  <div class="primary-cell">
                    <div class="row-avatar">
                      <UIcon
                        :name="item.resourceType === 'REPORT' ? 'i-lucide-chart-no-axes-combined' : 'i-lucide-file-text'"
                        size="15" />
                    </div>
                    <div><b>{{ item.name }}</b><small class="code">{{ item.code }}</small></div>
                  </div>
                </td>
                <td>
                  <UBadge color="neutral" variant="subtle" :label="resourceTypeLabel(item.resourceType)" />
                </td>
                <td>{{ item.domain }}</td>
                <td>
                  <div class="tags">
                    <UBadge v-for="name in item.functionNames" :key="name" color="primary" variant="subtle" size="sm"
                      :label="name" /><span v-if="!item.functionNames.length" class="muted">仅登记</span>
                  </div>
                </td>
                <td>
                  <UBadge :color="statusColor(item.status)" variant="subtle" :label="statusLabel(item.status)" />
                </td>
                <td>
                  <UButton color="primary" variant="ghost" size="sm" icon="i-lucide-pencil" label="编辑"
                    @click="editResource(item)" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <UModal v-model:open="functionOpen" :title="functionModalTitle" description="功能码是前端体验控制与后端强制校验共同使用的稳定契约。"
      :dismissible="!saving" :ui="{ content: 'sm:max-w-3xl' }">
      <template #body>
        <div class="form-grid">
          <UFormField label="功能名称" required>
            <UInput v-model="functionForm.name" placeholder="例如：新建采购单" />
          </UFormField>
          <UFormField label="稳定功能码" required>
            <UInput v-model="functionForm.code" class="code" :disabled="!!editingFunctionId"
              placeholder="sc.purchase_order.create" />
            <p v-if="editingFunctionId" class="form-help">功能码启用后作为研发契约保持不变。</p>
          </UFormField>
          <UFormField label="业务板块" required>
            <USelect v-model="functionForm.domain" :items="domains" />
          </UFormField>
          <UFormField label="动作类型" required>
            <USelect v-model="functionForm.actionType" :items="actionItems" :disabled="!!editingFunctionId" />
            <p v-if="editingFunctionId" class="form-help">动作与功能码共同定义功能语义，创建后保持不变。</p>
          </UFormField>
          <UFormField label="风险等级" required>
            <USelect v-model="functionForm.riskLevel" :items="riskItems" value-key="value" />
          </UFormField>
          <UFormField label="状态" required>
            <USelect v-model="functionForm.status" :items="editingFunctionId ? editStatusItems : createStatusItems"
              value-key="value" />
          </UFormField>
          <UFormField label="数据域">
            <USelect v-model="functionForm.dataDomainCode" :items="domainOptions" value-key="value"
              placeholder="不受行级范围控制" />
          </UFormField>
          <div style="display: flex; gap: 18px; align-items: end; padding-bottom: 6px">
            <UCheckbox v-model="functionForm.dataScoped" label="启用数据范围" />
            <UCheckbox v-model="functionForm.isSensitive" label="敏感操作" />
          </div>
          <UFormField label="说明" class="span-2">
            <UTextarea v-model="functionForm.description" autoresize />
          </UFormField>
          <UFormField v-if="editingFunctionId" label="变更原因" required class="span-2">
            <UTextarea v-model="functionReason" autoresize placeholder="说明本次功能定义或状态调整原因" />
          </UFormField>
        </div>
        <div class="inline-alert" style="margin-top: 14px">
          <UIcon name="i-lucide-code-xml" size="16" /><span>API
            不再登记成资源权限。每个受保护的控制器、服务方法、任务或消费者直接声明本功能码；后端始终负责最终放行。</span>
        </div>
      </template>
      <template #footer>
        <div class="modal-actions">
          <UButton color="neutral" variant="ghost" label="取消" :disabled="saving" @click="functionOpen = false" />
          <UButton color="primary" :label="editingFunctionId ? '保存修改' : '保存功能'" :loading="saving"
            @click="saveFunction" />
        </div>
      </template>
    </UModal>

    <UModal v-model:open="resourceOpen" :title="resourceModalTitle" description="业务资源不是权限项，只用于登记报表、模板及其关联功能。"
      :dismissible="!saving" :ui="{ content: 'sm:max-w-3xl' }">
      <template #body>
        <div class="form-grid">
          <UFormField label="资源名称" required>
            <UInput v-model="resourceForm.name" placeholder="例如：采购订单标准模板" />
          </UFormField>
          <UFormField label="稳定资源码" required>
            <UInput v-model="resourceForm.code" class="code" :disabled="!!editingResourceId"
              :placeholder="resourceForm.resourceType === 'REPORT' ? 'report.sc.purchase_summary' : 'template.sc.purchase_order'" />
            <p v-if="editingResourceId" class="form-help">资源码创建后保持稳定。</p>
          </UFormField>
          <UFormField label="资源类型" required>
            <USelect v-model="resourceForm.resourceType" :items="resourceTypeItems" value-key="value"
              :disabled="!!editingResourceId" />
            <p v-if="editingResourceId" class="form-help">类型与资源码前缀共同定义资源身份，创建后保持不变。</p>
          </UFormField>
          <UFormField label="业务板块" required>
            <USelect v-model="resourceForm.domain" :items="domains" />
          </UFormField>
          <UFormField label="状态" required>
            <USelect v-model="resourceForm.status" :items="editingResourceId ? editStatusItems : createStatusItems"
              value-key="value" />
          </UFormField>
          <UFormField label="说明" class="span-2">
            <UTextarea v-model="resourceForm.description" autoresize />
          </UFormField>
          <UFormField label="关联业务功能（仅追踪）" class="span-2">
            <div class="source-list"><label v-for="item in availableFunctions" :key="item.id" class="source-card"
                style="display: flex; gap: 10px; align-items: center">
                <UCheckbox :model-value="resourceForm.functionPermissionIds.includes(item.id)"
                  @update:model-value="toggleArray(resourceForm.functionPermissionIds, item.id, $event === true)" />
                <span><b>{{ item.name }}</b>
                  <p class="code">{{ item.code }}</p>
                </span>
              </label></div>
          </UFormField>
          <UFormField v-if="editingResourceId" label="变更原因" required class="span-2">
            <UTextarea v-model="resourceReason" autoresize placeholder="说明本次资源或功能关联调整原因" />
          </UFormField>
        </div>
        <div class="inline-alert" style="margin-top: 14px">
          <UIcon name="i-lucide-info" size="16" /><span>角色、用户和菜单均不能获得业务资源。若需要控制“查看报表”或“使用模板”，请创建对应功能码，例如
            bi.sales_report.view 或 sc.purchase_template.use。</span>
        </div>
      </template>
      <template #footer>
        <div class="modal-actions">
          <UButton color="neutral" variant="ghost" label="取消" :disabled="saving" @click="resourceOpen = false" />
          <UButton color="primary" :label="editingResourceId ? '保存修改' : '保存资源'" :loading="saving"
            @click="saveResource" />
        </div>
      </template>
    </UModal>
  </div>
</template>
