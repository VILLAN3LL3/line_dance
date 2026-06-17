import "../../styles/ChoreographyForm.css";

import React, { useEffect, useState } from "react";

import { getAuthors, getLevels, getStepFigures, getTags } from "../../api";
import { ChoreographyFormData } from "../../types";
import { ActionButton, ActionGroup, FormField } from "../shared/ui";
import { ChoreographyFormBasicSection } from "./ChoreographyFormBasicSection";
import { ChoreographyFormLinksSection } from "./ChoreographyFormLinksSection";
import { ChoreographyFormListSection } from "./ChoreographyFormListSection";

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
  const [formData, setFormData] = useState<ChoreographyFormData>(
    initialData || {
      name: "",
      level: "",
      authors: [],
      tags: [],
      step_figures: [],
    },
  );

  const [currentAuthor, setCurrentAuthor] = useState("");
  const [currentTag, setCurrentTag] = useState("");
  const [currentFigure, setCurrentFigure] = useState("");
  const [levels, setLevels] = useState<{ id: number; name: string }[]>([]);
  const [authorsFromDb, setAuthorsFromDb] = useState<string[]>([]);
  const [tagsFromDb, setTagsFromDb] = useState<string[]>([]);
  const [figuresFromDb, setFiguresFromDb] = useState<string[]>([]);
  useEffect(() => {
    let isActive = true;

    const loadReferenceData = async () => {
      try {
        const [fetchedLevels, fetchedAuthors, fetchedTags, fetchedFigures] = await Promise.all([
          getLevels(),
          getAuthors(),
          getTags(),
          getStepFigures(),
        ]);

        if (!isActive) {
          return;
        }

        setLevels(fetchedLevels);
        setAuthorsFromDb(fetchedAuthors);
        setTagsFromDb(fetchedTags);
        setFiguresFromDb(fetchedFigures);
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
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  return (
    <form className="choreography-form" onSubmit={handleSubmit}>
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

        <ChoreographyFormListSection
          title="Authors"
          listId="authors-list"
          inputValue={currentAuthor}
          options={authorsFromDb}
          selectedValues={formData.authors}
          placeholder="Author name"
          addButtonLabel="Add Author"
          onInputChange={handleAuthorChange}
          onInputBlur={handleAuthorBlur}
          onAdd={() => addAuthor()}
          onRemove={removeAuthor}
        />

        <ChoreographyFormLinksSection
          step_sheet_link={formData.step_sheet_link}
          demo_video_url={formData.demo_video_url}
          tutorial_video_url={formData.tutorial_video_url}
          onChange={handleChange}
        />

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

        <FormField label="Tag Information" htmlFor="tag_information" className="form-group">
          <textarea
            id="tag_information"
            name="tag_information"
            value={formData.tag_information || ""}
            onChange={handleChange}
            placeholder="Additional information about tags used in this choreography"
          />
        </FormField>

        <FormField label="Restart Information" htmlFor="restart_information" className="form-group">
          <textarea
            id="restart_information"
            name="restart_information"
            value={formData.restart_information || ""}
            onChange={handleChange}
            placeholder="Instructions for restarting or resetting the choreography"
          />
        </FormField>
      </div>

      <div className="form-section">
        <ChoreographyFormListSection
          title="Tags"
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
