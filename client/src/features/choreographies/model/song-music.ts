import type { ChoreographySong } from "../../../types";

type SongMusic = Pick<ChoreographySong, "bpm" | "length_seconds" | "genre">;

const LENGTH_PATTERN = /^(\d{1,3}):([0-5]\d)$/;
const WHOLE_NUMBER_PATTERN = /^\d+$/;

/** "3:45" -> 225; null when the text is not a m:ss length. */
export function parseLength(text: string): number | null {
  const match = LENGTH_PATTERN.exec(text.trim());
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

/** 225 -> "3:45" */
export const formatLength = (seconds: number): string =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/**
 * Text that does not parse is sent as it is, so the backend reports the field issue instead of the
 * client duplicating the range rules.
 */
export const toSubmittedBpm = (text: string): number | string => {
  const trimmed = text.trim();
  return WHOLE_NUMBER_PATTERN.test(trimmed) ? Number(trimmed) : trimmed;
};

export const toSubmittedLength = (text: string): number | string =>
  parseLength(text) ?? text.trim();

/** Form text of a loaded value; blank when the song has none. */
export const bpmToFormText = (bpm: number | string | undefined): string =>
  bpm === undefined ? "" : String(bpm);

export const lengthToFormText = (seconds: number | string | undefined): string =>
  typeof seconds === "number" ? formatLength(seconds) : (seconds ?? "");

/** "120 BPM · Country · 3:45"; empty when the song has no music metadata. */
export const formatSongMusicSummary = (song: SongMusic): string =>
  [
    song.bpm === undefined ? "" : `${song.bpm} BPM`,
    song.genre?.trim() ?? "",
    song.length_seconds === undefined ? "" : formatLength(song.length_seconds),
  ]
    .filter(Boolean)
    .join(" · ");
