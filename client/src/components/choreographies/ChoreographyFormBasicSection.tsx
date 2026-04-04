import React from "react";

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
    <div className="form-group">
      <label htmlFor="name">Choreography Name *</label>
      <input
        type="text"
        id="name"
        name="name"
        value={name}
        onChange={onChange}
        required
        placeholder="Enter choreography name"
      />
    </div>

    <div className="form-group">
      <label htmlFor="level">Level *</label>
      <select id="level" name="level" value={level} onChange={onChange} required>
        <option value="">Select a level</option>
        {levels.map((item) => (
          <option key={item.id} value={item.name}>
            {item.name}
          </option>
        ))}
      </select>
    </div>

    <div className="form-row">
      <div className="form-group">
        <label htmlFor="count">Count</label>
        <input
          type="number"
          id="count"
          name="count"
          value={count || ""}
          onChange={onChange}
          placeholder="e.g., 64"
        />
      </div>

      <div className="form-group">
        <label htmlFor="wall_count">Wall Count</label>
        <input
          type="number"
          id="wall_count"
          name="wall_count"
          value={wall_count || ""}
          onChange={onChange}
          placeholder="e.g., 4"
        />
      </div>

      <div className="form-group">
        <label htmlFor="creation_year">Year Created</label>
        <input
          type="number"
          id="creation_year"
          name="creation_year"
          value={creation_year || ""}
          onChange={onChange}
          placeholder="e.g., 2023"
        />
      </div>
    </div>
  </>
);
