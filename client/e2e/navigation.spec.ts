import { expect, test } from "@playwright/test";

test.describe("Global navigation", () => {
  test("loads app shell and navigates between major sections", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Line Dance" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Choreography Search" })).toBeVisible();

    await page.getByRole("link", { name: /Dance Groups/i }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: /Dance Group Administration/i })).toBeVisible();

    await page.getByRole("link", { name: /Trainers/i }).click();
    await expect(page).toHaveURL(/\/trainers$/);
    await expect(page.getByRole("heading", { name: /Trainer Management/i })).toBeVisible();

    await page.getByRole("link", { name: /Choreographies/i }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("button", { name: /Add New Choreography/i })).toBeVisible();
  });
});
