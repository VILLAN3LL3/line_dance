import type { SavedFilterConfiguration } from "../../../types";

/** Select values are strings, ids are numbers. */
export function findConfigurationById(
  configurations: SavedFilterConfiguration[],
  selectedId: string,
): SavedFilterConfiguration | null {
  return configurations.find((config) => String(config.id) === selectedId) ?? null;
}

export const savedFilterMessages = {
  nameRequired: "Please enter a name for this filter configuration",
  selectToLoad: "Please select a saved configuration to load",
  selectedNotFound: "Selected configuration could not be found",
  selectFirst: "Please select a saved configuration first",
  newNameRequired: "Please enter a new name before renaming",
  loadFailed: "Failed to load saved filter configurations",
  saveFailed: "Failed to save filter configuration",
  updateFailed: "Failed to update the selected configuration",
  renameFailed: "Failed to rename the selected configuration",
  deleteFailed: "Failed to delete the selected configuration",
  saved: (name: string) => `Saved "${name}"`,
  loaded: (name: string) => `Loaded "${name}"`,
  updated: (name: string) => `Updated "${name}"`,
  renamed: (name: string) => `Renamed to "${name}"`,
  deleted: (name: string) => `Deleted "${name}"`,
  confirmDelete: (name: string) => `Delete saved configuration "${name}"?`,
};
