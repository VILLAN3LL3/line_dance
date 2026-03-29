import { expect, test } from "@playwright/test";

test.describe("Choreography end-to-end", () => {
  test("create, filter, and open a choreography", async ({ page }) => {
    const name = `E2E Choreo ${Date.now()}`;

    await page.goto("/");
    await page.getByRole("button", { name: /Add New Choreography/i }).click();

    await expect(page.getByRole("heading", { name: /Add New Choreography/i })).toBeVisible();

    await page.getByLabel(/Choreography Name/i).fill(name);
    await page.getByLabel(/Level/i).selectOption({ label: "Beginner" });
    await page.getByPlaceholder("e.g., 64").fill("32");
    await page.getByPlaceholder("e.g., 4").fill("4");

    await page.getByPlaceholder("Author name").fill("E2E Author");
    await page.getByRole("button", { name: /Add Author/i }).click();

    await page.getByPlaceholder(/Step figure name/i).fill("Vine");
    await page.getByRole("button", { name: /Add Figure/i }).click();

    await page.getByPlaceholder(/Tag \(e\.g\., Country, Western, Urban\)/i).fill("E2E");
    await page.getByRole("button", { name: /Add Tag/i }).click();

    await page.getByRole("button", { name: /Save Choreography/i }).click();
    await expect(page.getByRole("heading", { name: /Choreography Search/i })).toBeVisible();
    await expect(page.getByText(/Failed to create choreography/i)).toHaveCount(0);

    await page.getByPlaceholder(/Search choreographies by name/i).fill(name);
    await page.getByPlaceholder(/Search choreographies by name/i).press("Enter");

    const resultCard = page.locator(".choreography-card", { hasText: name }).first();
    await expect(resultCard).toBeVisible({ timeout: 30_000 });

    await resultCard.click();
    await expect(page.getByRole("button", { name: /Back to List/i })).toBeVisible();
  });
});
