import "../../styles/DanceGroupsAdmin.css";

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { createDanceGroup, deleteDanceGroup, getDanceGroups, updateDanceGroup } from "../../api";
import { DanceGroup } from "../../types";
import {
  ActionButton,
  ActionGroup,
  BackButton,
  confirmAction,
  EmptyState,
  ErrorMessage,
  FormField,
  LoadingState,
} from "../shared/ui";

interface DanceGroupsAdminProps {
  mode?: "list" | "create";
}

export const DanceGroupsAdmin: React.FC<DanceGroupsAdminProps> = ({ mode = "list" }) => {
  const navigate = useNavigate();
  const [danceGroups, setDanceGroups] = useState<DanceGroup[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === "list") {
      void loadDanceGroups();
    }
  }, [mode]);

  const loadDanceGroups = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const groups = await getDanceGroups();
      setDanceGroups(groups);
    } catch (err) {
      setError("Failed to load dance groups");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      setError("Group name is required");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const group = await createDanceGroup(newGroupName);
      setNewGroupName("");
      navigate(`/admin/groups/${group.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create dance group");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (id: number) => {
    if (!editingName.trim()) {
      setError("Group name is required");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await updateDanceGroup(id, editingName);
      setEditingId(null);
      setEditingName("");
      await loadDanceGroups();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update dance group");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirmAction("Are you sure you want to delete this dance group and all related data?")) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await deleteDanceGroup(id);
      await loadDanceGroups();
    } catch (err) {
      setError("Failed to delete dance group");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dance-groups-admin">
      <header className="admin-header">
        <h1>Dance Group Administration</h1>
        <button
          onClick={() => {
            setNewGroupName("");
            navigate("/admin/groups/new");
          }}
          disabled={isLoading || mode !== "list"}
        >
          + New Dance Group
        </button>
      </header>

      {error && <ErrorMessage message={error} />}

      {mode === "list" && (
        <div className="groups-list-view">
          {isLoading && <LoadingState message="Loading dance groups..." />}

          {danceGroups.length === 0 ? (
            <EmptyState>No dance groups yet. Create one to get started!</EmptyState>
          ) : (
            <div className="groups-container">
              {danceGroups.map((group) => (
                <div key={group.id} className="group-card">
                  <div className="group-header">
                    {editingId === group.id ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="group-name-input"
                        autoFocus
                      />
                    ) : (
                      <>
                        <h3 className="group-name">{group.name}</h3>
                        <span className="group-id-badge">Group #{group.id}</span>
                      </>
                    )}
                  </div>
                  <div className="group-content">
                    <p className="group-summary">
                      Manage courses, sessions, and learned choreographies for this dance group.
                    </p>
                  </div>
                  <ActionGroup className="group-actions">
                    {editingId === group.id ? (
                      <>
                        <button
                          onClick={() => handleUpdate(group.id)}
                          className="btn-save"
                          disabled={isLoading}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setEditingName("");
                          }}
                          className="btn-cancel"
                          disabled={isLoading}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <ActionButton
                          onClick={() => navigate(`/admin/groups/${group.id}`)}
                          variant="secondary"
                          disabled={isLoading}
                        >
                          View Details
                        </ActionButton>
                        <ActionButton
                          onClick={() => {
                            setEditingId(group.id);
                            setEditingName(group.name);
                          }}
                          variant="edit"
                          disabled={isLoading}
                        >
                          Edit
                        </ActionButton>
                        <ActionButton
                          onClick={() => handleDelete(group.id)}
                          variant="delete"
                          disabled={isLoading}
                        >
                          Delete
                        </ActionButton>
                      </>
                    )}
                  </ActionGroup>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {mode === "create" && (
        <div className="form-view">
          <BackButton onClick={() => navigate("/admin")}>Back to List</BackButton>
          <h2>Create New Dance Group</h2>
          <form onSubmit={handleCreate} className="group-form">
            <FormField label="Group Name" htmlFor="group-name" className="form-group">
              <input
                id="group-name"
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Enter group name"
                disabled={isLoading}
                autoFocus
              />
            </FormField>
            <ActionGroup className="form-actions">
              <ActionButton type="submit" variant="primary" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Group"}
              </ActionButton>
              <ActionButton
                type="button"
                onClick={() => navigate("/admin")}
                variant="secondary"
                disabled={isLoading}
              >
                Cancel
              </ActionButton>
            </ActionGroup>
          </form>
        </div>
      )}
    </div>
  );
};

export default DanceGroupsAdmin;
