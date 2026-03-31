import "../styles/App.css";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { createChoreography, deleteChoreography, searchChoreographies, updateChoreography } from "../api";
import { Choreography, ChoreographyFormData, SearchFilters } from "../types";
import { ChoreographyCard } from "./ChoreographyCard";
import { ChoreographyForm } from "./ChoreographyForm";
import { ChoreographyTable } from "./ChoreographyTable";
import { SearchBar } from "./SearchBar";

type View = 'list' | 'create' | 'edit' | 'detail';

export const App: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const routeInitialFilters = (location.state as { initialFilters?: SearchFilters } | null)?.initialFilters;

  // Initialize display mode from localStorage
  const getInitialDisplayMode = () => {
    const saved = localStorage.getItem('displayMode');
    return (saved === 'card' || saved === 'table') ? saved : 'card';
  };

  // Initialize filters from location state or localStorage
  const getInitialFilters = useCallback((): SearchFilters => {
    // Check if we have initial filters from location state
    if (routeInitialFilters) {
      return routeInitialFilters;
    }

    // Otherwise use localStorage
    const saved = localStorage.getItem('currentFilters');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (error) {
        console.error('Error parsing saved filters:', error);
      }
    }
    return {};
  }, [routeInitialFilters]);

  const [view, setView] = useState<View>('list');
  const [displayMode, setDisplayMode] = useState<'card' | 'table'>(getInitialDisplayMode);
  const [choreographies, setChoreographies] = useState<Choreography[]>([]);
  const [selectedChoreography, setSelectedChoreography] = useState<Choreography | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [currentFilters, setCurrentFilters] = useState(getInitialFilters);
  const lastInitialLoadSignatureRef = useRef<string | null>(null);

  // Load choreographies on mount or when location changes
  useEffect(() => {
    const initialFilters = getInitialFilters();
    const loadSignature = JSON.stringify(initialFilters);

    if (lastInitialLoadSignatureRef.current === loadSignature) {
      return;
    }

    lastInitialLoadSignatureRef.current = loadSignature;
    setCurrentFilters(initialFilters);
    loadChoreographies(initialFilters, true);
    
    // Clear location state after using it
    if (routeInitialFilters) {
      globalThis.history.replaceState({}, document.title);
    }
  }, [getInitialFilters, routeInitialFilters, location.key]);

  // Save display mode to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('displayMode', displayMode);
  }, [displayMode]);

  // Save filters to localStorage when they change
  useEffect(() => {
    localStorage.setItem('currentFilters', JSON.stringify(currentFilters));
  }, [currentFilters]);

  const loadChoreographies = async (filters: SearchFilters = {}, isInitialLoad = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await searchChoreographies({ ...filters, page: 1, limit: 10000 });
      
      setChoreographies(result.data);
      setPagination({ page: 1, limit: result.data.length, total: result.data.length, totalPages: 1 });
      if (!isInitialLoad) {
        setCurrentFilters(filters);
      }
    } catch (err) {
      setError('Failed to load choreographies');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const returnToList = async (filters = currentFilters) => {
    setView('list');
    await loadChoreographies(filters);
  };

  const handleSearch = async (filters: SearchFilters) => {
    await loadChoreographies(filters);
  };

  const handleCreate = async (formData: ChoreographyFormData) => {
    setIsLoading(true);
    try {
      await createChoreography(formData);
      await returnToList();
    } catch (err) {
      setError('Failed to create choreography');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (id: number) => {
    navigate(`/choreographies/${id}`, { state: { editMode: true } });
  };

  const handleUpdate = async (formData: ChoreographyFormData) => {
    if (!selectedChoreography) return;
    setIsLoading(true);
    try {
      await updateChoreography(selectedChoreography.id, formData);
      await returnToList();
    } catch (err) {
      setError('Failed to update choreography');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this choreography?')) return;
    setIsLoading(true);
    try {
      await deleteChoreography(id);
      await returnToList();
    } catch (err) {
      setError('Failed to delete choreography');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectChoreography = (id: number) => {
    const choreo = choreographies.find(c => c.id === id);
    if (choreo) {
      setSelectedChoreography(choreo);
      setView('detail');
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return <div className="loading">Loading choreographies...</div>;
    }
    
    if (choreographies.length === 0) {
      return (
        <div className="empty-state">
          <p>No choreographies found. Start by adding one!</p>
        </div>
      );
    }
    
    if (displayMode === 'card') {
      return (
        <>
          <div className="choreographies-grid">
            {choreographies.map(choreo => (
              <ChoreographyCard
                key={choreo.id}
                choreography={choreo}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onSelect={handleSelectChoreography}
              />
            ))}
          </div>
          
          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button
                disabled={pagination.page === 1 || isLoading}
                onClick={() => loadChoreographies(currentFilters)}
              >
                Previous
              </button>
              <span>
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                disabled={pagination.page === pagination.totalPages || isLoading}
                onClick={() => loadChoreographies(currentFilters)}
              >
                Next
              </button>
            </div>
          )}
        </>
      );
    }
    
    return (
      <ChoreographyTable
        choreographies={choreographies}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onSelect={handleSelectChoreography}
        isLoading={isLoading}
      />
    );
  };

  return (
    <div className="app">
      <header className="app-header">
        <h2>Choreography Search</h2>
        <button
          onClick={() => setView('create')}
          disabled={isLoading || view !== 'list'}
        >
          + Add New Choreography
        </button>
      </header>

      {error && <div className="error-message">{error}</div>}

      {view === 'list' && (
        <div className="list-view">
          <SearchBar onSearch={handleSearch} filters={currentFilters} isLoading={isLoading} />
          
          <div className="view-toggle">
            <button
              className={`view-toggle-btn ${displayMode === 'card' ? 'active' : ''}`}
              onClick={() => setDisplayMode('card')}
              title="Card view"
            >
              📇 Cards
            </button>
            <button
              className={`view-toggle-btn ${displayMode === 'table' ? 'active' : ''}`}
              onClick={() => setDisplayMode('table')}
              title="Table view"
            >
              📊 Table
            </button>
          </div>
          
          {renderContent()}
        </div>
      )}

      {view === 'create' && (
        <div className="form-view">
          <h2>Add New Choreography</h2>
          <ChoreographyForm
            onSubmit={handleCreate}
            isLoading={isLoading}
            onCancel={() => setView('list')}
          />
        </div>
      )}

      {view === 'edit' && selectedChoreography && (
        <div className="form-view">
          <h2>Edit Choreography: {selectedChoreography.name}</h2>
          <ChoreographyForm
            initialData={{
              name: selectedChoreography.name,
              step_sheet_link: selectedChoreography.step_sheet_link,
              demo_video_url: selectedChoreography.demo_video_url,
              tutorial_video_url: selectedChoreography.tutorial_video_url,
              count: selectedChoreography.count,
              wall_count: selectedChoreography.wall_count,
              level: selectedChoreography.level,
              creation_year: selectedChoreography.creation_year,
              tag_information: selectedChoreography.tag_information,
              restart_information: selectedChoreography.restart_information,
              authors: selectedChoreography.authors,
              tags: selectedChoreography.tags,
              step_figures: selectedChoreography.step_figures,
            }}
            onSubmit={handleUpdate}
            isLoading={isLoading}
            onCancel={() => returnToList()}
          />
        </div>
      )}

      {view === 'detail' && selectedChoreography && (
        <div className="detail-view">
          <button onClick={() => setView('list')} className="btn-back">
            ← Back to List
          </button>
          <ChoreographyCard
            choreography={selectedChoreography}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      )}
    </div>
  );
};
