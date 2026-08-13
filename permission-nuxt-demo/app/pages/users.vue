<script setup lang="ts">
definePageMeta({ title: '用户管理' })
const { showError, showSuccess } = useAppApi()
const { mockFetch } = useMockApi()
const { data: users, refresh, pending } = await useAsyncData('users', () => mockFetch<any[]>('/api/users'))

const search = ref('')
const createOpen = ref(false)
const saving = ref(false)
const authOpen = ref(false)
const authTarget = reactive({ id: '', name: '' })
const form = reactive({ displayName: '', username: '', status: 'ACTIVE' as 'ACTIVE' | 'DISABLED' })

const filtered = computed(() => (users.value || []).filter(user => `${user.displayName} ${user.username} ${user.employeeNo || ''} ${user.orgUnitName || ''}`.toLowerCase().includes(search.value.toLowerCase())))

function initials(name: string) { return name.slice(-2) }
function statusColor(status: string) { return status === 'ACTIVE' ? 'success' : 'neutral' }
function openAuth(user: any) { authTarget.id = user.id; authTarget.name = user.displayName; authOpen.value = true }
function resetForm() { Object.assign(form, { displayName: '', username: '', status: 'ACTIVE' }) }
function openCreateUser() { resetForm(); createOpen.value = true }

async function createUser() {
  saving.value = true
  try {
    await mockFetch('/api/users', { method: 'POST', body: form })
    showSuccess('用户已创建', '用户基础账号已保存；请到“组织与岗位”设置任职，再按需授权角色或资源。')
    createOpen.value = false
    resetForm()
    await refresh()
  } catch (error) { showError(error) } finally { saving.value = false }
}
</script>

<template>
  <div>
    <PageHeader title="用户与例外授权" description="用户页只维护基础账号和能力授权；组织、岗位与工号统一在“组织与岗位”页面维护。">
      <UButton color="primary" icon="i-lucide-user-round-plus" label="新建用户" @click="openCreateUser" />
    </PageHeader>

    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>用户列表</h2>
          <p>{{ users?.length || 0 }} 位用户，授权变化会同步有效权限与审计记录。</p>
        </div>
        <UBadge color="primary" variant="subtle" label="单一企业" />
      </div>
      <div class="panel-body">
        <div class="toolbar">
          <UInput v-model="search" class="search-box" icon="i-lucide-search" placeholder="搜索姓名、账号、工号或组织" />
          <UButton color="neutral" variant="ghost" icon="i-lucide-refresh-cw" :loading="pending" @click="refresh()" />
        </div>
        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>用户</th>
                <th>组织 / 岗位</th>
                <th>角色模板</th>
                <th>直授</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in filtered" :key="user.id">
                <td>
                  <div class="primary-cell">
                    <div class="row-avatar">{{ initials(user.displayName) }}</div>
                    <div><b>{{ user.displayName }}</b><small>{{ user.employeeNo ? `${user.employeeNo} · ` : '' }}{{ user.username }}</small></div>
                  </div>
                </td>
                <td><b style="font-size: 11px">{{ user.orgUnitName || '未分配' }}</b>
                  <div class="muted">{{ user.positionName || '无岗位' }}</div>
                </td>
                <td>
                  <div class="tags">
                    <UBadge v-for="role in user.roleNames" :key="role" color="primary" variant="subtle" size="sm"
                      :label="role" /><span v-if="!user.roleNames.length" class="muted">无</span>
                  </div>
                </td>
                <td>
                  <UBadge :color="user.directGrantCount ? 'warning' : 'neutral'" variant="subtle"
                    :label="`${user.directGrantCount} 项`" />
                </td>
                <td>
                  <UBadge :color="statusColor(user.status)" variant="subtle"
                    :label="user.status === 'ACTIVE' ? '启用' : '停用'" />
                </td>
                <td>
                  <div class="row-actions">
                    <UButton color="primary" variant="ghost" size="sm" icon="i-lucide-shield-plus" label="授权"
                      @click="openAuth(user)" />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <UModal v-model:open="createOpen" title="新建用户" description="这里只创建基础账号；任职与授权在各自页面单独设置。" :dismissible="!saving"
      :ui="{ content: 'sm:max-w-xl' }">
      <template #body>
        <div class="form-grid">
          <UFormField label="姓名" required>
            <UInput v-model="form.displayName" placeholder="例如：李晨" />
          </UFormField>
          <UFormField label="登录账号" required>
            <UInput v-model="form.username" placeholder="li.chen" />
          </UFormField>
          <UFormField label="状态" required>
            <USelect v-model="form.status"
              :items="[{ label: '启用', value: 'ACTIVE' }, { label: '停用', value: 'DISABLED' }]" value-key="value" />
          </UFormField>
        </div>
        <div class="inline-alert" style="margin-top: 14px">
          <UIcon name="i-lucide-info" size="16" /><span>保存后用户处于“未分配组织 / 无岗位”状态。请到组织与岗位页设置任职，并可在设置任职时补充工号；角色和资源仍从本页“授权”入口配置。</span>
        </div>
      </template>
      <template #footer>
        <div class="modal-actions">
          <UButton color="neutral" variant="ghost" label="取消" :disabled="saving" @click="createOpen = false" />
          <UButton color="primary" icon="i-lucide-check" label="创建用户" :loading="saving" @click="createUser" />
        </div>
      </template>
    </UModal>

    <AuthorizationDrawer v-model:open="authOpen" subject-type="user" :subject-id="authTarget.id"
      :subject-name="authTarget.name" @saved="refresh" />
  </div>
</template>
