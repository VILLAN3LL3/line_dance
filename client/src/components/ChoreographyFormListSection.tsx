import React from "react";

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
    <div className="form-group form-input-row">
      <input
        type="text"
        value={inputValue}
        onChange={onInputChange}
        onBlur={onInputBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onAdd();
          }
        }}
        placeholder={inputValue ? "" : placeholder}
        list={listId}
      />
      <datalist id={listId}>
        {options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
      <button type="button" onClick={onAdd} className="btn-add">
        {addButtonLabel}
      </button>
    </div>
    <div className="tags-container">
      {selectedValues.map((value) => (
        <span key={value} className="tag">
          {value}
          <button type="button" onClick={() => onRemove(value)} className="btn-remove">
            x
          </button>
        </span>
      ))}
    </div>
  </div>
);
