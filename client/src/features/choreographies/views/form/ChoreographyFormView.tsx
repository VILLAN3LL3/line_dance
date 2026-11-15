import React from "react";

import type { ChoreographyFormData } from "../../../../types";
import { ChoreographyForm } from "./ChoreographyForm";

interface ChoreographyFormViewProps {
  title: string;
  initialData?: ChoreographyFormData;
  isLoading: boolean;
  onSubmit: (data: ChoreographyFormData) => Promise<void>;
  onCancel: () => void;
}

export const ChoreographyFormView: React.FC<ChoreographyFormViewProps> = ({
  title,
  initialData,
  isLoading,
  onSubmit,
  onCancel,
}) => (
  <div className="form-view">
    <ChoreographyForm
      title={title}
      initialData={initialData}
      onSubmit={onSubmit}
      isLoading={isLoading}
      onCancel={onCancel}
    />
  </div>
);
