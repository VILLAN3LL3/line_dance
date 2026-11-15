import "../../../styles/TrainersAdmin.css";

import React from "react";

import {
  ActionButton,
  confirmAction,
  EmptyState,
  ErrorMessage,
  LoadingState,
  Section,
} from "../../../shared/ui";
import { useTrainersViewModel } from "../viewmodels/useTrainersViewModel";
import { TrainerListItem } from "./TrainerListItem";

const TrainersPage: React.FC = () => {
  const { state, actions } = useTrainersViewModel();
  const { trainers, isBusy, error, newTrainer, editingId, editTrainer } = state;

  const handleCreate = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    void actions.submitNewTrainer();
  };

  const handleDelete = (id: number) => {
    if (
      !confirmAction(
        "Delete this trainer? Assigned courses will keep their data but no trainer assignment.",
      )
    ) {
      return;
    }
    void actions.removeTrainer(id);
  };

  return (
    <div className="trainers-admin">
      <header className="trainers-header">
        <h2>Trainer Management</h2>
      </header>

      {error && <ErrorMessage message={error} />}

      <Section title="Add Trainer" className="trainer-section">
        <form className="trainer-form" onSubmit={handleCreate}>
          <input
            type="text"
            placeholder="Name"
            value={newTrainer.name}
            onChange={(e) => actions.changeNewTrainer({ name: e.target.value })}
            disabled={isBusy}
          />
          <input
            type="text"
            placeholder="Phone"
            value={newTrainer.phone}
            onChange={(e) => actions.changeNewTrainer({ phone: e.target.value })}
            disabled={isBusy}
          />
          <input
            type="email"
            placeholder="E-Mail"
            value={newTrainer.email}
            onChange={(e) => actions.changeNewTrainer({ email: e.target.value })}
            disabled={isBusy}
          />
          <ActionButton type="submit" variant="primary" disabled={isBusy}>
            + Add Trainer
          </ActionButton>
        </form>
      </Section>

      <Section title="All Trainers" className="trainer-section">
        {isBusy && <LoadingState />}

        {!isBusy && trainers.length === 0 ? (
          <EmptyState>No trainers yet</EmptyState>
        ) : (
          <div className="trainers-list">
            {trainers.map((trainer) => (
              <TrainerListItem
                key={trainer.id}
                trainer={trainer}
                isEditing={editingId === trainer.id}
                isBusy={isBusy}
                editValues={editTrainer}
                onEditValuesChange={actions.changeEditTrainer}
                onStartEdit={actions.startEdit}
                onCancelEdit={actions.cancelEdit}
                onSave={(id) => void actions.saveEdit(id)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
};

export default TrainersPage;
