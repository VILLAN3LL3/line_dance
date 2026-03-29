import { expect, test } from "@playwright/test";

test.describe("Admin flows", () => {
  test("create and manage trainer", async ({ page }) => {
    const trainerName = `E2E Trainer ${Date.now()}`;

    await page.goto("/trainers");

    await page.getByPlaceholder("Name").fill(trainerName);
    await page.getByPlaceholder("Phone").fill("+1 555 123 4567");
    await page.getByPlaceholder("E-Mail").fill(`trainer.${Date.now()}@example.com`);
    await page.getByRole("button", { name: /Add Trainer/i }).click();

    const trainerItem = page.locator(".trainer-item", { hasText: trainerName });
    await expect(trainerItem).toBeVisible();

    await trainerItem.getByRole("button", { name: /Edit/i }).click();
    await page.locator(".trainers-list .trainer-item input[type='text']").first().fill(`${trainerName} Updated`);
    await page.getByRole("button", { name: /^Save$/i }).first().click();

    await expect(page.getByRole("heading", { name: `${trainerName} Updated` })).toBeVisible();
  });

  test("create a dance group", async ({ page }) => {
    const groupName = `E2E Group ${Date.now()}`;

    await page.goto("/admin");
    await page.getByRole("button", { name: /New Dance Group/i }).click();

    await expect(page).toHaveURL(/\/admin\/groups\/new$/);
    await page.getByLabel(/Group Name/i).fill(groupName);
    await page.getByRole("button", { name: /Create Group/i }).click();

    await expect(page).toHaveURL(/\/admin\/groups\/\d+$/);
    await expect(page.getByRole("heading", { name: groupName, exact: true })).toBeVisible();
  });
});
