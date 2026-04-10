import { expect, test } from "@playwright/test";

test.describe("Saved Filter Configurations", () => {
  test("supports save, rename, and delete lifecycle", async ({ page }) => {
    const configName = `E2E Config ${Date.now()}`;
    const renamedConfigName = `${configName} Updated`;

    await page.goto("/");
    await page.getByRole("button", { name: /Advanced Filters/i }).click();
    await page.getByRole("button", { name: /Saved Configurations/i }).click();

    await page.getByRole("combobox", { name: "Level:" }).fill("BEGINNER");
    await page.getByRole("combobox", { name: "Level:" }).press("Enter");

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

    await page.getByRole("combobox", { name: "Level:" }).fill("BEGINNER");
    await page.getByRole("combobox", { name: "Level:" }).press("Enter");
    await expect(
      page.locator(".filter-tags .level-batch", { hasText: "BEGINNER" }),
    ).toBeVisible();

    await page.getByPlaceholder(/Configuration name/i).fill(configName);
    await page.getByRole("button", { name: /Save Current Filters/i }).click();
    await expect(page.getByText(`Saved "${configName}"`)).toBeVisible();

    await page.getByRole("button", { name: /Clear All Filters/i }).click();
    await expect(page.locator(".filter-tags .level-batch", { hasText: "BEGINNER" })).toHaveCount(0);

    await page.locator("select").first().selectOption({ label: configName });
    await page.getByRole("button", { name: /Load Selected/i }).click();
    await expect(page.getByText(`Loaded "${configName}"`)).toBeVisible();
    await expect(
      page.locator(".filter-tags .level-batch", { hasText: "BEGINNER" }),
    ).toBeVisible();

    await page.getByRole("combobox", { name: "Tags:" }).fill("E2E-Updated");
    await page.getByRole("combobox", { name: "Tags:" }).press("Enter");
    await page.getByRole("button", { name: /Update Loaded/i }).click();
    await expect(page.getByText(`Updated "${configName}"`)).toBeVisible();

    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });
    await page.getByRole("button", { name: /Delete Selected/i }).click();
    await expect(page.getByText(`Deleted "${configName}"`)).toBeVisible();
  });

  test("loads saved max-level and excluded-tag filters", async ({ page, request }) => {
    const configName = `E2E Max Exclude ${Date.now()}`;
    const runId = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const keepName = `Saved Keep ${runId}`;
    const blockedName = `Saved Blocked ${runId}`;

    await request.post("http://127.0.0.1:3101/api/choreographies", {
      data: {
        name: keepName,
        level: "BEGINNER",
        authors: ["E2E API Author"],
        tags: ["E2E-KEEP"],
        step_figures: ["Vine"],
        count: 32,
        wall_count: 4,
      },
    });
    await request.post("http://127.0.0.1:3101/api/choreographies", {
      data: {
        name: blockedName,
        level: "ADVANCED",
        authors: ["E2E API Author"],
        tags: ["E2E-BLOCK"],
        step_figures: ["Kick"],
        count: 56,
        wall_count: 4,
      },
    });

    await page.goto("/");
    await page.getByPlaceholder(/Search choreographies by name/i).fill(runId);
    await page.getByRole("button", { name: /Advanced Filters/i }).click();
    await page.getByRole("button", { name: /Saved Configurations/i }).click();

    await page.getByRole("radio", { name: /Up to max level/i }).check();
    await page.getByRole("combobox", { name: "Level:" }).selectOption({ label: "BEGINNER" });
    await page.getByRole("radio", { name: /Exclude matches/i }).check();

    const tagsGroup = page.locator(".filter-group", { hasText: /^Tags:/ });
    await tagsGroup.getByRole("combobox", { name: "Tags:" }).fill("E2E-BLOCK");
    await tagsGroup.getByRole("combobox", { name: "Tags:" }).press("Enter");

    await page.getByPlaceholder(/Configuration name/i).fill(configName);
    await page.getByRole("button", { name: /Save Current Filters/i }).click();
    await expect(page.getByText(`Saved "${configName}"`)).toBeVisible();

    await page.getByRole("button", { name: /Clear All Filters/i }).click();
    await page.locator("select").first().selectOption({ label: configName });
    await page.getByRole("button", { name: /Load Selected/i }).click();

    await expect(page.getByText(`Loaded "${configName}"`)).toBeVisible();
    await expect(page.getByRole("radio", { name: /Up to max level/i })).toBeChecked();
    await expect(page.getByRole("combobox", { name: "Level:" })).toHaveValue(/^\d+$/);
    await expect(page.locator(".filter-tag-exclude", { hasText: "E2E-BLOCK" })).toBeVisible();

    await page.getByRole("button", { name: /Apply Filters/i }).click();
    await expect(page.locator(".choreography-card", { hasText: keepName })).toBeVisible();
    await expect(page.locator(".choreography-card", { hasText: blockedName })).toHaveCount(0);

    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });
    await page.getByRole("button", { name: /Delete Selected/i }).click();
    await expect(page.getByText(`Deleted "${configName}"`)).toBeVisible();
  });
});
