import { Page } from "@playwright/test";

/** The entries of the "Personal" submenu in the sidebar. */
export function personalMenuLink(page: Page, name: string | RegExp) {
  return page.getByRole("list", { name: "Personal" }).getByRole("link", { name });
}
