import { useState } from "react";
import { useParams } from "react-router-dom";

import { matchesName } from "../../../shared/utils/search";
import {
  useChoreographyCardViewModel,
  useLearningStatusChoreographiesQuery,
} from "../../choreographies";
import { usePracticeViewModel } from "../../practice";
import { useRepertoireStatisticsViewModel } from "../../statistics";
import { isStatusSection, parsePersonalSection } from "../model/personal-sections";
import { usePersonalSections } from "./usePersonalSections";

/** ViewModel for one section of the personal area, chosen by the route `/personal/:section`. */
export const usePersonalViewModel = () => {
  const { section: sectionName } = useParams();
  const activeId = parsePersonalSection(sectionName);
  const [query, setQuery] = useState("");
  const wishlist = useLearningStatusChoreographiesQuery("wishlist");
  const learned = useLearningStatusChoreographiesQuery("learned");
  const cardViewModel = useChoreographyCardViewModel();
  const practice = usePracticeViewModel(query);
  const statistics = useRepertoireStatisticsViewModel();
  const sections = usePersonalSections();

  const queries = { wishlist, learned };
  const active = activeId !== null && isStatusSection(activeId) ? queries[activeId] : null;

  return {
    state: {
      /** Null for a name that is no section; the page then redirects to the default one. */
      activeId,
      sections,
      activeSection: sections.find((section) => section.id === activeId) ?? sections[0],
      query,
      choreographies: (active?.data ?? []).filter((dance) => matchesName(dance.name, query)),
      isLoading: active?.isPending ?? false,
      error: active?.isError ? "Failed to load your dances" : null,
      cardViewModel,
      practice,
      statistics,
    },
    actions: { setQuery },
  };
};

export type PersonalViewModel = ReturnType<typeof usePersonalViewModel>;
