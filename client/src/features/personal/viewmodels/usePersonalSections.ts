import {
  LEARNING_STATUS_OPTIONS,
  useLearningStatusChoreographiesQuery,
} from "../../choreographies";
import { usePracticeDueCount } from "../../practice";
import { buildPersonalSections } from "../model/personal-sections";

/** The sections of the personal area with their counts, for the sidebar menu and the page heading. */
export const usePersonalSections = () => {
  const wishlist = useLearningStatusChoreographiesQuery("wishlist");
  const learned = useLearningStatusChoreographiesQuery("learned");
  const practice = usePracticeDueCount();

  return buildPersonalSections(LEARNING_STATUS_OPTIONS, {
    wishlist: wishlist.data?.length ?? null,
    learned: learned.data?.length ?? null,
    practice,
  });
};
