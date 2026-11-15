import "../../styles/ChoreographyForm.css";

import React, { useEffect, useRef, useState } from "react";

import {
  getAuthors,
  getChoreographyInfoCategories,
  getLevels,
  getStepFigures,
  getTags,
  validateChoreography,
} from "../../api";
import { ChoreographyFormData, ChoreographyInformation } from "../../types";
import { getFieldIssues } from "../../shared/http/apiErrors";
import type { FieldIssue } from "../../shared/http/apiErrors";
import { ActionButton, ActionGroup, LevelBatch } from "../../shared/ui";
import {
  AdditionalInformationTab,
  BasicInformationTab,
  ChoreographersTab,
  HashTagsTab,
  LinksTab,
  StepFiguresTab,
} from "./ChoreographyFormTabs";

const FORM_TABS = [
  { id: "basic-information", label: "Basic Information" },
  { id: "choreographers", label: "Choreographers" },
  { id: "links", label: "Links" },
  { id: "step-figures", label: "Step Figures" },
  { id: "additional-information", label: "Additional Information" },
  { id: "hash-tags", label: "Hash Tags" },
] as const;

type FormTabId = (typeof FORM_TABS)[number]["id"];

const FIELD_ISSUE_MESSAGES: Record<string, string> = {
  "name.required": "Enter a choreography name.",
  "level.required": "Select a level.",
  "level.invalid_level": "Select a valid level.",
  "count.invalid_integer": "Enter a whole number.",
  "wall_count.invalid_integer": "Enter a whole number.",
  "creation_year.invalid_integer": "Enter a whole number.",
  "step_sheet_link.invalid_url": "Enter a valid URL.",
  "demo_video_url.invalid_url": "Enter a valid URL.",
  "tutorial_video_url.invalid_url": "Enter a valid URL.",
  "category.required": "Choose or enter a category.",
  "description.required": "Enter a description.",
};

function mapFieldIssues(issues: FieldIssue[], formData: ChoreographyFormData) {
  const fieldErrors: Record<string, string> = {};
  let hasUnmappedIssue = false;
  for (const issue of issues) {
    const match = /^choreography_information\.(\d+)\.(category|description)$/.exec(issue.field);
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

function createEmptyChoreographyInformation(): ChoreographyInformation {
  return { id: crypto.randomUUID(), category: "", description: "" };
}

function ensureEmptyChoreographyInformationRow(information: ChoreographyInformation[]) {
  const lastItem = information[information.length - 1];
  if (!lastItem || lastItem.category.trim() || lastItem.description.trim()) {
    information.push(createEmptyChoreographyInformation());
  }
  return information;
}

interface ChoreographyFormProps {
  title?: string;
  initialData?: ChoreographyFormData;
  onSubmit: (data: ChoreographyFormData) => Promise<void>;
  isLoading?: boolean;
  onCancel?: () => void;
}

export const ChoreographyForm: React.FC<ChoreographyFormProps> = ({
  title,
  initialData,
  onSubmit,
  isLoading = false,
  onCancel,
}) => {
  const [formData, setFormData] = useState<ChoreographyFormData>(() =>
    initialData
      ? {
          ...initialData,
          choreography_information: ensureEmptyChoreographyInformationRow(
            (initialData.choreography_information || []).map((item) => ({
              ...item,
              id: item.id ?? crypto.randomUUID(),
            })),
          ),
        }
      : {
          name: "",
          level: "",
          authors: [],
          tags: [],
          step_figures: [],
          choreography_information: [createEmptyChoreographyInformation()],
        },
  );
  const [activeTab, setActiveTab] = useState<FormTabId>("basic-information");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const validationVersion = useRef(0);

  const [currentAuthor, setCurrentAuthor] = useState("");
  const [currentTag, setCurrentTag] = useState("");
  const [currentFigure, setCurrentFigure] = useState("");
  const [levels, setLevels] = useState<{ id: number; name: string }[]>([]);
  const [authorsFromDb, setAuthorsFromDb] = useState<string[]>([]);
  const [tagsFromDb, setTagsFromDb] = useState<string[]>([]);
  const [figuresFromDb, setFiguresFromDb] = useState<string[]>([]);
  const [informationCategories, setInformationCategories] = useState<string[]>(() =>
    (initialData?.choreography_information || []).map((item) => item.category),
  );
  const [customCategoryRowIds, setCustomCategoryRowIds] = useState<Set<string>>(() => new Set());

  const tabValidationErrors: Record<FormTabId, boolean> = {
    "basic-information": Boolean(
      fieldErrors.name ||
      fieldErrors.level ||
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

  useEffect(() => {
    let isActive = true;

    const loadReferenceData = async () => {
      try {
        const [fetchedLevels, fetchedAuthors, fetchedTags, fetchedFigures, fetchedInfoCategories] =
          await Promise.all([
            getLevels(),
            getAuthors(),
            getTags(),
            getStepFigures(),
            getChoreographyInfoCategories(),
          ]);

        if (!isActive) {
          return;
        }

        setLevels(fetchedLevels);
        setAuthorsFromDb(fetchedAuthors);
        setTagsFromDb(fetchedTags);
        setFiguresFromDb(fetchedFigures);
        setInformationCategories(fetchedInfoCategories);
      } catch (error) {
        console.error("Error loading reference data:", error);
      }
    };

    void loadReferenceData();

    return () => {
      isActive = false;
    };
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    validationVersion.current += 1;
    setFieldErrors((previous) => {
      const next = { ...previous };
      delete next[name];
      return next;
    });
    if (type === "checkbox") {
      const isChecked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({
        ...prev,
        [name]: isChecked,
      }));
    } else {
      const isNumericField = name === "count" || name === "wall_count" || name === "creation_year";
      const parsedValue = isNumericField && value ? Number(value) : undefined;
      const finalValue = isNumericField ? parsedValue : value;

      setFormData((prev) => ({
        ...prev,
        [name]: finalValue,
      }));
    }
  };

  const normalizeText = (value: string) => value.trim().toLowerCase();
  const includesIgnoreCase = (items: string[], value: string) =>
    items.some((item) => normalizeText(item) === normalizeText(value));
  const findOptionIgnoreCase = (options: string[], value: string) =>
    options.find((option) => normalizeText(option) === normalizeText(value));

  const addAuthor = (authorValue?: string) => {
    const author = (authorValue ?? currentAuthor).trim();
    const normalizedAuthor = findOptionIgnoreCase(authorsFromDb, author) ?? author;
    if (normalizedAuthor && !includesIgnoreCase(formData.authors, normalizedAuthor)) {
      validationVersion.current += 1;
      setFormData((prev) => ({
        ...prev,
        authors: [...prev.authors, normalizedAuthor],
      }));
    }
    setCurrentAuthor("");
  };

  const addTag = (tagValue?: string) => {
    const tag = (tagValue ?? currentTag).trim();
    const normalizedTag = findOptionIgnoreCase(tagsFromDb, tag) ?? tag;
    if (normalizedTag && !includesIgnoreCase(formData.tags, normalizedTag)) {
      validationVersion.current += 1;
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, normalizedTag],
      }));
    }
    setCurrentTag("");
  };

  const addFigure = (figureValue?: string) => {
    const figure = (figureValue ?? currentFigure).trim();
    const normalizedFigure = findOptionIgnoreCase(figuresFromDb, figure) ?? figure;
    if (normalizedFigure && !includesIgnoreCase(formData.step_figures, normalizedFigure)) {
      validationVersion.current += 1;
      setFormData((prev) => ({
        ...prev,
        step_figures: [...prev.step_figures, normalizedFigure],
      }));
    }
    setCurrentFigure("");
  };

  const removeAuthor = (authorToRemove: string) => {
    validationVersion.current += 1;
    setFormData((prev) => ({
      ...prev,
      authors: prev.authors.filter((author) => author !== authorToRemove),
    }));
  };

  const removeTag = (tagToRemove: string) => {
    validationVersion.current += 1;
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const removeFigure = (figureToRemove: string) => {
    validationVersion.current += 1;
    setFormData((prev) => ({
      ...prev,
      step_figures: prev.step_figures.filter((figure) => figure !== figureToRemove),
    }));
  };

  const updateChoreographyInformation = (
    index: number,
    field: "category" | "description",
    value: string,
  ) => {
    validationVersion.current += 1;
    const rowId = String(formData.choreography_information?.[index]?.id ?? index);
    setFieldErrors((previous) => {
      const next = { ...previous };
      delete next[`choreography_information.${rowId}.${field}`];
      return next;
    });
    setFormData((previous) => ({
      ...previous,
      choreography_information: (() => {
        const information = (previous.choreography_information || []).map((item, itemIndex) =>
          itemIndex === index ? { ...item, [field]: value } : item,
        );
        const lastItem = information[information.length - 1];
        if (
          index === information.length - 1 &&
          lastItem &&
          (lastItem.category.trim() || lastItem.description.trim())
        ) {
          information.push(createEmptyChoreographyInformation());
        }
        return information;
      })(),
    }));
  };

  const setCustomCategoryMode = (rowId: string, isCustom: boolean) => {
    setCustomCategoryRowIds((previous) => {
      if (previous.has(rowId) === isCustom) return previous;

      const next = new Set(previous);
      if (isCustom) {
        next.add(rowId);
      } else {
        next.delete(rowId);
      }
      return next;
    });
  };

  const removeChoreographyInformation = (indexToRemove: number) => {
    const rowId = String(formData.choreography_information?.[indexToRemove]?.id ?? indexToRemove);
    validationVersion.current += 1;
    setFieldErrors((previous) =>
      Object.fromEntries(
        Object.entries(previous).filter(
          ([field]) => !field.startsWith(`choreography_information.${rowId}.`),
        ),
      ),
    );
    setCustomCategoryMode(rowId, false);
    setFormData((previous) => ({
      ...previous,
      choreography_information: ensureEmptyChoreographyInformationRow(
        (previous.choreography_information || []).filter((_, index) => index !== indexToRemove),
      ),
    }));
  };

  const isDatalistSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputType = (e.nativeEvent as InputEvent).inputType;
    return inputType === "insertReplacementText" || inputType === "insertFromDrop";
  };

  const handleAuthorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const trimmed = value.trim();
    setCurrentAuthor(value);

    if (
      trimmed &&
      findOptionIgnoreCase(authorsFromDb, trimmed) &&
      !includesIgnoreCase(formData.authors, trimmed) &&
      isDatalistSelection(e)
    ) {
      addAuthor(trimmed);
    }
  };

  const handleFigureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const trimmed = value.trim();
    setCurrentFigure(value);

    if (
      trimmed &&
      findOptionIgnoreCase(figuresFromDb, trimmed) &&
      !includesIgnoreCase(formData.step_figures, trimmed) &&
      isDatalistSelection(e)
    ) {
      addFigure(trimmed);
    }
  };

  const handleTagChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const trimmed = value.trim();
    setCurrentTag(value);

    if (
      trimmed &&
      findOptionIgnoreCase(tagsFromDb, trimmed) &&
      !includesIgnoreCase(formData.tags, trimmed) &&
      isDatalistSelection(e)
    ) {
      addTag(trimmed);
    }
  };

  const handleAuthorBlur = () => {
    const normalized = currentAuthor.trim();
    if (
      normalized &&
      findOptionIgnoreCase(authorsFromDb, normalized) &&
      !includesIgnoreCase(formData.authors, normalized)
    ) {
      addAuthor(normalized);
    }
  };

  const handleFigureBlur = () => {
    const normalized = currentFigure.trim();
    if (
      normalized &&
      findOptionIgnoreCase(figuresFromDb, normalized) &&
      !includesIgnoreCase(formData.step_figures, normalized)
    ) {
      addFigure(normalized);
    }
  };

  const handleTagBlur = () => {
    const normalized = currentTag.trim();
    if (
      normalized &&
      findOptionIgnoreCase(tagsFromDb, normalized) &&
      !includesIgnoreCase(formData.tags, normalized)
    ) {
      addTag(normalized);
    }
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isValidating) return;
    const submittedVersion = validationVersion.current;
    setIsValidating(true);
    setValidationError(null);
    try {
      await validateChoreography(formData);
      if (validationVersion.current !== submittedVersion) {
        setValidationError("The form changed during validation. Please save again.");
        return;
      }
      setFieldErrors({});
      await onSubmit({
        ...formData,
        choreography_information: (formData.choreography_information || []).map(
          ({ category, description }) => ({ category, description }),
        ),
      });
    } catch (error) {
      const issues = getFieldIssues(error);
      if (validationVersion.current !== submittedVersion) {
        setValidationError("The form changed during validation. Please save again.");
      } else if (issues) {
        const { fieldErrors: nextErrors, hasUnmappedIssue } = mapFieldIssues(issues, formData);
        setFieldErrors(nextErrors);
        if (hasUnmappedIssue)
          setValidationError("Some fields could not be validated. Please try again.");
      } else {
        setValidationError("Failed to validate or save the choreography. Please try again.");
        console.error("Form submission error:", error);
      }
    } finally {
      setIsValidating(false);
    }
  };

  const handleTabKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
    let nextIndex: number;
    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % FORM_TABS.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + FORM_TABS.length) % FORM_TABS.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = FORM_TABS.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const nextTab = FORM_TABS[nextIndex];
    setActiveTab(nextTab.id);
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      .item(nextIndex)
      .focus();
  };

  const contextTitle = formData.name.trim() || title;

  return (
    <form className="choreography-form" onSubmit={handleSubmit} noValidate>
      {(contextTitle || formData.level.trim()) && (
        <div className="choreography-form-context">
          {contextTitle && <h2>{contextTitle}</h2>}
          {formData.level.trim() && <LevelBatch level={formData.level} />}
        </div>
      )}
      <div
        className="choreography-form-tabs"
        role="tablist"
        aria-label="Choreography form sections"
      >
        {FORM_TABS.map((tab, index) =>
          (() => {
            const hasError = tabValidationErrors[tab.id];
            return (
              <button
                key={tab.id}
                id={`choreography-form-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls="choreography-form-panel"
                aria-label={hasError ? `${tab.label}, validation errors` : undefined}
                title={hasError ? `${tab.label} contains validation errors` : undefined}
                tabIndex={activeTab === tab.id ? 0 : -1}
                className={
                  activeTab === tab.id ? "choreography-form-tab is-active" : "choreography-form-tab"
                }
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
              >
                {tab.label}
                {hasError && <span aria-hidden="true">⚠️</span>}
              </button>
            );
          })(),
        )}
      </div>

      <div
        id="choreography-form-panel"
        className="choreography-form-tab-panel"
        role="tabpanel"
        aria-labelledby={`choreography-form-tab-${activeTab}`}
        tabIndex={0}
      >
        {activeTab === "basic-information" && (
          <BasicInformationTab
            formData={formData}
            levels={levels}
            errors={fieldErrors}
            onChange={handleChange}
          />
        )}

        {activeTab === "choreographers" && (
          <ChoreographersTab
            inputValue={currentAuthor}
            options={authorsFromDb}
            selectedValues={formData.authors}
            onInputChange={handleAuthorChange}
            onInputBlur={handleAuthorBlur}
            onAdd={addAuthor}
            onRemove={removeAuthor}
          />
        )}

        {activeTab === "links" && (
          <LinksTab formData={formData} errors={fieldErrors} onChange={handleChange} />
        )}

        {activeTab === "step-figures" && (
          <StepFiguresTab
            inputValue={currentFigure}
            options={figuresFromDb}
            selectedValues={formData.step_figures}
            onInputChange={handleFigureChange}
            onInputBlur={handleFigureBlur}
            onAdd={addFigure}
            onRemove={removeFigure}
          />
        )}

        {activeTab === "additional-information" && (
          <AdditionalInformationTab
            information={formData.choreography_information || []}
            categories={informationCategories}
            customCategoryRowIds={customCategoryRowIds}
            errors={fieldErrors}
            onCategoryChange={(index, value) =>
              updateChoreographyInformation(index, "category", value)
            }
            onDescriptionChange={(index, value) =>
              updateChoreographyInformation(index, "description", value)
            }
            onCustomCategoryModeChange={setCustomCategoryMode}
            onRemove={removeChoreographyInformation}
          />
        )}

        {activeTab === "hash-tags" && (
          <HashTagsTab
            inputValue={currentTag}
            options={tagsFromDb}
            selectedValues={formData.tags}
            onInputChange={handleTagChange}
            onInputBlur={handleTagBlur}
            onAdd={addTag}
            onRemove={removeTag}
          />
        )}
      </div>

      {validationError && (
        <p role="alert" className="form-field-error">
          {validationError}
        </p>
      )}
      <ActionGroup className="form-actions">
        <ActionButton type="submit" variant="primary" disabled={isLoading || isValidating}>
          {isLoading || isValidating ? "Saving..." : "Save Choreography"}
        </ActionButton>
        {onCancel && (
          <ActionButton type="button" onClick={onCancel} variant="edit" className="btn-small">
            Cancel
          </ActionButton>
        )}
      </ActionGroup>
    </form>
  );
};
