import { z } from 'zod';
import type { ChoreographyIssue } from '../../contracts/api.ts';
import type { JsonValue } from '../../utils/json-input.ts';

const optionalText = z.string().nullish();
const songEntry = z.object({
  id: z.unknown().optional(),
  title: optionalText,
  artist: optionalText,
  youtube_url: optionalText,
  spotify_url: optionalText,
  note: optionalText,
  bpm: z.unknown().optional(),
  length_seconds: z.unknown().optional(),
  genre: optionalText,
  is_favorite: z.boolean().nullish(),
});
type SongEntry = z.output<typeof songEntry>;

export type SongInput = {
  /** Existing song id; `null` for songs that are new. */
  id: number | null;
  title: string;
  artist: string | null;
  youtube_url: string | null;
  spotify_url: string | null;
  note: string | null;
  bpm: number | null;
  length_seconds: number | null;
  genre: string | null;
  is_favorite: boolean;
};
/** `undefined` keeps the stored songs, an array replaces them, `null` marks invalid input. */
export type SongChanges = SongInput[] | null | undefined;

const trimmed = (value: string | null | undefined): string => value?.trim() ?? '';
const textOrNull = (value: string | null | undefined): string | null => trimmed(value) || null;

export const BPM_RANGE = { min: 30, max: 300 } as const;
export const LENGTH_SECONDS_RANGE = { min: 1, max: 3600 } as const;

type NumberField = { kind: 'empty' } | { kind: 'invalid' } | { kind: 'value'; value: number };

/** Only whole numbers in range are valid; text other than blank is an invalid value. */
function parseNumberField(value: unknown, range: { min: number; max: number }): NumberField {
  if (value === undefined || value === null) return { kind: 'empty' };
  if (typeof value === 'string' && !value.trim()) return { kind: 'empty' };
  if (typeof value !== 'number' || !Number.isInteger(value)) return { kind: 'invalid' };
  return value >= range.min && value <= range.max ? { kind: 'value', value } : { kind: 'invalid' };
}

const hasContent = (entry: SongEntry): boolean =>
  [entry.title, entry.artist, entry.youtube_url, entry.spotify_url, entry.note, entry.genre].some(
    (value) => trimmed(value),
  ) ||
  parseNumberField(entry.bpm, BPM_RANGE).kind !== 'empty' ||
  parseNumberField(entry.length_seconds, LENGTH_SECONDS_RANGE).kind !== 'empty';

/** Links are rendered as hrefs, so only http(s) is accepted. */
export function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value.trim());
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

export function getSongIssues(value: JsonValue | undefined): ChoreographyIssue[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return [{ field: 'choreography_songs', key: 'invalid_songs' }];

  const issues: ChoreographyIssue[] = [];
  let favorites = 0;
  value.forEach((item, index) => {
    const parsed = songEntry.safeParse(item);
    const field = `choreography_songs.${index}`;
    if (!parsed.success) {
      issues.push({ field, key: 'invalid_songs' });
      return;
    }
    const entry = parsed.data;
    if (!hasContent(entry)) return;
    if (entry.is_favorite) favorites += 1;
    if (!trimmed(entry.title)) issues.push({ field: `${field}.title`, key: 'required' });
    for (const link of ['youtube_url', 'spotify_url'] as const) {
      const url = trimmed(entry[link]);
      if (url && !isHttpUrl(url)) issues.push({ field: `${field}.${link}`, key: 'invalid_url' });
    }
    const numberFields = [
      ['bpm', BPM_RANGE],
      ['length_seconds', LENGTH_SECONDS_RANGE],
    ] as const;
    for (const [name, range] of numberFields) {
      if (parseNumberField(entry[name], range).kind === 'invalid') {
        issues.push({ field: `${field}.${name}`, key: 'invalid_integer' });
      }
    }
  });
  if (favorites > 1) issues.push({ field: 'choreography_songs', key: 'invalid_songs' });
  return issues;
}

/** Rows without content are dropped by the caller; a repeated id counts as a new song. */
function toSongInput(entry: SongEntry, usedIds: Set<number>): SongInput | null {
  const title = trimmed(entry.title);
  if (!title) return null;
  const bpm = parseNumberField(entry.bpm, BPM_RANGE);
  const length = parseNumberField(entry.length_seconds, LENGTH_SECONDS_RANGE);
  if (bpm.kind === 'invalid' || length.kind === 'invalid') return null;
  const id = Number.isSafeInteger(entry.id) && Number(entry.id) > 0 ? Number(entry.id) : null;
  const isRepeat = id !== null && usedIds.has(id);
  if (id !== null) usedIds.add(id);
  return {
    id: isRepeat ? null : id,
    title,
    artist: textOrNull(entry.artist),
    youtube_url: textOrNull(entry.youtube_url),
    spotify_url: textOrNull(entry.spotify_url),
    note: textOrNull(entry.note),
    bpm: bpm.kind === 'value' ? bpm.value : null,
    length_seconds: length.kind === 'value' ? length.value : null,
    genre: textOrNull(entry.genre),
    is_favorite: entry.is_favorite === true,
  };
}

/** Drops blank rows and trims values; expects input that passed `getSongIssues`. */
export function normalizeSongs(value: JsonValue | undefined): SongChanges {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return null;

  const songs: SongInput[] = [];
  const usedIds = new Set<number>();
  for (const item of value) {
    const parsed = songEntry.safeParse(item);
    if (!parsed.success) return null;
    if (!hasContent(parsed.data)) continue;
    const song = toSongInput(parsed.data, usedIds);
    if (!song) return null;
    songs.push(song);
  }
  return songs;
}

/** Existing songs that are no longer submitted, and the submitted ones that already exist. */
export function planSongChanges(
  stored: { id: number }[],
  songs: SongInput[],
): { deleteIds: number[]; existingIds: Set<number> } {
  const storedIds = new Set(stored.map((song) => song.id));
  const kept = new Set<number>();
  for (const song of songs) {
    if (song.id !== null && storedIds.has(song.id)) kept.add(song.id);
  }
  return {
    deleteIds: stored.map((song) => song.id).filter((id) => !kept.has(id)),
    existingIds: kept,
  };
}
