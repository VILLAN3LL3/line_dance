import "../../../styles/Practice.css";

import React, { useState } from "react";

import { ActionButton, Card } from "../../../shared/ui";
import type { Choreography, PracticeConfidence, PracticeSummary } from "../../../types";
import {
  formatSongLabel,
  getDefaultSong,
  getInformationCategoryIcon,
  resolveSongLinks,
} from "../../choreographies";
import {
  describeLastPractice,
  describeNextDue,
  describePracticeCount,
  getMemoryAids,
} from "../model/practice-deck";
import { formatLocalDate } from "../model/practice-log";
import type { CardPractice } from "../viewmodels/usePracticeDeckViewModel";

interface PracticeCardBackProps {
  choreography: Choreography;
  summary: PracticeSummary;
  isSaving: boolean;
  onPractice: (draft: CardPractice) => void;
}

/** Back of a flash card: what to remember about the dance and the practice record. */
export const PracticeCardBack: React.FC<PracticeCardBackProps> = ({
  choreography,
  summary,
  isSaving,
  onPractice,
}) => {
  const songs = choreography.choreography_songs;
  const defaultSong = getDefaultSong(songs);
  const today = formatLocalDate(new Date());
  const [practicedOn, setPracticedOn] = useState(today);
  const [note, setNote] = useState("");
  const [songId, setSongId] = useState<number | null>(defaultSong?.id ?? null);
  const idPrefix = `practice-${choreography.id}`;
  const songLinks = defaultSong ? resolveSongLinks(defaultSong) : null;
  const memoryAids = getMemoryAids(choreography);

  const practice = (confidence: PracticeConfidence) =>
    onPractice({ practicedOn, confidence, note, songId });

  const header = (
    <>
      <h3>{choreography.name}</h3>
      <div className="card-header-meta">
        <span className={`practice-due-badge${summary.is_due ? " is-due" : ""}`}>
          {describeNextDue(summary)}
        </span>
      </div>
    </>
  );

  const content = (
    <>
      <p>
        <strong>Music:</strong> {defaultSong ? formatSongLabel(defaultSong) : "No song"}
      </p>

      {memoryAids.length > 0 && (
        <ul className="practice-memory-aids" aria-label="Restarts and tags">
          {memoryAids.map((information) => (
            <li key={`${information.category}-${information.description}`}>
              <span aria-hidden="true">{getInformationCategoryIcon(information.category)}</span>{" "}
              <strong>{information.category}:</strong> {information.description}
            </li>
          ))}
        </ul>
      )}

      <dl className="practice-stats">
        <dt>Last practiced</dt>
        <dd>{describeLastPractice(summary)}</dd>
        <dt>Practiced</dt>
        <dd>{describePracticeCount(summary.practice_count)}</dd>
        <dt>Next</dt>
        <dd>{describeNextDue(summary)}</dd>
      </dl>
      {summary.last_note && <p className="practice-last-note">“{summary.last_note}”</p>}

      <div className="practice-form">
        <div className="form-group">
          <label htmlFor={`${idPrefix}-date`}>Practiced on</label>
          <input
            id={`${idPrefix}-date`}
            type="date"
            value={practicedOn}
            max={today}
            onChange={(event) => setPracticedOn(event.target.value)}
          />
        </div>
        {songs.length > 1 && (
          <div className="form-group">
            <label htmlFor={`${idPrefix}-song`}>Song</label>
            <select
              id={`${idPrefix}-song`}
              value={songId ?? ""}
              onChange={(event) =>
                setSongId(event.target.value ? Number(event.target.value) : null)
              }
            >
              {songs.map((song) => (
                <option key={song.id} value={song.id}>
                  {formatSongLabel(song)}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="form-group">
          <label htmlFor={`${idPrefix}-note`}>Note</label>
          <textarea
            id={`${idPrefix}-note`}
            rows={2}
            maxLength={500}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
      </div>
    </>
  );

  const actions = (
    <>
      {songLinks?.youtubeUrl && (
        <a
          href={songLinks.youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary btn-small youtube-action"
          aria-label={`Open "${formatSongLabel(defaultSong!)}" on YouTube`}
          title="Open on YouTube"
        >
          ▶️
        </a>
      )}
      {songLinks?.spotifyUrl && (
        <a
          href={songLinks.spotifyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary btn-small spotify-action"
          aria-label={`Open "${formatSongLabel(defaultSong!)}" on Spotify`}
          title="Open on Spotify"
        >
          🎵
        </a>
      )}
      <ActionButton
        variant="primary"
        className="btn-small"
        disabled={isSaving || !practicedOn}
        title="I remembered the dance: the next review comes later"
        onClick={() => practice("sure")}
      >
        ✅ Sure
      </ActionButton>
      <ActionButton
        variant="secondary"
        className="btn-small"
        disabled={isSaving || !practicedOn}
        title="I was unsure: review again tomorrow"
        onClick={() => practice("unsure")}
      >
        ❓ Unsure
      </ActionButton>
    </>
  );

  return (
    <Card
      className="choreography-card practice-card-back"
      header={header}
      content={content}
      actions={actions}
    />
  );
};
