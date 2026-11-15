import React from "react";

import type { ChoreographyFormViewModel } from "../../viewmodels/useChoreographyFormViewModel";
import { ChoreographyForm } from "./ChoreographyForm";

interface ChoreographyFormViewProps {
  title: string;
  viewModel: ChoreographyFormViewModel;
  isLoading: boolean;
  onCancel: () => void;
}

export const ChoreographyFormView: React.FC<ChoreographyFormViewProps> = ({
  title,
  viewModel,
  isLoading,
  onCancel,
}) => (
  <div className="form-view">
    <ChoreographyForm
      title={title}
      viewModel={viewModel}
      isLoading={isLoading}
      onCancel={onCancel}
    />
  </div>
);
