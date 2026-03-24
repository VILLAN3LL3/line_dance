import "../styles/ChoreographyForm.css";

import React, { useState } from "react";

import { ChoreographyFormData, Level } from "../types";

interface ChoreographyFormProps {
  initialData?: ChoreographyFormData;
  onSubmit: (data: ChoreographyFormData) => Promise<void>;
  isLoading?: boolean;
  onCancel?: () => void;
}

const LEVELS: Level[] = ['Beginner', 'Intermediate', 'Advanced', 'Experienced'];

export const ChoreographyForm: React.FC<ChoreographyFormProps> = ({
  initialData,
  onSubmit,
  isLoading = false,
  onCancel,
}) => {
  const [formData, setFormData] = useState<ChoreographyFormData>(
    initialData || {
      name: '',
      level: 'Beginner',
      authors: [],
      tags: [],
      step_figures: [],
    }
  );

  const [currentAuthor, setCurrentAuthor] = useState('');
  const [currentTag, setCurrentTag] = useState('');
  const [currentFigure, setCurrentFigure] = useState('');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'count' || name === 'wall_count' || name === 'creation_year' 
        ? value ? parseInt(value) : undefined
        : value,
    }));
  };

  const addAuthor = () => {
    if (currentAuthor.trim()) {
      setFormData(prev => ({
        ...prev,
        authors: [...prev.authors, currentAuthor.trim()],
      }));
      setCurrentAuthor('');
    }
  };

  const removeAuthor = (index: number) => {
    setFormData(prev => ({
      ...prev,
      authors: prev.authors.filter((_, i) => i !== index),
    }));
  };

  const addTag = () => {
    if (currentTag.trim()) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim()],
      }));
      setCurrentTag('');
    }
  };

  const removeTag = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index),
    }));
  };

  const addFigure = () => {
    if (currentFigure.trim()) {
      setFormData(prev => ({
        ...prev,
        step_figures: [...prev.step_figures, currentFigure.trim()],
      }));
      setCurrentFigure('');
    }
  };

  const removeFigure = (index: number) => {
    setFormData(prev => ({
      ...prev,
      step_figures: prev.step_figures.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  return (
    <form className="choreography-form" onSubmit={handleSubmit}>
      <div className="form-section">
        <h3>Basic Information</h3>
        
        <div className="form-group">
          <label htmlFor="name">Choreography Name *</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="Enter choreography name"
          />
        </div>

        <div className="form-group">
          <label htmlFor="level">Level *</label>
          <select id="level" name="level" value={formData.level} onChange={handleChange} required>
            {LEVELS.map(level => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="count">Count</label>
            <input
              type="number"
              id="count"
              name="count"
              value={formData.count || ''}
              onChange={handleChange}
              placeholder="e.g., 64"
            />
          </div>

          <div className="form-group">
            <label htmlFor="wall_count">Wall Count</label>
            <input
              type="number"
              id="wall_count"
              name="wall_count"
              value={formData.wall_count || ''}
              onChange={handleChange}
              placeholder="e.g., 4"
            />
          </div>

          <div className="form-group">
            <label htmlFor="creation_year">Year Created</label>
            <input
              type="number"
              id="creation_year"
              name="creation_year"
              value={formData.creation_year || ''}
              onChange={handleChange}
              placeholder="e.g., 2023"
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="step_sheet_link">Step Sheet Link</label>
          <input
            type="url"
            id="step_sheet_link"
            name="step_sheet_link"
            value={formData.step_sheet_link || ''}
            onChange={handleChange}
            placeholder="https://example.com/stepsheet"
          />
        </div>
      </div>

      <div className="form-section">
        <h3>Authors</h3>
        <div className="form-group">
          <input
            type="text"
            value={currentAuthor}
            onChange={e => setCurrentAuthor(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addAuthor())}
            placeholder="Author name"
          />
          <button type="button" onClick={addAuthor} className="btn-add">
            Add Author
          </button>
        </div>
        <div className="tags-container">
          {formData.authors.map((author, index) => (
            <span key={index} className="tag">
              {author}
              <button
                type="button"
                onClick={() => removeAuthor(index)}
                className="btn-remove"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="form-section">
        <h3>Step Figures</h3>
        <div className="form-group">
          <input
            type="text"
            value={currentFigure}
            onChange={e => setCurrentFigure(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addFigure())}
            placeholder="Step figure name (e.g., Vine, Shuffle, Grapevine)"
          />
          <button type="button" onClick={addFigure} className="btn-add">
            Add Figure
          </button>
        </div>
        <div className="tags-container">
          {formData.step_figures.map((figure, index) => (
            <span key={index} className="tag">
              {figure}
              <button
                type="button"
                onClick={() => removeFigure(index)}
                className="btn-remove"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="form-section">
        <h3>Tags</h3>
        <div className="form-group">
          <input
            type="text"
            value={currentTag}
            onChange={e => setCurrentTag(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
            placeholder="Tag (e.g., Country, Western, Urban)"
          />
          <button type="button" onClick={addTag} className="btn-add">
            Add Tag
          </button>
        </div>
        <div className="tags-container">
          {formData.tags.map((tag, index) => (
            <span key={index} className="tag">
              {tag}
              <button
                type="button"
                onClick={() => removeTag(index)}
                className="btn-remove"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn-primary" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Choreography'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};
