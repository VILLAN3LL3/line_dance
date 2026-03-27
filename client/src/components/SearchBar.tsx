import "../styles/SearchBar.css";

import React, { useEffect, useState, useRef } from "react";

import { getAuthors, getLevels, getStepFigures, getTags } from "../api";

interface SearchBarProps {
  onSearch: (filters: {
    search?: string;
    level?: string[];
    step_figures?: string[];
    step_figures_match_mode?: 'all' | 'any';
    without_step_figures?: boolean;
    tags?: string[];
    authors?: string[];
  }) => Promise<void>;
  filters?: {
    search?: string;
    level?: string[];
    step_figures?: string[];
    step_figures_match_mode?: 'all' | 'any';
    without_step_figures?: boolean;
    tags?: string[];
    authors?: string[];
  };
  isLoading?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch, filters = {}, isLoading = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string[]>([]);
  const [selectedFigures, setSelectedFigures] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedAuthors, setSelectedAuthors] = useState<string[]>([]);
  const [withoutStepFigures, setWithoutStepFigures] = useState(false);
  const [stepFiguresMatchMode, setStepFiguresMatchMode] = useState<'all' | 'any'>('all');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [levelOptions, setLevelOptions] = useState<string[]>([]);
  const [figureOptions, setFigureOptions] = useState<string[]>([]);
  const [tagOptions, setTagOptions] = useState<string[]>([]);
  const [authorOptions, setAuthorOptions] = useState<string[]>([]);
  const filterSyncRef = useRef(false);
  
  // Input states for autocomplete
  const [inputLevel, setInputLevel] = useState('');
  const [inputFigure, setInputFigure] = useState('');
  const [inputTag, setInputTag] = useState('');
  const [inputAuthor, setInputAuthor] = useState('');

  const handleSearch = async () => {
    await onSearch({
      search: searchTerm || undefined,
      level: selectedLevel.length > 0 ? selectedLevel : undefined,
      step_figures: !withoutStepFigures && selectedFigures.length > 0 ? selectedFigures : undefined,
      step_figures_match_mode: !withoutStepFigures && selectedFigures.length > 0 ? stepFiguresMatchMode : undefined,
      without_step_figures: withoutStepFigures || undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      authors: selectedAuthors.length > 0 ? selectedAuthors : undefined,
    });
  };

  useEffect(() => {
    // Sync filter values from parent state when changing views
    if (filters) {
      filterSyncRef.current = true;
      setSearchTerm(filters.search || '');
      setSelectedLevel(Array.isArray(filters.level) ? filters.level : (filters.level ? [filters.level] : []));
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
  }, [filters]);

  useEffect(() => {
    // Only auto-search on text input changes, not filter selections
    if (filterSyncRef.current) {
      return;
    }

    if (searchTerm !== undefined) {
      const timer = setTimeout(handleSearch, 300);
      return () => clearTimeout(timer);
    }
  }, [searchTerm]);

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [levels, figures, tags, authors] = await Promise.all([
          getLevels(),
          getStepFigures(),
          getTags(),
          getAuthors(),
        ]);

        setLevelOptions(levels.map(l => l.name));
        setFigureOptions(figures);
        setTagOptions(tags);
        setAuthorOptions(authors);
      } catch (error) {
        console.error('Error loading search filters:', error);
        setLevelOptions([]);
        setFigureOptions([]);
        setTagOptions([]);
        setAuthorOptions([]);
      }
    };

    loadFilters();
  }, []);

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
          <div className="filter-group">
            <label>Level:</label>
            <div className="filter-input-container">
              <input
                type="text"
                value={inputLevel}
                onChange={handleLevelInput}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLevelFromInput())}
                placeholder="Add level..."
                list="levels-list"
                disabled={isLoading}
              />
              <datalist id="levels-list">
                {levelOptions.map((level, index) => (
                  <option key={index} value={level} />
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
              {selectedLevel.map((level, index) => (
                <span key={index} className="filter-tag">
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
            <label>Step Figures:</label>
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
                Search choreographies without step figures
              </label>
            </div>
            <div className="filter-input-container">
              <input
                type="text"
                value={inputFigure}
                onChange={handleFigureInput}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFigureFromInput())}
                placeholder={withoutStepFigures ? 'Readonly: using without-step-figures filter' : 'Add step figure...'}
                list="figures-list"
                readOnly={withoutStepFigures}
                disabled={isLoading || withoutStepFigures}
              />
              <datalist id="figures-list">
                {figureOptions.map((figure, index) => (
                  <option key={index} value={figure} />
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
                <label>Match Mode:</label>
                <button
                  type="button"
                  onClick={() => setStepFiguresMatchMode(stepFiguresMatchMode === 'all' ? 'any' : 'all')}
                  className={`toggle-btn mode-${stepFiguresMatchMode}`}
                  disabled={isLoading}
                >
                  {stepFiguresMatchMode === 'all' ? 'AND (all selected)' : 'OR (any selected)'}
                </button>
              </div>
            )}
            <div className="filter-tags">
              {selectedFigures.map((figure, index) => (
                <span key={index} className="filter-tag">
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
            <label>Tags:</label>
            <div className="filter-input-container">
              <input
                type="text"
                value={inputTag}
                onChange={handleTagInput}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTagFromInput())}
                placeholder="Add tag..."
                list="tags-list"
                disabled={isLoading}
              />
              <datalist id="tags-list">
                {tagOptions.map((tag, index) => (
                  <option key={index} value={tag} />
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
              {selectedTags.map((tag, index) => (
                <span key={index} className="filter-tag">
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
            <label>Authors:</label>
            <div className="filter-input-container">
              <input
                type="text"
                value={inputAuthor}
                onChange={handleAuthorInput}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAuthorFromInput())}
                placeholder="Add author..."
                list="authors-list"
                disabled={isLoading}
              />
              <datalist id="authors-list">
                {authorOptions.map((author, index) => (
                  <option key={index} value={author} />
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
              {selectedAuthors.map((author, index) => (
                <span key={index} className="filter-tag">
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
        </div>
      )}
    </div>
  );
};
