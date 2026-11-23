import { describe, expect, it } from "vitest";

import {
  choreographyToFormData,
  hasPersonalLevel,
} from "../../../features/choreographies/model/choreography-level";
import type { Choreography } from "../../../types";

const choreography: Choreography = {
  id: 1,
  name: "Dance",
  level: "Advanced",
  official_level: "Beginner",
  personal_level: "Advanced",
  authors: [],
  tags: [],
  step_figures: [],
  rating: null,
  choreography_songs: [],
  created_at: "2020-01-01T00:00:00.000Z",
  updated_at: "2020-01-01T00:00:00.000Z",
};

describe("hasPersonalLevel", () => {
  it("is true only when a personal level exists", () => {
    expect(hasPersonalLevel(choreography)).toBe(true);
    expect(hasPersonalLevel({ ...choreography, personal_level: null })).toBe(false);
  });
});

describe("choreographyToFormData", () => {
  it("uses the official level, keeps the personal level and drops official_level", () => {
    const data = choreographyToFormData(choreography);

    expect(data.level).toBe("Beginner");
    expect(data.personal_level).toBe("Advanced");
    expect(data).not.toHaveProperty("official_level");
    expect(data.name).toBe("Dance");
  });
});
