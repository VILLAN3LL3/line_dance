import React from "react";

import { BackButton } from "../../../shared/ui";
import type { Choreography } from "../../../types";
import type { ChoreographyCardViewModel } from "../viewmodels/useChoreographyCardViewModel";
import { ChoreographyCard } from "./ChoreographyCard";

interface ChoreographyDetailViewProps {
  choreography: Choreography;
  cardViewModel: ChoreographyCardViewModel;
  onBack: () => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => Promise<void>;
}

export const ChoreographyDetailView: React.FC<ChoreographyDetailViewProps> = ({
  choreography,
  cardViewModel,
  onBack,
  onEdit,
  onDelete,
}) => (
  <div className="detail-view">
    <BackButton onClick={onBack}>Back to List</BackButton>
    <ChoreographyCard
      choreography={choreography}
      cardViewModel={cardViewModel}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  </div>
);
