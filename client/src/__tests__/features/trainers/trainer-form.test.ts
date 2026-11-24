import { describe, expect, it } from "vitest";

import {
  emptyTrainerForm,
  getTrainerErrorMessage,
  hasAllTrainerFields,
  toGenderPayload,
  toTrainerFormValues,
} from "../../../features/trainers/model/trainer-form";

describe("trainer-form model", () => {
  it("requires name, phone and email to be non-blank", () => {
    expect(hasAllTrainerFields({ name: "Ann", phone: "1", email: "a@b.c", gender: "" })).toBe(true);
    expect(hasAllTrainerFields({ name: "Ann", phone: "  ", email: "a@b.c", gender: "" })).toBe(
      false,
    );
    expect(hasAllTrainerFields(emptyTrainerForm)).toBe(false);
  });

  it("maps a trainer to form values", () => {
    expect(
      toTrainerFormValues({
        id: 1,
        name: "Ann",
        phone: "1",
        email: "a@b.c",
        created_at: "2024-01-01",
      }),
    ).toEqual({
      name: "Ann",
      phone: "1",
      email: "a@b.c",
      gender: "",
    });
    expect(
      toTrainerFormValues({
        id: 1,
        name: "Ann",
        phone: "1",
        email: "a@b.c",
        gender: "male",
        created_at: "2024-01-01",
      }).gender,
    ).toBe("male");
  });

  it("maps the unspecified gender to null for the API", () => {
    expect(toGenderPayload("")).toBeNull();
    expect(toGenderPayload("female")).toBe("female");
  });

  it("prefers the server error message and falls back otherwise", () => {
    expect(getTrainerErrorMessage(new Error("Email taken"), "Failed")).toBe("Email taken");
    expect(getTrainerErrorMessage("boom", "Failed")).toBe("Failed");
  });
});
