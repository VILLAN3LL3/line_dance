import "../../styles/ChoreographyForm.css";

import React, { useEffect, useState } from "react";

import {
  getAuthors,
  getChoreographyInfoCategories,
  getLevels,
  getStepFigures,
  getTags,
} from "../../api";
import { ChoreographyFormData } from "../../types";
import { ActionButton, ActionGroup, FormField } from "../shared/ui";
import { ChoreographyFormBasicSection } from "./ChoreographyFormBasicSection";
import { ChoreographyFormLinksSection } from "./ChoreographyFormLinksSection";
import { ChoreographyFormListSection } from "./ChoreographyFormListSection";

const FORM_TABS = [
  { id: "basic-information", label: "Basic Information" },
  { id: "choreographers", label: "Choreographers" },
  { id: "links", label: "Links" },
  { id: "step-figures", label: "Step Figures" },
  { id: "additional-information", label: "Additional Information" },
  { id: "hash-tags", label: "Hash Tags" },
] as const;

type FormTabId = (typeof FORM_TABS)[number]["id"];

function hasInvalidUrl(value?: string): boolean {
  if (!value?.trim()) return false;

  try {
    new URL(value.trim());
    return false;
  } catch {
    return true;
  }
}

interface ChoreographyFormProps {
  initialData?: ChoreographyFormData;
  onSubmit: (data: ChoreographyFormData) => Promise<void>;
  isLoading?: boolean;
  onCancel?: () => void;
}

export const ChoreographyForm: React.FC<ChoreographyFormProps> = ({
  initialData,
  onSubmit,
  isLoading = false,
  onCancel,
}) => {
  const [formData, setFormData] = useState<ChoreographyFormData>(() =>
    initialData
      ? {
          ...initialData,
          choreography_information: (initialData.choreography_information || []).map((item) => ({
            ...item,
            id: item.id ?? crypto.randomUUID(),
          })),
        }
      : {
          name: "",
          level: "",
          authors: [],
          tags: [],
          step_figures: [],
          choreography_information: [],
        },
  );
  const [activeTab, setActiveTab] = useState<FormTabId>("basic-information");
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  const [currentAuthor, setCurrentAuthor] = useState("");
  const [currentTag, setCurrentTag] = useState("");
  const [currentFigure, setCurrentFigure] = useState("");
  const [levels, setLevels] = useState<{ id: number; name: string }[]>([]);
  const [authorsFromDb, setAuthorsFromDb] = useState<string[]>([]);
  const [tagsFromDb, setTagsFromDb] = useState<string[]>([]);
  const [figuresFromDb, setFiguresFromDb] = useState<string[]>([]);
  const [informationCategories, setInformationCategories] = useState<string[]>([]);

  const tabValidationErrors: Record<FormTabId, boolean> = {
    "basic-information": !formData.name.trim() || !formData.level.trim(),
    choreographers: false,
    links: [formData.step_sheet_link, formData.demo_video_url, formData.tutorial_video_url].some(
      hasInvalidUrl,
    ),
    "step-figures": false,
    "additional-information": (formData.choreography_information || []).some(
      (item) => !item.category.trim() || !item.description.trim(),
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
    if (type === "checkbox") {
      const isChecked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({
        ...prev,
        [name]: isChecked,
      }));
    } else {
      const isNumericField = name === "count" || name === "wall_count" || name === "creation_year";
      const parsedValue = isNumericField && value ? Number.parseInt(value, 10) : undefined;
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
      setFormData((prev) => ({
        ...prev,
        step_figures: [...prev.step_figures, normalizedFigure],
      }));
    }
    setCurrentFigure("");
  };

  const removeAuthor = (authorToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      authors: prev.authors.filter((author) => author !== authorToRemove),
    }));
  };

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const removeFigure = (figureToRemove: string) => {
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
    setFormData((previous) => ({
      ...previous,
      choreography_information: (previous.choreography_information || []).map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const addChoreographyInformation = () => {
    setFormData((previous) => ({
      ...previous,
      choreography_information: [
        ...(previous.choreography_information || []),
        { id: crypto.randomUUID(), category: "", description: "" },
      ],
    }));
  };

  const removeChoreographyInformation = (indexToRemove: number) => {
    setFormData((previous) => ({
      ...previous,
      choreography_information: (previous.choreography_information || []).filter(
        (_, index) => index !== indexToRemove,
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
    setHasAttemptedSubmit(true);
    if (Object.values(tabValidationErrors).some(Boolean)) return;

    try {
      await onSubmit({
        ...formData,
        choreography_information: (formData.choreography_information || []).map(
          ({ category, description }) => ({ category, description }),
        ),
      });
    } catch (error) {
      console.error("Form submission error:", error);
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

  return (
    <form
      className="choreography-form"
      onSubmit={handleSubmit}
      onInvalidCapture={() => setHasAttemptedSubmit(true)}
    >
      <div
        className="choreography-form-tabs"
        role="tablist"
        aria-label="Choreography form sections"
      >
        {FORM_TABS.map((tab, index) =>
          (() => {
            const hasError = hasAttemptedSubmit && tabValidationErrors[tab.id];
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
          <div className="form-section">
            <h3>Basic Information</h3>
            <ChoreographyFormBasicSection
              name={formData.name}
              level={formData.level}
              count={formData.count}
              wall_count={formData.wall_count}
              creation_year={formData.creation_year}
              song={formData.song}
              artist={formData.artist}
              levels={levels}
              onChange={handleChange}
            />
          </div>
        )}

        {activeTab === "choreographers" && (
          <ChoreographyFormListSection
            title="Choreographers"
            listId="authors-list"
            inputValue={currentAuthor}
            options={authorsFromDb}
            selectedValues={formData.authors}
            placeholder="Choreographer name"
            addButtonLabel="Add Choreographer"
            onInputChange={handleAuthorChange}
            onInputBlur={handleAuthorBlur}
            onAdd={() => addAuthor()}
            onRemove={removeAuthor}
          />
        )}

        {activeTab === "links" && (
          <div className="form-section">
            <h3>Links</h3>
            <ChoreographyFormLinksSection
              step_sheet_link={formData.step_sheet_link}
              demo_video_url={formData.demo_video_url}
              tutorial_video_url={formData.tutorial_video_url}
              onChange={handleChange}
            />
          </div>
        )}

        {activeTab === "step-figures" && (
          <ChoreographyFormListSection
            title="Step Figures"
            listId="figures-list"
            inputValue={currentFigure}
            options={figuresFromDb}
            selectedValues={formData.step_figures}
            placeholder="Step figure name (e.g., Vine, Shuffle, Grapevine)"
            addButtonLabel="Add Figure"
            onInputChange={handleFigureChange}
            onInputBlur={handleFigureBlur}
            onAdd={() => addFigure()}
            onRemove={removeFigure}
          />
        )}

        {activeTab === "additional-information" && (
          <div className="form-section choreography-information-form-section">
            <h3>Additional Information</h3>
            {(formData.choreography_information || []).map((item, index) => (
              <div className="choreography-information-entry" key={item.id}>
                <div className="choreography-information-category-column">
                  <FormField
                    label={`Category ${index + 1}`}
                    htmlFor={`choreography-information-category-${index}`}
                    className="form-group choreography-information-category"
                  >
                    <div className="choreography-information-category-control">
                      <input
                        id={`choreography-information-category-${index}`}
                        list="choreography-information-categories"
                        value={item.category}
                        onChange={(event) =>
                          updateChoreographyInformation(index, "category", event.target.value)
                        }
                        placeholder="Choose or enter a category"
                      />
                      <ActionButton
                        type="button"
                        variant="secondary"
                        className="btn-small choreography-information-remove"
                        aria-label={`Remove information ${index + 1}`}
                        title={`Remove information ${index + 1}`}
                        onClick={() => removeChoreographyInformation(index)}
                      >
                        🗑️
                      </ActionButton>
                    </div>
                  </FormField>
                </div>
                <div className="choreography-information-description">
                  <div className="choreography-information-description-heading">
                    <label htmlFor={`choreography-information-description-${index}`}>
                      Description {index + 1}
                    </label>
                  </div>
                  <textarea
                    id={`choreography-information-description-${index}`}
                    value={item.description}
                    onChange={(event) =>
                      updateChoreographyInformation(index, "description", event.target.value)
                    }
                    placeholder="Describe this choreography detail"
                  />
                </div>
              </div>
            ))}
            <datalist id="choreography-information-categories">
              {informationCategories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
            <ActionButton
              type="button"
              variant="secondary"
              className="btn-small"
              onClick={addChoreographyInformation}
            >
              Add Info Field
            </ActionButton>
          </div>
        )}

        {activeTab === "hash-tags" && (
          <ChoreographyFormListSection
            title="Hash Tags"
            listId="tags-list"
            inputValue={currentTag}
            options={tagsFromDb}
            selectedValues={formData.tags}
            placeholder="Tag (e.g., Country, Western, Urban)"
            addButtonLabel="Add Tag"
            onInputChange={handleTagChange}
            onInputBlur={handleTagBlur}
            onAdd={() => addTag()}
            onRemove={removeTag}
          />
        )}
      </div>

      <ActionGroup className="form-actions">
        <ActionButton type="submit" variant="primary" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Choreography"}
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
