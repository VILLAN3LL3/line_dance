import { expect, test } from "@playwright/test";

import { API_BASE, createChoreographyViaApi } from "../helpers/api";

test.describe("Practice flash cards", () => {
  test("flips a learned dance, logs a practice and finds it in the log", async ({
    page,
    request,
  }) => {
    const name = `Practice Dance ${Date.now()}`;
    const id = await createChoreographyViaApi(request, name);
    const status = await request.put(`${API_BASE}/choreographies/${id}/learning-status`, {
      data: { status: "learned" },
    });
    expect(status.ok()).toBeTruthy();

    await page.goto("/personal");
    await page.getByRole("tab", { name: /^🔁 Practice/ }).click();

    const flipCard = page.locator(".flip-card", { hasText: name });
    await expect(flipCard.locator(".choreography-card").first()).toBeVisible();

    await flipCard.getByRole("button", { name: `Show back of ${name}` }).click();
    await expect(flipCard.getByText("Last practiced")).toBeVisible();
    await expect(flipCard.getByText("Not practiced yet")).toBeVisible();

    await flipCard.getByRole("button", { name: /Sure/ }).click();
    await expect(page.locator(".flip-card", { hasText: name })).toHaveCount(0);

    await page.getByRole("button", { name: /Show dances not due yet/ }).click();
    await expect(page.locator(".flip-card", { hasText: name })).toHaveCount(1);

    await page.getByRole("tab", { name: /Practice log/ }).click();
    await expect(page.getByText(name)).toBeVisible();
  });
});
