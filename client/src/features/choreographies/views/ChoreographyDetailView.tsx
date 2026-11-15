import React from "react";

import { BackButton } from "../../../shared/ui";
import type { Choreography } from "../../../types";
import { ChoreographyCard } from "./ChoreographyCard";

interface ChoreographyDetailViewProps {
  choreography: Choreography;
  onBack: () => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => Promise<void>;
}

export const ChoreographyDetailView: React.FC<ChoreographyDetailViewProps> = ({
  choreography,
  onBack,
  onEdit,
  onDelete,
}) => (
  <div className="detail-view">
    <BackButton onClick={onBack}>Back to List</BackButton>
    <ChoreographyCard choreography={choreography} onEdit={onEdit} onDelete={onDelete} />
  </div>
);
