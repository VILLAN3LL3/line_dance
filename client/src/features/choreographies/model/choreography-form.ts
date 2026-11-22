import type { FieldIssue } from "../../../shared/http/apiErrors";
import type { ChoreographyFormData, ChoreographyInformation } from "../../../types";
import { findOptionIgnoreCase, includesIgnoreCase } from "./search-filters";

export const FORM_TABS = [
  { id: "basic-information", label: "Basic Information" },
  { id: "choreographers", label: "Choreographers" },
  { id: "links", label: "Links" },
  { id: "step-figures", label: "Step Figures" },
  { id: "additional-information", label: "Additional Information" },
  { id: "hash-tags", label: "Hash Tags" },
] as const;

export type FormTabId = (typeof FORM_TABS)[number]["id"];
export type FieldErrors = Record<string, string>;
export type ListField = "authors" | "tags" | "step_figures";

const FIELD_ISSUE_MESSAGES: Record<string, string> = {
  "name.required": "Enter a choreography name.",
  "level.required": "Select a level.",
  "level.invalid_level": "Select a valid level.",
  "personal_level.invalid_level": "Select a valid personal level.",
  "count.invalid_integer": "Enter a whole number.",
  "wall_count.invalid_integer": "Enter a whole number.",
  "creation_year.invalid_integer": "Enter a whole number.",
  "step_sheet_link.invalid_url": "Enter a valid URL.",
  "demo_video_url.invalid_url": "Enter a valid URL.",
  "tutorial_video_url.invalid_url": "Enter a valid URL.",
  "category.required": "Choose or enter a category.",
  "description.required": "Enter a description.",
};

const INFORMATION_ISSUE_FIELD = /^choreography_information\.(\d+)\.(category|description)$/;

/** Maps backend issue keys to display text; information rows are addressed by their row id. */
export function mapFieldIssues(issues: FieldIssue[], formData: ChoreographyFormData) {
  const fieldErrors: FieldErrors = {};
  let hasUnmappedIssue = false;
  for (const issue of issues) {
    const match = INFORMATION_ISSUE_FIELD.exec(issue.field);
    let field = issue.field;
    let messageField = issue.field;
    if (match) {
      const row = formData.choreography_information?.[Number(match[1])];
      if (row?.id === undefined) {
        hasUnmappedIssue = true;
        continue;
      }
      field = `choreography_information.${row.id}.${match[2]}`;
      messageField = match[2];
    }
    const message = FIELD_ISSUE_MESSAGES[`${messageField}.${issue.key}`];
    if (message) fieldErrors[field] = message;
    else hasUnmappedIssue = true;
  }
  return { fieldErrors, hasUnmappedIssue };
}

export function createEmptyChoreographyInformation(): ChoreographyInformation {
  return { id: crypto.randomUUID(), category: "", description: "" };
}

const hasContent = (row: ChoreographyInformation | undefined): row is ChoreographyInformation =>
  Boolean(row && (row.category.trim() || row.description.trim()));

/** The form always ends with one empty row so users can keep adding information. */
export function ensureEmptyInformationRow(
  information: ChoreographyInformation[],
): ChoreographyInformation[] {
  const lastItem = information.at(-1);
  return !lastItem || hasContent(lastItem)
    ? [...information, createEmptyChoreographyInformation()]
    : information;
}

export function createInitialFormData(initialData?: ChoreographyFormData): ChoreographyFormData {
  if (!initialData) {
    return {
      name: "",
      level: "",
      authors: [],
      tags: [],
      step_figures: [],
      choreography_information: [createEmptyChoreographyInformation()],
    };
  }
  return {
    ...initialData,
    choreography_information: ensureEmptyInformationRow(
      (initialData.choreography_information || []).map((item) => ({
        ...item,
        id: item.id ?? crypto.randomUUID(),
      })),
    ),
  };
}

const NUMERIC_FIELDS = new Set(["count", "wall_count", "creation_year"]);

export function applyFieldChange(
  formData: ChoreographyFormData,
  name: string,
  value: string,
  checked?: boolean,
): ChoreographyFormData {
  if (checked !== undefined) return { ...formData, [name]: checked };
  if (NUMERIC_FIELDS.has(name)) return { ...formData, [name]: value ? Number(value) : undefined };
  return { ...formData, [name]: value };
}

export function clearFieldError(errors: FieldErrors, field: string): FieldErrors {
  const next = { ...errors };
  delete next[field];
  return next;
}

export const getInformationRowId = (formData: ChoreographyFormData, index: number): string =>
  String(formData.choreography_information?.[index]?.id ?? index);

export function clearInformationRowErrors(errors: FieldErrors, rowId: string): FieldErrors {
  return Object.fromEntries(
    Object.entries(errors).filter(
      ([field]) => !field.startsWith(`choreography_information.${rowId}.`),
    ),
  );
}

/** Adds a typed or picked value to a list field using the canonical spelling of known options. */
export function addListItem(
  formData: ChoreographyFormData,
  field: ListField,
  input: string,
  options: string[],
): ChoreographyFormData {
  const trimmed = input.trim();
  const item = findOptionIgnoreCase(options, trimmed) ?? trimmed;
  if (!item || includesIgnoreCase(formData[field], item)) return formData;
  return { ...formData, [field]: [...formData[field], item] };
}

export const removeListItem = (
  formData: ChoreographyFormData,
  field: ListField,
  item: string,
): ChoreographyFormData => ({
  ...formData,
  [field]: formData[field].filter((existing) => existing !== item),
});

/** A known option that is not selected yet is added as soon as it is picked or the input blurs. */
export const isPendingKnownOption = (
  input: string,
  options: string[],
  selected: string[],
): boolean => {
  const trimmed = input.trim();
  return Boolean(
    trimmed && findOptionIgnoreCase(options, trimmed) && !includesIgnoreCase(selected, trimmed),
  );
};

export function updateInformationRow(
  formData: ChoreographyFormData,
  index: number,
  field: "category" | "description",
  value: string,
): ChoreographyFormData {
  const information = (formData.choreography_information || []).map((item, itemIndex) =>
    itemIndex === index ? { ...item, [field]: value } : item,
  );
  const isLastRow = index === information.length - 1;
  if (isLastRow && hasContent(information.at(-1))) {
    information.push(createEmptyChoreographyInformation());
  }
  return { ...formData, choreography_information: information };
}

export const removeInformationRow = (
  formData: ChoreographyFormData,
  index: number,
): ChoreographyFormData => ({
  ...formData,
  choreography_information: ensureEmptyInformationRow(
    (formData.choreography_information || []).filter((_, itemIndex) => itemIndex !== index),
  ),
});

export const toSubmittedFormData = (formData: ChoreographyFormData): ChoreographyFormData => ({
  ...formData,
  choreography_information: (formData.choreography_information || []).map(
    ({ category, description }) => ({ category, description }),
  ),
});

export function getTabErrors(fieldErrors: FieldErrors): Record<FormTabId, boolean> {
  return {
    "basic-information": Boolean(
      fieldErrors.name ||
      fieldErrors.level ||
      fieldErrors.personal_level ||
      fieldErrors.count ||
      fieldErrors.wall_count ||
      fieldErrors.creation_year,
    ),
    choreographers: false,
    links: Boolean(
      fieldErrors.step_sheet_link || fieldErrors.demo_video_url || fieldErrors.tutorial_video_url,
    ),
    "step-figures": false,
    "additional-information": Object.keys(fieldErrors).some((field) =>
      field.startsWith("choreography_information."),
    ),
    "hash-tags": false,
  };
}

/** Arrow keys wrap around, Home/End jump to the ends; other keys do not move the selection. */
export function getNextTabIndex(
  key: string,
  currentIndex: number,
  tabCount: number,
): number | null {
  if (key === "ArrowRight") return (currentIndex + 1) % tabCount;
  if (key === "ArrowLeft") return (currentIndex - 1 + tabCount) % tabCount;
  if (key === "Home") return 0;
  if (key === "End") return tabCount - 1;
  return null;
}
