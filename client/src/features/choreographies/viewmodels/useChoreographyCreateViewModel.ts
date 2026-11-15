import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import type { ChoreographyFormData } from "../../../types";
import { createChoreography } from "../api";
import { choreographyKeys } from "../queryKeys";
import { useSaveWithDuplicateCheck } from "./useSaveWithDuplicateCheck";

/** ViewModel for the "add choreography" page. */
export const useChoreographyCreateViewModel = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const saveFlow = useSaveWithDuplicateCheck({
    save: async (data: ChoreographyFormData) => {
      await createChoreography(data);
      await queryClient.invalidateQueries({ queryKey: choreographyKeys.all });
      await navigate("/");
    },
    failureMessage: () => "Failed to create choreography",
  });

  return {
    state: saveFlow.state,
    actions: { ...saveFlow.actions, cancel: () => void navigate("/") },
  };
};
