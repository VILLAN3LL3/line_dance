import "../../styles/ChoreographyDetail.css";

import React, { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { checkChoreographyDuplicates, deleteChoreography, fetchChoreography, updateChoreography } from "../../api";
import { Choreography, ChoreographyFormData, DuplicateChoreography } from "../../types";
import { BackButton, confirmAction, EmptyState, ErrorMessage, LoadingState } from "../shared/ui";
import { ChoreographyCard } from "./ChoreographyCard";
import { ChoreographyForm } from "./ChoreographyForm";
import { DuplicateChoreographyWarning } from "./DuplicateChoreographyWarning";

const ChoreographyDetail: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const choreographyId = Number(id);
  const isEditQueryMode = new URLSearchParams(location.search).get("edit") === "1";
  const hasValidChoreographyId = Number.isFinite(choreographyId);

  const [choreography, setChoreography] = useState<Choreography | null>(null);
  const [view, setView] = useState<"view" | "edit">(() => {
    const state = location.state as { editMode?: boolean } | null;
    return state?.editMode || isEditQueryMode ? "edit" : "view";
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateChoreography[]>([]);
  const [pendingFormData, setPendingFormData] = useState<ChoreographyFormData | null>(null);

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
    if (!hasValidChoreographyId) {
      return;
    }

    queueMicrotask(() => {
      void loadChoreography();
    });
  }, [hasValidChoreographyId, loadChoreography]);

  useEffect(() => {
    // Clear location state after using it
    if (location.state?.editMode) {
      globalThis.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleEdit = () => {
    setView("edit");
  };

  const handleDelete = async () => {
    if (!confirmAction("Are you sure you want to delete this choreography?")) {
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

  const doUpdate = async (data: ChoreographyFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      await updateChoreography(choreographyId, data);
      await loadChoreography();
      setView("view");
    } catch (err) {
      setError("Failed to update choreography");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (data: ChoreographyFormData) => {
    setIsLoading(true);
    setError(null);
    setDuplicates([]);
    try {
      const found = await checkChoreographyDuplicates(data.name, data.level, data.authors, choreographyId);
      if (found.length > 0) {
        setDuplicates(found);
        setPendingFormData(data);
        setIsLoading(false);
        return;
      }
      await doUpdate(data);
    } catch (err) {
      setError("Failed to update choreography");
      console.error(err);
      setIsLoading(false);
    }
  };

  const handleConfirmUpdate = async () => {
    if (pendingFormData) {
      setDuplicates([]);
      await doUpdate(pendingFormData);
      setPendingFormData(null);
    }
  };

  const handleCancelDuplicate = () => {
    setDuplicates([]);
    setPendingFormData(null);
  };

  if (isLoading && !choreography) {
    return <LoadingState />;
  }

  if (!hasValidChoreographyId) {
    return <ErrorMessage message="Invalid choreography ID" />;
  }

  if (error && !choreography) {
    return <ErrorMessage message={error} />;
  }

  if (!choreography) {
    return <EmptyState>Choreography not found</EmptyState>;
  }

  return (
    <div className="choreography-detail">
      {!isEditQueryMode && <BackButton onClick={() => navigate(-1)} />}

      {error && <ErrorMessage message={error} />}

      {view === "view" ? (
        <ChoreographyCard
          choreography={choreography}
          onEdit={handleEdit}
          onDelete={handleDelete}
          videoEmbedMode="all"
        />
      ) : (
        <>
          {duplicates.length > 0 && (
            <DuplicateChoreographyWarning
              duplicates={duplicates}
              onConfirm={handleConfirmUpdate}
              onCancel={handleCancelDuplicate}
            />
          )}
          <ChoreographyForm
            initialData={choreography}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            onCancel={() => { setDuplicates([]); setPendingFormData(null); setView("view"); }}
          />
        </>
      )}
    </div>
  );
};

export default ChoreographyDetail;
