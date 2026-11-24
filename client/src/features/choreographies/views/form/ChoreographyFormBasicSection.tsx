import React from "react";

import { FormField } from "../../../../shared/ui";
import type { LearningStatus } from "../../../../types";
import { LEARNING_STATUS_OPTIONS } from "../../model/learning-status";

interface LevelOption {
  id: number;
  name: string;
}

interface ChoreographyFormBasicSectionProps {
  name: string;
  level: string;
  personalLevel?: string | null;
  learningStatus?: LearningStatus | "" | null;
  count?: number;
  wall_count?: number;
  creation_year?: number;
  levels: LevelOption[];
  errors: {
    name?: string;
    level?: string;
    personal_level?: string;
    learning_status?: string;
    count?: string;
    wall_count?: string;
    creation_year?: string;
  };
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => void;
}

export const ChoreographyFormBasicSection: React.FC<ChoreographyFormBasicSectionProps> = ({
  name,
  level,
  personalLevel,
  learningStatus,
  count,
  wall_count,
  creation_year,
  levels,
  errors,
  onChange,
}) => (
  <>
    <FormField
      label="Choreography Name *"
      htmlFor="name"
      className="form-group"
      error={errors.name}
    >
      <input
        type="text"
        id="name"
        name="name"
        value={name}
        onChange={onChange}
        required
        aria-invalid={errors.name ? true : undefined}
        aria-describedby={errors.name ? "name-error" : undefined}
        placeholder="Enter choreography name"
      />
    </FormField>

    <div className="form-row">
      <FormField
        label="Official Level *"
        htmlFor="level"
        className="form-group"
        error={errors.level}
      >
        <select
          id="level"
          name="level"
          value={level}
          onChange={onChange}
          required
          aria-invalid={errors.level ? true : undefined}
          aria-describedby={errors.level ? "level-error" : undefined}
        >
          <option value="">Select a level</option>
          {levels.map((item) => (
            <option key={item.id} value={item.name}>
              {item.name}
            </option>
          ))}
        </select>
      </FormField>

      <FormField
        label="Personal Level"
        htmlFor="personal_level"
        className="form-group"
        error={errors.personal_level}
      >
        <select
          id="personal_level"
          name="personal_level"
          value={personalLevel ?? ""}
          onChange={onChange}
          aria-invalid={errors.personal_level ? true : undefined}
          aria-describedby={errors.personal_level ? "personal_level-error" : undefined}
        >
          <option value="">{level ? `Same as official (${level})` : "Same as official"}</option>
          {levels.map((item) => (
            <option key={item.id} value={item.name}>
              {item.name}
            </option>
          ))}
        </select>
      </FormField>

      <FormField
        label="Learning Status"
        htmlFor="learning_status"
        className="form-group"
        error={errors.learning_status}
      >
        <select
          id="learning_status"
          name="learning_status"
          value={learningStatus ?? ""}
          onChange={onChange}
          aria-invalid={errors.learning_status ? true : undefined}
          aria-describedby={errors.learning_status ? "learning_status-error" : undefined}
        >
          <option value="">No status</option>
          {LEARNING_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.emoji} {option.label}
            </option>
          ))}
        </select>
      </FormField>
    </div>

    <div className="form-row">
      <FormField label="Count" htmlFor="count" className="form-group" error={errors.count}>
        <input
          type="number"
          id="count"
          name="count"
          value={count ?? ""}
          onChange={onChange}
          aria-invalid={errors.count ? true : undefined}
          aria-describedby={errors.count ? "count-error" : undefined}
          placeholder="e.g., 64"
        />
      </FormField>

      <FormField
        label="Wall Count"
        htmlFor="wall_count"
        className="form-group"
        error={errors.wall_count}
      >
        <input
          type="number"
          id="wall_count"
          name="wall_count"
          value={wall_count ?? ""}
          onChange={onChange}
          aria-invalid={errors.wall_count ? true : undefined}
          aria-describedby={errors.wall_count ? "wall_count-error" : undefined}
          placeholder="e.g., 4"
        />
      </FormField>

      <FormField
        label="Year Created"
        htmlFor="creation_year"
        className="form-group"
        error={errors.creation_year}
      >
        <input
          type="number"
          id="creation_year"
          name="creation_year"
          value={creation_year ?? ""}
          onChange={onChange}
          aria-invalid={errors.creation_year ? true : undefined}
          aria-describedby={errors.creation_year ? "creation_year-error" : undefined}
          placeholder="e.g., 2023"
        />
      </FormField>
    </div>
  </>
);
