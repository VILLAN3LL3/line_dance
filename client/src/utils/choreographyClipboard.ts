import type { Choreography } from "../types";

/**
 * Replace ISO country code suffix in an author name with the full country name.
 * e.g. "Bettina Haag (DE)" => "Bettina Haag (Germany)"
 * Falls back to original string if code is not found in the map.
 */
export function formatAuthorForClipboard(
  author: string,
  countryCodes: Record<string, string>,
): string {
  const match = /^(.+?)\s*\(([A-Z]{2,3})\)$/.exec(author);
  if (match) {
    const countryName = countryCodes[match[2]];
    if (countryName) {
      return `${match[1].trim()} (${countryName})`;
    }
  }
  return author;
}

function buildTitle(choreography: Choreography): string {
  return choreography.creation_year
    ? `${choreography.name} (${choreography.creation_year})`
    : choreography.name;
}

function buildCountWall(choreography: Choreography): string | null {
  if (choreography.count && choreography.wall_count) {
    return `${choreography.count} / ${choreography.wall_count}`;
  }
  if (choreography.count) {
    return `${choreography.count}`;
  }
  if (choreography.wall_count) {
    return `- / ${choreography.wall_count}`;
  }
  return null;
}

function buildMusicSection(choreography: Choreography): string[] {
  if (!choreography.song && !choreography.artist) {
    return [];
  }

  const musicLines = ["", "Music:"];

  if (choreography.song) {
    musicLines.push(`• Song: ${choreography.song}`);
  }

  if (choreography.artist) {
    musicLines.push(`• Artist: ${choreography.artist}`);
  }

  if (choreography.song?.trim() && choreography.artist?.trim()) {
    const encodeSearchQuery = (text: string): string =>
      encodeURIComponent(text.trim()).replaceAll("%20", "+");
    const youtubeQuery = `${encodeSearchQuery(choreography.artist)}+${encodeSearchQuery(choreography.song)}`;
    const spotifyQuery = `${encodeSearchQuery(choreography.artist)}+${encodeSearchQuery(choreography.song)}`;

    musicLines.push(
      `• YouTube Search: https://www.youtube.com/results?search_query=${youtubeQuery}`,
      `• Spotify Search: https://open.spotify.com/search/${spotifyQuery}`,
    );
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
    `Level: ${choreography.level}`,
    ...(countWall ? [`Count / Wall: ${countWall}`] : []),
    ...buildMusicSection(choreography),
    ...(formattedAuthors.length > 0
      ? ["", "Choreographers:", ...formattedAuthors.map((author) => `• ${author}`)]
      : []),
    ...(choreography.step_figures.length > 0
      ? ["", "Step Figures:", ...choreography.step_figures.map((figure) => `• ${figure}`)]
      : []),
    ...(choreography.restart_information || choreography.tag_information
      ? ["", "Sequence Notes:"]
      : []),
    ...(choreography.restart_information
      ? [`• Restart Information: ${choreography.restart_information}`]
      : []),
    ...(choreography.tag_information ? [`• Tag Information: ${choreography.tag_information}`] : []),
    ...(choreography.tags.length > 0
      ? ["", "Tags:", ...choreography.tags.map((tag) => `• ${tag}`)]
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
