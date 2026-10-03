import { test, expect } from "@playwright/test";
test("缺代码提示与真实提交刷新保留版本", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("账号", { exact: true }).fill("student01");
  await page.getByLabel("密码", { exact: true }).fill("DemoPass123!");
  await page.getByRole("button", { name: "登录工作台" }).click();
  await page.getByRole("link", { name: "我的作业", exact: true }).click();
  await page.getByRole("link", { name: "查看作业" }).first().click();
  await page.getByRole("button", { name: /提交作业|提交新版本/ }).click();
  await page
    .getByLabel("报告文件")
    .setInputFiles({
      name: "report.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(
        "独立测试报告：分析需求，设计数据库，实现课程和作业管理。".repeat(10),
      ),
    });
  await page.getByRole("button", { name: "确认提交" }).click();
  await expect(page.getByRole("alert")).toContainText("代码");
  await page
    .getByLabel("代码文件")
    .setInputFiles({
      name: "main.py",
      mimeType: "text/plain",
      buffer: Buffer.from("def total(values):\n    return sum(values)\n"),
    });
  await page.getByRole("button", { name: "确认提交" }).click();
  await expect(page.getByText("提交成功，新版本已保存")).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("link", { name: /report\.txt/ }).first(),
  ).toBeVisible();
});
test("对话框 Esc 关闭后恢复焦点", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("账号", { exact: true }).fill("student01");
  await page.getByLabel("密码", { exact: true }).fill("DemoPass123!");
  await page.getByRole("button", { name: "登录工作台" }).click();
  await page.getByRole("link", { name: "我的作业", exact: true }).click();
  await page.getByRole("link", { name: "查看作业" }).first().click();
  const trigger = page.getByRole("button", { name: /提交作业|提交新版本/ });
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();
});
test("响应丢失后重试不生成第二个版本", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("账号", { exact: true }).fill("student01");
  await page.getByLabel("密码", { exact: true }).fill("DemoPass123!");
  await page.getByRole("button", { name: "登录工作台" }).click();
  await page.getByRole("link", { name: "我的作业", exact: true }).click();
  await page.getByRole("link", { name: "查看作业" }).first().click();
  const path = new URL(page.url()).pathname,
    apiPath = "/api" + path + "/";
  const before = await (await page.request.get(apiPath)).json();
  let lost = false;
  await page.route("**/api/assignments/*/submissions/", async (route) => {
    if (route.request().method() === "POST" && !lost) {
      lost = true;
      const saved = await route.fetch();
      expect(saved.status()).toBe(201);
      await route.abort("failed");
    } else await route.continue();
  });
  await page.getByRole("button", { name: /提交作业|提交新版本/ }).click();
  await page
    .getByLabel("报告文件")
    .setInputFiles({
      name: "retry.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("用于真实重试测试的报告内容。".repeat(8)),
    });
  await page
    .getByLabel("代码文件")
    .setInputFiles({
      name: "retry.py",
      mimeType: "text/plain",
      buffer: Buffer.from("def retry(values):\n    return sum(values)\n"),
    });
  await page.getByRole("button", { name: "确认提交" }).click();
  await expect(page.getByRole("alert")).toContainText("网络连接失败");
  await page.getByRole("button", { name: "确认提交" }).click();
  await expect(page.getByText("提交成功，新版本已保存")).toBeVisible();
  const after = await (await page.request.get(apiPath)).json();
  expect(after.my_submission.version).toBe(
    (before.my_submission?.version || 0) + 1,
  );
});
