import "../../../../styles/ChoreographyForm.css";

import React from "react";

import { ActionButton, ActionGroup } from "../../../../shared/ui";
import type { ChoreographyFormViewModel } from "../../viewmodels/useChoreographyFormViewModel";
import { FORM_TABS, type ListField } from "../../model/choreography-form";
import { ChoreographyLevelBadge } from "../ChoreographyLevelBadge";
import { AdditionalInformationTab } from "./ChoreographyFormAdditionalInformationTab";
import { SongsTab } from "./ChoreographyFormSongsTab";
import {
  BasicInformationTab,
  ChoreographersTab,
  HashTagsTab,
  LinksTab,
  StepFiguresTab,
} from "./ChoreographyFormTabs";

interface ChoreographyFormProps {
  title?: string;
  viewModel: ChoreographyFormViewModel;
  isLoading?: boolean;
  onCancel?: () => void;
}

type FieldChangeEvent = React.ChangeEvent<
  HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
>;

export const ChoreographyForm: React.FC<ChoreographyFormProps> = ({
  title,
  viewModel,
  isLoading = false,
  onCancel,
}) => {
  const { state, actions } = viewModel;
  const { formData, activeTab, fieldErrors, isValidating } = state;

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    void actions.submit();
  };

  const handleFieldChange = (e: FieldChangeEvent) => {
    const { name, value, type } = e.target;
    const checked = type === "checkbox" ? (e.target as HTMLInputElement).checked : undefined;
    actions.changeField(name, value, checked);
  };

  const listFieldProps = (field: ListField) => ({
    inputValue: state.inputs[field],
    options: state.options[field],
    selectedValues: formData[field],
    onInputChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      actions.changeListInput(field, e.target.value, (e.nativeEvent as InputEvent).inputType),
    onInputBlur: () => actions.blurListInput(field),
    onAdd: () => actions.addItem(field),
    onRemove: (value: string) => actions.removeItem(field, value),
  });

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const nextIndex = actions.selectTabByKey(event.key, index);
    if (nextIndex === null) return;

    event.preventDefault();
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      .item(nextIndex)
      .focus();
  };

  const contextTitle = formData.name.trim() || title;

  return (
    <form className="choreography-form" onSubmit={handleSubmit} noValidate>
      {(contextTitle || formData.level.trim()) && (
        <div className="choreography-form-context">
          {contextTitle && <h2>{contextTitle}</h2>}
          {formData.level.trim() && (
            <ChoreographyLevelBadge
              choreography={{
                level: formData.personal_level || formData.level,
                official_level: formData.level,
                personal_level: formData.personal_level || null,
              }}
            />
          )}
        </div>
      )}
      <div
        className="choreography-form-tabs"
        role="tablist"
        aria-label="Choreography form sections"
      >
        {FORM_TABS.map((tab, index) => {
          const hasError = state.tabErrors[tab.id];
          return (
            <button
              key={tab.id}
              id={`choreography-form-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls="choreography-form-panel"
              aria-label={hasError ? `${tab.label}, validation errors` : undefined}
              title={hasError ? `${tab.label} contains validation errors` : undefined}
              tabIndex={activeTab === tab.id ? 0 : -1}
              className={
                activeTab === tab.id ? "choreography-form-tab is-active" : "choreography-form-tab"
              }
              onClick={() => actions.selectTab(tab.id)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
            >
              {tab.label}
              {hasError && <span aria-hidden="true">⚠️</span>}
            </button>
          );
        })}
      </div>

      <div
        id="choreography-form-panel"
        className="choreography-form-tab-panel"
        role="tabpanel"
        aria-labelledby={`choreography-form-tab-${activeTab}`}
        tabIndex={0}
      >
        {activeTab === "basic-information" && (
          <BasicInformationTab
            formData={formData}
            levels={state.levels}
            errors={fieldErrors}
            onChange={handleFieldChange}
          />
        )}

        {activeTab === "choreographers" && <ChoreographersTab {...listFieldProps("authors")} />}

        {activeTab === "links" && (
          <LinksTab
            formData={formData}
            errors={fieldErrors}
            urlChecks={state.urlChecks}
            onChange={handleFieldChange}
          />
        )}

        {activeTab === "songs" && (
          <SongsTab
            songs={formData.choreography_songs ?? []}
            errors={fieldErrors}
            onChange={actions.changeSong}
            onFavorite={actions.chooseFavoriteSong}
            onRemove={actions.removeSong}
          />
        )}

        {activeTab === "step-figures" && <StepFiguresTab {...listFieldProps("step_figures")} />}

        {activeTab === "additional-information" && (
          <AdditionalInformationTab
            information={formData.choreography_information || []}
            categories={state.informationCategories}
            customCategoryRowIds={state.customCategoryRowIds}
            errors={fieldErrors}
            onCategoryChange={(index, value) => actions.changeInformation(index, "category", value)}
            onDescriptionChange={(index, value) =>
              actions.changeInformation(index, "description", value)
            }
            onCustomCategoryModeChange={actions.setCustomCategoryMode}
            onRemove={actions.removeInformation}
          />
        )}

        {activeTab === "hash-tags" && <HashTagsTab {...listFieldProps("tags")} />}
      </div>

      {state.validationError && (
        <p role="alert" className="form-field-error">
          {state.validationError}
        </p>
      )}
      <ActionGroup className="form-actions">
        <ActionButton type="submit" variant="primary" disabled={isLoading || isValidating}>
          {isLoading || isValidating ? "Saving..." : "Save Choreography"}
        </ActionButton>
        {onCancel && (
          <ActionButton type="button" onClick={onCancel} variant="edit" className="btn-small">
            Cancel
          </ActionButton>
        )}
      </ActionGroup>
    </form>
  );
};
