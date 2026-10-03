import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const output = path.resolve(import.meta.dirname, "../../artifacts/photo-ui");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROMIUM_EXECUTABLE ||
    "D:/Tools/gstack-playwright/chromium-1234/chrome-win64/chrome.exe",
});
const errors = [],
  checks = [];
try {
  for (const width of [1440, 1280]) {
    const context = await browser.newContext({
      baseURL: process.env.HOMEWORK_E2E_URL || "http://127.0.0.1:8885",
      viewport: { width, height: 1000 },
    });
    await context.route("**/*", async (route) => {
      if (
        !["127.0.0.1", "localhost"].includes(
          new URL(route.request().url()).hostname,
        )
      ) {
        errors.push(`External image/request: ${route.request().url()}`);
        await route.abort();
      } else await route.continue();
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    async function capture(name) {
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
      const images = await page
        .locator(".photo-avatar img, .course-photo-avatar img, .course-photo")
        .evaluateAll((items) =>
          items.map((img) => ({
            src: img.getAttribute("src"),
            loaded: img.complete && img.naturalWidth > 0,
          })),
        );
      expect(images.length).toBeGreaterThan(0);
      expect(images.every((img) => img.loaded)).toBeTruthy();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBeTruthy();
      await page.screenshot({
        path: path.join(output, `${name}-${width}.png`),
        fullPage: true,
      });
      for (const [i, y] of [0, 450, 900].entries()) {
        await page.evaluate((y) => window.scrollTo(0, y), y);
        await page.screenshot({
          path: path.join(output, `${name}-${width}-scroll-${i}.png`),
        });
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      checks.push({ name, width, images });
    }
    async function login(username) {
      await page.goto("/login");
      await page.getByLabel("账号", { exact: true }).fill(username);
      await page.getByLabel("密码", { exact: true }).fill("DemoPass123!");
      await page.getByRole("button", { name: "登录工作台" }).click();
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        "你好",
      );
    }
    await login("admin");
    await capture("admin-dashboard");
    await page.goto("/admin/users");
    await expect(
      page.getByRole("heading", { name: "账号与角色", exact: true }),
    ).toBeVisible();
    await capture("admin-avatars");
    await page.goto("/courses");
    await capture("admin-courses");
    await page.getByTitle("退出登录", { exact: true }).click();
    await login("teacher");
    await page.goto("/assignments");
    await capture("teacher-assignment-books");
    await page.getByTitle("退出登录", { exact: true }).click();
    await login("student01");
    await page.goto("/courses");
    await capture("student-course-books");
    await context.close();
  }
  expect(errors).toEqual([]);
  await writeFile(
    path.join(output, "checks.json"),
    JSON.stringify({ checks, errors }, null, 2),
  );
  console.log(
    `Verified ${checks.length} rendered desktop pages; all local photos loaded, no horizontal overflow or page errors.`,
  );
} finally {
  await browser.close();
}
