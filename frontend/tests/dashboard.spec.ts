import { test, expect } from "@playwright/test";
test("工作台标签筛选真实作业，键盘切换和详情入口可用", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("账号", { exact: true }).fill("student01");
  await page.getByLabel("密码", { exact: true }).fill("DemoPass123!");
  await page.getByRole("button", { name: "登录工作台" }).click();
  await expect(
    page.getByRole("heading", { name: "你好，顾知行" }),
  ).toBeVisible();
  await page.getByRole("tab", { name: /已提交/ }).click();
  await expect(page.getByRole("tab", { name: /已提交/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect
    .poll(
      async () =>
        (
          await page
            .getByRole("tab", { name: /已提交/ })
            .locator(".desk-tab-background")
            .boundingBox()
        )?.height || 0,
    )
    .toBeGreaterThan(30);
  const panel = page.getByRole("tabpanel");
  await expect(panel.getByText("待提交", { exact: true })).toHaveCount(0);
  await expect(
    panel.getByRole("link", { name: "查看作业" }).first(),
  ).toBeVisible();
  await page.getByRole("tab", { name: /已提交/ }).press("ArrowRight");
  await expect(page.getByRole("tab", { name: /已反馈/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.getByRole("tab", { name: /全部/ }).click();
  await panel.getByRole("link", { name: "查看作业" }).first().click();
  await expect(page.getByRole("heading", { name: "作业要求" })).toBeVisible();
});
