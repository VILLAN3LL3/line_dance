import React from "react";

import { AutoCompleteInput, FormField, Tag, TagGroup } from "../shared/ui";

interface ChoreographyFormListSectionProps {
  title: string;
  listId: string;
  inputValue: string;
  options: string[];
  selectedValues: string[];
  placeholder: string;
  addButtonLabel: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onInputBlur: () => void;
  onAdd: () => void;
  onRemove: (value: string) => void;
}

export const ChoreographyFormListSection: React.FC<ChoreographyFormListSectionProps> = ({
  title,
  listId,
  inputValue,
  options,
  selectedValues,
  placeholder,
  addButtonLabel,
  onInputChange,
  onInputBlur,
  onAdd,
  onRemove,
}) => (
  <div className="form-section">
    <h3>{title}</h3>
    <FormField className="form-group form-input-row">
      <AutoCompleteInput
        listId={listId}
        value={inputValue}
        options={options}
        onChange={onInputChange}
        onBlur={onInputBlur}
        onAdd={() => onAdd()}
        placeholder={inputValue ? "" : placeholder}
        addButtonLabel={addButtonLabel}
        addButtonClassName="btn-add"
      />
    </FormField>
    <TagGroup className="tags-container">
      {selectedValues.map((value) => (
        <Tag
          key={value}
          value={value}
          className="tag"
          removeButtonClassName="btn-remove"
          isRemovable
          onRemove={() => onRemove(value)}
        />
      ))}
    </TagGroup>
  </div>
);
