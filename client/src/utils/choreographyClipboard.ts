import type { Choreography } from "../types";

export function buildChoreographyClipboardText(choreography: Choreography): string {
  const title = choreography.creation_year
    ? `${choreography.name} (${choreography.creation_year})`
    : choreography.name;

  const countWall =
    choreography.count && choreography.wall_count
      ? `${choreography.count} / ${choreography.wall_count}`
      : choreography.count
        ? `${choreography.count}`
        : choreography.wall_count
          ? `- / ${choreography.wall_count}`
          : null;

  const sections: string[] = [
    title,
    "",
    `Level: ${choreography.level}`,
    ...(countWall ? [`Count / Wall: ${countWall}`] : []),
    ...(choreography.authors.length > 0
      ? ["", "Authors:", ...choreography.authors.map((author) => `• ${author}`)]
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
