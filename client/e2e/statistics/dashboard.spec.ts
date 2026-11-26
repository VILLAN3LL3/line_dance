import { expect, test } from "@playwright/test";

import { API_BASE } from "../helpers/api";

test.describe("Repertoire dashboard", () => {
  test("shows the statistics of the learned dances", async ({ page, request }) => {
    const suffix = Date.now();
    const create = async (name: string, data: Record<string, unknown>) => {
      const response = await request.post(`${API_BASE}/choreographies`, {
        data: { name: `${name} ${suffix}`, level: "Beginner", ...data },
      });
      expect(response.ok()).toBeTruthy();
      const id = (await response.json()).id as number;
      const status = await request.put(`${API_BASE}/choreographies/${id}/learning-status`, {
        data: { status: "learned" },
      });
      expect(status.ok()).toBeTruthy();
    };
    await create("Dashboard A", {
      creation_year: 1999,
      authors: [`Dashboard Author ${suffix}`],
      choreography_songs: [{ title: "Song", artist: "Artist", bpm: 118, genre: `Genre ${suffix}` }],
    });
    await create("Dashboard B", { creation_year: 1999, authors: [`Dashboard Author ${suffix}`] });

    await page.goto("/personal");
    await page.getByRole("tab", { name: /Dashboard/ }).click();

    await expect(page.getByRole("searchbox", { name: "Search dances by name" })).toHaveCount(0);
    await expect(page.getByRole("region", { name: "By level" })).toBeVisible();
    const choreographers = page.getByRole("region", { name: "By choreographer" });
    await expect(choreographers.getByText(`Dashboard Author ${suffix}`)).toBeVisible();
    await expect(choreographers.getByText(/2\s*\(\d+ %\)/).first()).toBeVisible();
    await expect(
      page.getByRole("region", { name: "By genre" }).getByText(`Genre ${suffix}`),
    ).toBeVisible();
    await expect(page.getByRole("region", { name: "By year" }).getByText("1999")).toBeVisible();
    await expect(
      page.getByRole("region", { name: "By tempo" }).getByText("100–119 BPM"),
    ).toBeVisible();

    await page.getByText("Show as table").click();
    await expect(page.getByRole("table")).toBeVisible();
  });
});
