import "../../styles/ChoreographyCard.css";

import React, { useState } from "react";

import { Choreography } from "../../types";
import { buildChoreographyClipboardText } from "../../utils/choreographyClipboard";
import { getYouTubeVideoEmbedUrl } from "../../utils/youtube";
import {
  ActionButton,
  Card,
  ExternalLink,
  LevelBatch,
  Tag,
  TagGroup,
  YouTubeVideo,
} from "../shared/ui";

interface ChoreographyCardProps {
  choreography: Choreography;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  videoEmbedMode?: "single" | "all";
}

interface InfoSectionProps {
  title: string;
  value?: string;
  isDetailMode: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}

interface ChoreographyCardContentProps {
  choreography: Choreography;
  isDetailMode: boolean;
  countWallSummary: { label: string; value: string } | null;
  demoEmbedUrl: string | null;
  tutorialEmbedUrl: string | null;
  onLinkClick: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  isRestartExpanded: boolean;
  isTagExpanded: boolean;
  onRestartToggle: () => void;
  onTagToggle: () => void;
}

interface ChoreographyCardActionsProps {
  choreography: Choreography;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  onCopy: () => Promise<void>;
}

function getCountWallSummary(choreography: Choreography): { label: string; value: string } | null {
  if (choreography.count && choreography.wall_count) {
    return { label: "Count/Wall", value: `${choreography.count} / ${choreography.wall_count}` };
  }

  if (choreography.count) {
    return { label: "Count", value: String(choreography.count) };
  }

  if (choreography.wall_count) {
    return { label: "Wall", value: String(choreography.wall_count) };
  }

  return null;
}

const InfoSection: React.FC<InfoSectionProps> = ({
  title,
  value,
  isDetailMode,
  isExpanded,
  onToggle,
}) => {
  if (!value && !isDetailMode) {
    return null;
  }

  return (
    <div className="info-section">
      <strong>{title}</strong>
      <span
        className={
          value && !isExpanded
            ? "info-section-text info-section-text-collapsed"
            : "info-section-text"
        }
      >
        {value || "None"}
      </span>
      {value && (
        <button type="button" className="info-section-toggle" onClick={onToggle}>
          {isExpanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
};

const ChoreographyCardContent: React.FC<ChoreographyCardContentProps> = ({
  choreography,
  isDetailMode,
  countWallSummary,
  demoEmbedUrl,
  tutorialEmbedUrl,
  onLinkClick,
  isRestartExpanded,
  isTagExpanded,
  onRestartToggle,
  onTagToggle,
}) => {
  const primaryEmbedUrl = demoEmbedUrl || tutorialEmbedUrl;
  const primaryEmbedLabel = demoEmbedUrl ? "Demo Video:" : "Tutorial Video:";
  const primaryEmbedTitle = demoEmbedUrl
    ? `Demo video for ${choreography.name}`
    : `Tutorial video for ${choreography.name}`;
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

      <InfoSection
        title="Restart Information"
        value={choreography.restart_information}
        isDetailMode={isDetailMode}
        isExpanded={isRestartExpanded}
        onToggle={onRestartToggle}
      />

      <InfoSection
        title="Tag Information"
        value={choreography.tag_information}
        isDetailMode={isDetailMode}
        isExpanded={isTagExpanded}
        onToggle={onTagToggle}
      />

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

const ChoreographyCardActions: React.FC<ChoreographyCardActionsProps> = ({
  choreography,
  onEdit,
  onDelete,
  onCopy,
}) => (
  <>
    {choreography.step_sheet_link && (
      <a
        href={choreography.step_sheet_link}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(event) => event.stopPropagation()}
        className="btn-secondary btn-small step-sheet-action"
        aria-label="Open step sheet in a new tab"
        title="Open step sheet in a new tab"
      >
        🦶
      </a>
    )}

    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onCopy();
      }}
      className="btn-secondary btn-small copy-action"
      aria-label="Copy choreography details"
      title="Copy choreography details"
    >
      ⤵️
    </button>

    {onEdit && (
      <a
        href={`/choreographies/${choreography.id}?edit=1`}
        onClick={(event) => {
          event.stopPropagation();
          if (!event.ctrlKey && !event.metaKey && !event.shiftKey) {
            event.preventDefault();
            onEdit(choreography.id);
          }
        }}
        className="btn-edit btn-small"
      >
        Edit
      </a>
    )}

    {onDelete && (
      <ActionButton
        onClick={(event) => {
          event.stopPropagation();
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

export const ChoreographyCard: React.FC<ChoreographyCardProps> = ({
  choreography,
  onEdit,
  onDelete,
  videoEmbedMode = "single",
}) => {
  const isDetailMode = videoEmbedMode === "all";
  const [isRestartExpanded, setIsRestartExpanded] = useState(false);
  const [isTagExpanded, setIsTagExpanded] = useState(false);
  const countWallSummary = getCountWallSummary(choreography);
  const demoEmbedUrl = getYouTubeVideoEmbedUrl(choreography.demo_video_url);
  const tutorialEmbedUrl = getYouTubeVideoEmbedUrl(choreography.tutorial_video_url);
  const cardClassName =
    videoEmbedMode === "all" ? "choreography-card card-detail-video-layout" : "choreography-card";
  const handleContentLinkClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.stopPropagation();
  };

  const copyToClipboard = async () => {
    const text = buildChoreographyClipboardText(choreography);

    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      globalThis.prompt("Copy choreography details:", text);
    }
  };

  const header = (
    <>
      <h3>
        {choreography.name}
        {choreography.creation_year ? ` (${choreography.creation_year})` : ""}
      </h3>
      <LevelBatch level={choreography.level} />
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
      isRestartExpanded={isRestartExpanded}
      isTagExpanded={isTagExpanded}
      onRestartToggle={() => setIsRestartExpanded((current) => !current)}
      onTagToggle={() => setIsTagExpanded((current) => !current)}
    />
  );

  const actions = (
    <ChoreographyCardActions
      choreography={choreography}
      onEdit={onEdit}
      onDelete={onDelete}
      onCopy={copyToClipboard}
    />
  );

  return <Card className={cardClassName} header={header} content={content} actions={actions} />;
};
