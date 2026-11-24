import "../../../styles/ChoreographyCard.css";

import React from "react";

import { Card } from "../../../shared/ui";
import { getYouTubeVideoEmbedUrl } from "../../../shared/utils/youtube";
import type { Choreography } from "../../../types";
import { getCountWallSummary } from "../model/choreography-card";
import { describeLearningStatus } from "../model/learning-status";
import type { ChoreographyCardViewModel } from "../viewmodels/useChoreographyCardViewModel";
import { ChoreographyCardActions } from "./card/ChoreographyCardActions";
import { ChoreographyCardContent } from "./card/ChoreographyCardContent";
import { ChoreographyCardTitle } from "./card/ChoreographyCardTitle";
import { ChoreographyLevelBadge } from "./ChoreographyLevelBadge";
import { StarRating } from "./StarRating";

interface ChoreographyCardProps {
  choreography: Choreography;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  cardViewModel: ChoreographyCardViewModel;
  videoEmbedMode?: "single" | "all";
}

export const ChoreographyCard: React.FC<ChoreographyCardProps> = ({
  choreography,
  onEdit,
  onDelete,
  cardViewModel,
  videoEmbedMode = "single",
}) => {
  const isDetailMode = videoEmbedMode === "all";
  const countWallSummary = getCountWallSummary(choreography);
  const demoEmbedUrl = getYouTubeVideoEmbedUrl(choreography.demo_video_url);
  const tutorialEmbedUrl = getYouTubeVideoEmbedUrl(choreography.tutorial_video_url);
  const cardClassName =
    videoEmbedMode === "all" ? "choreography-card card-detail-video-layout" : "choreography-card";
  const learningStatus = cardViewModel.state.learningStatusFor(choreography);
  const learningStatusText =
    learningStatus.status && describeLearningStatus(learningStatus.status, learningStatus.date);
  const handleContentLinkClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.stopPropagation();
  };

  const header = (
    <>
      <ChoreographyCardTitle
        title={`${choreography.name}${choreography.creation_year != null ? ` (${choreography.creation_year})` : ""}`}
        learningStatus={learningStatus.status}
        learningStatusText={learningStatusText || undefined}
        onLearningStatusChange={(status) =>
          void cardViewModel.actions.changeLearningStatus(choreography, status)
        }
      />
      <div className="card-header-meta">
        <ChoreographyLevelBadge
          choreography={choreography}
          trailingContent={
            <StarRating
              rating={cardViewModel.state.ratingFor(choreography)}
              compact
              onChange={(rating) => cardViewModel.actions.changeRating(choreography, rating)}
            />
          }
        />
        {learningStatus.date && learningStatusText && (
          <span className="learning-status-date">{learningStatusText}</span>
        )}
      </div>
    </>
  );

  const content = (
    <ChoreographyCardContent
      choreography={choreography}
      isDetailMode={isDetailMode}
      countWallSummary={countWallSummary}
      demoEmbedUrl={demoEmbedUrl}
      tutorialEmbedUrl={tutorialEmbedUrl}
      onLinkClick={handleContentLinkClick}
    />
  );

  const actions = (
    <ChoreographyCardActions
      choreography={choreography}
      onEdit={onEdit}
      onDelete={onDelete}
      onCopy={() => cardViewModel.actions.copyToClipboard(choreography)}
    />
  );

  return <Card className={cardClassName} header={header} content={content} actions={actions} />;
};
