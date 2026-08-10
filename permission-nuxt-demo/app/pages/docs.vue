<script setup lang="ts">
definePageMeta({ title: '方案文档' })

const sections = [
  { id: 'summary', label: '架构总览' },
  { id: 'model', label: '核心对象' },
  { id: 'flow', label: '授权计算' },
  { id: 'data', label: '数据权限' },
  { id: 'backend', label: '前后端执行' },
  { id: 'lifecycle', label: '目录治理' },
  { id: 'workflow', label: '研发工作流' },
  { id: 'boundary', label: '本期边界' }
]
</script>

<template>
  <div>
    <PageHeader title="实现随方案一起交付" description="本页内嵌 Demo 当前执行的核心口径；完整设计方案位于项目根目录，README 提供表结构、API 和运行说明。">
      <UButton to="/simulator" color="primary" icon="i-lucide-flask-conical" label="打开模拟器" />
    </PageHeader>

    <div class="docs-layout">
      <aside class="panel docs-nav">
        <div class="panel-head">
          <div>
            <h3>本页目录</h3>
          </div>
        </div>
        <div class="panel-body nav-list">
          <a v-for="item in sections" :key="item.id" :href="`#${item.id}`" class="nav-link" style="color: #526178">
            <UIcon name="i-lucide-hash" size="13" />{{ item.label }}
          </a>
        </div>
      </aside>

      <article class="panel docs-content">
        <h2 id="summary">架构总览</h2>
        <p>本系统采用 <b>RBAC 角色模板 + 用户直接加授 + 菜单权限包 + 组织/岗位数据范围</b>。运营侧只有“菜单”和“功能”两类可授权对象；前后端共同使用稳定业务功能码，API 只是功能校验的执行点。</p>
        <pre>有效能力(u) = 角色功能(u) ∪ 用户直授功能(u) ∪ 菜单 CORE 功能(u)
允许(u, 功能码, 数据对象)
  = 已认证
  AND 功能码 ∈ 有效能力(u)
  AND 数据对象 ∈ 岗位在对应数据域的有效范围</pre>

        <h2 id="model">核心对象</h2>
        <table>
          <thead>
            <tr>
              <th>对象</th>
              <th>职责</th>
              <th>是否直接授权</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>用户</td>
              <td>具体登录主体，可获得少量、有期限的 ALLOW 加授</td>
              <td>授权主体</td>
            </tr>
            <tr>
              <td>角色</td>
              <td>复用常规菜单和功能的模板</td>
              <td>授给用户</td>
            </tr>
            <tr>
              <td>功能</td>
              <td>唯一能力合同，如“创建采购单” / <code>sc.purchase_order.create</code></td>
              <td>是</td>
            </tr>
            <tr>
              <td>菜单</td>
              <td>板块 → 目录 → 页面菜单；页面叶子携带功能包</td>
              <td>仅页面菜单</td>
            </tr>
            <tr>
              <td>业务资源</td>
              <td>报表或模板目录；可关联功能便于追踪，但不参与授权</td>
              <td>否</td>
            </tr>
            <tr>
              <td>岗位</td>
              <td>用户在部门中的有效任职及数据策略来源</td>
              <td>否</td>
            </tr>
          </tbody>
        </table>
        <p><b>资源 scope 已收敛：</b>仅保留 <code>REPORT</code> 和 <code>TEMPLATE</code> 两类业务资源。API、任务、集成操作不进入资源目录，也不存在“资源权限”。</p>

        <h2 id="flow">授权计算</h2>
        <h3>菜单包</h3>
        <p>CORE 是打开页面所必需的最小功能集合，随页面菜单自动展开；OPTIONAL 包含新建、编辑、导出、删除、审批等能力，由管理员单独选择。高风险功能永远不能成为 CORE。</p>
        <h3>父节点语义</h3>
        <p>板块或目录勾选只保存“当前页面菜单叶子集合”。未来新增子菜单不会静默进入历史授权，避免通配扩权。</p>
        <h3>来源去重</h3>
        <p>同一功能可同时来自角色、用户直授和菜单 CORE。撤销某一来源时，如果仍有其他来源，权限继续有效。业务资源与功能的关联只用于目录追踪，不会增加任何有效能力。</p>

        <h2 id="data">数据权限</h2>
        <p>数据范围按“岗位 × 数据域”配置，而不是挂在业务角色上。第一版范围固定为
          NONE、SELF、DEPT、DEPT_AND_DESCENDANTS、CUSTOM_DEPTS、ALL。多个有效任职按允许范围并集合并，未配置按 NONE。</p>
        <pre>采购专员 @ 华东供应链组
  sc.purchase_order → SELF

采购主管 @ 供应链部
  sc.purchase_order → DEPT_AND_DESCENDANTS</pre>

        <h2 id="backend">前后端执行</h2>
        <p>前端路由、按钮与后端控制器/服务方法使用同一个功能码。前端隐藏只改善体验；后端逐请求强制校验，并在列表、详情、更新、删除、导出和批量操作上复用同一数据谓词。</p>
        <pre>// 前端：体验控制
const canCreate = hasFunction('sc.purchase_order.create')

// 后端：安全边界
requireFunction(event, 'sc.purchase_order.create')
const scope = resolveDataAccess(userId, 'sc.purchase_order')</pre>
        <p>新增 API 不需要先创建“API 资源”再映射功能；它必须直接声明一个已启用功能码。未声明、功能不存在或功能已停用均默认拒绝，CI 应扫描漏保护的管理端执行点。</p>

        <h2 id="lifecycle">目录治理</h2>
        <ul>
          <li>功能与业务资源都支持新建、编辑、停用，并记录变更原因和 before / after 审计。</li>
          <li>稳定代码及其动作/资源类型创建后不可编辑；语义变化时应新建对象、迁移引用，再停用旧对象。</li>
          <li>启用功能前确认风险等级、数据域和前后端执行点；功能不依赖业务资源即可启用。</li>
          <li>业务资源可选关联一个或多个功能，仅回答“从哪里访问/维护”，不能用于鉴权。</li>
        </ul>

        <h2 id="workflow">研发工作流</h2>
        <ol>
          <li>产品与后端登记稳定功能码、风险等级及数据域，例如 <code>sc.purchase_order.create</code>。</li>
          <li>后端 API / 服务方法直接声明该功能码；CI 检查未保护执行点和不存在的功能码。</li>
          <li>前端以同一功能码控制按钮与路由，但不承担安全放行。</li>
          <li>如存在下载报表或录入模板，再登记 REPORT / TEMPLATE，并从资源侧关联相关功能。</li>
          <li>菜单维护者配置 CORE / OPTIONAL，预览影响后发布。</li>
          <li>权限管理员以角色为主、用户加授为例外；组织管理员维护岗位与数据域范围。</li>
        </ol>

        <h2 id="boundary">本期边界</h2>
        <p>明确不引入多租户、tenant_id、角色层级、用户级 DENY、API 资源权限、任务/集成资源目录、对象实例 ACL、任意 SQL/表达式型 ABAC、字段级授权或独立策略引擎。Demo
          的身份头仅用于本地演示，生产环境应接入企业 SSO / Session。</p>
      </article>
    </div>
  </div>
</template>
