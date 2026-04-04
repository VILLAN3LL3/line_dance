import { useEffect, useMemo, useState } from "react";

import {
  deleteSavedFilterConfiguration,
  getSavedFilterConfigurations,
  saveFilterConfiguration,
  updateSavedFilterConfiguration,
} from "../api";
import { SavedFilterConfiguration, SearchFilters } from "../types";

interface UseSavedFilterConfigurationsOptions {
  buildFilters: () => SearchFilters;
  applyLoadedFilters: (filters: SearchFilters) => Promise<void>;
  isLoading: boolean;
}

export const useSavedFilterConfigurations = ({
  buildFilters,
  applyLoadedFilters,
  isLoading,
}: UseSavedFilterConfigurationsOptions) => {
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

  const isBusy = useMemo(
    () => isLoading || isSavingConfiguration || isUpdatingConfiguration || isDeletingConfiguration,
    [isLoading, isSavingConfiguration, isUpdatingConfiguration, isDeletingConfiguration],
  );

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

  return {
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
  };
};
