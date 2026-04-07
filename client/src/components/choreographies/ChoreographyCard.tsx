import "../../styles/ChoreographyCard.css";

import React from "react";

import { Choreography } from "../../types";
import { getYouTubeVideoEmbedUrl } from "../../utils/youtube";
import { ActionButton, Badge, Card, Tag, YouTubeVideo } from "../shared/ui";

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
  const demoEmbedUrl = getYouTubeVideoEmbedUrl(choreography.demo_video_url);
  const tutorialEmbedUrl = getYouTubeVideoEmbedUrl(choreography.tutorial_video_url);
  const primaryEmbedUrl = demoEmbedUrl || tutorialEmbedUrl;
  const primaryEmbedLabel = demoEmbedUrl ? "Demo Video:" : "Tutorial Video:";
  const primaryEmbedTitle = demoEmbedUrl
    ? `Demo video for ${choreography.name}`
    : `Tutorial video for ${choreography.name}`;
  const cardClassName =
    videoEmbedMode === "all" ? "choreography-card card-detail-video-layout" : "choreography-card";
  const showPrimaryEmbed = videoEmbedMode === "single" && Boolean(primaryEmbedUrl);
  const showDemoLink = !showPrimaryEmbed && Boolean(choreography.demo_video_url);
  const showTutorialLink = !showPrimaryEmbed && Boolean(choreography.tutorial_video_url);
  const showAllEmbeds =
    videoEmbedMode === "all" && (Boolean(demoEmbedUrl) || Boolean(tutorialEmbedUrl));
  const handleContentLinkClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.stopPropagation();
  };

  const header = (
    <>
      <h3>{choreography.name}</h3>
      <Badge className={`level-badge level-${choreography.level.toLowerCase()}`}>
        {choreography.level}
      </Badge>
    </>
  );

  const content = (
    <>
      {choreography.count && (
        <p>
          <strong>Count:</strong> {choreography.count}
        </p>
      )}
      {choreography.wall_count && (
        <p>
          <strong>Wall:</strong> {choreography.wall_count}
        </p>
      )}
      {choreography.creation_year && (
        <p>
          <strong>Year:</strong> {choreography.creation_year}
        </p>
      )}

      {choreography.authors.length > 0 && (
        <div className="authors">
          <strong>Authors:</strong> {choreography.authors.join(", ")}
        </div>
      )}

      {choreography.step_figures.length > 0 && (
        <div className="step-figures">
          <strong>Step Figures:</strong>
          <div className="tag-list">
            {choreography.step_figures.map((figure) => (
              <Tag key={figure} value={figure} className="tag-small" />
            ))}
            {choreography.restart_information && (
              <Tag value="Restart 🔁" className="tag-small" title="Has restart information" />
            )}
            {choreography.tag_information && (
              <Tag value="Tag 🌉" className="tag-small" title="Has tag information" />
            )}
          </div>
        </div>
      )}

      {choreography.tags.length > 0 && (
        <div className="tags">
          <strong>Tags:</strong>
          <div className="tag-list">
            {choreography.tags.map((tag) => (
              <Tag key={tag} value={tag} className="tag-small" />
            ))}
          </div>
        </div>
      )}

      {choreography.step_sheet_link && (
        <a
          href={choreography.step_sheet_link}
          target="_blank"
          rel="noopener noreferrer"
          className="step-sheet-link"
          onClick={handleContentLinkClick}
        >
          🦶 View Step Sheet
        </a>
      )}

      {showPrimaryEmbed && primaryEmbedUrl && (
        <div className="video-embed-block">
          <strong>{primaryEmbedLabel}</strong>
          <YouTubeVideo src={primaryEmbedUrl} title={primaryEmbedTitle} />
        </div>
      )}

      {showDemoLink && choreography.demo_video_url && (
        <a
          href={choreography.demo_video_url}
          target="_blank"
          rel="noopener noreferrer"
          className="step-sheet-link"
          onClick={handleContentLinkClick}
        >
          🎬 Watch Demo
        </a>
      )}

      {showTutorialLink && choreography.tutorial_video_url && (
        <a
          href={choreography.tutorial_video_url}
          target="_blank"
          rel="noopener noreferrer"
          className="step-sheet-link"
          onClick={handleContentLinkClick}
        >
          🎓 Watch Tutorial
        </a>
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

  const actions = (
    <>
      {onEdit && (
        <ActionButton
          onClick={(e) => {
            e.stopPropagation();
            onEdit(choreography.id);
          }}
          className="btn-small btn-edit"
        >
          Edit
        </ActionButton>
      )}
      {onDelete && (
        <ActionButton
          onClick={(e) => {
            e.stopPropagation();
            onDelete(choreography.id);
          }}
          className="btn-small btn-delete"
        >
          Delete
        </ActionButton>
      )}
    </>
  );

  return <Card className={cardClassName} header={header} content={content} actions={actions} />;
};
