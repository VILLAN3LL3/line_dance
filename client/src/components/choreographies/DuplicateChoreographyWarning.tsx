import React from "react";
import { Link } from "react-router-dom";

import { DuplicateChoreography } from "../../types";
import { ActionButton, ActionGroup } from "../shared/ui";

interface DuplicateChoreographyWarningProps {
  duplicates: DuplicateChoreography[];
  onConfirm: () => void;
  onCancel: () => void;
}

export const DuplicateChoreographyWarning: React.FC<DuplicateChoreographyWarningProps> = ({
  duplicates,
  onConfirm,
  onCancel,
}) => (
  <div className="duplicate-warning">
    <p>
      <strong>Possible duplicate{duplicates.length > 1 ? "s" : ""} found</strong> —{" "}
      {duplicates.length === 1
        ? "a choreography with the same title, level and an overlapping choreographer already exists"
        : "choreographies with the same title, level and overlapping choreographers already exist"}
      :
    </p>
    <ul className="duplicate-warning__list">
      {duplicates.map((d) => (
        <li key={d.id}>
          <Link to={`/choreographies/${d.id}`} target="_blank" rel="noopener noreferrer">
            {d.name}
          </Link>
          {" "}— {d.level}
          {d.authors.length > 0 ? ` · ${d.authors.join(", ")}` : ""}
        </li>
      ))}
    </ul>
    <ActionGroup className="duplicate-warning__actions">
      <ActionButton variant="primary" onClick={onConfirm}>
        Save anyway
      </ActionButton>
      <ActionButton variant="secondary" onClick={onCancel}>
        Cancel
      </ActionButton>
    </ActionGroup>
  </div>
);
