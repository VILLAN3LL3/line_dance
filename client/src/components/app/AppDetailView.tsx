import React from "react";

import { Choreography } from "../../types";
import { ChoreographyCard } from "../choreographies/ChoreographyCard";
import { BackButton } from "../shared/ui";

interface AppDetailViewProps {
  choreography: Choreography;
  onBack: () => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => Promise<void>;
}

export const AppDetailView: React.FC<AppDetailViewProps> = ({
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
