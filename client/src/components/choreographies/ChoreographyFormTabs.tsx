import React from "react";

import { ActionButton, FormField } from "../shared/ui";
import { ChoreographyFormBasicSection } from "./ChoreographyFormBasicSection";
import { ChoreographyFormLinksSection } from "./ChoreographyFormLinksSection";
import { ChoreographyFormListSection } from "./ChoreographyFormListSection";

import type { ChoreographyFormData, ChoreographyInformation } from "../../types";
const NEW_CATEGORY_VALUE = "__create_new_category__";

type ChoreographyChangeHandler = (
  event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
) => void;

interface BasicInformationTabProps {
  formData: ChoreographyFormData;
  levels: { id: number; name: string }[];
  onChange: ChoreographyChangeHandler;
}

export const BasicInformationTab: React.FC<BasicInformationTabProps> = ({
  formData,
  levels,
  onChange,
}) => (
  <div className="form-section">
    <ChoreographyFormBasicSection
      name={formData.name}
      level={formData.level}
      count={formData.count}
      wall_count={formData.wall_count}
      creation_year={formData.creation_year}
      song={formData.song}
      artist={formData.artist}
      levels={levels}
      onChange={onChange}
    />
  </div>
);

interface ChoreographersTabProps {
  inputValue: string;
  options: string[];
  selectedValues: string[];
  onInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onInputBlur: () => void;
  onAdd: () => void;
  onRemove: (value: string) => void;
}

export const ChoreographersTab: React.FC<ChoreographersTabProps> = ({
  inputValue,
  options,
  selectedValues,
  onInputChange,
  onInputBlur,
  onAdd,
  onRemove,
}) => (
  <ChoreographyFormListSection
    title="Choreographers"
    showTitle={false}
    listId="authors-list"
    inputValue={inputValue}
    options={options}
    selectedValues={selectedValues}
    placeholder="Choreographer name"
    addButtonLabel="Add Choreographer"
    onInputChange={onInputChange}
    onInputBlur={onInputBlur}
    onAdd={onAdd}
    onRemove={onRemove}
  />
);

interface LinksTabProps {
  formData: ChoreographyFormData;
  onChange: ChoreographyChangeHandler;
}

export const LinksTab: React.FC<LinksTabProps> = ({ formData, onChange }) => (
  <div className="form-section">
    <ChoreographyFormLinksSection
      step_sheet_link={formData.step_sheet_link}
      demo_video_url={formData.demo_video_url}
      tutorial_video_url={formData.tutorial_video_url}
      onChange={onChange}
    />
  </div>
);

interface StepFiguresTabProps {
  inputValue: string;
  options: string[];
  selectedValues: string[];
  onInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onInputBlur: () => void;
  onAdd: () => void;
  onRemove: (value: string) => void;
}

export const StepFiguresTab: React.FC<StepFiguresTabProps> = ({
  inputValue,
  options,
  selectedValues,
  onInputChange,
  onInputBlur,
  onAdd,
  onRemove,
}) => (
  <ChoreographyFormListSection
    title="Step Figures"
    showTitle={false}
    listId="figures-list"
    inputValue={inputValue}
    options={options}
    selectedValues={selectedValues}
    placeholder="Step figure name (e.g., Vine, Shuffle, Grapevine)"
    addButtonLabel="Add Figure"
    onInputChange={onInputChange}
    onInputBlur={onInputBlur}
    onAdd={onAdd}
    onRemove={onRemove}
  />
);

interface AdditionalInformationTabProps {
  information: ChoreographyInformation[];
  categories: string[];
  customCategoryRowIds: Set<string>;
  onCategoryChange: (index: number, value: string) => void;
  onDescriptionChange: (index: number, value: string) => void;
  onCustomCategoryModeChange: (rowId: string, isCustom: boolean) => void;
  onRemove: (index: number) => void;
}

export const AdditionalInformationTab: React.FC<AdditionalInformationTabProps> = ({
  information,
  categories,
  customCategoryRowIds,
  onCategoryChange,
  onDescriptionChange,
  onCustomCategoryModeChange,
  onRemove,
}) => (
  <div className="form-section choreography-information-form-section">
    {information.map((item, index) => {
      const rowId = String(item.id ?? index);
      const existingCategory = categories.find(
        (category) => category.toLocaleLowerCase() === item.category.toLocaleLowerCase(),
      );
      const isCustomCategory =
        customCategoryRowIds.has(rowId) || (Boolean(item.category) && !existingCategory);
      const selectedCategory = isCustomCategory ? NEW_CATEGORY_VALUE : (existingCategory ?? "");

      return (
        <div className="choreography-information-entry" key={rowId}>
          <div className="choreography-information-category-column">
            <FormField
              label={`Category ${index + 1}`}
              htmlFor={`choreography-information-category-${rowId}`}
              className="form-group choreography-information-category"
            >
              <div
                className={
                  isCustomCategory
                    ? "choreography-information-category-control is-custom"
                    : "choreography-information-category-control"
                }
              >
                <select
                  id={`choreography-information-category-${rowId}`}
                  value={selectedCategory}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value === NEW_CATEGORY_VALUE) {
                      onCustomCategoryModeChange(rowId, true);
                      if (item.category) onCategoryChange(index, "");
                      return;
                    }

                    onCustomCategoryModeChange(rowId, false);
                    onCategoryChange(index, value);
                  }}
                >
                  <option value="" disabled>
                    Choose a category
                  </option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                  <option value={NEW_CATEGORY_VALUE}>Add new category...</option>
                </select>
                {isCustomCategory && (
                  <input
                    aria-label={`New category ${index + 1}`}
                    value={item.category}
                    onChange={(event) => onCategoryChange(index, event.target.value)}
                    placeholder="Enter a category"
                  />
                )}
                {(item.category.trim() || item.description.trim()) && (
                  <ActionButton
                    type="button"
                    variant="secondary"
                    className="btn-small choreography-information-remove"
                    aria-label={`Remove information ${index + 1}`}
                    title={`Remove information ${index + 1}`}
                    onClick={() => onRemove(index)}
                  >
                    🗑️
                  </ActionButton>
                )}
              </div>
            </FormField>
          </div>
          <div className="choreography-information-description">
            <div className="choreography-information-description-heading">
              <label htmlFor={`choreography-information-description-${rowId}`}>
                Description {index + 1}
              </label>
            </div>
            <textarea
              id={`choreography-information-description-${rowId}`}
              value={item.description}
              onChange={(event) => onDescriptionChange(index, event.target.value)}
              placeholder="Describe this choreography detail"
            />
          </div>
        </div>
      );
    })}
  </div>
);

interface HashTagsTabProps {
  inputValue: string;
  options: string[];
  selectedValues: string[];
  onInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onInputBlur: () => void;
  onAdd: () => void;
  onRemove: (value: string) => void;
}

export const HashTagsTab: React.FC<HashTagsTabProps> = ({
  inputValue,
  options,
  selectedValues,
  onInputChange,
  onInputBlur,
  onAdd,
  onRemove,
}) => (
  <ChoreographyFormListSection
    title="Hash Tags"
    showTitle={false}
    listId="tags-list"
    inputValue={inputValue}
    options={options}
    selectedValues={selectedValues}
    placeholder="Tag (e.g., Country, Western, Urban)"
    addButtonLabel="Add Tag"
    onInputChange={onInputChange}
    onInputBlur={onInputBlur}
    onAdd={onAdd}
    onRemove={onRemove}
  />
);
