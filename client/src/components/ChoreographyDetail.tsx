import "../styles/ChoreographyDetail.css";

import React, { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { deleteChoreography, fetchChoreography, updateChoreography } from "../api";
import { Choreography, ChoreographyFormData } from "../types";
import { ChoreographyCard } from "./ChoreographyCard";
import { ChoreographyForm } from "./ChoreographyForm";

const ChoreographyDetail: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const choreographyId = Number(id);

  const [choreography, setChoreography] = useState<Choreography | null>(null);
  const [view, setView] = useState<'view' | 'edit'>('view');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadChoreography = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchChoreography(choreographyId);
      setChoreography(data);
    } catch (err) {
      setError("Failed to load choreography");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [choreographyId]);

  useEffect(() => {
    if (!Number.isFinite(choreographyId)) {
      setError("Invalid choreography ID");
      return;
    }

    // Check if we should start in edit mode
    const state = location.state as { editMode?: boolean } | null;
    if (state?.editMode) {
      setView('edit');
    }

    void loadChoreography();
  }, [choreographyId, location.state, loadChoreography]);

  useEffect(() => {
    // Clear location state after using it
    if (location.state?.editMode) {
      globalThis.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleEdit = () => {
    setView('edit');
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this choreography?")) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await deleteChoreography(choreographyId);
      navigate("/");
    } catch (err) {
      setError("Failed to delete choreography");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (data: ChoreographyFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      await updateChoreography(choreographyId, data);
      await loadChoreography();
      setView('view');
    } catch (err) {
      setError("Failed to update choreography");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !choreography) {
    return <div className="loading">Loading...</div>;
  }

  if (error && !choreography) {
    return <div className="error-message">{error}</div>;
  }

  if (!choreography) {
    return <div className="error-message">Choreography not found</div>;
  }

  return (
    <div className="choreography-detail">
      <button onClick={() => navigate(-1)} className="btn-back">
        ← Back
      </button>

      {error && <div className="error-message">{error}</div>}

      {view === 'view' ? (
        <ChoreographyCard
          choreography={choreography}
          onEdit={handleEdit}
          onDelete={handleDelete}
          videoEmbedMode="all"
        />
      ) : (
        <ChoreographyForm
          initialData={choreography}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          onCancel={() => setView('view')}
        />
      )}
    </div>
  );
};

export default ChoreographyDetail;
