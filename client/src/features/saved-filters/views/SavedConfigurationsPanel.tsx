import React, { useState } from "react";

import { ActionButton, confirmAction } from "../../../shared/ui";
import { savedFilterMessages } from "../model/saved-filter-selection";
import type { SavedFiltersViewModel } from "../viewmodels/useSavedFiltersViewModel";

interface SavedConfigurationsPanelProps {
  viewModel: SavedFiltersViewModel;
}

export const SavedConfigurationsPanel: React.FC<SavedConfigurationsPanelProps> = ({
  viewModel,
}) => {
  const [showSavedConfigurations, setShowSavedConfigurations] = useState(false);
  const { state, actions } = viewModel;
  const {
    configurations,
    selectedConfigurationId,
    selectedConfiguration,
    configurationName,
    isSaving,
    isUpdating,
    isDeleting,
    isLoadingConfigurations,
    message,
    error,
    isBusy,
  } = state;

  const handleDelete = () => {
    if (selectedConfiguration) {
      if (!confirmAction(savedFilterMessages.confirmDelete(selectedConfiguration.name))) return;
    }
    void actions.remove();
  };

  return (
    <div className="saved-configurations-container">
      <button
        type="button"
        onClick={() => setShowSavedConfigurations(!showSavedConfigurations)}
        className="btn-toggle-saved-configs"
      >
        {showSavedConfigurations ? "Hide" : "Show"} Saved Configurations
      </button>

      {showSavedConfigurations && (
        <div className="filter-group saved-filters-group saved-filters-panel">
          <label htmlFor="saved-filter-name">Saved Configurations</label>
          <div className="saved-filters-controls">
            <input
              id="saved-filter-name"
              type="text"
              value={configurationName}
              onChange={(e) => actions.changeName(e.target.value)}
              placeholder="Configuration name..."
              disabled={isBusy}
            />
            <ActionButton onClick={actions.save} variant="primary" disabled={isBusy}>
              {isSaving ? "Saving..." : "Save Current Filters"}
            </ActionButton>
          </div>

          <div className="saved-filters-controls">
            <select
              value={selectedConfigurationId}
              onChange={(e) => actions.chooseConfiguration(e.target.value)}
              disabled={
                isBusy ||
                isLoadingConfigurations ||
                isUpdating ||
                isDeleting ||
                configurations.length === 0
              }
            >
              <option value="">Select saved configuration...</option>
              {configurations.map((config) => (
                <option key={config.id} value={String(config.id)}>
                  {config.name}
                </option>
              ))}
            </select>
            <ActionButton
              onClick={actions.load}
              variant="secondary"
              disabled={isBusy || isLoadingConfigurations || !selectedConfigurationId}
            >
              Load Selected
            </ActionButton>
          </div>

          <div className="saved-filters-actions-row">
            <ActionButton
              onClick={actions.updateFilters}
              variant="secondary"
              disabled={isBusy || !selectedConfigurationId}
            >
              {isUpdating ? "Working..." : "Update Loaded"}
            </ActionButton>
            <ActionButton
              onClick={actions.rename}
              variant="secondary"
              disabled={isBusy || !selectedConfigurationId}
            >
              Rename Selected
            </ActionButton>
            <ActionButton
              onClick={handleDelete}
              variant="delete"
              disabled={isBusy || !selectedConfigurationId}
            >
              {isDeleting ? "Deleting..." : "Delete Selected"}
            </ActionButton>
          </div>

          {message && <p className="saved-filters-message">{message}</p>}
          {error && <p className="saved-filters-error">{error}</p>}
        </div>
      )}
    </div>
  );
};
