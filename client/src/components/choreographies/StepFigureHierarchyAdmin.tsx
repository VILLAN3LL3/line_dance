import "../../styles/StepFigureHierarchyAdmin.css";

import React, { useEffect, useMemo, useState } from "react";

import {
  createStepFigureDefinition,
  deleteStepFigureDefinition,
  getStepFigureHierarchy,
  updateStepFigureDefinition,
} from "../../api";
import { StepFigureDefinition } from "../../types";
import {
  ActionButton,
  ActionGroup,
  confirmAction,
  EmptyState,
  ErrorMessage,
  LoadingState,
  Section,
} from "../shared/ui";
import { ChoreographyFormListSection } from "./ChoreographyFormListSection";

const StepFigureHierarchyAdmin: React.FC = () => {
  const [stepFigures, setStepFigures] = useState<StepFigureDefinition[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [newName, setNewName] = useState("");
  const [newComponentInput, setNewComponentInput] = useState("");
  const [newComponentIds, setNewComponentIds] = useState<number[]>([]);

  const [editName, setEditName] = useState("");
  const [editComponentInput, setEditComponentInput] = useState("");
  const [editComponentIds, setEditComponentIds] = useState<number[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedFigure = stepFigures.find((figure) => figure.id === selectedId) || null;
  const isInitialLoading = isLoading && stepFigures.length === 0;
  const figureIdByName = useMemo(
    () => new Map(stepFigures.map((figure) => [figure.name, figure.id])),
    [stepFigures],
  );
  const figureNameById = useMemo(
    () => new Map(stepFigures.map((figure) => [figure.id, figure.name])),
    [stepFigures],
  );
  const catalogStepFigures = useMemo(
    () =>
      [...stepFigures].sort((left, right) => {
        if (left.used_by_choreography_count !== right.used_by_choreography_count) {
          return right.used_by_choreography_count - left.used_by_choreography_count;
        }

        return left.name.localeCompare(right.name);
      }),
    [stepFigures],
  );
  const createComponentOptions = useMemo(
    () =>
      catalogStepFigures
        .filter((figure) => !newComponentIds.includes(figure.id))
        .map((figure) => figure.name),
    [catalogStepFigures, newComponentIds],
  );
  const editComponentOptions = useMemo(() => {
    if (!selectedFigure) {
      return [];
    }

    return catalogStepFigures
      .filter((figure) => figure.id !== selectedFigure.id && !editComponentIds.includes(figure.id))
      .map((figure) => figure.name);
  }, [catalogStepFigures, editComponentIds, selectedFigure]);

  useEffect(() => {
    void loadStepFigures();
  }, []);

  useEffect(() => {
    if (!selectedFigure) {
      setEditName("");
      setEditComponentInput("");
      setEditComponentIds([]);
      return;
    }

    setEditName(selectedFigure.name);
    setEditComponentInput("");
    setEditComponentIds(selectedFigure.components.map((component) => component.id));
  }, [selectedFigure]);

  const loadStepFigures = async (preferredId?: number | null) => {
    setIsLoading(true);
    setError(null);

    try {
      const figures = await getStepFigureHierarchy();
      setStepFigures(figures);

      if (figures.length === 0) {
        setSelectedId(null);
        return;
      }

      const requestedId = preferredId ?? selectedId;
      const nextSelected =
        requestedId !== null && requestedId !== undefined
          ? figures.find((figure) => figure.id === requestedId)?.id
          : undefined;

      setSelectedId(nextSelected ?? figures[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load step figures");
    } finally {
      setIsLoading(false);
    }
  };

  const addCreateComponentFromInput = () => {
    const componentName = newComponentInput.trim();
    const componentId = figureIdByName.get(componentName);

    if (!componentId) {
      setNewComponentInput("");
      return;
    }

    setNewComponentIds((ids) => (ids.includes(componentId) ? ids : [...ids, componentId]));
    setNewComponentInput("");
  };

  const addEditComponentFromInput = () => {
    if (!selectedFigure) {
      return;
    }

    const componentName = editComponentInput.trim();
    const componentId = figureIdByName.get(componentName);

    if (!componentId || componentId === selectedFigure.id) {
      setEditComponentInput("");
      return;
    }

    setEditComponentIds((ids) => (ids.includes(componentId) ? ids : [...ids, componentId]));
    setEditComponentInput("");
  };

  const removeCreateComponent = (componentName: string) => {
    const componentId = figureIdByName.get(componentName);
    if (!componentId) {
      return;
    }
    setNewComponentIds((ids) => ids.filter((id) => id !== componentId));
  };

  const removeEditComponent = (componentName: string) => {
    const componentId = figureIdByName.get(componentName);
    if (!componentId) {
      return;
    }
    setEditComponentIds((ids) => ids.filter((id) => id !== componentId));
  };

  const handleCreateComponentInputBlur = () => {
    if (createComponentOptions.includes(newComponentInput.trim())) {
      addCreateComponentFromInput();
    }
  };

  const handleEditComponentInputBlur = () => {
    if (editComponentOptions.includes(editComponentInput.trim())) {
      addEditComponentFromInput();
    }
  };

  const handleCreate = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!newName.trim()) {
      setError("Step figure name is required");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const created = await createStepFigureDefinition({
        name: newName.trim(),
        component_ids: newComponentIds,
      });
      setNewName("");
      setNewComponentInput("");
      setNewComponentIds([]);
      await loadStepFigures(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create step figure");
      setIsLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedFigure) {
      return;
    }

    if (!editName.trim()) {
      setError("Step figure name is required");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await updateStepFigureDefinition(selectedFigure.id, {
        name: editName.trim(),
        component_ids: editComponentIds,
      });
      await loadStepFigures(selectedFigure.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update step figure");
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedFigure) {
      return;
    }

    if (!confirmAction(`Delete step figure "${selectedFigure.name}"?`)) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await deleteStepFigureDefinition(selectedFigure.id);
      await loadStepFigures(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete step figure");
      setIsLoading(false);
    }
  };

  let catalogContent = <EmptyState>No step figures configured yet</EmptyState>;

  if (isInitialLoading) {
    catalogContent = <LoadingState message="Loading step figures..." />;
  } else if (stepFigures.length > 0) {
    catalogContent = (
      <div className="step-figure-admin__list">
        {catalogStepFigures.map((figure) => (
          <button
            type="button"
            key={figure.id}
            className={`step-figure-admin__list-item ${selectedId === figure.id ? "active" : ""}`}
            onClick={() => setSelectedId(figure.id)}
          >
            <div>
              <strong>{figure.name}</strong>
              <p>
                {figure.components.length} components, {figure.parents.length} parents
              </p>
            </div>
            <span>{figure.used_by_choreography_count} choreographies</span>
          </button>
        ))}
      </div>
    );
  }

  let editorContent = <EmptyState>Select a step figure to edit its hierarchy</EmptyState>;

  if (selectedFigure) {
    editorContent = (
      <div className="step-figure-admin__editor">
        <label className="step-figure-admin__field">
          <span>Name</span>
          <input
            type="text"
            value={editName}
            onChange={(event) => setEditName(event.target.value)}
            disabled={isLoading}
          />
        </label>

        <div className="step-figure-admin__field">
          <ChoreographyFormListSection
            title="Components"
            listId="edit-component-figures-list"
            inputValue={editComponentInput}
            options={editComponentOptions}
            selectedValues={editComponentIds
              .map((componentId) => figureNameById.get(componentId))
              .filter((name): name is string => Boolean(name))}
            placeholder="Add component step figure"
            addButtonLabel="Add Component"
            onInputChange={(event) => setEditComponentInput(event.target.value)}
            onInputBlur={handleEditComponentInputBlur}
            onAdd={addEditComponentFromInput}
            onRemove={removeEditComponent}
          />
        </div>

        <div className="step-figure-admin__meta">
          <div>
            <h4>Parents</h4>
            {selectedFigure.parents.length === 0 ? (
              <p>None</p>
            ) : (
              <ul>
                {selectedFigure.parents.map((parent) => (
                  <li key={parent.id}>{parent.name}</li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h4>Usage</h4>
            <p>{selectedFigure.used_by_choreography_count} choreographies</p>
          </div>
        </div>

        <ActionGroup className="step-figure-admin__actions">
          <ActionButton variant="primary" onClick={handleUpdate} disabled={isLoading}>
            Save Changes
          </ActionButton>
          <ActionButton variant="delete" onClick={handleDelete} disabled={isLoading}>
            Delete Step Figure
          </ActionButton>
        </ActionGroup>
      </div>
    );
  }

  return (
    <div className="step-figure-admin">
      <header className="step-figure-admin__header">
        <h2>Step Figure Hierarchy</h2>
        <p>
          Configure composite step figures by combining reusable base figures into named sequences.
        </p>
      </header>

      {error && <ErrorMessage message={error} />}

      <Section title="Add Step Figure" className="step-figure-admin__section">
        <form className="step-figure-admin__form" onSubmit={handleCreate}>
          <label className="step-figure-admin__field">
            <span>Name</span>
            <input
              type="text"
              placeholder="e.g. Weave Combination"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              disabled={isLoading}
            />
          </label>

          <div className="step-figure-admin__field">
            {stepFigures.length === 0 ? (
              <EmptyState>Create a base step figure first</EmptyState>
            ) : (
              <ChoreographyFormListSection
                title="Components"
                listId="create-component-figures-list"
                inputValue={newComponentInput}
                options={createComponentOptions}
                selectedValues={newComponentIds
                  .map((componentId) => figureNameById.get(componentId))
                  .filter((name): name is string => Boolean(name))}
                placeholder="Add component step figure"
                addButtonLabel="Add Component"
                onInputChange={(event) => setNewComponentInput(event.target.value)}
                onInputBlur={handleCreateComponentInputBlur}
                onAdd={addCreateComponentFromInput}
                onRemove={removeCreateComponent}
              />
            )}
          </div>

          <ActionButton type="submit" variant="primary" disabled={isLoading}>
            Create Step Figure
          </ActionButton>
        </form>
      </Section>

      <div className="step-figure-admin__layout">
        <Section title="Catalog" className="step-figure-admin__section">
          {catalogContent}
        </Section>

        <Section title="Edit Selection" className="step-figure-admin__section">
          {editorContent}
        </Section>
      </div>
    </div>
  );
};

export default StepFigureHierarchyAdmin;