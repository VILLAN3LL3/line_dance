import React from "react";

import { ActionButton, FormField } from "../../../../shared/ui";
import type { ChoreographyInformation } from "../../../../types";

const NEW_CATEGORY_VALUE = "__create_new_category__";

interface AdditionalInformationTabProps {
  information: ChoreographyInformation[];
  categories: string[];
  customCategoryRowIds: Set<string>;
  errors: Record<string, string>;
  onCategoryChange: (index: number, value: string) => void;
  onDescriptionChange: (index: number, value: string) => void;
  onCustomCategoryModeChange: (rowId: string, isCustom: boolean) => void;
  onRemove: (index: number) => void;
}

export const AdditionalInformationTab: React.FC<AdditionalInformationTabProps> = ({
  information,
  categories,
  customCategoryRowIds,
  errors,
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
      const categoryError = errors[`choreography_information.${rowId}.category`];
      const descriptionError = errors[`choreography_information.${rowId}.description`];
      const categoryErrorId = `choreography-information-category-${rowId}-error`;
      const descriptionErrorId = `choreography-information-description-${rowId}-error`;

      return (
        <div className="choreography-information-entry" key={rowId}>
          <div className="choreography-information-category-column">
            <FormField
              label={`Category ${index + 1}`}
              htmlFor={`choreography-information-category-${rowId}`}
              className="form-group choreography-information-category"
              error={categoryError}
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
                  aria-invalid={categoryError && !isCustomCategory ? true : undefined}
                  aria-describedby={
                    categoryError && !isCustomCategory ? categoryErrorId : undefined
                  }
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
                    aria-invalid={categoryError ? true : undefined}
                    aria-describedby={categoryError ? categoryErrorId : undefined}
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
              aria-invalid={descriptionError ? true : undefined}
              aria-describedby={descriptionError ? descriptionErrorId : undefined}
            />
            {descriptionError && (
              <span id={descriptionErrorId} className="form-field-error">
                {descriptionError}
              </span>
            )}
          </div>
        </div>
      );
    })}
  </div>
);
