import "../../../styles/ChoreographyDetail.css";

import React from "react";

import {
  BackButton,
  confirmAction,
  EmptyState,
  ErrorMessage,
  LoadingState,
} from "../../../shared/ui";
import { useChoreographyDetailViewModel } from "../viewmodels/useChoreographyDetailViewModel";
import { ChoreographyCard } from "./ChoreographyCard";
import { DuplicateChoreographyWarning } from "./DuplicateChoreographyWarning";
import { ChoreographyFormView } from "./form/ChoreographyFormView";

const ChoreographyDetailPage: React.FC = () => {
  const { state, actions } = useChoreographyDetailViewModel();
  const { choreography, error } = state;

  const handleDelete = () => {
    if (!confirmAction("Are you sure you want to delete this choreography?")) return;
    void actions.removeChoreography();
  };

  if (state.isInitialLoading) {
    return <LoadingState />;
  }

  if (!state.hasValidId) {
    return <ErrorMessage message="Invalid choreography ID" />;
  }

  if (error && !choreography) {
    return <ErrorMessage message={error} />;
  }

  if (!choreography) {
    return <EmptyState>Choreography not found</EmptyState>;
  }

  return (
    <div className="choreography-detail">
      {state.showBackButton && <BackButton onClick={actions.back} />}

      {error && <ErrorMessage message={error} />}

      {state.mode === "view" ? (
        <ChoreographyCard
          choreography={choreography}
          cardViewModel={state.cardViewModel}
          onEdit={actions.startEdit}
          onDelete={handleDelete}
          videoEmbedMode="all"
        />
      ) : (
        <>
          {state.duplicates.length > 0 && (
            <DuplicateChoreographyWarning
              duplicates={state.duplicates}
              onConfirm={actions.confirmDuplicate}
              onCancel={actions.cancelDuplicate}
            />
          )}
          <ChoreographyFormView
            title="Edit Choreography"
            viewModel={state.form}
            isLoading={state.isBusy}
            onCancel={actions.cancelEdit}
          />
        </>
      )}
    </div>
  );
};

export default ChoreographyDetailPage;
