import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const directory = new URL(
  "../../artifacts/screenshots/redesign-final/",
  import.meta.url,
).pathname.replace(/^\/([A-Z]:)/, "$1");
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROMIUM_EXECUTABLE ||
    "D:/Tools/gstack-playwright/chromium-1234/chrome-win64/chrome.exe",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const base = process.env.HOMEWORK_E2E_URL || "http://127.0.0.1:8844";
async function login(username) {
  await page.goto(base + "/login");
  await page.getByLabel("账号", { exact: true }).fill(username);
  await page.getByLabel("密码", { exact: true }).fill("DemoPass123!");
  await page.getByRole("button", { name: "登录工作台" }).click();
  await page.waitForURL("**/dashboard");
  await page.getByRole("heading", { level: 1 }).waitFor();
  await page.waitForLoadState("networkidle");
}
async function capture(name) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: directory + "/" + name + ".png",
    fullPage: true,
  });
  for (const [index, offset] of [0, 500, 1000].entries()) {
    await page.evaluate((y) => window.scrollTo(0, y), offset);
    await page.screenshot({
      path: directory + "/" + name + "-scroll-" + index + ".png",
    });
  }
  await page.evaluate(() => window.scrollTo(0, 0));
}
await login("student01");
await capture("dashboard");
await page.getByRole("tab", { name: /已提交/ }).click();
await capture("dashboard-submitted");
await page.setViewportSize({ width: 1280, height: 900 });
await page.goto(base + "/dashboard");
await capture("dashboard-1280");
await page.setViewportSize({ width: 1440, height: 1000 });
const token = (await (await page.request.get(base + "/api/auth/csrf/")).json())
  .csrf_token;
await page.request.post(base + "/api/auth/logout/", {
  headers: { "X-CSRFToken": token },
});
await login("teacher");
await page.goto(base + "/assignments/4/similarity");
await capture("similarity");
await page
  .getByRole("row")
  .filter({ hasText: "100.0%" })
  .first()
  .getByRole("link", { name: "查看片段" })
  .click();
await capture("pair");
await page.goto(base + "/assignments/4/similarity");
await page.getByRole("button", { name: "添加公共模板" }).click();
await capture("template-dialog");
await writeFile(
  directory + "/errors.json",
  JSON.stringify({ errors }, null, 2),
);
await browser.close();
console.log(JSON.stringify({ directory, errors }));
process.exit(errors.length ? 1 : 0);
