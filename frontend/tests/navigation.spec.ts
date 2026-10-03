import { test, expect } from "@playwright/test";
test("服务中断时登录显示中文恢复提示且可重试", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("账号", { exact: true }).fill("admin");
  await page.getByLabel("密码", { exact: true }).fill("DemoPass123!");
  await page.route("**/api/auth/csrf/", (route) =>
    route.abort("connectionrefused"),
  );
  await page.getByRole("button", { name: "登录工作台" }).click();
  await expect(page.getByRole("alert")).toContainText("无法连接本机服务");
  await expect(page.getByRole("button", { name: "登录工作台" })).toBeEnabled();
  await page.unroute("**/api/auth/csrf/");
  await page.getByRole("button", { name: "登录工作台" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("你好");
});
test("未登录页面不循环请求用户接口", async ({ page }) => {
  let requests = 0;
  page.on("request", (r) => {
    if (new URL(r.url()).pathname === "/api/auth/me/") requests++;
  });
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "欢迎回来" })).toBeVisible();
  await page.waitForTimeout(1200);
  expect(requests).toBeLessThanOrEqual(2);
});
test("学生登录后只看到自己课程，刷新保留会话", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("账号", { exact: true }).fill("student01");
  await page.getByLabel("密码", { exact: true }).fill("DemoPass123!");
  await page.getByRole("button", { name: "登录工作台" }).click();
  await expect(
    page.getByRole("heading", { name: "你好，顾知行", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "我的课程", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "软件设计综合实训", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Java 面向对象设计", { exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "软件设计综合实训", exact: true }),
  ).toBeVisible();
});
