import React, { useState } from "react";

import { useSavedFilterConfigurations } from "../../hooks/useSavedFilterConfigurations";
import { SearchFilters } from "../../types";

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
            <button
              type="button"
              onClick={handleSaveConfiguration}
              className="btn-primary"
              disabled={isBusy}
            >
              {isSavingConfiguration ? "Saving..." : "Save Current Filters"}
            </button>
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
            <button
              type="button"
              onClick={handleLoadConfiguration}
              className="btn-secondary"
              disabled={isBusy || isLoadingConfigurations || !selectedConfigurationId}
            >
              Load Selected
            </button>
          </div>

          <div className="saved-filters-actions-row">
            <button
              type="button"
              onClick={handleUpdateLoadedConfiguration}
              className="btn-secondary"
              disabled={isBusy || !selectedConfigurationId}
            >
              {isUpdatingConfiguration ? "Working..." : "Update Loaded"}
            </button>
            <button
              type="button"
              onClick={handleRenameConfiguration}
              className="btn-secondary"
              disabled={isBusy || !selectedConfigurationId}
            >
              Rename Selected
            </button>
            <button
              type="button"
              onClick={handleDeleteConfiguration}
              className="btn-delete"
              disabled={isBusy || !selectedConfigurationId}
            >
              {isDeletingConfiguration ? "Deleting..." : "Delete Selected"}
            </button>
          </div>

          {configurationMessage && <p className="saved-filters-message">{configurationMessage}</p>}
          {configurationError && <p className="saved-filters-error">{configurationError}</p>}
        </div>
      )}
    </div>
  );
};
