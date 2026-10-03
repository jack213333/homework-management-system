import { chromium, expect } from "@playwright/test";
import { readFile, mkdir, writeFile, rename } from "node:fs/promises";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "../..");
const directory = path.resolve(root, "../homework-management-deliverables");
const screenshots = path.join(directory, "qa", "installed-screenshots");
await mkdir(screenshots, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROMIUM_EXECUTABLE ||
    "D:/Tools/gstack-playwright/chromium-1234/chrome-win64/chrome.exe",
});
const context = await browser.newContext({
  baseURL: process.env.HOMEWORK_E2E_URL || "http://127.0.0.1:8766",
  viewport: { width: 1440, height: 1000 },
  recordVideo: {
    dir: path.join(directory, "qa", "video"),
    size: { width: 1440, height: 1000 },
  },
});
const external = [],
  errors = [],
  steps = [];
await context.route("**/*", async (route) => {
  const url = new URL(route.request().url());
  if (!["127.0.0.1", "localhost"].includes(url.hostname)) {
    external.push(url.href);
    await route.abort();
  } else await route.continue();
});
const page = await context.newPage();
page.on("pageerror", (e) => errors.push(e.message));
async function hold(label) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1800);
  steps.push({ label, url: page.url() });
}
async function capture(name) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: path.join(screenshots, name + ".png"),
    fullPage: true,
  });
  for (const [i, y] of [0, 450, 900].entries()) {
    await page.evaluate((y) => window.scrollTo(0, y), y);
    await page.screenshot({
      path: path.join(screenshots, name + "-scroll-" + i + ".png"),
    });
  }
  await page.evaluate(() => window.scrollTo(0, 0));
}
async function login(username) {
  await page.goto("/login");
  await page.getByLabel("账号", { exact: true }).fill(username);
  await page.getByLabel("密码", { exact: true }).fill("DemoPass123!");
  await page.getByRole("button", { name: "登录工作台" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("你好");
}
async function logout() {
  await page.getByTitle("退出登录", { exact: true }).click();
  await expect(page.getByRole("heading", { name: "欢迎回来" })).toBeVisible();
}
const demo = await readFile(
  path.join(root, "backend/accounts/management/commands/load_demo_work.py"),
  "utf8",
);
const report = demo.match(/REPORT = """([\s\S]*?)"""/)[1];
const code = demo.match(/CODE = """([\s\S]*?)"""/)[1];
await page.goto("/login");
await capture("login");
await login("student01");
await hold("学生工作台与实际作业筛选");
await page.getByRole("tab", { name: /待完成/ }).click();
await hold("待完成筛选");
await page.getByRole("tab", { name: /全部/ }).click();
await page.goto("/assignments/4");
await page.getByRole("button", { name: /提交作业|提交新版本/ }).click();
await page
  .getByLabel("报告文件")
  .setInputFiles({
    name: "实训报告.txt",
    mimeType: "text/plain",
    buffer: Buffer.from(report),
  });
await page
  .getByLabel("代码文件")
  .setInputFiles({
    name: "成绩统计.py",
    mimeType: "text/plain",
    buffer: Buffer.from(code),
  });
await capture("upload-dialog");
await hold("真实报告和代码附件提交");
await page.getByRole("button", { name: "确认提交" }).click();
await expect(page.getByText("提交成功，新版本已保存")).toBeVisible();
await page.reload();
await capture("submission-history");
await hold("刷新后版本与原件保留");
await logout();
await login("teacher");
await page.goto("/assignments");
await capture("teacher-assignments");
await page
  .locator(".teacher-assignment-row")
  .first()
  .getByRole("button", { name: "编辑", exact: true })
  .click();
await capture("assignment-editor");
await page.keyboard.press("Escape");
await hold("教师作业管理");
await page.goto("/assignments/4/similarity");
await page.getByRole("button", { name: "开始检测", exact: true }).click();
await expect(page.getByText("检测已完成", { exact: true })).toBeVisible();
await capture("similarity");
await hold("不同学生最新版本相似检测");
await page.getByRole("combobox", { name: "文件类别筛选" }).selectOption("code");
await page
  .getByRole("row")
  .filter({ hasText: "100.0%" })
  .first()
  .getByRole("link", { name: "查看片段" })
  .click();
await expect(page.locator(".match-text").first()).toContainText("def");
await capture("pair");
await hold("原文片段与双方覆盖率");
await page.getByLabel("复核状态").selectOption("follow_up");
await page
  .getByLabel("复核备注")
  .fill("演示数据具有相同程序片段，仅作为复核线索，需结合来源和学生说明。");
await page.getByRole("button", { name: "保存复核" }).click();
await expect(page.getByText("复核意见已保存，不影响成绩")).toBeVisible();
await hold("教师记录复核意见");
await page.goto("/assignments/4/grading");
await page.getByRole("button", { name: /顾知行/ }).click();
await page.getByRole("spinbutton", { name: /成绩/ }).fill("86.50");
await page
  .getByLabel("批改评语")
  .fill("报告说明清晰，请补充非法输入的测试用例。");
await page.getByRole("button", { name: "保存批改" }).click();
await expect(page.getByText("批改已保存，发布后学生可见")).toBeVisible();
await capture("grading");
await hold("批改报告与代码");
await page.goto("/assignments/4/grades");
await page.getByRole("button", { name: "发布成绩", exact: true }).click();
await page.getByRole("button", { name: "确认发布" }).click();
await expect(page.getByText("成绩已发布")).toBeVisible();
await capture("grades");
await hold("成绩统计与明确发布");
await logout();
await login("student01");
await page.goto("/assignments/4");
await expect(
  page.locator(".history-item").first().getByText("86.50 分", { exact: true }),
).toBeVisible();
await hold("学生查看最新版本成绩和评语");
await page.goto("/dashboard");
await capture("dashboard");
await logout();
await login("admin");
await page.goto("/admin/users");
await capture("admin-users");
await hold("管理员用户与角色维护");
await page.goto("/admin/courses");
await capture("admin-courses");
await hold("实验课程与人员管理");
const video = page.video();
await context.close();
await rename(await video.path(), path.join(directory, "功能展示视频.webm"));
await browser.close();
await writeFile(
  path.join(directory, "qa", "video-evidence.json"),
  JSON.stringify({ external, errors, steps }, null, 2),
);
console.log(
  JSON.stringify({ steps: steps.length, external, errors, directory }),
);
if (external.length || errors.length) process.exit(1);
