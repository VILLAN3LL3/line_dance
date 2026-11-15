import React from "react";

import { ErrorMessage } from "../../../shared/ui";
import { useChoreographyCreateViewModel } from "../viewmodels/useChoreographyCreateViewModel";
import { DuplicateChoreographyWarning } from "./DuplicateChoreographyWarning";
import { ChoreographyFormView } from "./form/ChoreographyFormView";

const ChoreographyCreatePage: React.FC = () => {
  const { state, actions } = useChoreographyCreateViewModel();

  return (
    <>
      {state.error && <ErrorMessage message={state.error} />}
      {state.duplicates.length > 0 && (
        <DuplicateChoreographyWarning
          duplicates={state.duplicates}
          onConfirm={actions.confirmDuplicate}
          onCancel={actions.cancelDuplicate}
        />
      )}
      <ChoreographyFormView
        title="Add New Choreography"
        viewModel={state.form}
        isLoading={state.isSaving}
        onCancel={actions.cancel}
      />
    </>
  );
};

export default ChoreographyCreatePage;
