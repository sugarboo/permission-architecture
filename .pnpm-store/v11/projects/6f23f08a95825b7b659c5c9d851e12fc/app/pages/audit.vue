<script setup lang="ts">
definePageMeta({ title: '授权审计' })
const { mockFetch } = useMockApi()
const { data: audit, refresh, pending } = await useAsyncData('audit', () => mockFetch<any[]>('/api/audit'))
const search = ref('')
const filtered = computed(() => (audit.value || []).filter(item => `${item.summary} ${item.action} ${item.actorName} ${item.entityType}`.toLowerCase().includes(search.value.toLowerCase())))
function formatTime(value: string) { return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }
function actionColor(action: string): 'primary' | 'success' | 'warning' | 'neutral' { return action.includes('CREATE') ? 'success' : action.includes('UPDATE') || action.includes('PUBLISH') ? 'primary' : action.includes('GRANT') ? 'warning' : 'neutral' }
</script>

<template>
  <div>
    <PageHeader title="每一次扩权都能回答为什么" description="创建、授权、菜单包发布、岗位数据策略调整都会记录操作者、主体、原因和 before / after 差异。">
      <UButton color="neutral" variant="outline" icon="i-lucide-refresh-cw" label="刷新审计" :loading="pending" @click="refresh()" />
    </PageHeader>
    <section class="panel">
      <div class="panel-head"><div><h2>审计事件</h2><p>最近 {{ audit?.length || 0 }} 条权限中心事件。</p></div><UBadge color="success" variant="subtle" label="本机 Mock 审计" /></div>
      <div class="panel-body">
        <div class="toolbar"><UInput v-model="search" class="search-box" icon="i-lucide-search" placeholder="搜索摘要、动作、操作者或主体" /></div>
        <div class="table-scroll"><table class="data-table"><thead><tr><th>时间</th><th>动作</th><th>摘要</th><th>主体</th><th>操作者</th><th>差异</th></tr></thead><tbody>
          <tr v-for="item in filtered" :key="item.id"><td class="muted">{{ formatTime(item.createdAt) }}</td><td><UBadge :color="actionColor(item.action)" variant="subtle" :label="item.action" /></td><td><b style="font-size: 11px">{{ item.summary }}</b></td><td><span class="code">{{ item.entityType }} / {{ item.entityId }}</span></td><td>{{ item.actorName }}<div class="muted">{{ item.actorUsername }}</div></td><td><UPopover><UButton color="neutral" variant="ghost" size="sm" icon="i-lucide-braces" label="JSON" /><template #content><pre style="max-width: 430px; max-height: 260px; overflow: auto; padding: 12px; font-size: 10px">{{ JSON.stringify(JSON.parse(item.detailJson || '{}'), null, 2) }}</pre></template></UPopover></td></tr>
        </tbody></table></div>
      </div>
    </section>
  </div>
</template>
