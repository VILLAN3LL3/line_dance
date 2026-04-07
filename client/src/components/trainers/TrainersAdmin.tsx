import "../../styles/TrainersAdmin.css";

import React, { useEffect, useState } from "react";

import { createTrainer, deleteTrainer, getTrainers, updateTrainer } from "../../api";
import { Trainer } from "../../types";
import { EmptyState, ErrorMessage, LoadingState } from "../shared/ui";

const TrainersAdmin: React.FC = () => {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadTrainers();
  }, []);

  const loadTrainers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const trainerRows = await getTrainers();
      setTrainers(trainerRows);
    } catch (err) {
      setError("Failed to load trainers");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim() || !newEmail.trim()) {
      setError("Name, phone, and email are required");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await createTrainer(newName, newPhone, newEmail);
      setNewName("");
      setNewPhone("");
      setNewEmail("");
      await loadTrainers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create trainer");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const startEdit = (trainer: Trainer) => {
    setEditingId(trainer.id);
    setEditName(trainer.name);
    setEditPhone(trainer.phone);
    setEditEmail(trainer.email);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditPhone("");
    setEditEmail("");
  };

  const handleUpdate = async (id: number) => {
    if (!editName.trim() || !editPhone.trim() || !editEmail.trim()) {
      setError("Name, phone, and email are required");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await updateTrainer(id, editName, editPhone, editEmail);
      cancelEdit();
      await loadTrainers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update trainer");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (
      !confirm(
        "Delete this trainer? Assigned courses will keep their data but no trainer assignment.",
      )
    ) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await deleteTrainer(id);
      await loadTrainers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete trainer");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="trainers-admin">
      <header className="trainers-header">
        <h2>Trainer Management</h2>
      </header>

      {error && <ErrorMessage message={error} />}

      <section className="trainer-section">
        <h3>Add Trainer</h3>
        <form className="trainer-form" onSubmit={handleCreate}>
          <input
            type="text"
            placeholder="Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            disabled={isLoading}
          />
          <input
            type="text"
            placeholder="Phone"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            disabled={isLoading}
          />
          <input
            type="email"
            placeholder="E-Mail"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            disabled={isLoading}
          />
          <button type="submit" className="btn-primary" disabled={isLoading}>
            + Add Trainer
          </button>
        </form>
      </section>

      <section className="trainer-section">
        <h3>All Trainers</h3>
        {isLoading && <LoadingState />}

        {!isLoading && trainers.length === 0 ? (
          <EmptyState>No trainers yet</EmptyState>
        ) : (
          <div className="trainers-list">
            {trainers.map((trainer) => (
              <div className="trainer-item" key={trainer.id}>
                {editingId === trainer.id ? (
                  <>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      disabled={isLoading}
                    />
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      disabled={isLoading}
                    />
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      disabled={isLoading}
                    />
                    <div className="trainer-actions">
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => handleUpdate(trainer.id)}
                        disabled={isLoading}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={cancelEdit}
                        disabled={isLoading}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="trainer-info">
                      <h4>{trainer.name}</h4>
                      <p>{trainer.phone}</p>
                      <p>{trainer.email}</p>
                    </div>
                    <div className="trainer-actions">
                      <button
                        type="button"
                        className="btn-edit"
                        onClick={() => startEdit(trainer)}
                        disabled={isLoading}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        type="button"
                        className="btn-delete"
                        onClick={() => handleDelete(trainer.id)}
                        disabled={isLoading}
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default TrainersAdmin;
