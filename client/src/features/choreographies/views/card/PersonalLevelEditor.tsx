import React from "react";

interface PersonalLevelEditorProps {
  choreographyId: number;
  officialLevel: string;
  personalLevel: string | null;
  levelOptions: string[];
  isSaving: boolean;
  hasError: boolean;
  onChange: (level: string | null) => void;
}

/** Lets users override the official level of a choreography with their own assessment. */
export const PersonalLevelEditor: React.FC<PersonalLevelEditorProps> = ({
  choreographyId,
  officialLevel,
  personalLevel,
  levelOptions,
  isSaving,
  hasError,
  onChange,
}) => {
  const selectId = `personal-level-${choreographyId}`;
  return (
    <div className="personal-level-editor">
      <label htmlFor={selectId}>
        <strong>Personal level:</strong>
      </label>{" "}
      <select
        id={selectId}
        value={personalLevel ?? ""}
        disabled={isSaving || levelOptions.length === 0}
        aria-invalid={hasError ? true : undefined}
        onChange={(event) => onChange(event.target.value || null)}
      >
        <option value="">Same as official ({officialLevel})</option>
        {levelOptions.map((level) => (
          <option key={level} value={level}>
            {level}
          </option>
        ))}
      </select>
      {hasError && (
        <span role="alert" className="personal-level-error">
          Could not save the personal level.
        </span>
      )}
    </div>
  );
};
