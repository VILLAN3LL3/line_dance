import React, { useEffect, useState } from "react";

import {
  deleteSavedFilterConfiguration, getSavedFilterConfigurations, saveFilterConfiguration, updateSavedFilterConfiguration
} from "../api";
import { SavedFilterConfiguration, SearchFilters } from "../types";

interface SearchBarSavedConfigurationsPanelProps {
  buildFilters: () => SearchFilters;
  applyLoadedFilters: (filters: SearchFilters) => Promise<void>;
  isLoading: boolean;
}

export const SearchBarSavedConfigurationsPanel: React.FC<
  SearchBarSavedConfigurationsPanelProps
> = ({ buildFilters, applyLoadedFilters, isLoading }) => {
  const [showSavedConfigurations, setShowSavedConfigurations] = useState(false);
  const [savedConfigurations, setSavedConfigurations] = useState<SavedFilterConfiguration[]>([]);
  const [selectedConfigurationId, setSelectedConfigurationId] = useState("");
  const [configurationName, setConfigurationName] = useState("");
  const [isSavingConfiguration, setIsSavingConfiguration] = useState(false);
  const [isUpdatingConfiguration, setIsUpdatingConfiguration] = useState(false);
  const [isDeletingConfiguration, setIsDeletingConfiguration] = useState(false);
  const [isLoadingConfigurations, setIsLoadingConfigurations] = useState(false);
  const [configurationMessage, setConfigurationMessage] = useState<string | null>(null);
  const [configurationError, setConfigurationError] = useState<string | null>(null);

  const loadSavedConfigurations = async () => {
    setIsLoadingConfigurations(true);
    try {
      const configurations = await getSavedFilterConfigurations();
      setSavedConfigurations(configurations);
    } catch (error) {
      console.error("Error loading saved filter configurations:", error);
      setConfigurationError("Failed to load saved filter configurations");
    } finally {
      setIsLoadingConfigurations(false);
    }
  };

  const getSelectedConfiguration = () =>
    savedConfigurations.find((config) => String(config.id) === selectedConfigurationId) || null;

  const handleSaveConfiguration = async () => {
    const name = configurationName.trim();
    if (!name) {
      setConfigurationError("Please enter a name for this filter configuration");
      setConfigurationMessage(null);
      return;
    }

    setIsSavingConfiguration(true);
    setConfigurationError(null);
    setConfigurationMessage(null);
    try {
      const saved = await saveFilterConfiguration(name, buildFilters());
      setConfigurationName(saved.name);
      setSelectedConfigurationId(String(saved.id));
      setConfigurationMessage(`Saved "${saved.name}"`);
      await loadSavedConfigurations();
    } catch (error) {
      console.error("Error saving filter configuration:", error);
      setConfigurationError("Failed to save filter configuration");
    } finally {
      setIsSavingConfiguration(false);
    }
  };

  const handleLoadConfiguration = async () => {
    if (!selectedConfigurationId) {
      setConfigurationError("Please select a saved configuration to load");
      setConfigurationMessage(null);
      return;
    }

    const selected = savedConfigurations.find(
      (config) => String(config.id) === selectedConfigurationId,
    );
    if (!selected) {
      setConfigurationError("Selected configuration could not be found");
      setConfigurationMessage(null);
      return;
    }

    setConfigurationError(null);
    setConfigurationMessage(`Loaded "${selected.name}"`);
    await applyLoadedFilters(selected.filters || {});
  };

  const handleUpdateLoadedConfiguration = async () => {
    const selected = getSelectedConfiguration();
    if (!selected) {
      setConfigurationError("Please select a saved configuration first");
      setConfigurationMessage(null);
      return;
    }

    setIsUpdatingConfiguration(true);
    setConfigurationError(null);
    setConfigurationMessage(null);
    try {
      const updated = await updateSavedFilterConfiguration(selected.id, {
        filters: buildFilters(),
      });
      setConfigurationMessage(`Updated "${updated.name}"`);
      await loadSavedConfigurations();
    } catch (error) {
      console.error("Error updating saved filter configuration:", error);
      setConfigurationError("Failed to update the selected configuration");
    } finally {
      setIsUpdatingConfiguration(false);
    }
  };

  const handleRenameConfiguration = async () => {
    const selected = getSelectedConfiguration();
    if (!selected) {
      setConfigurationError("Please select a saved configuration first");
      setConfigurationMessage(null);
      return;
    }

    const newName = configurationName.trim();
    if (!newName) {
      setConfigurationError("Please enter a new name before renaming");
      setConfigurationMessage(null);
      return;
    }

    setIsUpdatingConfiguration(true);
    setConfigurationError(null);
    setConfigurationMessage(null);
    try {
      const updated = await updateSavedFilterConfiguration(selected.id, {
        name: newName,
      });
      setConfigurationName(updated.name);
      setConfigurationMessage(`Renamed to "${updated.name}"`);
      await loadSavedConfigurations();
    } catch (error) {
      console.error("Error renaming saved filter configuration:", error);
      setConfigurationError("Failed to rename the selected configuration");
    } finally {
      setIsUpdatingConfiguration(false);
    }
  };

  const handleDeleteConfiguration = async () => {
    const selected = getSelectedConfiguration();
    if (!selected) {
      setConfigurationError("Please select a saved configuration first");
      setConfigurationMessage(null);
      return;
    }

    const confirmed = globalThis.confirm(`Delete saved configuration "${selected.name}"?`);
    if (!confirmed) {
      return;
    }

    setIsDeletingConfiguration(true);
    setConfigurationError(null);
    setConfigurationMessage(null);
    try {
      await deleteSavedFilterConfiguration(selected.id);
      setSelectedConfigurationId("");
      setConfigurationName("");
      setConfigurationMessage(`Deleted "${selected.name}"`);
      await loadSavedConfigurations();
    } catch (error) {
      console.error("Error deleting saved filter configuration:", error);
      setConfigurationError("Failed to delete the selected configuration");
    } finally {
      setIsDeletingConfiguration(false);
    }
  };

  useEffect(() => {
    loadSavedConfigurations();
  }, []);

  useEffect(() => {
    const selected =
      savedConfigurations.find((config) => String(config.id) === selectedConfigurationId) || null;
    if (selected) {
      setConfigurationName(selected.name);
    }
  }, [selectedConfigurationId, savedConfigurations]);

  const isBusy =
    isLoading || isSavingConfiguration || isUpdatingConfiguration || isDeletingConfiguration;

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
