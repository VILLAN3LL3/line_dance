import { describe, expect, it } from "vitest";

import { LEARNING_STATUS_OPTIONS } from "../../../features/choreographies";
import {
  buildPersonalSections,
  describeSection,
  isSearchableSection,
  isStatusSection,
  parsePersonalSection,
} from "../../../features/personal/model/personal-sections";

describe("buildPersonalSections", () => {
  it("lists the sections of the sidebar menu with route and count", () => {
    const sections = buildPersonalSections(LEARNING_STATUS_OPTIONS, {
      wishlist: 3,
      learned: null,
      practice: 2,
    });

    expect(
      sections.map((section) => [
        section.id,
        section.path,
        section.label,
        section.emoji,
        section.count,
      ]),
    ).toEqual([
      ["dashboard", "/personal/dashboard", "Dashboard", "📊", null],
      ["wishlist", "/personal/wishlist", "Wishlist", "🤍", 3],
      ["learned", "/personal/learned", "Learned", "✅", null],
      ["practice", "/personal/practice", "Practice", "🏋️‍♂️", 2],
      ["log", "/personal/log", "Practice log", "📓", null],
    ]);
    expect(sections[1].emptyMessage).toMatch(/wishlist is empty/i);
  });
});

describe("section helpers", () => {
  it("knows the sections by the name in the route", () => {
    expect(
      ["dashboard", "wishlist", "learned", "practice", "log"].map(parsePersonalSection),
    ).toEqual(["dashboard", "wishlist", "learned", "practice", "log"]);
    expect([undefined, "", "Dashboard", "other"].map(parsePersonalSection)).toEqual([
      null,
      null,
      null,
      null,
    ]);
  });

  it("tells the status sections and the searchable sections apart", () => {
    expect(isStatusSection("wishlist")).toBe(true);
    expect(isStatusSection("practice")).toBe(false);
    expect(
      ["wishlist", "learned", "practice", "log"].map((id) => isSearchableSection(id as never)),
    ).toEqual([true, true, true, true]);
    expect(isSearchableSection("dashboard")).toBe(false);
  });

  it("puts the count into the heading only when it is known", () => {
    const [dashboard, wishlist, , practice] = buildPersonalSections(LEARNING_STATUS_OPTIONS, {
      wishlist: 0,
      practice: 5,
    });
    expect([dashboard, wishlist, practice].map(describeSection)).toEqual([
      "Dashboard",
      "Wishlist (0)",
      "Practice (5)",
    ]);
  });
});
