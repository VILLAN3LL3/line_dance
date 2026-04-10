import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import { createChoreography } from "../../api";
import { ChoreographyFormData } from "../../types";
import { AppFormView } from "../app/AppFormView";
import { ErrorMessage } from "../shared/ui";

const ChoreographyCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (formData: ChoreographyFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      await createChoreography(formData);
      navigate("/");
    } catch (err) {
      setError("Failed to create choreography");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {error && <ErrorMessage message={error} />}
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
