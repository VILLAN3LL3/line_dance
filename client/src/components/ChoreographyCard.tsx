import "../styles/ChoreographyCard.css";

import React from "react";

import { Choreography } from "../types";

interface ChoreographyCardProps {
  choreography: Choreography;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  onSelect?: (id: number) => void;
}

export const ChoreographyCard: React.FC<ChoreographyCardProps> = ({
  choreography,
  onEdit,
  onDelete,
  onSelect,
}) => {
  return (
    <button
      className="choreography-card"
      onClick={() => onSelect?.(choreography.id)}
      >
      <div className="card-header">
        <h3>{choreography.name}</h3>
        <span className={`level-badge level-${choreography.level.toLowerCase()}`}>
          {choreography.level}
        </span>
      </div>

      <div className="card-content">
        {choreography.count && <p><strong>Count:</strong> {choreography.count}</p>}
        {choreography.wall_count && <p><strong>Wall:</strong> {choreography.wall_count}</p>}
        {choreography.creation_year && <p><strong>Year:</strong> {choreography.creation_year}</p>}

        {choreography.authors.length > 0 && (
          <div className="authors">
            <strong>Authors:</strong> {choreography.authors.join(', ')}
          </div>
        )}

        {choreography.step_figures.length > 0 && (
          <div className="step-figures">
            <strong>Step Figures:</strong>
            <div className="tag-list">
              {choreography.step_figures.map((figure) => (
                <span key={figure} className="tag-small">
                  {figure}
                </span>
              ))}
              {choreography.restart_information && <span className="info-badge" title="Has restart information">Restart 🔁</span>}
              {choreography.tag_information && <span className="info-badge" title="Has tag information">Tag 🌉</span>}
            </div>
          </div>
        )}

        {choreography.tags.length > 0 && (
          <div className="tags">
            <strong>Tags:</strong>
            <div className="tag-list">
              {choreography.tags.map((tag) => (
                <span key={tag} className="tag-small">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {choreography.step_sheet_link && (
          <a href={choreography.step_sheet_link} target="_blank" rel="noopener noreferrer" className="step-sheet-link">
            🦶 View Step Sheet
          </a>
        )}

        {choreography.demo_video_url && (
          <a href={choreography.demo_video_url} target="_blank" rel="noopener noreferrer" className="step-sheet-link">
            🎬 Watch Demo
          </a>
        )}

        {choreography.tutorial_video_url && (
          <a href={choreography.tutorial_video_url} target="_blank" rel="noopener noreferrer" className="step-sheet-link">
            🎓 Watch Tutorial
          </a>
        )}
      </div>

      <div className="card-actions">
        {onEdit && (
          <button onClick={(e) => { e.stopPropagation(); onEdit(choreography.id); }} className="btn-small btn-edit">
            Edit
          </button>
        )}
        {onDelete && (
          <button onClick={(e) => { e.stopPropagation(); onDelete(choreography.id); }} className="btn-small btn-danger">
            Delete
          </button>
        )}
      </div>
    </button>
  );
};
