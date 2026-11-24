import { useState } from "react";

import type { LearningStatus } from "../../../types";
import {
  LEARNING_STATUS_OPTIONS,
  useChoreographyCardViewModel,
  useLearningStatusChoreographiesQuery,
} from "../../choreographies";
import { buildPersonalTabs } from "../model/personal-tabs";

/** ViewModel for the personal area: the wishlist and the learned dances, one list at a time. */
export const usePersonalViewModel = () => {
  const [activeStatus, setActiveStatus] = useState<LearningStatus>("wishlist");
  const wishlist = useLearningStatusChoreographiesQuery("wishlist");
  const learned = useLearningStatusChoreographiesQuery("learned");
  const cardViewModel = useChoreographyCardViewModel();

  const queries = { wishlist, learned };
  const active = queries[activeStatus];
  const tabs = buildPersonalTabs(LEARNING_STATUS_OPTIONS, {
    wishlist: wishlist.data?.length ?? null,
    learned: learned.data?.length ?? null,
  });

  return {
    state: {
      activeStatus,
      tabs,
      activeTab: tabs.find((tab) => tab.status === activeStatus) ?? tabs[0],
      choreographies: active.data ?? [],
      isLoading: active.isPending,
      error: active.isError ? "Failed to load your dances" : null,
      cardViewModel,
    },
    actions: { selectStatus: setActiveStatus },
  };
};

export type PersonalViewModel = ReturnType<typeof usePersonalViewModel>;
