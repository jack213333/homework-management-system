import { test,expect } from '@playwright/test'
test('未登录页面不循环请求用户接口',async({page})=>{
  let requests=0;page.on('request',r=>{if(new URL(r.url()).pathname==='/api/auth/me/')requests++})
  await page.goto('/login');await expect(page.getByRole('heading',{name:'欢迎回来'})).toBeVisible();await page.waitForTimeout(1200)
  expect(requests).toBeLessThanOrEqual(2)
})
test('学生登录后只看到自己课程，刷新保留会话',async({page})=>{
  await page.goto('/login');await page.getByLabel('账号',{exact:true}).fill('student01');await page.getByLabel('密码',{exact:true}).fill('DemoPass123!');await page.getByRole('button',{name:'登录工作台'}).click();
  await expect(page.getByRole('heading',{name:'你好，顾知行',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'我的课程',exact:true}).click();
  await expect(page.getByRole('heading',{name:'软件设计综合实训',exact:true})).toBeVisible();
  await expect(page.getByText('Java 面向对象设计',{exact:true})).toHaveCount(0);
  await page.reload();await expect(page.getByRole('heading',{name:'软件设计综合实训',exact:true})).toBeVisible();
})
test('窄屏仍能退出登录',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/login');await page.getByLabel('账号',{exact:true}).fill('student01');await page.getByLabel('密码',{exact:true}).fill('DemoPass123!');await page.getByRole('button',{name:'登录工作台'}).click();await expect(page.getByRole('heading',{name:'你好，顾知行'})).toBeVisible()
  await page.getByRole('button',{name:'退出登录',exact:true}).click();await expect(page.getByRole('heading',{name:'欢迎回来'})).toBeVisible()
})
