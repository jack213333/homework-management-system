import {chromium} from '@playwright/test'
import {mkdir,writeFile} from 'node:fs/promises'
const directory=new URL('../../artifacts/screenshots/',import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1')
await mkdir(directory,{recursive:true})
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'D:/Tools/gstack-playwright/chromium-1234/chrome-win64/chrome.exe'})
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[]
page.on('pageerror',e=>errors.push(e.message))
const base=process.env.HOMEWORK_E2E_URL||'http://127.0.0.1:8844'
async function login(username){await page.goto(base+'/login');await page.getByLabel('账号',{exact:true}).fill(username);await page.getByLabel('密码',{exact:true}).fill('DemoPass123!');await page.getByRole('button',{name:'登录工作台'}).click();await page.waitForURL('**/dashboard');await page.getByRole('heading',{level:1}).waitFor();await page.waitForLoadState('networkidle')}
async function capture(name,url){if(url)await page.goto(base+url);await page.waitForLoadState('networkidle');await page.waitForTimeout(2000);await page.screenshot({path:directory+'/'+name+'.png',fullPage:true});for(const [index,offset] of [0,500,1000].entries()){await page.evaluate(y=>window.scrollTo(0,y),offset);await page.screenshot({path:directory+'/'+name+'-scroll-'+index+'.png'})}}
await login('teacher');await capture('teacher-assignments','/assignments');await page.getByRole('link',{name:'查看作业'}).first().click();const detail=new URL(page.url()).pathname;await capture('teacher-grading',detail+'/grading');await capture('teacher-grades',detail+'/grades');await page.getByRole('button',{name:'发布成绩',exact:true}).click();await capture('teacher-publish-dialog');await page.getByRole('button',{name:'关闭对话框'}).click();
const token=(await(await page.request.get(base+'/api/auth/csrf/')).json()).csrf_token;await page.request.post(base+'/api/auth/logout/',{headers:{'X-CSRFToken':token}});await login('admin');await capture('admin-users','/admin/users');await page.getByRole('button',{name:'新增账号'}).click();await capture('admin-user-dialog');await page.getByRole('button',{name:'关闭对话框'}).click();await capture('admin-courses','/courses');await page.getByRole('button',{name:'成员管理'}).first().click();await capture('admin-members-dialog');await page.getByRole('button',{name:'关闭对话框'}).click();
await writeFile(directory+'/teacher-errors.json',JSON.stringify({errors},null,2));await browser.close();console.log(JSON.stringify({directory,errors}));process.exit(errors.length?1:0)
