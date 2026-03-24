import "../styles/SearchBar.css";

import React, { useEffect, useState } from "react";

import { getLevels, getStepFigures, getTags } from "../api";

interface SearchBarProps {
  onSearch: (filters: {
    search?: string;
    level?: string;
    step_figures?: string[];
    tags?: string[];
  }) => Promise<void>;
  isLoading?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch, isLoading = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [selectedFigures, setSelectedFigures] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [levelOptions, setLevelOptions] = useState<string[]>([]);
  const [figureOptions, setFigureOptions] = useState<string[]>([]);
  const [tagOptions, setTagOptions] = useState<string[]>([]);

  const handleSearch = async () => {
    await onSearch({
      search: searchTerm || undefined,
      level: selectedLevel || undefined,
      step_figures: selectedFigures.length > 0 ? selectedFigures : undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
    });
  };

  useEffect(() => {
    // Only auto-search on text input changes, not filter selections
    if (searchTerm !== undefined) {
      const timer = setTimeout(handleSearch, 300);
      return () => clearTimeout(timer);
    }
  }, [searchTerm]);

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [levels, figures, tags] = await Promise.all([
          getLevels(),
          getStepFigures(),
          getTags(),
        ]);

        setLevelOptions(levels.map(l => l.name));
        setFigureOptions(figures);
        setTagOptions(tags);
      } catch (error) {
        console.error('Error loading search filters:', error);
        setLevelOptions([]);
        setFigureOptions([]);
        setTagOptions([]);
      }
    };

    loadFilters();
  }, []);

  const toggleFigure = (figure: string) => {
    setSelectedFigures(prev =>
      prev.includes(figure) ? prev.filter(f => f !== figure) : [...prev, figure]
    );
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
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
            <div className="filter-options">
              {levelOptions.map(level => (
                <label key={level} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectedLevel === level}
                    onChange={() => setSelectedLevel(selectedLevel === level ? '' : level)}
                    disabled={isLoading}
                  />
                  {level}
                </label>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <label>Step Figures:</label>
            <div className="filter-options">
              {figureOptions.map(figure => (
                <label key={figure} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectedFigures.includes(figure)}
                    onChange={() => toggleFigure(figure)}
                    disabled={isLoading}
                  />
                  {figure}
                </label>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <label>Tags:</label>
            <div className="filter-options">
              {tagOptions.map(tag => (
                <label key={tag} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectedTags.includes(tag)}
                    onChange={() => toggleTag(tag)}
                    disabled={isLoading}
                  />
                  {tag}
                </label>
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
