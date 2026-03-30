import "../styles/SearchBar.css";

import React, { useEffect, useRef, useState } from "react";

import {
  deleteSavedFilterConfiguration, getAuthors, getLevels, getMaxChoreographyCount, getSavedFilterConfigurations, getStepFigures, getTags,
  saveFilterConfiguration, updateSavedFilterConfiguration
} from "../api";
import { SavedFilterConfiguration, SearchFilters } from "../types";

interface SearchBarProps {
  onSearch: (filters: SearchFilters) => Promise<void>;
  filters?: SearchFilters;
  isLoading?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch, filters = {}, isLoading = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string[]>([]);
  const [maxCount, setMaxCount] = useState<number>(0);
  const [maxCountLimit, setMaxCountLimit] = useState<number>(0);
  const [selectedFigures, setSelectedFigures] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedAuthors, setSelectedAuthors] = useState<string[]>([]);
  const [withoutStepFigures, setWithoutStepFigures] = useState(false);
  const [stepFiguresMatchMode, setStepFiguresMatchMode] = useState<'all' | 'any' | 'exact'>('all');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSavedConfigurations, setShowSavedConfigurations] = useState(false);
  const [levelOptions, setLevelOptions] = useState<string[]>([]);
  const [figureOptions, setFigureOptions] = useState<string[]>([]);
  const [tagOptions, setTagOptions] = useState<string[]>([]);
  const [authorOptions, setAuthorOptions] = useState<string[]>([]);
  const filterSyncRef = useRef(false);
  const [savedConfigurations, setSavedConfigurations] = useState<SavedFilterConfiguration[]>([]);
  const [selectedConfigurationId, setSelectedConfigurationId] = useState('');
  const [configurationName, setConfigurationName] = useState('');
  const [isSavingConfiguration, setIsSavingConfiguration] = useState(false);
  const [isUpdatingConfiguration, setIsUpdatingConfiguration] = useState(false);
  const [isDeletingConfiguration, setIsDeletingConfiguration] = useState(false);
  const [isLoadingConfigurations, setIsLoadingConfigurations] = useState(false);
  const [configurationMessage, setConfigurationMessage] = useState<string | null>(null);
  const [configurationError, setConfigurationError] = useState<string | null>(null);
  
  // Input states for autocomplete
  const [inputLevel, setInputLevel] = useState('');
  const [inputFigure, setInputFigure] = useState('');
  const [inputTag, setInputTag] = useState('');
  const [inputAuthor, setInputAuthor] = useState('');

  const buildFilters = (): SearchFilters => ({
    search: searchTerm || undefined,
    level: selectedLevel.length > 0 ? selectedLevel : undefined,
    max_count: maxCountLimit > 0 ? maxCount : undefined,
    step_figures: !withoutStepFigures && selectedFigures.length > 0 ? selectedFigures : undefined,
    step_figures_match_mode: !withoutStepFigures && selectedFigures.length > 0 ? stepFiguresMatchMode : undefined,
    without_step_figures: withoutStepFigures || undefined,
    tags: selectedTags.length > 0 ? selectedTags : undefined,
    authors: selectedAuthors.length > 0 ? selectedAuthors : undefined,
  });

  const applyLoadedFilters = async (loadedFilters: SearchFilters) => {
    setSearchTerm(loadedFilters.search || '');
    setSelectedLevel(loadedFilters.level || []);
    setMaxCount(loadedFilters.max_count ?? maxCountLimit);
    setWithoutStepFigures(!!loadedFilters.without_step_figures);
    setSelectedFigures(loadedFilters.without_step_figures ? [] : (loadedFilters.step_figures || []));
    setStepFiguresMatchMode(loadedFilters.step_figures_match_mode || 'all');
    setSelectedTags(loadedFilters.tags || []);
    setSelectedAuthors(loadedFilters.authors || []);
    setInputLevel('');
    setInputFigure('');
    setInputTag('');
    setInputAuthor('');

    await onSearch(loadedFilters);
  };

  const loadSavedConfigurations = async () => {
    setIsLoadingConfigurations(true);
    try {
      const configurations = await getSavedFilterConfigurations();
      setSavedConfigurations(configurations);
    } catch (error) {
      console.error('Error loading saved filter configurations:', error);
      setConfigurationError('Failed to load saved filter configurations');
    } finally {
      setIsLoadingConfigurations(false);
    }
  };

  const getSelectedConfiguration = () => (
    savedConfigurations.find(config => String(config.id) === selectedConfigurationId) || null
  );

  const handleClearAllFilters = async () => {
    // Reset all filter states to initial values
    setSearchTerm('');
    setSelectedLevel([]);
    setSelectedFigures([]);
    setSelectedTags([]);
    setSelectedAuthors([]);
    setMaxCount(maxCountLimit);
    setWithoutStepFigures(false);
    setStepFiguresMatchMode('all');
    setInputLevel('');
    setInputFigure('');
    setInputTag('');
    setInputAuthor('');
    
    // Apply the cleared filters
    await onSearch({});
  };

  const handleSearch = async () => {
    const filters = buildFilters();
    await onSearch(filters);
  };

  const handleSaveConfiguration = async () => {
    const name = configurationName.trim();
    if (!name) {
      setConfigurationError('Please enter a name for this filter configuration');
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
      console.error('Error saving filter configuration:', error);
      setConfigurationError('Failed to save filter configuration');
    } finally {
      setIsSavingConfiguration(false);
    }
  };

  const handleLoadConfiguration = async () => {
    if (!selectedConfigurationId) {
      setConfigurationError('Please select a saved configuration to load');
      setConfigurationMessage(null);
      return;
    }

    const selected = savedConfigurations.find(config => String(config.id) === selectedConfigurationId);
    if (!selected) {
      setConfigurationError('Selected configuration could not be found');
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
      setConfigurationError('Please select a saved configuration first');
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
      console.error('Error updating saved filter configuration:', error);
      setConfigurationError('Failed to update the selected configuration');
    } finally {
      setIsUpdatingConfiguration(false);
    }
  };

  const handleRenameConfiguration = async () => {
    const selected = getSelectedConfiguration();
    if (!selected) {
      setConfigurationError('Please select a saved configuration first');
      setConfigurationMessage(null);
      return;
    }

    const newName = configurationName.trim();
    if (!newName) {
      setConfigurationError('Please enter a new name before renaming');
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
      console.error('Error renaming saved filter configuration:', error);
      setConfigurationError('Failed to rename the selected configuration');
    } finally {
      setIsUpdatingConfiguration(false);
    }
  };

  const handleDeleteConfiguration = async () => {
    const selected = getSelectedConfiguration();
    if (!selected) {
      setConfigurationError('Please select a saved configuration first');
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
      setSelectedConfigurationId('');
      setConfigurationName('');
      setConfigurationMessage(`Deleted "${selected.name}"`);
      await loadSavedConfigurations();
    } catch (error) {
      console.error('Error deleting saved filter configuration:', error);
      setConfigurationError('Failed to delete the selected configuration');
    } finally {
      setIsDeletingConfiguration(false);
    }
  };

  useEffect(() => {
    // Sync filter values from parent state when changing views
    if (filters) {
      filterSyncRef.current = true;
      setSearchTerm(filters.search || '');
      setSelectedLevel(Array.isArray(filters.level) ? filters.level : []);
      setMaxCount(filters.max_count ?? maxCountLimit);
      setSelectedFigures(filters.step_figures || []);
      setStepFiguresMatchMode(filters.step_figures_match_mode || 'all');
      setWithoutStepFigures(!!filters.without_step_figures);
      setSelectedTags(filters.tags || []);
      setSelectedAuthors(filters.authors || []);

      const reset = setTimeout(() => {
        filterSyncRef.current = false;
      }, 0);

      return () => clearTimeout(reset);
    }
  }, [filters, maxCountLimit]);



  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [levels, figures, tags, authors] = await Promise.all([
          getLevels(),
          getStepFigures(),
          getTags(),
          getAuthors(),
        ]);

        const maxExistingCount = await getMaxChoreographyCount();

        setLevelOptions(levels.map(l => l.name));
        setFigureOptions(figures);
        setTagOptions(tags);
        setAuthorOptions(authors);
        setMaxCountLimit(maxExistingCount);
        setMaxCount((previous) => {
          if (previous > 0 && previous <= maxExistingCount) {
            return previous;
          }
          return maxExistingCount;
        });
      } catch (error) {
        console.error('Error loading search filters:', error);
        setLevelOptions([]);
        setFigureOptions([]);
        setTagOptions([]);
        setAuthorOptions([]);
        setMaxCountLimit(0);
        setMaxCount(0);
      }
    };

    loadFilters();
  }, []);

  useEffect(() => {
    loadSavedConfigurations();
  }, []);

  useEffect(() => {
    const selected = savedConfigurations.find(config => String(config.id) === selectedConfigurationId) || null;
    if (selected) {
      setConfigurationName(selected.name);
    }
  }, [selectedConfigurationId, savedConfigurations]);

  useEffect(() => {
    if (maxCountLimit > 0 && maxCount === 0) {
      setMaxCount(maxCountLimit);
    }
    if (maxCount > maxCountLimit) {
      setMaxCount(maxCountLimit);
    }
  }, [maxCount, maxCountLimit]);

  const toggleFigure = (figure: string) => {
    if (withoutStepFigures) {
      return;
    }
    setSelectedFigures(prev =>
      prev.includes(figure) ? prev.filter(f => f !== figure) : [...prev, figure]
    );
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const toggleAuthor = (author: string) => {
    setSelectedAuthors(prev =>
      prev.includes(author) ? prev.filter(a => a !== author) : [...prev, author]
    );
  };

  const addFigureFromInput = (figureValue?: string) => {
    if (withoutStepFigures) {
      return;
    }
    const value = figureValue ?? inputFigure;
    const trimmed = value.trim();
    if (trimmed && !selectedFigures.includes(trimmed)) {
      setSelectedFigures([...selectedFigures, trimmed]);
      setInputFigure('');
    }
  };

  const addTagFromInput = (tagValue?: string) => {
    const value = tagValue ?? inputTag;
    const trimmed = value.trim();
    if (trimmed && !selectedTags.includes(trimmed)) {
      setSelectedTags([...selectedTags, trimmed]);
      setInputTag('');
    }
  };

  const addAuthorFromInput = (authorValue?: string) => {
    const value = authorValue ?? inputAuthor;
    const trimmed = value.trim();
    if (trimmed && !selectedAuthors.includes(trimmed)) {
      setSelectedAuthors([...selectedAuthors, trimmed]);
      setInputAuthor('');
    }
  };

  const toggleLevel = (level: string) => {
    setSelectedLevel(prev =>
      prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
    );
  };

  const isDatalistSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputType = (e.nativeEvent as InputEvent).inputType;
    return inputType === 'insertReplacementText' || inputType === 'insertFromDrop';
  };

  const addLevelFromInput = (levelValue?: string) => {
    const value = levelValue ?? inputLevel;
    const trimmed = value.trim();
    if (trimmed && !selectedLevel.includes(trimmed)) {
      setSelectedLevel([...selectedLevel, trimmed]);
      setInputLevel('');
    }
  };

  const handleLevelInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputLevel(value);

    if (
      value.trim() &&
      levelOptions.includes(value.trim()) &&
      !selectedLevel.includes(value.trim()) &&
      isDatalistSelection(e)
    ) {
      addLevelFromInput(value);
    }
  };

  const handleFigureInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (withoutStepFigures) {
      return;
    }
    const value = e.target.value;
    setInputFigure(value);

    if (
      value.trim() &&
      figureOptions.includes(value.trim()) &&
      !selectedFigures.includes(value.trim()) &&
      isDatalistSelection(e)
    ) {
      addFigureFromInput(value);
    }
  };

  const handleTagInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputTag(value);

    if (
      value.trim() &&
      tagOptions.includes(value.trim()) &&
      !selectedTags.includes(value.trim()) &&
      isDatalistSelection(e)
    ) {
      addTagFromInput(value);
    }
  };

  const handleAuthorInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputAuthor(value);

    if (
      value.trim() &&
      authorOptions.includes(value.trim()) &&
      !selectedAuthors.includes(value.trim()) &&
      isDatalistSelection(e)
    ) {
      addAuthorFromInput(value);
    }
  };

  return (
    <div className="search-bar">
      <div className="search-main">
        <input
          type="text"
          placeholder="Search choreographies by name..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              handleSearch();
            }
          }}
          onBlur={handleSearch}
          className="search-input"
          disabled={isLoading}
        />
      </div>

      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="btn-toggle-advanced"
      >
        {showAdvanced ? '▼' : '▶'} Advanced Filters
      </button>

      {showAdvanced && (
        <div className="advanced-filters">
          <button
            type="button"
            onClick={() => setShowSavedConfigurations(!showSavedConfigurations)}
            className="btn-toggle-saved-configs"
          >
            {showSavedConfigurations ? '▼' : '▶'} Saved Configurations
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
                  disabled={isLoading || isSavingConfiguration || isUpdatingConfiguration || isDeletingConfiguration}
                >
                  {isSavingConfiguration ? 'Saving...' : 'Save Current Filters'}
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
                  disabled={isLoading || isLoadingConfigurations || isUpdatingConfiguration || isDeletingConfiguration || savedConfigurations.length === 0}
                >
                  <option value="">Select saved configuration...</option>
                  {savedConfigurations.map(config => (
                    <option key={config.id} value={String(config.id)}>
                      {config.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleLoadConfiguration}
                  className="btn-secondary"
                  disabled={isLoading || isLoadingConfigurations || isUpdatingConfiguration || isDeletingConfiguration || !selectedConfigurationId}
                >
                  Load Selected
                </button>
              </div>

              <div className="saved-filters-actions-row">
                <button
                  type="button"
                  onClick={handleUpdateLoadedConfiguration}
                  className="btn-secondary"
                  disabled={isLoading || isSavingConfiguration || isUpdatingConfiguration || isDeletingConfiguration || !selectedConfigurationId}
                >
                  {isUpdatingConfiguration ? 'Working...' : 'Update Loaded'}
                </button>
                <button
                  type="button"
                  onClick={handleRenameConfiguration}
                  className="btn-secondary"
                  disabled={isLoading || isSavingConfiguration || isUpdatingConfiguration || isDeletingConfiguration || !selectedConfigurationId}
                >
                  Rename Selected
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfiguration}
                  className="btn-delete"
                  disabled={isLoading || isSavingConfiguration || isUpdatingConfiguration || isDeletingConfiguration || !selectedConfigurationId}
                >
                  {isDeletingConfiguration ? 'Deleting...' : 'Delete Selected'}
                </button>
              </div>

              {configurationMessage && <p className="saved-filters-message">{configurationMessage}</p>}
              {configurationError && <p className="saved-filters-error">{configurationError}</p>}
            </div>
          )}

          <div className="filter-group">
            <label htmlFor="level-input">Level:</label>
            <div className="filter-input-container">
              <input
                id="level-input"
                type="text"
                value={inputLevel}
                onChange={handleLevelInput}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addLevelFromInput();
                  }
                }}
                placeholder="Add level..."
                list="levels-list"
                autoComplete="off"
                disabled={isLoading}
              />
              <datalist id="levels-list">
                {levelOptions.map((level) => (
                  <option key={level} value={level} />
                ))}
              </datalist>
              <button
                type="button"
                onClick={() => addLevelFromInput()}
                className="btn-add-filter"
                disabled={isLoading}
              >
                +
              </button>
            </div>
            <div className="filter-tags">
              {selectedLevel.map((level) => (
                <span key={level} className="filter-tag">
                  {level}
                  <button
                    type="button"
                    onClick={() => toggleLevel(level)}
                    className="btn-remove-tag"
                    disabled={isLoading}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <label htmlFor="max-count-slider">Max Counts:</label>
            <div className="max-count-filter">
              <input
                id="max-count-slider"
                type="range"
                min={0}
                max={maxCountLimit}
                step={8}
                value={Math.min(maxCount, maxCountLimit)}
                onChange={(e) => setMaxCount(Number(e.target.value))}
                disabled={isLoading || maxCountLimit === 0}
              />
              <span className="max-count-value">
                {maxCountLimit === 0 || maxCount >= maxCountLimit ? `No limit (max ${maxCountLimit})` : `≤ ${maxCount}`}
              </span>
            </div>
          </div>

          <div className="filter-group">
            <label htmlFor="figure-input">Step Figures:</label>
            <div className="filter-checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={withoutStepFigures}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setWithoutStepFigures(checked);
                    if (checked) {
                      setSelectedFigures([]);
                      setInputFigure('');
                    }
                  }}
                  disabled={isLoading}
                />
                {' '}
                Search choreographies without step figures
              </label>
            </div>
            <div className="filter-input-container">
              <input
                id="figure-input"
                type="text"
                value={inputFigure}
                onChange={handleFigureInput}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addFigureFromInput();
                  }
                }}
                placeholder={withoutStepFigures ? 'Readonly: using without-step-figures filter' : 'Add step figure...'}
                list="figures-list"
                autoComplete="off"
                readOnly={withoutStepFigures}
                disabled={isLoading || withoutStepFigures}
              />
              <datalist id="figures-list">
                {figureOptions.map((figure) => (
                  <option key={figure} value={figure} />
                ))}
              </datalist>
              <button
                type="button"
                onClick={() => addFigureFromInput()}
                className="btn-add-filter"
                disabled={isLoading || withoutStepFigures}
              >
                +
              </button>
            </div>
            {selectedFigures.length > 0 && (
              <div className="filter-mode-toggle">
                <span>Match Mode:</span>
                <div className="match-mode-radios" role="radiogroup" aria-label="Step figure match mode">
                  <label className={`match-mode-option mode-all ${stepFiguresMatchMode === 'all' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="step-figures-match-mode"
                      value="all"
                      checked={stepFiguresMatchMode === 'all'}
                      onChange={() => setStepFiguresMatchMode('all')}
                      disabled={isLoading}
                    />
                    {' '}
                    AND (all selected)
                  </label>
                  <label className={`match-mode-option mode-any ${stepFiguresMatchMode === 'any' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="step-figures-match-mode"
                      value="any"
                      checked={stepFiguresMatchMode === 'any'}
                      onChange={() => setStepFiguresMatchMode('any')}
                      disabled={isLoading}
                    />
                    {' '}
                    OR (any selected)
                  </label>
                  <label className={`match-mode-option mode-exact ${stepFiguresMatchMode === 'exact' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="step-figures-match-mode"
                      value="exact"
                      checked={stepFiguresMatchMode === 'exact'}
                      onChange={() => setStepFiguresMatchMode('exact')}
                      disabled={isLoading}
                    />
                    {' '}
                    EXACT (only selected)
                  </label>
                </div>
              </div>
            )}
            <div className="filter-tags">
              {selectedFigures.map((figure) => (
                <span key={figure} className="filter-tag">
                  {figure}
                  <button
                    type="button"
                    onClick={() => toggleFigure(figure)}
                    className="btn-remove-tag"
                    disabled={isLoading}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <label htmlFor="tag-input">Tags:</label>
            <div className="filter-input-container">
              <input
                id="tag-input"
                type="text"
                value={inputTag}
                onChange={handleTagInput}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTagFromInput();
                  }
                }}
                placeholder="Add tag..."
                list="tags-list"
                autoComplete="off"
                disabled={isLoading}
              />
              <datalist id="tags-list">
                {tagOptions.map((tag) => (
                  <option key={tag} value={tag} />
                ))}
              </datalist>
              <button
                type="button"
                onClick={() => addTagFromInput()}
                className="btn-add-filter"
                disabled={isLoading}
              >
                +
              </button>
            </div>
            <div className="filter-tags">
              {selectedTags.map((tag) => (
                <span key={tag} className="filter-tag">
                  {tag}
                  <button
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className="btn-remove-tag"
                    disabled={isLoading}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <label htmlFor="author-input">Authors:</label>
            <div className="filter-input-container">
              <input
                id="author-input"
                type="text"
                value={inputAuthor}
                onChange={handleAuthorInput}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addAuthorFromInput();
                  }
                }}
                placeholder="Add author..."
                list="authors-list"
                autoComplete="off"
                disabled={isLoading}
              />
              <datalist id="authors-list">
                {authorOptions.map((author) => (
                  <option key={author} value={author} />
                ))}
              </datalist>
              <button
                type="button"
                onClick={() => addAuthorFromInput()}
                className="btn-add-filter"
                disabled={isLoading}
              >
                +
              </button>
            </div>
            <div className="filter-tags">
              {selectedAuthors.map((author) => (
                <span key={author} className="filter-tag">
                  {author}
                  <button
                    type="button"
                    onClick={() => toggleAuthor(author)}
                    className="btn-remove-tag"
                    disabled={isLoading}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {showAdvanced && (
        <div className="search-actions">
          <button
            type="button"
            onClick={handleSearch}
            className="btn-primary"
            disabled={isLoading}
          >
            Apply Filters
          </button>
          <button
            type="button"
            onClick={handleClearAllFilters}
            className="btn-secondary"
            disabled={isLoading}
          >
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
};
