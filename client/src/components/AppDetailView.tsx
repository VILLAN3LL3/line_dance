import React from "react";

import { Choreography } from "../types";
import { ChoreographyCard } from "./ChoreographyCard";

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
    <button onClick={onBack} className="btn-back">
      Back to List
    </button>
    <ChoreographyCard choreography={choreography} onEdit={onEdit} onDelete={onDelete} />
  </div>
);
