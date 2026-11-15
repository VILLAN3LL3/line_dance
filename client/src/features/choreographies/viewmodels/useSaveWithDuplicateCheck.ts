import { useState } from "react";

import { getFieldIssues } from "../../../shared/http/apiErrors";
import type { ChoreographyFormData, DuplicateChoreography } from "../../../types";
import { checkChoreographyDuplicates } from "../api";

interface UseSaveWithDuplicateCheckOptions {
  /** Persists the choreography; field issues thrown here are handed back to the form. */
  save: (data: ChoreographyFormData) => Promise<void>;
  failureMessage: (error: unknown) => string | null;
  /** Excludes the choreography being edited from the duplicate search. */
  excludeId?: number;
}

const RECHECK_FIELDS_MESSAGE = "Validation failed. Save the form again to review the field errors.";

/**
 * Save flow shared by create and edit: look for duplicates first and ask for confirmation when
 * some exist. Field issues are rethrown so the form can show them next to the inputs.
 */
export const useSaveWithDuplicateCheck = ({
  save,
  failureMessage,
  excludeId,
}: UseSaveWithDuplicateCheckOptions) => {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateChoreography[]>([]);
  const [pendingData, setPendingData] = useState<ChoreographyFormData | null>(null);

  const persist = async (data: ChoreographyFormData) => {
    setIsSaving(true);
    setError(null);
    try {
      await save(data);
    } catch (err) {
      if (getFieldIssues(err)) throw err;
      setError(failureMessage(err));
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const submit = async (data: ChoreographyFormData) => {
    setIsSaving(true);
    setError(null);
    setDuplicates([]);
    try {
      const found = await checkChoreographyDuplicates(
        data.name,
        data.level,
        data.authors,
        excludeId,
      );
      if (found.length > 0) {
        setDuplicates(found);
        setPendingData(data);
        return;
      }
      await persist(data);
    } catch (err) {
      if (getFieldIssues(err)) throw err;
      setError(failureMessage(err));
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDuplicate = async () => {
    if (!pendingData) return;
    setDuplicates([]);
    try {
      await persist(pendingData);
      setPendingData(null);
    } catch (err) {
      setError(RECHECK_FIELDS_MESSAGE);
      console.error(err);
    }
  };

  const cancelDuplicate = () => {
    setDuplicates([]);
    setPendingData(null);
  };

  return {
    state: { isSaving, error, duplicates },
    actions: { submit, confirmDuplicate, cancelDuplicate },
  };
};
