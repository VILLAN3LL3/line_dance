import React from "react";

import { ChoreographyFormData } from "../types";
import { ChoreographyForm } from "./ChoreographyForm";

interface AppFormViewProps {
  title: string;
  initialData?: ChoreographyFormData;
  isLoading: boolean;
  onSubmit: (data: ChoreographyFormData) => Promise<void>;
  onCancel: () => void;
}

export const AppFormView: React.FC<AppFormViewProps> = ({
  title,
  initialData,
  isLoading,
  onSubmit,
  onCancel,
}) => (
  <div className="form-view">
    <h2>{title}</h2>
    <ChoreographyForm
      initialData={initialData}
      onSubmit={onSubmit}
      isLoading={isLoading}
      onCancel={onCancel}
    />
  </div>
);
