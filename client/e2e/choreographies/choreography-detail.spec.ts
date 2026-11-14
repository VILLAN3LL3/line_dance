import { expect, test } from "@playwright/test";

import { createChoreographyViaApi } from "../helpers/api";

test.describe("Choreography Detail", () => {
  test("shows backend field issues and saves after correcting them", async ({ page }) => {
    const name = `E2E Validation ${Date.now()}`;
    await page.goto("/choreographies/new");
    await page.getByLabel("Choreography Name *").fill(name);
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/choreographies/validate") &&
        response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Save Choreography" }).click();
    const response = await responsePromise;
    expect(response.status()).toBe(400);
    expect((await response.json()).issues).toContainEqual({ field: "level", key: "required" });
    const level = page.getByLabel("Level *");
    await expect(level).toHaveAttribute("aria-invalid", "true");
    await expect(level).toHaveCSS("border-color", "rgb(198, 61, 47)");
    await expect(page.getByText("Select a level.")).toBeVisible();
    await expect(
      page.getByRole("tab", { name: "Basic Information, validation errors" }),
    ).toBeVisible();

    await level.selectOption({ label: "BEGINNER" });
    await expect(level).not.toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText("Select a level.")).toBeHidden();
    await page.getByRole("button", { name: "Save Choreography" }).click();
    await expect(page).toHaveURL("/");
  });

  test("supports edit action", async ({ page, request }) => {
    const originalName = `E2E Detail ${Date.now()}`;
    const updatedName = `${originalName} Updated`;
    const choreographyId = await createChoreographyViaApi(request, originalName);

    await page.goto(`/choreographies/${choreographyId}`);
    await expect(page.getByText(originalName)).toBeVisible();

    await page.getByRole("link", { name: /^Edit$/i }).click();
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

    await page.getByRole("button", { name: /^Delete choreography$/i }).click();
    await expect(page).toHaveURL(/\/$/);

    await page.getByPlaceholder(/Search choreographies by name/i).fill(name);
    await page.getByPlaceholder(/Search choreographies by name/i).press("Enter");
    await expect(page.locator(".choreography-card", { hasText: name })).toHaveCount(0);
  });
});
