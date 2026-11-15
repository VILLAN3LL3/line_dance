import React from "react";

interface AutoCompleteInputProps {
  id?: string;
  listId: string;
  value: string;
  options: string[];
  placeholder: string;
  disabled?: boolean;
  readOnly?: boolean;
  autoComplete?: string;
  addButtonLabel?: string;
  addButtonClassName?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  onAdd?: (value?: string) => void;
}

export const AutoCompleteInput: React.FC<AutoCompleteInputProps> = ({
  id,
  listId,
  value,
  options,
  placeholder,
  disabled = false,
  readOnly = false,
  autoComplete = "off",
  addButtonLabel,
  addButtonClassName = "btn-add",
  onChange,
  onBlur,
  onAdd,
}) => (
  <>
    <input
      id={id}
      type="text"
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      onKeyDown={(e) => {
        if (e.key === "Enter" && onAdd) {
          e.preventDefault();
          onAdd(value);
        }
      }}
      placeholder={placeholder}
      list={listId}
      autoComplete={autoComplete}
      readOnly={readOnly}
      disabled={disabled}
    />
    <datalist id={listId}>
      {options.map((option) => (
        <option key={option} value={option} />
      ))}
    </datalist>
    {onAdd && addButtonLabel && (
      <button
        type="button"
        onClick={() => onAdd(value)}
        className={addButtonClassName}
        disabled={disabled}
      >
        {addButtonLabel}
      </button>
    )}
  </>
);
