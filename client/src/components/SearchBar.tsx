import React, { useState, useEffect } from 'react';
import { Level } from '../types';
import '../styles/SearchBar.css';

interface SearchBarProps {
  onSearch: (filters: {
    search?: string;
    level?: string;
    step_figures?: string[];
    tags?: string[];
  }) => Promise<void>;
  isLoading?: boolean;
}

const LEVELS: Level[] = ['Beginner', 'Intermediate', 'Advanced', 'Experienced'];
const COMMON_FIGURES = [
  'Vine', 'Shuffle', 'Grapevine', 'Rock Step', 'Slide', 'Jazz Box',
  'Triple Step', 'Pivot', 'Scuff', 'Kick', 'Heel', 'Touch',
];

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch, isLoading = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [selectedFigures, setSelectedFigures] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customFigure, setCustomFigure] = useState('');

  const handleSearch = async () => {
    await onSearch({
      search: searchTerm || undefined,
      level: selectedLevel || undefined,
      step_figures: selectedFigures.length > 0 ? selectedFigures : undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
    });
  };

  useEffect(() => {
    const timer = setTimeout(handleSearch, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, selectedLevel, selectedFigures, selectedTags]);

  const toggleFigure = (figure: string) => {
    setSelectedFigures(prev =>
      prev.includes(figure) ? prev.filter(f => f !== figure) : [...prev, figure]
    );
  };

  const addCustomFigure = () => {
    if (customFigure.trim() && !selectedFigures.includes(customFigure.trim())) {
      setSelectedFigures(prev => [...prev, customFigure.trim()]);
      setCustomFigure('');
    }
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
              {LEVELS.map(level => (
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
              {COMMON_FIGURES.map(figure => (
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
            <div className="custom-input">
              <input
                type="text"
                placeholder="Add custom figure..."
                value={customFigure}
                onChange={e => setCustomFigure(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && addCustomFigure()}
              />
              <button type="button" onClick={addCustomFigure} className="btn-small">
                Add
              </button>
            </div>
            {selectedFigures.length > 0 && (
              <div className="selected-items">
                {selectedFigures.map((figure, idx) => (
                  <span key={idx} className="selected-tag">
                    {figure}
                    <button
                      type="button"
                      onClick={() => toggleFigure(figure)}
                      className="btn-remove-small"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="filter-group">
            <label>Tags:</label>
            <div className="custom-input">
              <input
                type="text"
                placeholder="Enter tag name..."
                onKeyPress={e => {
                  if (e.key === 'Enter') {
                    const tag = (e.target as HTMLInputElement).value.trim();
                    if (tag && !selectedTags.includes(tag)) {
                      setSelectedTags([...selectedTags, tag]);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }
                }}
              />
            </div>
            {selectedTags.length > 0 && (
              <div className="selected-items">
                {selectedTags.map((tag, idx) => (
                  <span key={idx} className="selected-tag">
                    {tag}
                    <button
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className="btn-remove-small"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
