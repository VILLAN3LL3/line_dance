import { expect, test } from "@playwright/test";

import { personalMenuLink } from "../helpers/personal";

test.describe("Personal area navigation", () => {
  test("opens the dashboard from the sidebar and lists the sections as submenu", async ({
    page,
  }) => {
    await page.goto("/trainers");
    await expect(page.getByRole("list", { name: "Personal" })).toHaveCount(0);

    await page.getByRole("link", { name: /Personal/ }).click();

    await expect(page).toHaveURL(/\/personal\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByRole("tab")).toHaveCount(0);
    await expect(personalMenuLink(page, "Dashboard")).toHaveAttribute("aria-current", "page");

    await personalMenuLink(page, /^Wishlist/).click();
    await expect(page).toHaveURL(/\/personal\/wishlist$/);
    await expect(page.getByRole("heading", { name: /^Wishlist/ })).toBeVisible();
    await expect(personalMenuLink(page, /^Wishlist/)).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("searchbox", { name: "Search dances by name" })).toBeVisible();

    await personalMenuLink(page, /^Practice$|^Practice\s*\d+$/).click();
    await expect(page).toHaveURL(/\/personal\/practice$/);
  });

  test("redirects an unknown section to the dashboard", async ({ page }) => {
    await page.goto("/personal/unknown");
    await expect(page).toHaveURL(/\/personal\/dashboard$/);
  });
});
