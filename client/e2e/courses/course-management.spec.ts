import { expect, test } from "@playwright/test";

import { createChoreographyViaApi, createDanceCourseViaApi, createDanceGroupViaApi, createTrainerViaApi } from "../helpers/api";

test.describe("Course Management", () => {
  test("course detail supports session and choreography lifecycle", async ({ page, request }) => {
    const choreoName = `E2E Session Choreo ${Date.now()}`;
    const groupName = `E2E Session Group ${Date.now()}`;
    const choreographyId = await createChoreographyViaApi(request, choreoName);
    const groupId = await createDanceGroupViaApi(request, groupName);
    const courseId = await createDanceCourseViaApi(
      request,
      groupId,
      `WS${new Date().getFullYear() - 1}`,
      "2025-01-10",
    );

    const futureSessionDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    await page.goto(`/admin/groups/${groupId}/courses/${courseId}`);
    await expect(
      page.getByRole("heading", { name: new RegExp(`Course: ${courseId}`) }),
    ).toBeVisible();

    await page.locator(".session-form input[type='date']").fill(futureSessionDate);
    await page.getByRole("button", { name: /Add Session/i }).click();
    await expect(page.locator(".session-item")).toHaveCount(1);

    await page.getByRole("button", { name: /Manage/i }).click();
    await expect(page.getByRole("heading", { name: /Choreographies for/i })).toBeVisible();
    await expect(page.locator(".loading")).toHaveCount(0);
    await expect(page.getByPlaceholder(/Search choreography by name/i)).toBeEnabled();
    await page.getByPlaceholder(/Search choreography by name/i).fill(`${choreoName} (Beginner)`);
    await expect(page.getByRole("button", { name: /Add to Session/i })).toBeEnabled();
    await page.getByRole("button", { name: /Add to Session/i }).click();

    const sessionChoreographyItem = page.locator(".choreography-item", { hasText: choreoName });
    await expect(sessionChoreographyItem).toHaveCount(1, { timeout: 30_000 });
    await expect(page.locator(".loading")).toHaveCount(0, { timeout: 30_000 });

    const removeButton = sessionChoreographyItem.getByRole("button", { name: /^Remove$/i });
    await expect(removeButton).toBeEnabled({ timeout: 30_000 });

    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });
    await removeButton.click();
    await expect(page.locator(".loading")).toHaveCount(0, { timeout: 30_000 });
    await expect(sessionChoreographyItem).toHaveCount(0, { timeout: 30_000 });

    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });
    await page.getByRole("button", { name: /^Delete$/i }).click();
    await expect(page.locator(".loading")).toHaveCount(0, { timeout: 30_000 });
    await expect(page.locator(".session-item")).toHaveCount(0, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: /Choreographies for/i })).toHaveCount(0);
    await expect(page.locator(".empty-state", { hasText: /No sessions yet/i })).toBeVisible();

    expect(choreographyId).toBeGreaterThan(0);
  });

  test("course edit updates semester, links, and trainer", async ({ page, request }) => {
    const groupName = `E2E Course Edit Group ${Date.now()}`;
    const trainerName = `E2E Trainer ${Date.now()}`;
    const trainerId = await createTrainerViaApi(
      request,
      trainerName,
      `trainer.${Date.now()}@example.com`,
    );
    const groupId = await createDanceGroupViaApi(request, groupName);
    const courseId = await createDanceCourseViaApi(request, groupId, "WS2024", "2024-01-20");
    const newSemester = "SS2026";

    await page.goto(`/admin/groups/${groupId}/courses/${courseId}/edit`);
    await expect(page.getByRole("heading", { name: /Edit Course/i })).toBeVisible();

    await page.getByLabel(/Semester/i).fill(newSemester);
    await page.getByLabel(/YouTube Playlist URL/i).fill("https://youtube.com/playlist?list=PL123");
    await page.getByLabel(/Copperknob List URL/i).fill("https://www.copperknob.co.uk/");
    await page.getByLabel(/Spotify Playlist URL/i).fill("https://open.spotify.com/playlist/123");
    await page.getByLabel(/Trainer/i).selectOption(String(trainerId));

    await page.getByRole("button", { name: /Save Changes/i }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/groups/${groupId}$`));
    await expect(page.getByText(newSemester)).toBeVisible();
    await expect(page.getByText(new RegExp(`Trainer: ${trainerName}`))).toBeVisible();
    await expect(page.getByRole("link", { name: /YouTube/i })).toBeVisible();
  });
});
