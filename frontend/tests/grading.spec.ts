import { test, expect } from "@playwright/test";

test("编辑已有作业保存后保持原状态", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("账号", { exact: true }).fill("teacher");
  await page.getByLabel("密码", { exact: true }).fill("DemoPass123!");
  await page.getByRole("button", { name: "登录工作台" }).click();
  await expect(
    page.getByRole("heading", { name: "你好，陈老师" }),
  ).toBeVisible();
  await page.goto("/assignments");
  const row = page.locator(".teacher-assignment-row").first();
  await expect(row.getByText("开放提交", { exact: true })).toBeVisible();
  await row.getByRole("button", { name: "编辑", exact: true }).click();
  await page.getByRole("button", { name: "保存修改", exact: true }).click();
  await expect(page.getByText("作业已保存", { exact: true })).toBeVisible();
  await expect(row.getByText("开放提交", { exact: true })).toBeVisible();
});
test("教师保存并发布成绩，学生查看对应反馈", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("账号", { exact: true }).fill("teacher");
  await page.getByLabel("密码", { exact: true }).fill("DemoPass123!");
  await page.getByRole("button", { name: "登录工作台" }).click();
  await expect(
    page.getByRole("heading", { name: "你好，陈老师" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "作业管理", exact: true }).click();
  await page.getByRole("link", { name: "查看作业" }).first().click();
  const detail = new URL(page.url()).pathname;
  await page.getByRole("link", { name: "批改作业", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "批改作业", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /顾知行/ }).click();
  await page.getByRole("spinbutton", { name: /成绩/ }).fill("86.50");
  await page.getByLabel("批改评语").fill("需求表达清晰，注意补充边界条件。");
  await page.getByRole("button", { name: "保存批改" }).click();
  await expect(page.getByText("批改已保存，发布后学生可见")).toBeVisible();
  await page.goto(
    new URL("/assignments/" + detail.split("/")[2] + "/grades", page.url())
      .href,
  );
  await page.getByRole("button", { name: "发布成绩", exact: true }).click();
  await page.getByRole("button", { name: "确认发布" }).click();
  await expect(page.getByText("成绩已发布")).toBeVisible();
  const token = (await (await page.request.get("/api/auth/csrf/")).json())
    .csrf_token;
  await page.request.post("/api/auth/logout/", {
    headers: { "X-CSRFToken": token },
  });
  await page.goto("/login");
  await page.getByLabel("账号", { exact: true }).fill("student01");
  await page.getByLabel("密码", { exact: true }).fill("DemoPass123!");
  await page.getByRole("button", { name: "登录工作台" }).click();
  await expect(
    page.getByRole("heading", { name: "你好，顾知行" }),
  ).toBeVisible();
  await page.goto(new URL(detail, page.url()).href);
  const latest=page.locator('.history-item').first();
  await expect(latest.getByText("86.50 分", { exact: true })).toBeVisible();
  await expect(
    latest.getByText("需求表达清晰，注意补充边界条件。", { exact: true }),
  ).toBeVisible();
});
