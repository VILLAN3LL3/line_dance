import { expect, test } from "@playwright/test";

import {
  addGroupLevelViaApi,
  addSessionChoreographyViaApi,
  createChoreographyViaApi,
  createDanceCourseViaApi,
  createDanceGroupViaApi,
  createSessionViaApi,
} from "../helpers/api";

test.describe("Dance Group Detail", () => {
  test("supports adding levels and creating courses", async ({ page, request }) => {
    const groupName = `E2E Main Group ${Date.now()}`;
    const groupId = await createDanceGroupViaApi(request, groupName);
    const semester = `WS${new Date().getFullYear()}`;

    await page.goto(`/admin/groups/${groupId}`);
    await expect(page.getByRole("heading", { name: groupName, exact: true })).toBeVisible();

    await page.getByRole("combobox", { name: /Available levels/i }).selectOption({
      label: "BEGINNER",
    });
    await expect(page.locator(".tag", { hasText: "BEGINNER" })).toBeVisible();

    await page.getByRole("button", { name: /New Course/i }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/groups/${groupId}/courses/new$`));

    await page.getByLabel(/Semester/i).fill(semester);
    await page.getByRole("button", { name: /Create Course/i }).click();

    await expect(page).toHaveURL(new RegExp(`/admin/groups/${groupId}$`));
    await page.getByRole("checkbox", { name: /Planned/i }).check();
    await expect(page.getByText(semester)).toBeVisible();
  });

  test("search choreographies applies prefilled learned filters", async ({ page, request }) => {
    const choreoName = `E2E Learned ${Date.now()}`;
    const choreographyId = await createChoreographyViaApi(request, choreoName);
    const groupId = await createDanceGroupViaApi(request, `E2E Learned Group ${Date.now()}`);
    await addGroupLevelViaApi(request, groupId, "BEGINNER");
    const courseId = await createDanceCourseViaApi(request, groupId, "WS2024", "2024-01-10");
    const sessionId = await createSessionViaApi(request, courseId, "2024-02-01");
    expect(choreographyId).toBeGreaterThan(0);
    await addSessionChoreographyViaApi(request, sessionId, choreographyId);

    await page.goto(`/admin/groups/${groupId}`);
    await expect(page.getByRole("button", { name: /Search Choreographies/i })).toBeVisible();
    await page.getByRole("button", { name: /Search Choreographies/i }).click();

    await expect(page).toHaveURL(/\/$/);
    await page.getByRole("button", { name: /Advanced Filters/i }).click();
    await expect(page.locator(".filter-tag", { hasText: "BEGINNER" })).toBeVisible();
    await expect(page.locator(".filter-tag", { hasText: "Vine" })).toBeVisible();
  });

  test("supports course status filters and deleting a course", async ({ page, request }) => {
    const now = Date.now();
    const groupId = await createDanceGroupViaApi(request, `E2E Status Group ${now}`);

    const runningSemester = `RUN-${now}`;
    const plannedSemester = `PLAN-${now}`;
    const passedSemester = `PASS-${now}`;

    await createDanceCourseViaApi(request, groupId, runningSemester, "2020-01-10");
    const plannedCourseId = await createDanceCourseViaApi(
      request,
      groupId,
      plannedSemester,
      "2099-01-10",
    );
    const passedCourseId = await createDanceCourseViaApi(
      request,
      groupId,
      passedSemester,
      "2020-01-01",
    );
    await createSessionViaApi(request, passedCourseId, "2000-01-01");
    expect(plannedCourseId).toBeGreaterThan(0);

    await page.goto(`/admin/groups/${groupId}`);

    await expect(page.getByText(runningSemester)).toBeVisible();
    await expect(page.getByText(plannedSemester)).toHaveCount(0);
    await expect(page.getByText(passedSemester)).toHaveCount(0);

    await page.getByRole("checkbox", { name: /Planned/i }).check();
    await expect(page.getByText(plannedSemester)).toBeVisible();

    await page.getByRole("checkbox", { name: /Passed/i }).check();
    await expect(page.getByText(passedSemester)).toBeVisible();

    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });
    await page
      .locator(".course-item", { hasText: plannedSemester })
      .getByRole("button", { name: /^Delete$/i })
      .click();
    await expect(page.getByText(plannedSemester)).toHaveCount(0);
  });
});
