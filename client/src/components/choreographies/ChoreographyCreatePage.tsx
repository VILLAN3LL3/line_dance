import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import { checkChoreographyDuplicates, createChoreography } from "../../api";
import { ChoreographyFormData, DuplicateChoreography } from "../../types";
import { getFieldIssues } from "../../utils/apiErrors";
import { AppFormView } from "../app/AppFormView";
import { ErrorMessage } from "../shared/ui";
import { DuplicateChoreographyWarning } from "./DuplicateChoreographyWarning";

const ChoreographyCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateChoreography[]>([]);
  const [pendingFormData, setPendingFormData] = useState<ChoreographyFormData | null>(null);

  const doCreate = async (formData: ChoreographyFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      await createChoreography(formData);
      await navigate("/");
    } catch (err) {
      if (getFieldIssues(err)) throw err;
      setError("Failed to create choreography");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (formData: ChoreographyFormData) => {
    setIsLoading(true);
    setError(null);
    setDuplicates([]);
    try {
      const found = await checkChoreographyDuplicates(
        formData.name,
        formData.level,
        formData.authors,
      );
      if (found.length > 0) {
        setDuplicates(found);
        setPendingFormData(formData);
        return;
      }
      await doCreate(formData);
    } catch (err) {
      if (getFieldIssues(err)) throw err;
      setError("Failed to create choreography");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmCreate = async () => {
    if (pendingFormData) {
      setDuplicates([]);
      try {
        await doCreate(pendingFormData);
        setPendingFormData(null);
      } catch (err) {
        setError("Validation failed. Save the form again to review the field errors.");
        console.error(err);
      }
    }
  };

  const handleCancelDuplicate = () => {
    setDuplicates([]);
    setPendingFormData(null);
  };

  return (
    <>
      {error && <ErrorMessage message={error} />}
      {duplicates.length > 0 && (
        <DuplicateChoreographyWarning
          duplicates={duplicates}
          onConfirm={handleConfirmCreate}
          onCancel={handleCancelDuplicate}
        />
      )}
      <AppFormView
        title="Add New Choreography"
        onSubmit={handleCreate}
        isLoading={isLoading}
        onCancel={() => navigate("/")}
      />
    </>
  );
};

export default ChoreographyCreatePage;
