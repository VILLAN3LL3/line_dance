import "../../../styles/DanceGroupsAdmin.css";

import React from "react";

import {
  ActionButton,
  ActionGroup,
  BackButton,
  confirmAction,
  EmptyState,
  ErrorMessage,
  FormField,
  LoadingState,
} from "../../../shared/ui";
import {
  useDanceGroupsAdminViewModel,
  type DanceGroupsAdminMode,
} from "../viewmodels/useDanceGroupsAdminViewModel";

interface DanceGroupsAdminProps {
  mode?: DanceGroupsAdminMode;
}

// Focus the field when it appears; a stable callback ref runs only on mount.
const focusOnMount = (element: HTMLInputElement | null) => element?.focus();

export const DanceGroupsAdmin: React.FC<DanceGroupsAdminProps> = ({ mode = "list" }) => {
  const { state, actions } = useDanceGroupsAdminViewModel(mode);
  const { isLoading, editingId } = state;

  const handleCreate = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    void actions.create();
  };

  const handleDelete = (id: number) => {
    if (!confirmAction("Are you sure you want to delete this dance group and all related data?")) {
      return;
    }
    void actions.remove(id);
  };

  return (
    <div className="dance-groups-admin">
      <header className="admin-header">
        <h1>Dance Group Administration</h1>
        <button onClick={actions.startCreating} disabled={isLoading || mode !== "list"}>
          + New Dance Group
        </button>
      </header>

      {state.error && <ErrorMessage message={state.error} />}

      {mode === "list" && (
        <div className="groups-list-view">
          {isLoading && <LoadingState message="Loading dance groups..." />}

          {state.groups.length === 0 ? (
            <EmptyState>No dance groups yet. Create one to get started!</EmptyState>
          ) : (
            <div className="groups-container">
              {state.groups.map((group) => (
                <div key={group.id} className="group-card">
                  <div className="group-header">
                    {editingId === group.id ? (
                      <input
                        type="text"
                        value={state.editingName}
                        onChange={(e) => actions.changeEditingName(e.target.value)}
                        className="group-name-input"
                        ref={focusOnMount}
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
                          onClick={() => void actions.saveEdit(group.id)}
                          className="btn-save"
                          disabled={isLoading}
                        >
                          Save
                        </button>
                        <button
                          onClick={actions.cancelEdit}
                          className="btn-cancel"
                          disabled={isLoading}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <ActionButton
                          onClick={() => actions.openGroup(group.id)}
                          variant="secondary"
                          disabled={isLoading}
                        >
                          View Details
                        </ActionButton>
                        <ActionButton
                          onClick={() => actions.startEdit(group.id, group.name)}
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
          <BackButton onClick={actions.backToList}>Back to List</BackButton>
          <h2>Create New Dance Group</h2>
          <form onSubmit={handleCreate} className="group-form">
            <FormField label="Group Name" htmlFor="group-name" className="form-group">
              <input
                id="group-name"
                type="text"
                value={state.newGroupName}
                onChange={(e) => actions.changeNewGroupName(e.target.value)}
                placeholder="Enter group name"
                disabled={isLoading}
                ref={focusOnMount}
              />
            </FormField>
            <ActionGroup className="form-actions">
              <ActionButton type="submit" variant="primary" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Group"}
              </ActionButton>
              <ActionButton
                type="button"
                onClick={actions.backToList}
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
