<script setup lang="ts">
definePageMeta({ title: '权限总览' })
const { data, pending, refresh } = await useAsyncData('bootstrap', () => $fetch<any>('/api/bootstrap'))

const stats = computed(() => [
  { label: '有效用户', value: data.value?.counts?.users || 0, icon: 'i-lucide-users-round', color: '#246bfd', tint: '#edf4ff' },
  { label: '角色模板', value: data.value?.counts?.roles || 0, icon: 'i-lucide-shield-check', color: '#6d5bd0', tint: '#f1efff' },
  { label: '稳定业务功能', value: data.value?.counts?.functions || 0, icon: 'i-lucide-boxes', color: '#18a77b', tint: '#eaf9f4' },
  { label: '用户直接加授', value: data.value?.counts?.directGrants || 0, icon: 'i-lucide-user-round-plus', color: '#d97706', tint: '#fff6e8' }
])

function formatTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}
</script>

<template>
  <div>
    <PageHeader title="把授权语言还给业务" description="运营人员分配“查看客户、审批采购单”等稳定功能；前后端共用同一功能码，前端负责体验，后端负责最终放行。">
      <UButton color="neutral" variant="outline" icon="i-lucide-refresh-cw" label="刷新上下文" :loading="pending"
        @click="refresh()" />
      <UButton to="/users" color="primary" icon="i-lucide-user-round-plus" label="发起用户授权" />
    </PageHeader>

    <div class="stats-grid">
      <StatCard v-for="stat in stats" :key="stat.label" v-bind="stat" />
    </div>

    <div class="panel" style="margin-bottom: 18px">
      <div class="panel-head">
        <div>
          <h2>一次请求的最终判定</h2>
          <p>能力与数据范围必须同时满足；菜单可见从来不是安全边界。</p>
        </div>
        <UBadge color="primary" variant="subtle" :label="`Policy v${data?.versions?.policy_version || '—'}`" />
      </div>
      <div class="panel-body">
        <div class="formula-strip">
          <div class="formula-item"><b>角色模板</b><span>批量复用常规授权</span></div>
          <div class="formula-op">∪</div>
          <div class="formula-item"><b>用户直接加授</b><span>少量、临时、可审计例外</span></div>
          <div class="formula-op">∪</div>
          <div class="formula-item"><b>菜单 CORE</b><span>页面所需的安全最小能力</span></div>
          <div class="formula-op">AND</div>
          <div class="formula-item"><b>岗位 × 数据域</b><span>本人 / 部门 / 部门及下级 / 指定部门 / 全部</span></div>
        </div>
      </div>
    </div>

    <div class="content-grid">
      <section class="panel">
        <div class="panel-head">
          <div>
            <h2>模块健康度</h2>
            <p>每一层都保留自己的职责边界。</p>
          </div>
          <UBadge color="success" variant="subtle" label="后端强制校验" />
        </div>
        <div class="panel-body">
          <div class="detail-grid">
            <div class="detail-cell"><span>菜单叶子</span><b>{{ data?.counts?.menus || 0 }} 个</b></div>
            <div class="detail-cell"><span>业务资源</span><b>{{ data?.counts?.resources || 0 }} 个</b></div>
            <div class="detail-cell"><span>部门 / 小组</span><b>{{ data?.counts?.orgUnits || 0 }} 个</b></div>
            <div class="detail-cell"><span>岗位模板</span><b>{{ data?.counts?.positions || 0 }} 个</b></div>
            <div class="detail-cell"><span>目录版本</span><b>v{{ data?.versions?.catalog_version || 0 }}</b></div>
            <div class="detail-cell"><span>缓存键</span><b class="code">userId + policyVersion</b></div>
          </div>
          <div class="inline-alert" style="margin-top: 14px">
            <UIcon name="i-lucide-info" size="16" /><span>本 Demo 使用配置化的周睿作为演示请求主体；真实项目需替换为企业 SSO / Session
              身份。权限判定和数据过滤均已在服务端实现。</span>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <div>
            <h2>最近授权审计</h2>
            <p>变更原因、主体和差异可追溯。</p>
          </div>
          <UButton to="/audit" color="neutral" variant="ghost" size="sm" label="查看全部" />
        </div>
        <div class="panel-body audit-list">
          <div v-for="item in data?.recentAudit || []" :key="item.id" class="audit-item">
            <span class="audit-dot" />
            <div class="audit-copy"><b>{{ item.summary }}</b>
              <p>{{ item.actorName }} · {{ item.action }}</p>
            </div><span class="audit-time">{{ formatTime(item.createdAt) }}</span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
