import React from "react";

import { FormField } from "../shared/ui";

interface LevelOption {
  id: number;
  name: string;
}

interface ChoreographyFormBasicSectionProps {
  name: string;
  level: string;
  count?: number;
  wall_count?: number;
  creation_year?: number;
  levels: LevelOption[];
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => void;
}

export const ChoreographyFormBasicSection: React.FC<ChoreographyFormBasicSectionProps> = ({
  name,
  level,
  count,
  wall_count,
  creation_year,
  levels,
  onChange,
}) => (
  <>
    <FormField label="Choreography Name *" htmlFor="name" className="form-group">
      <input
        type="text"
        id="name"
        name="name"
        value={name}
        onChange={onChange}
        required
        placeholder="Enter choreography name"
      />
    </FormField>

    <FormField label="Level *" htmlFor="level" className="form-group">
      <select id="level" name="level" value={level} onChange={onChange} required>
        <option value="">Select a level</option>
        {levels.map((item) => (
          <option key={item.id} value={item.name}>
            {item.name}
          </option>
        ))}
      </select>
    </FormField>

    <div className="form-row">
      <FormField label="Count" htmlFor="count" className="form-group">
        <input
          type="number"
          id="count"
          name="count"
          value={count || ""}
          onChange={onChange}
          placeholder="e.g., 64"
        />
      </FormField>

      <FormField label="Wall Count" htmlFor="wall_count" className="form-group">
        <input
          type="number"
          id="wall_count"
          name="wall_count"
          value={wall_count || ""}
          onChange={onChange}
          placeholder="e.g., 4"
        />
      </FormField>

      <FormField label="Year Created" htmlFor="creation_year" className="form-group">
        <input
          type="number"
          id="creation_year"
          name="creation_year"
          value={creation_year || ""}
          onChange={onChange}
          placeholder="e.g., 2023"
        />
      </FormField>
    </div>
  </>
);
