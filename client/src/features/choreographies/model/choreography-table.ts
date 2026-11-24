import type { Choreography } from "../../../types";
import { getDefaultSong } from "./choreography-songs";

export type SortField =
  | "name"
  | "level"
  | "count"
  | "wall_count"
  | "creation_year"
  | "bpm"
  | "genre"
  | "length"
  | `information:${string}`;
export type SortDirection = "asc" | "desc";

const INFORMATION_PREFIX = "information:";

const compareOptionalNumber = (a: number | undefined, b: number | undefined): number => {
  if (a === undefined && b === undefined) return 0;
  if (a === undefined) return 1;
  if (b === undefined) return -1;
  return a - b;
};

const compareBooleanFlag = (a: boolean, b: boolean): number => {
  if (a === b) return 0;
  return a ? -1 : 1;
};

const compareOptionalText = (a: string | undefined, b: string | undefined): number => {
  if (a === undefined && b === undefined) return 0;
  if (a === undefined) return 1;
  if (b === undefined) return -1;
  return a.localeCompare(b);
};

/** Music columns show the default song: the favorite, otherwise the first. */
export const getDefaultSongMusic = (
  choreography: Choreography,
): { bpm?: number; genre?: string; length_seconds?: number } =>
  getDefaultSong(choreography.choreography_songs) ?? {};

const hasInformationCategory = (choreography: Choreography, category: string): boolean =>
  (choreography.choreography_information || []).some((item) => item.category === category);

export const getSortIndicator = (
  activeField: SortField,
  field: SortField,
  direction: SortDirection,
): string => {
  if (activeField !== field) return "";
  if (direction === "asc") return " ⇧";
  return " ⇩";
};

/** Clicking the active column flips the direction; a new column starts ascending. */
export const nextSort = (
  current: { field: SortField; direction: SortDirection },
  clickedField: SortField,
): { field: SortField; direction: SortDirection } =>
  current.field === clickedField
    ? { field: clickedField, direction: current.direction === "asc" ? "desc" : "asc" }
    : { field: clickedField, direction: "asc" };

export const sortChoreographies = (
  choreographies: Choreography[],
  field: SortField,
  direction: SortDirection,
): Choreography[] => {
  const multiplier = direction === "asc" ? 1 : -1;
  const items = [...choreographies];

  items.sort((a, b) => {
    switch (field) {
      case "name":
        return a.name.localeCompare(b.name) * multiplier;
      case "level":
        return a.level.localeCompare(b.level) * multiplier;
      case "count":
        return compareOptionalNumber(a.count, b.count) * multiplier;
      case "wall_count":
        return compareOptionalNumber(a.wall_count, b.wall_count) * multiplier;
      case "creation_year":
        return compareOptionalNumber(a.creation_year, b.creation_year) * multiplier;
      case "bpm":
        return (
          compareOptionalNumber(getDefaultSongMusic(a).bpm, getDefaultSongMusic(b).bpm) * multiplier
        );
      case "length":
        return (
          compareOptionalNumber(
            getDefaultSongMusic(a).length_seconds,
            getDefaultSongMusic(b).length_seconds,
          ) * multiplier
        );
      case "genre":
        return (
          compareOptionalText(getDefaultSongMusic(a).genre, getDefaultSongMusic(b).genre) *
          multiplier
        );
      default:
        if (field.startsWith(INFORMATION_PREFIX)) {
          const category = field.slice(INFORMATION_PREFIX.length);
          return (
            compareBooleanFlag(
              hasInformationCategory(a, category),
              hasInformationCategory(b, category),
            ) * multiplier
          );
        }
        return 0;
    }
  });

  return items;
};

export const collectInformationCategories = (choreographies: Choreography[]): string[] =>
  [
    ...new Set(
      choreographies.flatMap((choreography) =>
        (choreography.choreography_information || []).map((information) => information.category),
      ),
    ),
  ].sort((left, right) => left.localeCompare(right));

export const sortAlphabetically = (values: string[]): string[] =>
  [...values].sort((a, b) => a.localeCompare(b));
