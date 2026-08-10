import { expect, test } from '@playwright/test'

async function waitForNuxt(page: import('@playwright/test').Page) {
  await page.waitForLoadState('networkidle')
  await page.waitForFunction(() => Boolean((document.querySelector('#__nuxt') as HTMLElement & { __vue_app__?: unknown } | null)?.__vue_app__))
}

test('overview and navigation expose the scoped architecture', async ({ page }) => {
  await page.goto('/')
  await waitForNuxt(page)
  await expect(page.getByRole('heading', { name: '把授权语言还给业务' })).toBeVisible()
  await expect(page.getByText('单企业模式', { exact: true })).toBeVisible()
  await expect(page.getByText('不包含多租户或用户级 DENY')).toBeVisible()
  await expect(page.getByRole('link', { name: '权限模拟器' })).toBeVisible()
})

test('user create and tree authorization flows are interactive', async ({ page }) => {
  await page.goto('/users')
  await waitForNuxt(page)
  await page.getByRole('button', { name: '新建用户' }).click()
  const createDialog = page.getByRole('dialog', { name: '新建用户' })
  await expect(createDialog.getByRole('textbox', { name: '姓名*' })).toBeVisible()
  await expect(createDialog.getByRole('button', { name: '创建用户' })).toBeVisible()
  await createDialog.getByRole('button', { name: '取消' }).click()

  await page.getByRole('row', { name: /EMP0108/ }).getByRole('button', { name: '授权' }).click()
  const authDialog = page.getByRole('dialog', { name: /用户授权/ })
  await expect(authDialog.getByRole('tree')).toBeVisible()
  await authDialog.getByRole('button', { name: '数据范围' }).click()
  await expect(authDialog.getByText('crm.customer', { exact: true })).toBeVisible()
  await authDialog.getByRole('button', { name: '有效权限' }).click()
  await expect(authDialog.getByText('菜单 CORE：客户列表').first()).toBeVisible()
})

test('menu package keeps high-risk capabilities out of CORE', async ({ page }) => {
  await page.goto('/menus')
  await waitForNuxt(page)
  await page.getByRole('button', { name: '编辑权限包' }).click()
  const dialog = page.getByRole('dialog', { name: /发布权限包/ })
  await expect(dialog.getByRole('button', { name: '删除客户 CORE' })).toBeDisabled()
  await expect(dialog.getByRole('button', { name: '删除客户 OPTIONAL' })).toBeEnabled()
})

test('function and business resource edit flows are available', async ({ page }) => {
  await page.goto('/catalog')
  await waitForNuxt(page)

  await page.getByRole('button', { name: '编辑' }).first().click()
  const functionDialog = page.getByRole('dialog', { name: '编辑业务功能' })
  await expect(functionDialog.getByText('功能码启用后作为研发契约保持不变。')).toBeVisible()
  await expect(functionDialog.getByRole('button', { name: '保存修改' })).toBeVisible()
  await functionDialog.getByRole('button', { name: '取消' }).click()

  await page.getByRole('button', { name: /业务资源 \d+/ }).click()
  await page.getByRole('button', { name: '编辑' }).first().click()
  const resourceDialog = page.getByRole('dialog', { name: '编辑业务资源' })
  await expect(resourceDialog.getByText('业务资源不是权限项')).toBeVisible()
  await expect(resourceDialog.getByText('角色、用户和菜单均不能获得业务资源。')).toBeVisible()
})

test('simulator applies capability AND row scope', async ({ page }) => {
  await page.goto('/simulator')
  await waitForNuxt(page)
  await page.getByRole('button', { name: '运行模拟' }).click()
  await expect(page.getByRole('heading', { name: '拒绝访问' })).toBeVisible()
  await expect(page.getByText('能力：通过；数据行：超出范围。')).toBeVisible()
  await expect(page.getByText('2 / 5 条客户可见')).toBeVisible()
})
