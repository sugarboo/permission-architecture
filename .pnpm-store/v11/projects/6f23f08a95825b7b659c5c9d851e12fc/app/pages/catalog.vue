<script setup lang="ts">
definePageMeta({ title: '资源管理' })

type CatalogStatus = 'DRAFT' | 'ACTIVE' | 'DISABLED'
type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'

const { showError, showSuccess } = useAppApi()
const { mockFetch } = useMockApi()
const { data: catalog, refresh, pending } = await useAsyncData('catalog', () => mockFetch<any>('/api/catalog'))
const search = ref('')
const resourceOpen = ref(false)
const editingResourceId = ref<string | null>(null)
const changeReason = ref('')
const saving = ref(false)

const domains = ['信息板块', '供应链板块', '设计师板块', '权限中心']
const riskItems = [
  { label: '低风险', value: 'LOW' },
  { label: '中风险', value: 'MEDIUM' },
  { label: '高风险', value: 'HIGH' }
]
const createStatusItems = [{ label: '草稿', value: 'DRAFT' }, { label: '启用', value: 'ACTIVE' }]
const editStatusItems = [...createStatusItems, { label: '停用', value: 'DISABLED' }]

const form = reactive({
  name: '',
  code: '',
  domain: '信息板块',
  dataDomainCode: null as string | null,
  riskLevel: 'LOW' as RiskLevel,
  status: 'DRAFT' as CatalogStatus
})

const filteredResources = computed(() => (catalog.value?.resources || []).filter((item: any) =>
  `${item.name} ${item.code} ${item.domain}`.toLowerCase().includes(search.value.toLowerCase())
))
const dataDomainOptions = computed(() => (catalog.value?.dataDomains || []).map((item: any) => ({
  label: `${item.name} · ${item.code}`,
  value: item.code
})))
const modalTitle = computed(() => editingResourceId.value ? '编辑资源' : '新建资源')

function riskColor(risk: string): 'error' | 'warning' | 'neutral' {
  return risk === 'HIGH' ? 'error' : risk === 'MEDIUM' ? 'warning' : 'neutral'
}

function statusColor(status: string): 'success' | 'warning' | 'neutral' {
  return status === 'ACTIVE' ? 'success' : status === 'DRAFT' ? 'warning' : 'neutral'
}

function statusLabel(status: string) {
  return status === 'ACTIVE' ? '已启用' : status === 'DRAFT' ? '草稿' : '已停用'
}

function resetForm() {
  editingResourceId.value = null
  changeReason.value = ''
  Object.assign(form, { name: '', code: '', domain: '信息板块', dataDomainCode: null, riskLevel: 'LOW', status: 'DRAFT' })
}

function createResource() {
  resetForm()
  resourceOpen.value = true
}

function editResource(item: any) {
  editingResourceId.value = item.id
  changeReason.value = ''
  Object.assign(form, {
    name: item.name,
    code: item.code,
    domain: item.domain,
    dataDomainCode: item.dataDomainCode || null,
    riskLevel: item.riskLevel,
    status: item.status
  })
  resourceOpen.value = true
}

async function saveResource() {
  saving.value = true
  try {
    const payload = {
      name: form.name,
      domain: form.domain,
      dataDomainCode: form.dataDomainCode,
      riskLevel: form.riskLevel,
      status: form.status
    }
    if (editingResourceId.value) {
      await mockFetch(`/api/catalog/resources/${editingResourceId.value}`, { method: 'PUT', body: { ...payload, reason: changeReason.value } })
      showSuccess('资源已更新', '资源码保持不变，菜单包与授权目录已同步刷新。')
    } else {
      await mockFetch('/api/catalog/resources', { method: 'POST', body: { ...payload, code: form.code } })
      showSuccess('资源已登记', '该资源码可直接供前端路由、按钮与后端执行点共同校验。')
    }
    resourceOpen.value = false
    resetForm()
    await refresh()
  } catch (error) {
    showError(error)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <PageHeader title="资源是唯一授权原子" description="原“功能”统一改名为“资源”。资源表达一个稳定业务动作；前端与后端共同使用同一资源码，API 不再单独建模。">
      <UButton color="primary" icon="i-lucide-box" label="新建资源" @click="createResource" />
    </PageHeader>

    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>资源目录</h2>
          <p>角色、用户与菜单包只授权这里的资源，不存在第二层报表 / 模板资源。</p>
        </div>
        <UBadge color="primary" variant="subtle" :label="`${catalog?.resources?.length || 0} 个资源`" />
      </div>
      <div class="panel-body">
        <div class="toolbar">
          <UInput v-model="search" class="search-box" icon="i-lucide-search" placeholder="搜索资源名称、资源码或板块" />
          <UButton color="neutral" variant="ghost" icon="i-lucide-refresh-cw" :loading="pending" @click="refresh()" />
        </div>

        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>资源</th>
                <th>业务板块</th>
                <th>数据域</th>
                <th>风险</th>
                <th>菜单绑定</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in filteredResources" :key="item.id">
                <td>
                  <div class="primary-cell">
                    <div class="row-avatar"><UIcon name="i-lucide-box" size="15" /></div>
                    <div><b>{{ item.name }}</b><small class="code">{{ item.code }}</small></div>
                  </div>
                </td>
                <td>{{ item.domain }}</td>
                <td><span class="code">{{ item.dataDomainCode || '不受行级范围控制' }}</span></td>
                <td><UBadge :color="riskColor(item.riskLevel)" variant="subtle" :label="item.riskLevel" /></td>
                <td>{{ item.menuCount }} 个</td>
                <td><UBadge :color="statusColor(item.status)" variant="subtle" :label="statusLabel(item.status)" /></td>
                <td><UButton color="primary" variant="ghost" size="sm" icon="i-lucide-pencil" label="编辑" @click="editResource(item)" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <UModal v-model:open="resourceOpen" :title="modalTitle" description="资源码是前端体验控制与后端强制校验共同使用的稳定契约。" :dismissible="!saving" :ui="{ content: 'sm:max-w-2xl' }">
      <template #body>
        <div class="form-grid">
          <UFormField label="资源名称" required>
            <UInput v-model="form.name" placeholder="例如：新建采购单" />
          </UFormField>
          <UFormField label="稳定资源码" required>
            <UInput v-model="form.code" class="code" :disabled="!!editingResourceId" placeholder="sc.purchase_order.create" />
            <p v-if="editingResourceId" class="form-help">资源码启用后作为研发契约保持不变。</p>
          </UFormField>
          <UFormField label="业务板块" required>
            <USelect v-model="form.domain" :items="domains" />
          </UFormField>
          <UFormField label="风险等级" required>
            <USelect v-model="form.riskLevel" :items="riskItems" value-key="value" />
          </UFormField>
          <UFormField label="数据域（选填）" description="留空表示不参与行级数据范围判定。">
            <USelect v-model="form.dataDomainCode" :items="dataDomainOptions" value-key="value" placeholder="不受行级范围控制" />
          </UFormField>
          <UFormField label="状态" required>
            <USelect v-model="form.status" :items="editingResourceId ? editStatusItems : createStatusItems" value-key="value" />
          </UFormField>
          <UFormField v-if="editingResourceId" label="变更说明（选填）" class="span-2">
            <UTextarea v-model="changeReason" autoresize placeholder="简要说明本次调整" />
          </UFormField>
        </div>
        <div class="inline-alert" style="margin-top: 14px">
          <UIcon name="i-lucide-code-xml" size="16" />
          <span>受保护的控制器、服务方法、任务和前端交互点直接声明资源码；不再维护 API → 资源 → 功能的二次映射。</span>
        </div>
      </template>
      <template #footer>
        <div class="modal-actions">
          <UButton color="neutral" variant="ghost" label="取消" :disabled="saving" @click="resourceOpen = false" />
          <UButton color="primary" :label="editingResourceId ? '保存修改' : '保存资源'" :loading="saving" @click="saveResource" />
        </div>
      </template>
    </UModal>
  </div>
</template>
