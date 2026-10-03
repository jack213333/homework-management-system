import { defineConfig } from '@playwright/test'
const baseURL=process.env.HOMEWORK_E2E_URL||'http://127.0.0.1:8877'
export default defineConfig({
  testDir:'./tests', workers:1, timeout:25000, expect:{timeout:6000},
  use:{baseURL,viewport:{width:1440,height:1000},headless:true,launchOptions:{executablePath:process.env.CHROMIUM_EXECUTABLE||'D:/Tools/gstack-playwright/chromium-1234/chrome-win64/chrome.exe'},trace:'retain-on-failure'},
  webServer:{command:'.venv\\Scripts\\python.exe -m desktop.launcher --no-browser --port 8877 --data-dir artifacts/e2e-data',cwd:'..',url:baseURL+'/api/health/',reuseExistingServer:!!process.env.HOMEWORK_E2E_URL,timeout:60000}
})
