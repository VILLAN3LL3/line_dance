import React, { useState } from "react";

import { useSavedFilterConfigurations } from "../../hooks/useSavedFilterConfigurations";
import { SearchFilters } from "../../types";
import { ActionButton } from "../shared/ui";

interface SearchBarSavedConfigurationsPanelProps {
  buildFilters: () => SearchFilters;
  applyLoadedFilters: (filters: SearchFilters) => Promise<void>;
  isLoading: boolean;
}

export const SearchBarSavedConfigurationsPanel: React.FC<
  SearchBarSavedConfigurationsPanelProps
> = ({ buildFilters, applyLoadedFilters, isLoading }) => {
  const [showSavedConfigurations, setShowSavedConfigurations] = useState(false);
  const {
    savedConfigurations,
    selectedConfigurationId,
    setSelectedConfigurationId,
    configurationName,
    setConfigurationName,
    isSavingConfiguration,
    isUpdatingConfiguration,
    isDeletingConfiguration,
    isLoadingConfigurations,
    configurationMessage,
    configurationError,
    setConfigurationError,
    setConfigurationMessage,
    isBusy,
    handleSaveConfiguration,
    handleLoadConfiguration,
    handleUpdateLoadedConfiguration,
    handleRenameConfiguration,
    handleDeleteConfiguration,
  } = useSavedFilterConfigurations({
    buildFilters,
    applyLoadedFilters,
    isLoading,
  });

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
          <label htmlFor="saved-filter-name">Saved Configurations:</label>
          <div className="saved-filters-controls">
            <input
              id="saved-filter-name"
              type="text"
              value={configurationName}
              onChange={(e) => setConfigurationName(e.target.value)}
              placeholder="Configuration name..."
              disabled={isLoading || isSavingConfiguration}
            />
            <ActionButton onClick={handleSaveConfiguration} variant="primary" disabled={isBusy}>
              {isSavingConfiguration ? "Saving..." : "Save Current Filters"}
            </ActionButton>
          </div>

          <div className="saved-filters-controls">
            <select
              value={selectedConfigurationId}
              onChange={(e) => {
                setSelectedConfigurationId(e.target.value);
                setConfigurationError(null);
                setConfigurationMessage(null);
              }}
              disabled={
                isLoading ||
                isLoadingConfigurations ||
                isUpdatingConfiguration ||
                isDeletingConfiguration ||
                savedConfigurations.length === 0
              }
            >
              <option value="">Select saved configuration...</option>
              {savedConfigurations.map((config) => (
                <option key={config.id} value={String(config.id)}>
                  {config.name}
                </option>
              ))}
            </select>
            <ActionButton
              onClick={handleLoadConfiguration}
              variant="secondary"
              disabled={isBusy || isLoadingConfigurations || !selectedConfigurationId}
            >
              Load Selected
            </ActionButton>
          </div>

          <div className="saved-filters-actions-row">
            <ActionButton
              onClick={handleUpdateLoadedConfiguration}
              variant="secondary"
              disabled={isBusy || !selectedConfigurationId}
            >
              {isUpdatingConfiguration ? "Working..." : "Update Loaded"}
            </ActionButton>
            <ActionButton
              onClick={handleRenameConfiguration}
              variant="secondary"
              disabled={isBusy || !selectedConfigurationId}
            >
              Rename Selected
            </ActionButton>
            <ActionButton
              onClick={handleDeleteConfiguration}
              variant="delete"
              disabled={isBusy || !selectedConfigurationId}
            >
              {isDeletingConfiguration ? "Deleting..." : "Delete Selected"}
            </ActionButton>
          </div>

          {configurationMessage && <p className="saved-filters-message">{configurationMessage}</p>}
          {configurationError && <p className="saved-filters-error">{configurationError}</p>}
        </div>
      )}
    </div>
  );
};
