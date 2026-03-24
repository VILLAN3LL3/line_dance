import "../styles/App.css";

import React, { useEffect, useState } from "react";

import { createChoreography, deleteChoreography, fetchChoreographies, searchChoreographies, updateChoreography } from "../api";
import { Choreography, PaginatedResponse } from "../types";
import { ChoreographyCard } from "./ChoreographyCard";
import { ChoreographyForm } from "./ChoreographyForm";
import { SearchBar } from "./SearchBar";

type View = 'list' | 'create' | 'edit' | 'detail';

export const App: React.FC = () => {
  const [view, setView] = useState<View>('list');
  const [choreographies, setChoreographies] = useState<Choreography[]>([]);
  const [selectedChoreography, setSelectedChoreography] = useState<Choreography | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [currentFilters, setCurrentFilters] = useState({});

  // Load choreographies on mount and when filters change
  useEffect(() => {
    loadChoreographies();
  }, []);

  const loadChoreographies = async (filters = {}, page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      let result: PaginatedResponse<Choreography>;
      
      if (Object.keys(filters).length > 0) {
        result = await searchChoreographies({ ...filters, page, limit: 20 });
      } else {
        result = await fetchChoreographies(page, 20);
      }
      
      setChoreographies(result.data);
      setPagination(result.pagination);
      setCurrentFilters(filters);
    } catch (err) {
      setError('Failed to load choreographies');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (filters: any) => {
    await loadChoreographies(filters, 1);
  };

  const handleCreate = async (formData: any) => {
    setIsLoading(true);
    try {
      await createChoreography(formData);
      setView('list');
      await loadChoreographies(currentFilters);
    } catch (err) {
      setError('Failed to create choreography');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (id: number) => {
    const choreo = choreographies.find(c => c.id === id);
    if (choreo) {
      setSelectedChoreography(choreo);
      setView('edit');
    }
  };

  const handleUpdate = async (formData: any) => {
    if (!selectedChoreography) return;
    setIsLoading(true);
    try {
      await updateChoreography(selectedChoreography.id, formData);
      setView('list');
      await loadChoreographies(currentFilters);
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
      await loadChoreographies(currentFilters);
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

  return (
    <div className="app">
      <header className="app-header">
        <h1>Line Dance Choreography Search</h1>
        <button
          onClick={() => setView('create')}
          className="btn-primary"
          disabled={isLoading || view !== 'list'}
        >
          + Add New Choreography
        </button>
      </header>

      {error && <div className="error-message">{error}</div>}

      {view === 'list' && (
        <div className="list-view">
          <SearchBar onSearch={handleSearch} isLoading={isLoading} />
          
          {isLoading ? (
            <div className="loading">Loading choreographies...</div>
          ) : choreographies.length === 0 ? (
            <div className="empty-state">
              <p>No choreographies found. Start by adding one!</p>
            </div>
          ) : (
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
                    onClick={() => loadChoreographies(currentFilters, pagination.page - 1)}
                  >
                    Previous
                  </button>
                  <span>
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    disabled={pagination.page === pagination.totalPages || isLoading}
                    onClick={() => loadChoreographies(currentFilters, pagination.page + 1)}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
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
              isPhrased: selectedChoreography.isPhrased,
              authors: selectedChoreography.authors,
              tags: selectedChoreography.tags,
              step_figures: selectedChoreography.step_figures,
            }}
            onSubmit={handleUpdate}
            isLoading={isLoading}
            onCancel={() => setView('list')}
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
