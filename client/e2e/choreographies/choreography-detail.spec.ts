import { expect, test } from "@playwright/test";

import { createChoreographyViaApi } from "../helpers/api";

test.describe("Choreography Detail", () => {
  test("supports edit action", async ({ page, request }) => {
    const originalName = `E2E Detail ${Date.now()}`;
    const updatedName = `${originalName} Updated`;
    const choreographyId = await createChoreographyViaApi(request, originalName);

    await page.goto(`/choreographies/${choreographyId}`);
    await expect(page.getByText(originalName)).toBeVisible();

    await page.getByRole("button", { name: /^Edit$/i }).click();
    await page.getByLabel(/Choreography Name/i).fill(updatedName);
    await page.getByRole("button", { name: /Save Choreography/i }).click();

    await expect(page.getByText(updatedName)).toBeVisible();
  });

  test("supports delete action", async ({ page, request }) => {
    const name = `E2E Delete ${Date.now()}`;
    const choreographyId = await createChoreographyViaApi(request, name);

    await page.goto(`/choreographies/${choreographyId}`);
    await expect(page.getByText(name)).toBeVisible();

    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });

    await page.getByRole("button", { name: /^Delete$/i }).click();
    await expect(page).toHaveURL(/\/$/);

    await page.getByPlaceholder(/Search choreographies by name/i).fill(name);
    await page.getByPlaceholder(/Search choreographies by name/i).press("Enter");
    await expect(page.locator(".choreography-card", { hasText: name })).toHaveCount(0);
  });
});
