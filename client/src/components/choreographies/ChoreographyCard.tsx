import "../../styles/ChoreographyCard.css";

import React from "react";

import { Choreography } from "../../types";
import { buildChoreographyClipboardText } from "../../utils/choreographyClipboard";
import { getYouTubeVideoEmbedUrl } from "../../utils/youtube";
import { ActionButton, Badge, Card, ExternalLink, Tag, TagGroup, YouTubeVideo } from "../shared/ui";

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
  const showDemoLink = videoEmbedMode === "single" && !showPrimaryEmbed && Boolean(choreography.demo_video_url);
  const showTutorialLink =
    videoEmbedMode === "single" && !showPrimaryEmbed && Boolean(choreography.tutorial_video_url);
  const showAllEmbeds =
    videoEmbedMode === "all" && (Boolean(demoEmbedUrl) || Boolean(tutorialEmbedUrl));
  const handleContentLinkClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.stopPropagation();
  };

  const copyToClipboard = async () => {
    const text = buildChoreographyClipboardText(choreography);

    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "absolute";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
  };

  const header = (
    <>
      <h3>
        {choreography.name}
        {choreography.creation_year ? ` (${choreography.creation_year})` : ""}
      </h3>
      <Badge className={`level-badge level-${choreography.level.toLowerCase()}`}>
        {choreography.level}
      </Badge>
    </>
  );

  const content = (
    <>
      {(choreography.count || choreography.wall_count) && (
        <p>
          {choreography.count && choreography.wall_count ? (
            <>
              <strong>Count/Wall:</strong> {choreography.count} / {choreography.wall_count}
            </>
          ) : choreography.count ? (
            <>
              <strong>Count:</strong> {choreography.count}
            </>
          ) : (
            <>
              <strong>Wall:</strong> {choreography.wall_count}
            </>
          )}
        </p>
      )}

      {choreography.authors.length > 0 && (
        <div className="authors">
          <strong>Authors:</strong> {choreography.authors.join(", ")}
        </div>
      )}

      {(choreography.step_figures.length > 0 || isDetailMode) && (
        <div className="step-figures">
          <strong>Step Figures:</strong>
          {choreography.step_figures.length > 0 ? (
            <TagGroup className="tag-list">
              {choreography.step_figures.map((figure) => (
                <Tag key={figure} value={figure} className="tag-small" />
              ))}
              {choreography.restart_information && (
                <Tag value="Restart 🔁" className="tag-small" title="Has restart information" />
              )}
              {choreography.tag_information && (
                <Tag value="Tag 🌉" className="tag-small" title="Has tag information" />
              )}
            </TagGroup>
          ) : (
            <span>No step figures</span>
          )}
        </div>
      )}

      {(choreography.restart_information || isDetailMode) && (
        <div className="info-section">
          <strong>Restart Information</strong>
          <span>{choreography.restart_information || "None"}</span>
        </div>
      )}

      {(choreography.tag_information || isDetailMode) && (
        <div className="info-section">
          <strong>Tag Information</strong>
          <span>{choreography.tag_information || "None"}</span>
        </div>
      )}

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
          onClick={handleContentLinkClick}
        >
          🎬 Watch Demo
        </ExternalLink>
      )}

      {showTutorialLink && choreography.tutorial_video_url && (
        <ExternalLink
          href={choreography.tutorial_video_url}
          className="step-sheet-link"
          onClick={handleContentLinkClick}
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

  const actions = (
    <>
      {choreography.step_sheet_link && (
        <a
          href={choreography.step_sheet_link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            e.stopPropagation();
          }}
          className="btn-secondary btn-small step-sheet-action"
          role="button"
          aria-label="Open step sheet in a new tab"
          title="Open step sheet in a new tab"
        >
          🦶
        </a>
      )}
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void copyToClipboard();
        }}
        className="btn-secondary btn-small copy-action"
        role="button"
        aria-label="Copy choreography details"
        title="Copy choreography details"
      >
        ⤵️
      </a>
      {onEdit && (
        <a
          href={`/choreographies/${choreography.id}?edit=1`}
          onClick={(e) => {
            e.stopPropagation();
            // If plain click (no modifier keys), prevent default and use onEdit callback
            if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
              e.preventDefault();
              onEdit(choreography.id);
            }
            // Otherwise let the link open normally in a new tab
          }}
          className="btn-edit btn-small"
          role="button"
        >
          Edit
        </a>
      )}
      {onDelete && (
        <ActionButton
          onClick={(e) => {
            e.stopPropagation();
            onDelete(choreography.id);
          }}
          variant="delete"
          className="btn-small"
        >
          Delete
        </ActionButton>
      )}
    </>
  );

  return <Card className={cardClassName} header={header} content={content} actions={actions} />;
};
