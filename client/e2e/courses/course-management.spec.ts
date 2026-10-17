import { expect, test } from "@playwright/test";

import {
  API_BASE,
  addSessionChoreographyViaApi,
  createChoreographyViaApi,
  createDanceCourseViaApi,
  createDanceGroupViaApi,
  createTrainerViaApi,
} from "../helpers/api";

test.describe("Course Management", () => {
  for (const input of ["mouse", "keyboard", "touch"] as const) {
    test.describe(`session contents reordering with ${input}`, () => {
      test.use({
        viewport: input === "mouse" ? { width: 1280, height: 900 } : { width: 390, height: 1100 },
        hasTouch: input === "touch",
      });

      test("preserves dates and hidden sessions and persists descriptions and dances", async ({
        page,
        request,
      }, testInfo) => {
        const groupId = await createDanceGroupViaApi(request, `Reorder ${input} ${Date.now()}`);
        const courseId = await createDanceCourseViaApi(request, groupId, "WS2099", "2099-01-01");
        const danceName = `Reorder Dance ${input} ${Date.now()}`;
        const danceId = await createChoreographyViaApi(request, danceName);
        const slots: { id: number; session_date: string }[] = [];
        for (const [index, comment] of ["Hidden", "First", "Second", "Third"].entries()) {
          const response = await request.post(`${API_BASE}/sessions`, {
            data: {
              dance_course_id: courseId,
              session_date: index === 0 ? "2000-01-01" : `2099-01-0${index}`,
              comment,
            },
          });
          expect(response.ok()).toBeTruthy();
          slots.push(await response.json());
        }
        await addSessionChoreographyViaApi(request, slots[1].id, danceId);
        await page.goto(`/admin/groups/${groupId}/courses/${courseId}`);
        const items = page.locator(".session-item");
        await expect(items).toHaveCount(3);
        const closeMenu = page.getByRole("button", { name: "Close menu" });
        if (await closeMenu.isVisible()) await closeMenu.click();
        await expect(closeMenu).not.toBeVisible();
        const datesBefore = await items.locator("h4").allTextContents();
        const source = items.nth(2).getByRole("button", { name: /Move contents/ });
        const target = items.nth(0).getByRole("button", { name: /Move contents/ });
        await source.scrollIntoViewIfNeeded();

        const saved = page.waitForResponse(
          (response) =>
            response.url().endsWith("/sessions/reorder-contents") &&
            response.request().method() === "POST",
        );
        if (input === "keyboard") {
          await source.focus();
          await page.keyboard.press("Space");
          await expect(source).toHaveAttribute("aria-pressed", "true");
          await expect(page.locator(".session-content-drag-preview")).toBeVisible();
          await page.evaluate(
            () =>
              new Promise<void>((resolve) =>
                requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
              ),
          );
          await page.keyboard.press("ArrowUp");
          await expect(items.nth(1)).toHaveClass(/session-drop-target/);
          await page.keyboard.press("ArrowUp");
          await expect(items.nth(0)).toHaveClass(/session-drop-target/);
          await page.keyboard.press("Space");
        } else if (input === "mouse") {
          const from = await source.boundingBox();
          const to = await target.boundingBox();
          if (!from || !to) throw new Error("Missing drag handle geometry");
          await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
          await page.mouse.down();
          await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 15 });
          await page.mouse.up();
        } else {
          const from = await source.boundingBox();
          const to = await target.boundingBox();
          if (!from || !to) throw new Error("Missing touch handle geometry");
          const cdp = await page.context().newCDPSession(page);
          const x = from.x + from.width / 2;
          const startY = from.y + from.height / 2;
          const endY = to.y + to.height / 2;
          await expect
            .poll(() =>
              page.evaluate(
                ({ x, y }) =>
                  Boolean(document.elementFromPoint(x, y)?.closest(".session-drag-handle")),
                { x, y: startY },
              ),
            )
            .toBeTruthy();
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchStart",
            touchPoints: [{ x, y: startY }],
          });
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [{ x, y: startY - 12 }],
          });
          await expect(page.locator(".session-content-drag-preview")).toBeVisible();
          for (let step = 1; step <= 15; step += 1) {
            await cdp.send("Input.dispatchTouchEvent", {
              type: "touchMove",
              touchPoints: [{ x, y: startY + ((endY - startY) * step) / 15 }],
            });
          }
          await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
          await cdp.detach();
        }
        expect((await saved).ok()).toBeTruthy();
        await expect(items.nth(0).locator(".session-comment")).toHaveText("Third");
        await expect(items.nth(1).locator(".session-comment")).toHaveText("First");
        await expect(items.nth(2).locator(".session-comment")).toHaveText("Second");
        expect(await items.locator("h4").allTextContents()).toEqual(datesBefore);
        await page.reload();
        await expect(items.nth(1).locator(".session-comment")).toHaveText("First");
        if (await closeMenu.isVisible()) await closeMenu.click();
        await items.nth(1).getByRole("button", { name: "Manage", exact: true }).click();
        await expect(
          items.nth(1).getByRole("button", { name: `Open choreography card for ${danceName}` }),
        ).toBeVisible();
        const response = await request.get(`${API_BASE}/sessions?dance_course_id=${courseId}`);
        const sessions = await response.json();
        expect(
          sessions.map((session: { id: number; session_date: string }) => ({
            id: session.id,
            session_date: session.session_date,
          })),
        ).toEqual(slots.map(({ id, session_date }) => ({ id, session_date })));
        expect(sessions[0].comment).toBe("Hidden");
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        ).toBeTruthy();
        await page.screenshot({
          path: testInfo.outputPath(`reorder-${input}.png`),
          fullPage: true,
        });
      });
    });
  }

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
    await expect(page.getByRole("heading", { name: /E2E Course/ })).toBeVisible();

    await page.locator(".session-form input[type='date']").fill(futureSessionDate);
    await page.getByRole("button", { name: /Add Session/i }).click();
    await expect(page.locator(".session-item")).toHaveCount(1);

    await page.getByRole("button", { name: /Manage/i }).click();
    await expect(page.getByRole("heading", { name: /Choreographies for/i })).toBeVisible();
    await expect(page.locator(".loading")).toHaveCount(0);
    await expect(page.getByPlaceholder(/Search choreography by name/i)).toBeEnabled();
    await page.getByPlaceholder(/Search choreography by name/i).fill(`${choreoName} (BEGINNER)`);
    await expect(page.getByRole("button", { name: /Add to Session/i })).toBeEnabled();
    await page.getByRole("button", { name: /Add to Session/i }).click();

    const sessionChoreographyItem = page.locator(".choreography-item", { hasText: choreoName });
    await expect(sessionChoreographyItem).toHaveCount(1, { timeout: 30_000 });
    await expect(page.locator(".loading")).toHaveCount(0, { timeout: 30_000 });

    await sessionChoreographyItem
      .getByRole("button", { name: new RegExp(`Open choreography card for ${choreoName}`) })
      .click();
    const choreographyDialog = page.getByRole("dialog", {
      name: new RegExp(`Choreography details: ${choreoName}`),
    });
    await expect(choreographyDialog).toBeVisible({ timeout: 30_000 });
    await expect(choreographyDialog.getByRole("heading", { name: choreoName })).toBeVisible({
      timeout: 30_000,
    });
    await choreographyDialog.getByRole("button", { name: /^Close$/i }).click();
    await expect(choreographyDialog).toHaveCount(0, { timeout: 30_000 });

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

  test("direct create/edit routes initialize form state and allow cancel", async ({
    page,
    request,
  }) => {
    const groupId = await createDanceGroupViaApi(request, `E2E Direct Route Group ${Date.now()}`);
    const courseId = await createDanceCourseViaApi(request, groupId, "WS2026", "2026-01-20");

    await page.goto(`/admin/groups/${groupId}/courses/new`);
    await expect(page.getByRole("heading", { name: /Create Course/i })).toBeVisible();
    await expect(page.getByText(/Group:/i)).toBeVisible();
    await page.getByRole("button", { name: /^Cancel$/i }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/groups/${groupId}$`));

    await page.goto(`/admin/groups/${groupId}/courses/${courseId}/edit`);
    await expect(page.getByRole("heading", { name: /Edit Course/i })).toBeVisible();
    await expect(page.getByLabel(/Course Name/i)).toHaveValue("E2E Course WS2026");
    await expect(page.getByLabel(/Semester/i)).toHaveValue("WS2026");
    await page.getByRole("button", { name: /^Cancel$/i }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/groups/${groupId}$`));
  });
});
