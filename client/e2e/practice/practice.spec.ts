import { expect, test } from "@playwright/test";

import {
  API_BASE,
  createChoreographyViaApi,
  createLearnedChoreographyWithoutPractice,
} from "../helpers/api";

test.describe("Practice flash cards", () => {
  test("flips a learned dance, logs a practice and finds it in the log", async ({
    page,
    request,
  }) => {
    const name = `Practice Dance ${Date.now()}`;
    await createLearnedChoreographyWithoutPractice(request, name);

    await page.goto("/personal");
    await page.getByRole("tab", { name: /^🔁 Practice/ }).click();

    const flipCard = page.locator(".flip-card", { hasText: name });
    await expect(flipCard.locator(".choreography-card").first()).toBeVisible();

    // A click on a plain spot of the card turns it; the edge only tilts it first.
    const front = flipCard.locator(".flip-card-front");
    await flipCard.locator(".flip-card-edge-right").hover();
    await front.getByText("Count/Wall:").click();
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

test.describe("Practice log paging", () => {
  test("loads more entries when the end of the list is scrolled into view", async ({
    page,
    request,
  }) => {
    const name = `Paged Dance ${Date.now()}`;
    const id = await createChoreographyViaApi(request, name);
    const entries = Array.from({ length: 60 }, (_, index) => {
      const day = String((index % 28) + 1).padStart(2, "0");
      const month = String(Math.floor(index / 28) + 1).padStart(2, "0");
      return request.post(`${API_BASE}/practice-log`, {
        data: { choreography_ids: [id], practiced_on: `2025-${month}-${day}` },
      });
    });
    await Promise.all(entries);

    await page.goto("/personal");
    await page.getByRole("tab", { name: /Practice log/ }).click();
    await page.getByRole("searchbox", { name: "Search dances by name" }).fill(name);

    const rows = page.locator(".practice-log-entry");
    await expect(rows).toHaveCount(50);

    await page.getByRole("button", { name: "Load more" }).scrollIntoViewIfNeeded();
    await expect(rows).toHaveCount(60);
    await expect(page.getByRole("button", { name: "Load more" })).toHaveCount(0);
  });
});

test.describe("First practice", () => {
  test("marking a dance as learned records today as its first practice", async ({
    page,
    request,
  }) => {
    const name = `First Practice Dance ${Date.now()}`;
    const id = await createChoreographyViaApi(request, name);
    const status = await request.put(`${API_BASE}/choreographies/${id}/learning-status`, {
      data: { status: "learned" },
    });
    expect(status.ok()).toBeTruthy();

    await page.goto("/personal");
    await page.getByRole("tab", { name: /Practice log/ }).click();
    await page.getByRole("searchbox", { name: "Search dances by name" }).fill(name);
    await expect(page.locator(".practice-log-entry", { hasText: name })).toHaveCount(1);

    await page.getByRole("tab", { name: /^🔁 Practice/ }).click();
    await expect(page.getByText("Not due yet (1)")).toBeVisible();
  });
});
