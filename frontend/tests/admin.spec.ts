import {test,expect} from '@playwright/test'
test('管理员停用账号使旧会话失效，并能恢复账号',async({page,browser})=>{
  const studentContext=await browser.newContext();const student=await studentContext.newPage()
  async function login(p:typeof page,user:string){await p.goto('/login');await p.getByLabel('账号',{exact:true}).fill(user);await p.getByLabel('密码',{exact:true}).fill('DemoPass123!');await p.getByRole('button',{name:'登录工作台'}).click();await expect(p.getByRole('heading',{level:1})).toContainText('你好')}
  await login(page,'admin');await login(student,'student04');await page.goto('/admin/users');const row=page.getByRole('row').filter({hasText:'student04'});await row.getByRole('button',{name:'编辑',exact:true}).click();await page.getByLabel('账号可用').uncheck();await page.getByRole('button',{name:'保存账号'}).click();await expect(page.getByText('账号信息已保存')).toBeVisible()
  try{await student.goto('/dashboard');await expect(student.getByRole('heading',{name:'欢迎回来'})).toBeVisible();expect((await student.request.get('/api/auth/me/')).status()).toBe(403)}finally{await row.getByRole('button',{name:'编辑',exact:true}).click();await page.getByLabel('账号可用').check();await page.getByRole('button',{name:'保存账号'}).click();await expect(row.getByText('正常',{exact:true})).toBeVisible();await studentContext.close()}
})
