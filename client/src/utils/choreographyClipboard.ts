import type { Choreography } from "../types";

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

export function buildChoreographyClipboardText(choreography: Choreography): string {
  const title = buildTitle(choreography);
  const countWall = buildCountWall(choreography);

  const sections: string[] = [
    title,
    "",
    `Level: ${choreography.level}`,
    ...(countWall ? [`Count / Wall: ${countWall}`] : []),
    ...buildMusicSection(choreography),
    ...(choreography.authors.length > 0
      ? ["", "Choreographers:", ...choreography.authors.map((author) => `• ${author}`)]
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
