import { useState } from "react";

import {
  LEARNING_STATUS_OPTIONS,
  useChoreographyCardViewModel,
  useLearningStatusChoreographiesQuery,
} from "../../choreographies";
import { matchesName } from "../../../shared/utils/search";
import { usePracticeViewModel } from "../../practice";
import { buildPersonalTabs, isStatusTab } from "../model/personal-tabs";
import type { PersonalTabId } from "../model/personal-tabs";

/** ViewModel for the personal area: the wishlist, the learned dances and the practice tabs. */
export const usePersonalViewModel = () => {
  const [activeId, setActiveId] = useState<PersonalTabId>("wishlist");
  const wishlist = useLearningStatusChoreographiesQuery("wishlist");
  const learned = useLearningStatusChoreographiesQuery("learned");
  const cardViewModel = useChoreographyCardViewModel();
  const [query, setQuery] = useState("");
  const practice = usePracticeViewModel(query);

  const queries = { wishlist, learned };
  const active = isStatusTab(activeId) ? queries[activeId] : null;
  const { deck } = practice.deck.state;
  const isDeckReady = !practice.deck.state.isLoading && !practice.deck.state.error;
  const tabs = buildPersonalTabs(LEARNING_STATUS_OPTIONS, {
    wishlist: wishlist.data?.length ?? null,
    learned: learned.data?.length ?? null,
    practice: isDeckReady ? deck.due.length : null,
  });

  return {
    state: {
      activeId,
      tabs,
      activeTab: tabs.find((tab) => tab.id === activeId) ?? tabs[0],
      query,
      choreographies: (active?.data ?? []).filter((dance) => matchesName(dance.name, query)),
      isLoading: active?.isPending ?? false,
      error: active?.isError ? "Failed to load your dances" : null,
      cardViewModel,
      practice,
    },
    actions: { selectTab: setActiveId, setQuery },
  };
};

export type PersonalViewModel = ReturnType<typeof usePersonalViewModel>;
