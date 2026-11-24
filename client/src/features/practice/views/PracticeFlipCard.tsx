import React from "react";

import { FlipCard } from "../../../shared/ui";
import { ChoreographyCard } from "../../choreographies";
import type { ChoreographyCardViewModel } from "../../choreographies";
import type { PracticeCard } from "../model/practice-deck";
import type { CardPractice } from "../viewmodels/usePracticeDeckViewModel";
import { PracticeCardBack } from "./PracticeCardBack";

interface PracticeFlipCardProps {
  card: PracticeCard;
  cardViewModel: ChoreographyCardViewModel;
  isSaving: boolean;
  onPractice: (draft: CardPractice) => void;
}

/** The regular choreography card on the front, the flash card information on the back. */
export const PracticeFlipCard: React.FC<PracticeFlipCardProps> = ({
  card,
  cardViewModel,
  isSaving,
  onPractice,
}) => (
  <FlipCard
    label={card.choreography.name}
    front={<ChoreographyCard choreography={card.choreography} cardViewModel={cardViewModel} />}
    back={
      <PracticeCardBack
        choreography={card.choreography}
        summary={card.summary}
        isSaving={isSaving}
        onPractice={onPractice}
      />
    }
  />
);
