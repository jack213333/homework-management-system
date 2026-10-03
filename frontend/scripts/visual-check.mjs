import {chromium} from '@playwright/test'
import {mkdir,writeFile} from 'node:fs/promises'
const directory=new URL('../../artifacts/screenshots/',import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1')
await mkdir(directory,{recursive:true})
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'D:/Tools/gstack-playwright/chromium-1234/chrome-win64/chrome.exe'})
const context=await browser.newContext({viewport:{width:1440,height:1000}})
const page=await context.newPage(),errors=[]
page.on('pageerror',e=>errors.push(e.message))
const base=process.env.HOMEWORK_E2E_URL||'http://127.0.0.1:8844'
async function capture(name,url){await page.goto(base+url);await page.waitForLoadState('networkidle');await page.waitForTimeout(2000);await page.screenshot({path:directory+'/'+name+'.png',fullPage:true});for(const [index,offset] of [0,500,1000].entries()){await page.evaluate(y=>window.scrollTo(0,y),offset);await page.screenshot({path:directory+'/'+name+'-scroll-'+index+'.png'})}}
await capture('login-1440','/login')
await page.getByLabel('账号',{exact:true}).fill('student01');await page.getByLabel('密码',{exact:true}).fill('DemoPass123!');await page.getByRole('button',{name:'登录工作台'}).click()
await page.waitForURL('**/dashboard');await page.getByRole('heading',{name:'你好，顾知行'}).waitFor()
await capture('dashboard-1440','/dashboard');await capture('courses-1440','/courses');await page.goto(base+'/assignments');await page.getByRole('link',{name:'查看作业'}).first().click();await page.waitForLoadState('networkidle');const detail=new URL(page.url()).pathname
await capture('assignment-1440',detail);await page.getByRole('button',{name:/提交作业|提交新版本/}).click();await page.waitForTimeout(2000);await page.screenshot({path:directory+'/upload-dialog-1440.png',fullPage:true});await page.getByRole('button',{name:'关闭对话框'}).click()
await page.setViewportSize({width:834,height:1100});await capture('dashboard-834','/dashboard')
await page.setViewportSize({width:390,height:844});await capture('dashboard-390','/dashboard');await capture('assignment-390',detail)
await writeFile(directory+'/errors.json',JSON.stringify({errors},null,2))
await context.close();await browser.close();console.log(JSON.stringify({directory,errors,screenshots:8}));process.exit(errors.length?1:0)
