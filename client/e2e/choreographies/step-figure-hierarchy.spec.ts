import { expect, test } from "@playwright/test";

test.describe("Step Figure Hierarchy Admin", () => {
  test("supports create, edit, and delete with component autocomplete", async ({ page }) => {
    const runId = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const rockName = `Rock Step ${runId}`;
    const shuffleName = `Shuffle ${runId}`;
    const lindyName = `Lindy Step ${runId}`;
    const lindyUpdatedName = `${lindyName} Updated`;

    await page.goto("/admin/step-figures");
    await expect(page.getByRole("heading", { name: /Step Figure Hierarchy/i })).toBeVisible();

    // Create base step figure: Rock
    await page.getByPlaceholder(/e\.g\. Weave Combination/i).fill(rockName);
    await page.getByRole("button", { name: /^Create Step Figure$/i }).click();
    await expect(
      page.locator(".step-figure-admin__list-item", { hasText: rockName }),
    ).toBeVisible();

    // Create base step figure: Shuffle
    await page.getByPlaceholder(/e\.g\. Weave Combination/i).fill(shuffleName);
    await page.getByRole("button", { name: /^Create Step Figure$/i }).click();
    await expect(
      page.locator(".step-figure-admin__list-item", { hasText: shuffleName }),
    ).toBeVisible();

    // Create composite step figure with autocomplete components
    await page.getByPlaceholder(/e\.g\. Weave Combination/i).fill(lindyName);
    await page
      .getByPlaceholder(/Add component step figure/i)
      .first()
      .fill(rockName);
    await page
      .getByRole("button", { name: /^Add Component$/i })
      .first()
      .click();
    await page
      .getByPlaceholder(/Add component step figure/i)
      .first()
      .fill(shuffleName);
    await page
      .getByRole("button", { name: /^Add Component$/i })
      .first()
      .click();
    await page.getByRole("button", { name: /^Create Step Figure$/i }).click();

    const lindyRow = page.locator(".step-figure-admin__list-item", { hasText: lindyName });
    await expect(lindyRow).toBeVisible();

    // Edit composite: rename and remove one component
    await lindyRow.click();
    const editSection = page.locator("section", { hasText: /Edit Selection/i });
    await editSection.locator('input[type="text"]').first().fill(lindyUpdatedName);
    await editSection
      .locator(".tag", { hasText: rockName })
      .getByRole("button", { name: "x" })
      .click();
    await page.getByRole("button", { name: /^Save Changes$/i }).click();

    const updatedRow = page.locator(".step-figure-admin__list-item", { hasText: lindyUpdatedName });
    await expect(updatedRow).toBeVisible();

    // Delete composite
    await updatedRow.click();
    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });
    await page.getByRole("button", { name: /^Delete Step Figure$/i }).click();

    await expect(
      page.locator(".step-figure-admin__list-item", { hasText: lindyUpdatedName }),
    ).toHaveCount(0);
  });
});
