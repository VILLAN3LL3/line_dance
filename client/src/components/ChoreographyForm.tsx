import "../styles/ChoreographyForm.css";

import React, { useEffect, useState } from "react";

import { addLevel as apiAddLevel, getLevels, getAuthors, getTags, getStepFigures } from "../api";
import { ChoreographyFormData } from "../types";

interface ChoreographyFormProps {
  initialData?: ChoreographyFormData;
  onSubmit: (data: ChoreographyFormData) => Promise<void>;
  isLoading?: boolean;
  onCancel?: () => void;
}

export const ChoreographyForm: React.FC<ChoreographyFormProps> = ({
  initialData,
  onSubmit,
  isLoading = false,
  onCancel,
}) => {
  const [formData, setFormData] = useState<ChoreographyFormData>(
    initialData || {
      name: '',
      level: '',
      authors: [],
      tags: [],
      step_figures: [],
    }
  );

  const [currentAuthor, setCurrentAuthor] = useState('');
  const [currentTag, setCurrentTag] = useState('');
  const [currentFigure, setCurrentFigure] = useState('');
  const [levels, setLevels] = useState<{ id: number; name: string }[]>([]);
  const [authorsFromDb, setAuthorsFromDb] = useState<string[]>([]);
  const [tagsFromDb, setTagsFromDb] = useState<string[]>([]);
  const [figuresFromDb, setFiguresFromDb] = useState<string[]>([]);
  const [newLevelName, setNewLevelName] = useState('');
  const [showAddLevel, setShowAddLevel] = useState(false);
  const [levelError, setLevelError] = useState<string | null>(null);

  useEffect(() => {
    loadReferenceData();
  }, []);

  const loadReferenceData = async () => {
    try {
      const [fetchedLevels, fetchedAuthors, fetchedTags, fetchedFigures] = await Promise.all([
        getLevels(),
        getAuthors(),
        getTags(),
        getStepFigures(),
      ]);

      setLevels(fetchedLevels);
      setAuthorsFromDb(fetchedAuthors);
      setTagsFromDb(fetchedTags);
      setFiguresFromDb(fetchedFigures);

      // Set default level if not set
      if (!formData.level && fetchedLevels.length > 0) {
        setFormData(prev => ({ ...prev, level: fetchedLevels[0].name }));
      }
    } catch (error) {
      console.error('Error loading reference data:', error);
    }
  };

  const handleAddLevel = async () => {
    if (!newLevelName.trim()) {
      setLevelError('Level name cannot be empty');
      return;
    }

    try {
      setLevelError(null);
      const newLevel = await apiAddLevel(newLevelName.trim());
      setLevels([...levels, newLevel]);
      setNewLevelName('');
      setShowAddLevel(false);
      // Automatically select the new level
      setFormData(prev => ({ ...prev, level: newLevel.name }));
    } catch (error) {
      setLevelError(error instanceof Error ? error.message : 'Failed to add level');
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const isChecked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        [name]: isChecked,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: name === 'count' || name === 'wall_count' || name === 'creation_year' 
          ? value ? parseInt(value) : undefined
          : value,
      }));
    }
  };

  const addAuthor = (authorValue?: string) => {
    const author = (authorValue ?? currentAuthor).trim();
    if (author && !formData.authors.includes(author)) {
      setFormData(prev => ({
        ...prev,
        authors: [...prev.authors, author],
      }));
    }
    setCurrentAuthor('');
  };

  const addTag = (tagValue?: string) => {
    const tag = (tagValue ?? currentTag).trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag],
      }));
    }
    setCurrentTag('');
  };

  const addFigure = (figureValue?: string) => {
    const figure = (figureValue ?? currentFigure).trim();
    if (figure && !formData.step_figures.includes(figure)) {
      setFormData(prev => ({
        ...prev,
        step_figures: [...prev.step_figures, figure],
      }));
    }
    setCurrentFigure('');
  };

  const removeAuthor = (index: number) => {
    setFormData(prev => ({
      ...prev,
      authors: prev.authors.filter((_, i) => i !== index),
    }));
  };

  const removeTag = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index),
    }));
  };

  const removeFigure = (index: number) => {
    setFormData(prev => ({
      ...prev,
      step_figures: prev.step_figures.filter((_, i) => i !== index),
    }));
  };

  const isDatalistSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputType = (e.nativeEvent as InputEvent).inputType;
    return inputType === 'insertReplacementText' || inputType === 'insertFromDrop';
  };

  const handleAuthorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCurrentAuthor(value);

    if (
      value.trim() &&
      authorsFromDb.includes(value.trim()) &&
      !formData.authors.includes(value.trim()) &&
      isDatalistSelection(e)
    ) {
      addAuthor(value.trim());
    }
  };

  const handleFigureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCurrentFigure(value);

    if (
      value.trim() &&
      figuresFromDb.includes(value.trim()) &&
      !formData.step_figures.includes(value.trim()) &&
      isDatalistSelection(e)
    ) {
      addFigure(value.trim());
    }
  };

  const handleTagChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCurrentTag(value);

    if (
      value.trim() &&
      tagsFromDb.includes(value.trim()) &&
      !formData.tags.includes(value.trim()) &&
      isDatalistSelection(e)
    ) {
      addTag(value.trim());
    }
  };

  const handleAuthorBlur = () => {
    const normalized = currentAuthor.trim();
    if (normalized && authorsFromDb.includes(normalized) && !formData.authors.includes(normalized)) {
      addAuthor(normalized);
    }
  };

  const handleFigureBlur = () => {
    const normalized = currentFigure.trim();
    if (normalized && figuresFromDb.includes(normalized) && !formData.step_figures.includes(normalized)) {
      addFigure(normalized);
    }
  };

  const handleTagBlur = () => {
    const normalized = currentTag.trim();
    if (normalized && tagsFromDb.includes(normalized) && !formData.tags.includes(normalized)) {
      addTag(normalized);
    }
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
          <div className="level-group">
            <select id="level" name="level" value={formData.level} onChange={handleChange} required>
              <option value="">Select a level</option>
              {levels.map(level => (
                <option key={level.id} value={level.name}>
                  {level.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowAddLevel(!showAddLevel)}
              className="btn-small btn-secondary"
              title="Add new level"
            >
              +
            </button>
          </div>
          {showAddLevel && (
            <div className="add-level-form">
              <input
                type="text"
                value={newLevelName}
                onChange={e => {
                  setNewLevelName(e.target.value);
                  setLevelError(null);
                }}
                onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), handleAddLevel())}
                placeholder="New level name"
                className="input-new-level"
              />
              <button
                type="button"
                onClick={handleAddLevel}
                className="btn-small btn-add"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddLevel(false);
                  setNewLevelName('');
                  setLevelError(null);
                }}
                className="btn-small btn-secondary"
              >
                Cancel
              </button>
              {levelError && <span className="error-text">{levelError}</span>}
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="isPhrased">
            <input
              type="checkbox"
              id="isPhrased"
              name="isPhrased"
              checked={formData.isPhrased || false}
              onChange={handleChange}
            />
            Is Phrased
          </label>
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

        <div className="form-group">
          <label htmlFor="demo_video_url">Demo Video URL</label>
          <input
            type="url"
            id="demo_video_url"
            name="demo_video_url"
            value={formData.demo_video_url || ''}
            onChange={handleChange}
            placeholder="https://youtube.com/..."
          />
        </div>

        <div className="form-group">
          <label htmlFor="tutorial_video_url">Tutorial Video URL</label>
          <input
            type="url"
            id="tutorial_video_url"
            name="tutorial_video_url"
            value={formData.tutorial_video_url || ''}
            onChange={handleChange}
            placeholder="https://youtube.com/..."
          />
        </div>

        <div className="form-group">
          <label htmlFor="tag_information">Tag Information</label>
          <textarea
            id="tag_information"
            name="tag_information"
            value={formData.tag_information || ''}
            onChange={handleChange}
            placeholder="Additional information about tags used in this choreography"
          />
        </div>

        <div className="form-group">
          <label htmlFor="restart_information">Restart Information</label>
          <textarea
            id="restart_information"
            name="restart_information"
            value={formData.restart_information || ''}
            onChange={handleChange}
            placeholder="Instructions for restarting or resetting the choreography"
          />
        </div>
      </div>

      <div className="form-section">
        <h3>Authors</h3>
        <div className="form-group">
          <input
            type="text"
            value={currentAuthor}
            onChange={handleAuthorChange}
            onBlur={handleAuthorBlur}
            onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addAuthor())}
            placeholder={currentAuthor ? '' : 'Author name'}
            list="authors-list"
          />
          <datalist id="authors-list">
            {authorsFromDb.map((author, index) => (
              <option key={index} value={author} />
            ))}
          </datalist>
          <button type="button" onClick={() => addAuthor()} className="btn-add">
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
            onChange={handleFigureChange}
            onBlur={handleFigureBlur}
            onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addFigure())}
            placeholder={currentFigure ? '' : 'Step figure name (e.g., Vine, Shuffle, Grapevine)'}
            list="figures-list"
          />
          <datalist id="figures-list">
            {figuresFromDb.map((figure, index) => (
              <option key={index} value={figure} />
            ))}
          </datalist>
          <button type="button" onClick={() => addFigure()} className="btn-add">
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
            onChange={handleTagChange}
            onBlur={handleTagBlur}
            onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
            placeholder={currentTag ? '' : 'Tag (e.g., Country, Western, Urban)'}
            list="tags-list"
          />
          <datalist id="tags-list">
            {tagsFromDb.map((tag, index) => (
              <option key={index} value={tag} />
            ))}
          </datalist>
          <button type="button" onClick={() => addTag()} className="btn-add">
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
