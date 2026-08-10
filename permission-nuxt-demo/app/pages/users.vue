<script setup lang="ts">
definePageMeta({ title: '用户管理' })
const { showError, showSuccess } = useAppApi()
const { data: users, refresh, pending } = await useAsyncData('users', () => $fetch<any[]>('/api/users'))
const { data: org } = await useAsyncData('org-for-users', () => $fetch<any>('/api/org'))
const { data: roles } = await useAsyncData('roles-for-users', () => $fetch<any[]>('/api/roles'))

const search = ref('')
const createOpen = ref(false)
const saving = ref(false)
const authOpen = ref(false)
const authTarget = reactive({ id: '', name: '' })
const form = reactive({ displayName: '', username: '', employeeNo: '', email: '', phone: '', orgUnitId: '', positionId: '', roleIds: [] as string[], status: 'ACTIVE' as 'ACTIVE' | 'DISABLED' })

const filtered = computed(() => (users.value || []).filter(user => `${user.displayName} ${user.username} ${user.employeeNo} ${user.orgUnitName || ''}`.toLowerCase().includes(search.value.toLowerCase())))
const orgOptions = computed(() => (org.value?.units || []).filter((item: any) => item.unitType !== 'COMPANY' && item.status === 'ACTIVE').map((item: any) => ({ label: item.name, value: item.id })))
const positionOptions = computed(() => (org.value?.positions || []).filter((item: any) => item.status === 'ACTIVE').map((item: any) => ({ label: `${item.name} · ${item.orgUnitName}`, value: item.id })))

function initials(name: string) { return name.slice(-2) }
function statusColor(status: string) { return status === 'ACTIVE' ? 'success' : 'neutral' }
function openAuth(user: any) { authTarget.id = user.id; authTarget.name = user.displayName; authOpen.value = true }
function toggleRole(roleId: string, checked: boolean) { const next = new Set(form.roleIds); checked ? next.add(roleId) : next.delete(roleId); form.roleIds = [...next] }
function resetForm() { Object.assign(form, { displayName: '', username: '', employeeNo: '', email: '', phone: '', orgUnitId: '', positionId: '', roleIds: [], status: 'ACTIVE' }) }

async function createUser() {
  saving.value = true
  try {
    await $fetch('/api/users', { method: 'POST', body: form })
    showSuccess('用户已创建', '用户、主任职、初始角色与审计记录已同步写入。')
    createOpen.value = false
    resetForm()
    await refresh()
  } catch (error) { showError(error) } finally { saving.value = false }
}
</script>

<template>
  <div>
    <PageHeader title="用户与例外授权" description="角色用于常规权限复用；用户直授只做 ALLOW 型例外，授权原因必填，失效时间与来源工单按需填写。">
      <UButton color="primary" icon="i-lucide-user-round-plus" label="新建用户" @click="createOpen = true" />
    </PageHeader>

    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>用户列表</h2>
          <p>{{ users?.length || 0 }} 位用户，授权变化实时提升 authzVersion。</p>
        </div>
        <UBadge color="primary" variant="subtle" label="单一企业" />
      </div>
      <div class="panel-body">
        <div class="toolbar">
          <UInput v-model="search" class="search-box" icon="i-lucide-search" placeholder="搜索姓名、账号、工号或部门" />
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
                <th>策略版本</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in filtered" :key="user.id">
                <td>
                  <div class="primary-cell">
                    <div class="row-avatar">{{ initials(user.displayName) }}</div>
                    <div><b>{{ user.displayName }}</b><small>{{ user.employeeNo }} · {{ user.username }}</small></div>
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
                <td><span class="code">v{{ user.authzVersion }}</span></td>
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

    <UModal v-model:open="createOpen" title="新建用户" description="创建用户并分配主任职与初始角色；账号和工号需保持唯一。" :dismissible="!saving"
      :ui="{ content: 'sm:max-w-2xl' }">
      <template #body>
        <div class="form-grid">
          <UFormField label="姓名" required>
            <UInput v-model="form.displayName" placeholder="例如：李晨" />
          </UFormField>
          <UFormField label="登录账号" required>
            <UInput v-model="form.username" placeholder="li.chen" />
          </UFormField>
          <UFormField label="工号" required>
            <UInput v-model="form.employeeNo" placeholder="EMP0401" />
          </UFormField>
          <UFormField label="状态" required>
            <USelect v-model="form.status"
              :items="[{ label: '启用', value: 'ACTIVE' }, { label: '停用', value: 'DISABLED' }]" value-key="value" />
          </UFormField>
          <UFormField label="邮箱">
            <UInput v-model="form.email" type="email" placeholder="name@example.com" />
          </UFormField>
          <UFormField label="手机号">
            <UInput v-model="form.phone" placeholder="13800000000" />
          </UFormField>
          <UFormField label="主部门" required>
            <USelect v-model="form.orgUnitId" :items="orgOptions" value-key="value" placeholder="选择部门 / 小组" />
          </UFormField>
          <UFormField label="岗位" required>
            <USelect v-model="form.positionId" :items="positionOptions" value-key="value" placeholder="选择岗位" />
          </UFormField>
          <UFormField label="初始角色" class="span-2">
            <div class="source-list">
              <label v-for="role in roles || []" :key="role.id" class="source-card"
                style="display: flex; gap: 10px; align-items: center">
                <UCheckbox :model-value="form.roleIds.includes(role.id)"
                  @update:model-value="toggleRole(role.id, $event === true)" /><span><b>{{ role.name }}</b>
                  <p>{{ role.code }} · {{ role.domain }}</p>
                </span>
              </label>
            </div>
          </UFormField>
        </div>
        <div class="inline-alert" style="margin-top: 14px">
          <UIcon name="i-lucide-info" size="16" /><span>岗位决定数据范围，角色决定业务能力。新建用户不会因为选择角色而自动获得全公司数据。</span>
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
