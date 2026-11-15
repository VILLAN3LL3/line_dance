import "../../../styles/ChoreographyCard.css";

import React from "react";

import { Card, LevelBatch } from "../../../shared/ui";
import { getYouTubeVideoEmbedUrl } from "../../../shared/utils/youtube";
import type { Choreography } from "../../../types";
import { getCountWallSummary } from "../model/choreography-card";
import { useChoreographyCardViewModel } from "../viewmodels/useChoreographyCardViewModel";
import { ChoreographyCardActions } from "./card/ChoreographyCardActions";
import { ChoreographyCardContent } from "./card/ChoreographyCardContent";
import { StarRating } from "./StarRating";

interface ChoreographyCardProps {
  choreography: Choreography;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  videoEmbedMode?: "single" | "all";
}

export const ChoreographyCard: React.FC<ChoreographyCardProps> = ({
  choreography,
  onEdit,
  onDelete,
  videoEmbedMode = "single",
}) => {
  const isDetailMode = videoEmbedMode === "all";
  const { state, actions: cardActions } = useChoreographyCardViewModel(choreography);
  const countWallSummary = getCountWallSummary(choreography);
  const demoEmbedUrl = getYouTubeVideoEmbedUrl(choreography.demo_video_url);
  const tutorialEmbedUrl = getYouTubeVideoEmbedUrl(choreography.tutorial_video_url);
  const cardClassName =
    videoEmbedMode === "all" ? "choreography-card card-detail-video-layout" : "choreography-card";
  const handleContentLinkClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.stopPropagation();
  };

  const header = (
    <>
      <h3>
        {choreography.name}
        {choreography.creation_year != null ? ` (${choreography.creation_year})` : ""}
      </h3>
      <div className="card-header-meta">
        <LevelBatch
          level={choreography.level}
          trailingContent={
            <StarRating rating={state.rating} compact onChange={cardActions.changeRating} />
          }
        />
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
      onCopy={cardActions.copyToClipboard}
    />
  );

  return <Card className={cardClassName} header={header} content={content} actions={actions} />;
};
