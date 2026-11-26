import { expect, test } from "@playwright/test";

import { personalMenuLink } from "../helpers/personal";
import { createChoreographyViaApi } from "../helpers/api";

test.describe("Personal learning status", () => {
  test("marks a dance on the card and moves it between the personal lists", async ({
    page,
    request,
  }) => {
    const name = `Status Dance ${Date.now()}`;
    await createChoreographyViaApi(request, name);

    await page.goto("/");
    const closeMenuButton = page.getByRole("button", { name: "Close menu" });
    if (await closeMenuButton.isVisible()) {
      await closeMenuButton.click();
    }
    const search = page.getByPlaceholder(/Search choreographies by name/i);
    await search.fill(name);
    await search.press("Enter");

    const card = page.locator(".choreography-card", { hasText: name }).first();
    await card.getByRole("button", { name: name }).click();
    await card.getByRole("button", { name: "Wishlist" }).click();
    await expect(card.getByRole("button", { name: /Learning status: Wishlist/ })).toHaveText("🤍");

    await page.goto("/personal/wishlist");
    await expect(page.getByRole("heading", { name: "Personal" })).toBeVisible();
    const wishlistCard = page.locator(".choreography-card", { hasText: name });
    await expect(wishlistCard).toBeVisible();

    await wishlistCard.getByRole("button", { name: /Learning status: Wishlist/ }).click();
    await wishlistCard.getByRole("button", { name: "Learned" }).click();
    await expect(wishlistCard).toHaveCount(0);

    await personalMenuLink(page, /^Learned/).click();
    const learnedCard = page.locator(".choreography-card", { hasText: name });
    await expect(learnedCard.getByRole("button", { name: /Learning status: Learned/ })).toHaveText(
      "✅",
    );
    await expect(learnedCard.getByText(/Learned since \d{4}-\d{2}-\d{2}/)).toBeVisible();
  });

  test("closes the status editor with Escape when opened from the title or the icon", async ({
    page,
    request,
  }) => {
    const name = `Escape Dance ${Date.now()}`;
    await createChoreographyViaApi(request, name);

    await page.goto("/");
    const closeMenuButton = page.getByRole("button", { name: "Close menu" });
    if (await closeMenuButton.isVisible()) {
      await closeMenuButton.click();
    }
    const search = page.getByPlaceholder(/Search choreographies by name/i);
    await search.fill(name);
    await search.press("Enter");

    const card = page.locator(".choreography-card", { hasText: name }).first();
    const editor = card.getByRole("group", { name: "Learning status" });

    await card.getByRole("button", { name: name }).click();
    await expect(editor).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(editor).toBeHidden();

    await card.getByRole("button", { name: name }).click();
    await card.getByRole("button", { name: "Close status editor" }).click();
    await expect(editor).toBeHidden();

    await card.getByRole("button", { name: name }).click();
    await card.getByRole("button", { name: "Learned" }).click();
    await card.getByRole("button", { name: /Learning status: Learned/ }).click();
    await expect(editor).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(editor).toBeHidden();
  });
});
