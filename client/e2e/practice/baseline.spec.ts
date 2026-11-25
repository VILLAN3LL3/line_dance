import { expect, test } from "@playwright/test";

import { createLearnedChoreographyWithoutPractice } from "../helpers/api";

test.describe("Practice interval step", () => {
  test("puts learned dances on a step so they are not due", async ({ page, request }) => {
    const name = `Baseline Dance ${Date.now()}`;
    await createLearnedChoreographyWithoutPractice(request, name);

    await page.goto("/personal");
    await page.getByRole("tab", { name: /^🔁 Practice/ }).click();
    await page.getByRole("searchbox", { name: "Search dances by name" }).fill(name);
    await expect(page.getByText("Time to practice (1)")).toBeVisible();

    await page.getByRole("button", { name: /Log practice/ }).click();
    await page.getByRole("radio", { name: /Set an interval step/ }).click();
    await page.getByLabel("Find a dance").fill(name);
    await page.getByRole("button", { name: /Select all shown/ }).click();
    await page.getByLabel("Interval step", { exact: true }).selectOption("6");
    await page.getByRole("button", { name: "Set step for 1 dance" }).click();
    await expect(page.getByText("Set 1 dance to step 6")).toBeVisible();

    await expect(page.getByText("Not due yet (1)")).toBeVisible();
    await page.getByRole("tab", { name: /Practice log/ }).click();
    await expect(page.getByText(/set to step 6/)).toBeVisible();
  });
});
