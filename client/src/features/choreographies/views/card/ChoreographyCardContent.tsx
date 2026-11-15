import React from "react";

import { ExternalLink, Tag, TagGroup, YouTubeVideo } from "../../../../shared/ui";
import type { Choreography, ChoreographyInformation } from "../../../../types";
import { getInformationCategoryIcon } from "../../model/choreography-card";
import { SongSearchButtons } from "../SongSearchButtons";
import { ChoreographerNames } from "./ChoreographerNames";

export interface ChoreographyCardContentProps {
  choreography: Choreography;
  isDetailMode: boolean;
  countWallSummary: { label: string; value: string } | null;
  demoEmbedUrl: string | null;
  tutorialEmbedUrl: string | null;
  onLinkClick: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}

const InfoSection: React.FC<{ information: ChoreographyInformation }> = ({ information }) => (
  <div className="info-section">
    <strong>{information.category}</strong>
    <span className="info-section-text">{information.description}</span>
  </div>
);

export const ChoreographyCardContent: React.FC<ChoreographyCardContentProps> = ({
  choreography,
  isDetailMode,
  countWallSummary,
  demoEmbedUrl,
  tutorialEmbedUrl,
  onLinkClick,
}) => {
  const primaryEmbedUrl = demoEmbedUrl || tutorialEmbedUrl;
  const primaryEmbedLabel = demoEmbedUrl ? "Demo Video:" : "Tutorial Video:";
  const primaryEmbedTitle = demoEmbedUrl
    ? `Demo video for ${choreography.name}`
    : `Tutorial video for ${choreography.name}`;
  const informationCategories = [
    ...new Set((choreography.choreography_information || []).map((item) => item.category)),
  ];
  const showStepFigureBadges = !isDetailMode && informationCategories.length > 0;
  const showStepFiguresSection =
    choreography.step_figures.length > 0 || isDetailMode || showStepFigureBadges;
  const showPrimaryEmbed = !isDetailMode && Boolean(primaryEmbedUrl);
  const showDemoLink = !isDetailMode && !showPrimaryEmbed && Boolean(choreography.demo_video_url);
  const showTutorialLink =
    !isDetailMode && !showPrimaryEmbed && Boolean(choreography.tutorial_video_url);
  const showAllEmbeds = isDetailMode && (Boolean(demoEmbedUrl) || Boolean(tutorialEmbedUrl));

  return (
    <>
      {countWallSummary && (
        <p>
          <strong>{countWallSummary.label}:</strong> {countWallSummary.value}
        </p>
      )}

      <ChoreographerNames key={choreography.id} authors={choreography.authors} />

      {isDetailMode && (choreography.song || choreography.artist) && (
        <div className="music-section">
          <SongSearchButtons song={choreography.song} artist={choreography.artist} />
        </div>
      )}

      {showStepFiguresSection && (
        <div className="step-figures">
          <strong>Step Figures:</strong>
          {choreography.step_figures.length > 0 || showStepFigureBadges ? (
            <TagGroup className="tag-list">
              {choreography.step_figures.map((figure) => (
                <Tag key={figure} value={figure} className="tag-small" />
              ))}
              {showStepFigureBadges &&
                informationCategories.map((category) => (
                  <Tag
                    key={category}
                    value={`${category} ${getInformationCategoryIcon(category)}`}
                    className="tag-small"
                    title={`Has ${category} information`}
                  />
                ))}
            </TagGroup>
          ) : (
            <span>No step figures</span>
          )}
        </div>
      )}

      {isDetailMode &&
        choreography.choreography_information?.map((information) => (
          <InfoSection
            key={information.id ?? `${information.category}-${information.description}`}
            information={information}
          />
        ))}

      {(choreography.tags.length > 0 || isDetailMode) && (
        <div className="tags">
          <strong>Tags:</strong>
          {choreography.tags.length > 0 ? (
            <TagGroup className="tag-list">
              {choreography.tags.map((tag) => (
                <Tag key={tag} value={tag} className="tag-small" />
              ))}
            </TagGroup>
          ) : (
            <span>No tags</span>
          )}
        </div>
      )}

      {showPrimaryEmbed && primaryEmbedUrl && (
        <div className="video-embed-block">
          <strong>{primaryEmbedLabel}</strong>
          <YouTubeVideo src={primaryEmbedUrl} title={primaryEmbedTitle} />
        </div>
      )}

      {showDemoLink && choreography.demo_video_url && (
        <ExternalLink
          href={choreography.demo_video_url}
          className="step-sheet-link"
          onClick={onLinkClick}
        >
          🎬 Watch Demo
        </ExternalLink>
      )}

      {showTutorialLink && choreography.tutorial_video_url && (
        <ExternalLink
          href={choreography.tutorial_video_url}
          className="step-sheet-link"
          onClick={onLinkClick}
        >
          🎓 Watch Tutorial
        </ExternalLink>
      )}

      {showAllEmbeds && (
        <div className="video-embeds-row">
          {demoEmbedUrl && (
            <div className="video-embed-block">
              <strong>Demo Video:</strong>
              <YouTubeVideo src={demoEmbedUrl} title={`Demo video for ${choreography.name}`} />
            </div>
          )}
          {tutorialEmbedUrl && (
            <div className="video-embed-block">
              <strong>Tutorial Video:</strong>
              <YouTubeVideo
                src={tutorialEmbedUrl}
                title={`Tutorial video for ${choreography.name}`}
              />
            </div>
          )}
        </div>
      )}
    </>
  );
};
