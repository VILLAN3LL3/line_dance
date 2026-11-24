import { useCallback, useEffect, useRef, useState } from "react";

import { getFieldIssues } from "../../../shared/http/apiErrors";
import type { ChoreographyFormData } from "../../../types";
import {
  useAuthorsQuery,
  useGenresQuery,
  useInfoCategoriesQuery,
  useLevelsQuery,
  useStepFiguresQuery,
  useTagsQuery,
} from "../../metadata";
import { validateChoreography } from "../api";
import { useUrlCheck } from "../../url-check";
import {
  addListItem,
  applyFieldChange,
  clearFieldError,
  clearInformationRowErrors,
  createInitialFormData,
  FORM_TABS,
  getInformationRowId,
  getNextTabIndex,
  getTabErrors,
  isPendingKnownOption,
  mapFieldIssues,
  removeInformationRow,
  removeListItem,
  toSubmittedFormData,
  updateInformationRow,
  type FieldErrors,
  type FormTabId,
  type ListField,
} from "../model/choreography-form";
import {
  clearSongRowErrors,
  getSongRowId,
  removeSongRow,
  setFavoriteSong,
  updateSongRow,
  type SongField,
} from "../model/choreography-songs";
import { isDatalistInputType } from "../model/search-filters";

interface UseChoreographyFormViewModelOptions {
  initialData?: ChoreographyFormData;
  initialDataKey?: number;
  onSubmit: (data: ChoreographyFormData) => Promise<void>;
}

const NO_OPTIONS: string[] = [];
const FORM_CHANGED_MESSAGE = "The form changed during validation. Please save again.";

/** ViewModel for the choreography form: tabbed editing state, reference data and validate-then-save. */
export const useChoreographyFormViewModel = ({
  initialData,
  initialDataKey,
  onSubmit,
}: UseChoreographyFormViewModelOptions) => {
  const [formData, setFormData] = useState<ChoreographyFormData>(() =>
    createInitialFormData(initialData),
  );
  const [activeTab, setActiveTab] = useState<FormTabId>("basic-information");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [inputs, setInputs] = useState<Record<ListField, string>>({
    authors: "",
    tags: "",
    step_figures: "",
  });
  const [customCategoryRowIds, setCustomCategoryRowIds] = useState<Set<string>>(() => new Set());
  // Edits made while a validation request is in flight make its result stale.
  const editVersion = useRef(0);
  const initialDataKeyRef = useRef({
    key: initialDataKey,
    isLoaded: initialData !== undefined,
  });

  const levelsQuery = useLevelsQuery();
  const authorsQuery = useAuthorsQuery();
  const tagsQuery = useTagsQuery();
  const figuresQuery = useStepFiguresQuery();
  const categoriesQuery = useInfoCategoriesQuery();
  const genresQuery = useGenresQuery();
  const stepSheetUrlCheck = useUrlCheck();
  const demoVideoUrlCheck = useUrlCheck();
  const tutorialVideoUrlCheck = useUrlCheck();

  const reset = useCallback(
    (data?: ChoreographyFormData) => {
      editVersion.current += 1;
      setFormData(createInitialFormData(data));
      setActiveTab("basic-information");
      setFieldErrors({});
      setValidationError(null);
      setIsValidating(false);
      setInputs({ authors: "", tags: "", step_figures: "" });
      setCustomCategoryRowIds(new Set());
      stepSheetUrlCheck.actions.reset();
      demoVideoUrlCheck.actions.reset();
      tutorialVideoUrlCheck.actions.reset();
    },
    [stepSheetUrlCheck.actions, demoVideoUrlCheck.actions, tutorialVideoUrlCheck.actions],
  );

  useEffect(() => {
    const isLoaded = initialData !== undefined;
    if (
      initialDataKeyRef.current.key === initialDataKey &&
      initialDataKeyRef.current.isLoaded === isLoaded
    ) {
      return;
    }
    initialDataKeyRef.current = { key: initialDataKey, isLoaded };
    reset(initialData);
  }, [initialData, initialDataKey, reset]);

  const options: Record<ListField, string[]> = {
    authors: authorsQuery.data ?? NO_OPTIONS,
    tags: tagsQuery.data ?? NO_OPTIONS,
    step_figures: figuresQuery.data ?? NO_OPTIONS,
  };
  const informationCategories =
    categoriesQuery.data ?? (initialData?.choreography_information || []).map((i) => i.category);

  const edit = (change: (current: ChoreographyFormData) => ChoreographyFormData) => {
    editVersion.current += 1;
    setFormData(change);
  };

  const changeField = (name: string, value: string, checked?: boolean) => {
    editVersion.current += 1;
    setFieldErrors((previous) => clearFieldError(previous, name));
    setFormData((previous) => applyFieldChange(previous, name, value, checked));
  };

  const setInput = (field: ListField, value: string) =>
    setInputs((previous) => ({ ...previous, [field]: value }));

  const addItem = (field: ListField, value?: string) => {
    const input = value ?? inputs[field];
    edit((current) => addListItem(current, field, input, options[field]));
    setInput(field, "");
  };

  const changeListInput = (field: ListField, value: string, inputType?: string) => {
    setInput(field, value);
    if (
      isPendingKnownOption(value, options[field], formData[field]) &&
      isDatalistInputType(inputType)
    ) {
      addItem(field, value.trim());
    }
  };

  const blurListInput = (field: ListField) => {
    const normalized = inputs[field].trim();
    if (isPendingKnownOption(normalized, options[field], formData[field])) {
      addItem(field, normalized);
    }
  };

  const changeInformation = (index: number, field: "category" | "description", value: string) => {
    editVersion.current += 1;
    const rowId = getInformationRowId(formData, index);
    setFieldErrors((previous) =>
      clearFieldError(previous, `choreography_information.${rowId}.${field}`),
    );
    setFormData((previous) => updateInformationRow(previous, index, field, value));
  };

  const setCustomCategoryMode = (rowId: string, isCustom: boolean) =>
    setCustomCategoryRowIds((previous) => {
      if (previous.has(rowId) === isCustom) return previous;
      const next = new Set(previous);
      if (isCustom) next.add(rowId);
      else next.delete(rowId);
      return next;
    });

  const removeInformation = (index: number) => {
    const rowId = getInformationRowId(formData, index);
    editVersion.current += 1;
    setFieldErrors((previous) => clearInformationRowErrors(previous, rowId));
    setCustomCategoryMode(rowId, false);
    setFormData((previous) => removeInformationRow(previous, index));
  };

  const changeSong = (index: number, field: SongField, value: string) => {
    editVersion.current += 1;
    const rowId = getSongRowId(formData.choreography_songs ?? [], index);
    setFieldErrors((previous) => clearFieldError(previous, `choreography_songs.${rowId}.${field}`));
    setFormData((previous) => ({
      ...previous,
      choreography_songs: updateSongRow(previous.choreography_songs ?? [], index, field, value),
    }));
  };

  const removeSong = (index: number) => {
    const rowId = getSongRowId(formData.choreography_songs ?? [], index);
    editVersion.current += 1;
    setFieldErrors((previous) => clearSongRowErrors(previous, rowId));
    setFormData((previous) => ({
      ...previous,
      choreography_songs: removeSongRow(previous.choreography_songs ?? [], index),
    }));
  };

  const chooseFavoriteSong = (index: number) => {
    editVersion.current += 1;
    setFieldErrors((previous) => clearFieldError(previous, "choreography_songs"));
    setFormData((previous) => ({
      ...previous,
      choreography_songs: setFavoriteSong(previous.choreography_songs ?? [], index),
    }));
  };

  const submit = async () => {
    if (isValidating) return;
    const submittedVersion = editVersion.current;
    setIsValidating(true);
    setValidationError(null);
    try {
      await validateChoreography(formData);
      if (editVersion.current !== submittedVersion) {
        setValidationError(FORM_CHANGED_MESSAGE);
        return;
      }
      setFieldErrors({});
      await onSubmit(toSubmittedFormData(formData));
    } catch (error) {
      const issues = getFieldIssues(error);
      if (editVersion.current !== submittedVersion) {
        setValidationError(FORM_CHANGED_MESSAGE);
      } else if (issues) {
        const { fieldErrors: nextErrors, hasUnmappedIssue } = mapFieldIssues(issues, formData);
        setFieldErrors(nextErrors);
        if (hasUnmappedIssue) {
          setValidationError("Some fields could not be validated. Please try again.");
        }
      } else {
        setValidationError("Failed to validate or save the choreography. Please try again.");
        console.error("Form submission error:", error);
      }
    } finally {
      setIsValidating(false);
    }
  };

  /** Returns the tab to focus for a navigation key, or null when the key is not handled. */
  const selectTabByKey = (key: string, currentIndex: number): number | null => {
    const nextIndex = getNextTabIndex(key, currentIndex, FORM_TABS.length);
    if (nextIndex !== null) setActiveTab(FORM_TABS[nextIndex].id);
    return nextIndex;
  };

  return {
    state: {
      formData,
      activeTab,
      fieldErrors,
      validationError,
      isValidating,
      inputs,
      options,
      genreOptions: genresQuery.data ?? NO_OPTIONS,
      levels: levelsQuery.data ?? [],
      informationCategories,
      customCategoryRowIds,
      tabErrors: getTabErrors(fieldErrors),
      urlChecks: {
        stepSheet: stepSheetUrlCheck,
        demoVideo: demoVideoUrlCheck,
        tutorialVideo: tutorialVideoUrlCheck,
      },
    },
    actions: {
      selectTab: setActiveTab,
      selectTabByKey,
      changeField,
      changeListInput,
      blurListInput,
      addItem,
      removeItem: (field: ListField, item: string) =>
        edit((current) => removeListItem(current, field, item)),
      changeInformation,
      setCustomCategoryMode,
      removeInformation,
      changeSong,
      removeSong,
      chooseFavoriteSong,
      reset,
      submit,
    },
  };
};

export type ChoreographyFormViewModel = ReturnType<typeof useChoreographyFormViewModel>;
