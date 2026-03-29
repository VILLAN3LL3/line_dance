import { expect, test } from "@playwright/test";

test.describe("Trainers Admin", () => {
  test("validates required fields for trainer creation", async ({ page }) => {
    await page.goto("/trainers");
    await page.getByRole("button", { name: /Add Trainer/i }).click();
    await expect(page.getByText(/Name, phone, and email are required/i)).toBeVisible();
  });

  test("create, edit, and delete trainer", async ({ page }) => {
    const trainerName = `E2E Trainer ${Date.now()}`;
    const updatedTrainerName = `${trainerName} Updated`;

    await page.goto("/trainers");

    await page.getByPlaceholder("Name").fill(trainerName);
    await page.getByPlaceholder("Phone").fill("+1 555 123 4567");
    await page.getByPlaceholder("E-Mail").fill(`trainer.${Date.now()}@example.com`);
    await page.getByRole("button", { name: /Add Trainer/i }).click();

    const trainerItem = page.locator(".trainer-item", { hasText: trainerName });
    await expect(trainerItem).toBeVisible();

    await trainerItem.getByRole("button", { name: /Edit/i }).click();
    const editingTrainerItem = page
      .locator(".trainer-item")
      .filter({ has: page.getByRole("button", { name: /^Save$/i }) })
      .first();
    await editingTrainerItem.locator("input[type='text']").first().fill(updatedTrainerName);
    await editingTrainerItem.getByRole("button", { name: /^Save$/i }).click();

    const updatedTrainerItem = page.locator(".trainer-item", { hasText: updatedTrainerName });
    await expect(updatedTrainerItem).toBeVisible();

    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });
    await updatedTrainerItem.getByRole("button", { name: /^Delete$/i }).click();

    await expect(page.locator(".trainer-item", { hasText: updatedTrainerName })).toHaveCount(0);
  });
});
