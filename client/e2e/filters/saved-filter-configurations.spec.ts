import { expect, test } from "@playwright/test";

test.describe("Saved Filter Configurations", () => {
  test("supports save, rename, and delete lifecycle", async ({ page }) => {
    const configName = `E2E Config ${Date.now()}`;
    const renamedConfigName = `${configName} Updated`;

    await page.goto("/");
    await page.getByRole("button", { name: /Advanced Filters/i }).click();
    await page.getByRole("button", { name: /Saved Configurations/i }).click();

    await page.getByPlaceholder(/Add level/i).fill("Beginner");
    await page.getByRole("button", { name: /^\+$/ }).first().click();

    await page.getByPlaceholder(/Configuration name/i).fill(configName);
    await page.getByRole("button", { name: /Save Current Filters/i }).click();
    await expect(page.getByText(`Saved "${configName}"`)).toBeVisible();

    await page.getByPlaceholder(/Configuration name/i).fill(renamedConfigName);
    await page.getByRole("button", { name: /Rename Selected/i }).click();
    await expect(page.getByText(`Renamed to "${renamedConfigName}"`)).toBeVisible();

    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });
    await page.getByRole("button", { name: /Delete Selected/i }).click();
    await expect(page.getByText(`Deleted "${renamedConfigName}"`)).toBeVisible();
  });

  test("supports load, update loaded configuration, and clear all filters", async ({ page }) => {
    const configName = `E2E Loadable Config ${Date.now()}`;

    await page.goto("/");
    await page.getByRole("button", { name: /Advanced Filters/i }).click();
    await page.getByRole("button", { name: /Saved Configurations/i }).click();

    await page.getByPlaceholder(/Add level/i).fill("Beginner");
    await page.getByRole("button", { name: /^\+$/ }).first().click();
    await expect(page.locator(".filter-tag", { hasText: "Beginner" })).toBeVisible();

    await page.getByPlaceholder(/Configuration name/i).fill(configName);
    await page.getByRole("button", { name: /Save Current Filters/i }).click();
    await expect(page.getByText(`Saved "${configName}"`)).toBeVisible();

    await page.getByRole("button", { name: /Clear All Filters/i }).click();
    await expect(page.locator(".filter-tag", { hasText: "Beginner" })).toHaveCount(0);

    await page.locator("select").first().selectOption({ label: configName });
    await page.getByRole("button", { name: /Load Selected/i }).click();
    await expect(page.getByText(`Loaded "${configName}"`)).toBeVisible();
    await expect(page.locator(".filter-tag", { hasText: "Beginner" })).toBeVisible();

    await page.getByPlaceholder(/Add tag/i).fill("E2E-Updated");
    await page
      .locator(".filter-group", { hasText: /^Tags:/ })
      .getByRole("button", { name: /^\+$/ })
      .click();
    await page.getByRole("button", { name: /Update Loaded/i }).click();
    await expect(page.getByText(`Updated "${configName}"`)).toBeVisible();

    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });
    await page.getByRole("button", { name: /Delete Selected/i }).click();
    await expect(page.getByText(`Deleted "${configName}"`)).toBeVisible();
  });
});
