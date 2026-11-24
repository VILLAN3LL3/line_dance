import type { Choreography, ChoreographySong } from "../../../types";
import { splitSongs } from "./choreography-songs";
import { formatSongMusicSummary } from "./song-music";
import { formatSongLabel, resolveSongLinks } from "./song-search";

/**
 * Replace ISO country code suffix in an author name with the full country name.
 * e.g. "Bettina Haag (DE)" => "Bettina Haag (Germany)"
 * Falls back to original string if code is not found in the map.
 */
export function formatAuthorForClipboard(
  author: string,
  countryCodes: Record<string, string>,
): string {
  const countryCodeStart = author.lastIndexOf(" (");
  if (countryCodeStart >= 0 && author.endsWith(")")) {
    const countryCode = author.slice(countryCodeStart + 2, -1);
    const authorName = author.slice(0, countryCodeStart).trim();
    if (!/^[A-Z]{2,3}$/.test(countryCode) || !authorName) return author;

    const countryName = countryCodes[countryCode];
    if (countryName) {
      return `${authorName} (${countryName})`;
    }
  }
  return author;
}

function buildTitle(choreography: Choreography): string {
  return choreography.creation_year != null
    ? `${choreography.name} (${choreography.creation_year})`
    : choreography.name;
}

function buildCountWall(choreography: Choreography): string | null {
  if (choreography.count != null && choreography.wall_count != null) {
    return `${choreography.count} / ${choreography.wall_count}`;
  }
  if (choreography.count != null) {
    return `${choreography.count}`;
  }
  if (choreography.wall_count != null) {
    return `- / ${choreography.wall_count}`;
  }
  return null;
}

function buildLinkLines(song: ChoreographySong, indent: string, searchPrefix: boolean): string[] {
  const { youtubeUrl, spotifyUrl } = resolveSongLinks(song);
  const platformLabel = (name: string, storedUrl: string | undefined): string =>
    searchPrefix && !storedUrl?.trim() ? `${name} Search` : name;
  return [
    ...(youtubeUrl
      ? [`${indent}• ${platformLabel("YouTube", song.youtube_url)}: ${youtubeUrl}`]
      : []),
    ...(spotifyUrl
      ? [`${indent}• ${platformLabel("Spotify", song.spotify_url)}: ${spotifyUrl}`]
      : []),
  ];
}

function buildMusicSection(choreography: Choreography): string[] {
  const { primary, alternatives } = splitSongs(choreography.choreography_songs);
  if (!primary) {
    return [];
  }

  const musicLines = ["", "Music:", `• Song: ${primary.title}`];

  if (primary.artist) {
    musicLines.push(`• Artist: ${primary.artist}`);
  }
  if (primary.note?.trim()) {
    musicLines.push(`• Note: ${primary.note.trim()}`);
  }
  const primaryMusic = formatSongMusicSummary(primary);
  if (primaryMusic) {
    musicLines.push(`• Details: ${primaryMusic}`);
  }
  musicLines.push(...buildLinkLines(primary, "", true));

  if (alternatives.length > 0) {
    musicLines.push("", "Alternative songs:");
    for (const song of alternatives) {
      const note = song.note?.trim() ? ` (${song.note.trim()})` : "";
      const music = formatSongMusicSummary(song);
      const musicSuffix = music ? ` – ${music}` : "";
      musicLines.push(
        `• ${formatSongLabel(song)}${note}${musicSuffix}`,
        ...buildLinkLines(song, "  ", false),
      );
    }
  }

  return musicLines;
}

export function buildChoreographyClipboardText(
  choreography: Choreography,
  countryCodes: Record<string, string> = {},
): string {
  const title = buildTitle(choreography);
  const countWall = buildCountWall(choreography);
  const formattedAuthors = choreography.authors.map((a) =>
    formatAuthorForClipboard(a, countryCodes),
  );

  const sections: string[] = [
    title,
    "",
    `Level: ${choreography.official_level}`,
    ...(countWall ? [`Count / Wall: ${countWall}`] : []),
    ...buildMusicSection(choreography),
    ...(formattedAuthors.length > 0
      ? ["", "Choreographers:", ...formattedAuthors.map((author) => `• ${author}`)]
      : []),
    ...(choreography.step_figures.length > 0
      ? ["", "Step Figures:", ...choreography.step_figures.map((figure) => `• ${figure}`)]
      : []),
    ...(choreography.choreography_information?.length
      ? [
          "",
          "Choreography Information:",
          ...choreography.choreography_information.map(
            (information) => `• ${information.category}: ${information.description}`,
          ),
        ]
      : []),
    ...(choreography.tags.length > 0
      ? ["", "Hash Tags:", ...choreography.tags.map((tag) => `• ${tag}`)]
      : []),
    ...(choreography.step_sheet_link ||
    choreography.demo_video_url ||
    choreography.tutorial_video_url
      ? ["", "Links:"]
      : []),
    ...(choreography.step_sheet_link ? [`• Step Sheet: ${choreography.step_sheet_link}`] : []),
    ...(choreography.demo_video_url ? [`• Demo Video: ${choreography.demo_video_url}`] : []),
    ...(choreography.tutorial_video_url
      ? [`• Tutorial Video: ${choreography.tutorial_video_url}`]
      : []),
  ];

  return sections.join("\n");
}
