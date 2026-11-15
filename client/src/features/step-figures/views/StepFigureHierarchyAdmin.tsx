import "../../../styles/StepFigureHierarchyAdmin.css";

import React from "react";

import { ChoreographyFormListSection } from "../../choreographies";
import {
  ActionButton,
  ActionGroup,
  confirmAction,
  EmptyState,
  ErrorMessage,
  LoadingState,
  Section,
} from "../../../shared/ui";
import { useStepFigureHierarchyViewModel } from "../viewmodels/useStepFigureHierarchyViewModel";

const StepFigureHierarchyAdmin: React.FC = () => {
  const { state, actions } = useStepFigureHierarchyViewModel();
  const { selectedFigure, isBusy, newDraft, editDraft } = state;

  const handleCreate = (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    void actions.create();
  };

  const handleDelete = () => {
    if (!selectedFigure) return;
    if (!confirmAction(`Delete step figure "${selectedFigure.name}"?`)) return;
    void actions.remove();
  };

  let catalogContent = <EmptyState>No step figures configured yet</EmptyState>;

  if (state.isInitialLoading) {
    catalogContent = <LoadingState message="Loading step figures..." />;
  } else if (state.figures.length > 0) {
    catalogContent = (
      <div className="step-figure-admin__list">
        {state.catalog.map((figure) => (
          <button
            type="button"
            key={figure.id}
            className={`step-figure-admin__list-item ${selectedFigure?.id === figure.id ? "active" : ""}`}
            onClick={() => actions.selectFigure(figure.id)}
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
            value={editDraft.name}
            onChange={(event) => actions.changeEditName(event.target.value)}
            disabled={isBusy}
          />
        </label>

        <div className="step-figure-admin__field">
          <ChoreographyFormListSection
            title="Components"
            listId="edit-component-figures-list"
            inputValue={editDraft.componentInput}
            options={state.editComponentOptions}
            selectedValues={state.editComponentNames}
            placeholder="Add component step figure"
            addButtonLabel="Add Component"
            onInputChange={(event) => actions.changeEditComponentInput(event.target.value)}
            onInputBlur={actions.blurEditComponentInput}
            onAdd={actions.addEditComponent}
            onRemove={actions.removeEditComponent}
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
          <ActionButton variant="primary" onClick={actions.update} disabled={isBusy}>
            Save Changes
          </ActionButton>
          <ActionButton variant="delete" onClick={handleDelete} disabled={isBusy}>
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

      {state.error && <ErrorMessage message={state.error} />}

      <Section title="Add Step Figure" className="step-figure-admin__section">
        <form className="step-figure-admin__form" onSubmit={handleCreate}>
          <label className="step-figure-admin__field">
            <span>Name</span>
            <input
              type="text"
              placeholder="e.g. Weave Combination"
              value={newDraft.name}
              onChange={(event) => actions.changeNewName(event.target.value)}
              disabled={isBusy}
            />
          </label>

          <div className="step-figure-admin__field">
            {state.figures.length === 0 ? (
              <EmptyState>Create a base step figure first</EmptyState>
            ) : (
              <ChoreographyFormListSection
                title="Components"
                listId="create-component-figures-list"
                inputValue={newDraft.componentInput}
                options={state.newComponentOptions}
                selectedValues={state.newComponentNames}
                placeholder="Add component step figure"
                addButtonLabel="Add Component"
                onInputChange={(event) => actions.changeNewComponentInput(event.target.value)}
                onInputBlur={actions.blurNewComponentInput}
                onAdd={actions.addNewComponent}
                onRemove={actions.removeNewComponent}
              />
            )}
          </div>

          <ActionButton type="submit" variant="primary" disabled={isBusy}>
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
