import { expect, test } from "@playwright/test";

import { createDanceGroupViaApi } from "../helpers/api";

test.describe("Dance Groups Admin", () => {
  test("create dance group from list page", async ({ page }) => {
    const groupName = `E2E Group ${Date.now()}`;

    await page.goto("/admin");
    await page.getByRole("button", { name: /New Dance Group/i }).click();

    await expect(page).toHaveURL(/\/admin\/groups\/new$/);
    await page.getByLabel(/Group Name/i).fill(groupName);
    await page.getByRole("button", { name: /Create Group/i }).click();

    await expect(page).toHaveURL(/\/admin\/groups\/\d+$/);
    await expect(page.getByRole("heading", { name: groupName, exact: true })).toBeVisible();
  });

  test("edit and delete dance group from admin list", async ({ page, request }) => {
    const groupName = `E2E Admin Group ${Date.now()}`;
    const updatedName = `${groupName} Updated`;
    await createDanceGroupViaApi(request, groupName);

    await page.goto("/admin");
    const groupCard = page
      .locator(".group-card")
      .filter({ hasText: groupName })
      .filter({ has: page.getByRole("button", { name: /^Edit$/i }) })
      .first();
    await expect(groupCard).toBeVisible();

    await groupCard.getByRole("button", { name: /^Edit$/i }).click();
    const editingCard = page
      .locator(".group-card")
      .filter({ has: page.getByRole("button", { name: /^Save$/i }) })
      .first();
    await editingCard.locator(".group-name-input").fill(updatedName);
    await editingCard.getByRole("button", { name: /^Save$/i }).click();
    await expect(page.locator(".group-card", { hasText: updatedName })).toBeVisible();

    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });
    await page.locator(".group-card", { hasText: updatedName }).getByRole("button", { name: /^Delete$/i }).click();
    await expect(page.locator(".group-card", { hasText: updatedName })).toHaveCount(0);
  });
});
