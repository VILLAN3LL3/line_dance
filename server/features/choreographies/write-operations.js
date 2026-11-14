export function normalizeChoreographyInformation(value) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return null;

  const normalized = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') return null;
    if (typeof item.category !== 'string' || typeof item.description !== 'string') return null;
    const category = item.category.trim();
    const description = item.description.trim();
    if (category && description) normalized.push({ category, description });
  }
  return normalized;
}

export function prepareChoreography(input) {
  const {
    name,
    step_sheet_link,
    demo_video_url,
    tutorial_video_url,
    count,
    wall_count,
    level,
    creation_year,
    song,
    artist,
    authors,
    tags,
    step_figures,
  } = input;
  return {
    name,
    step_sheet_link: step_sheet_link || null,
    demo_video_url: demo_video_url || null,
    tutorial_video_url: tutorial_video_url || null,
    count: count || null,
    wall_count: wall_count || null,
    level,
    creation_year: creation_year || null,
    song: song || null,
    artist: artist || null,
    authors,
    tags,
    step_figures,
    information: normalizeChoreographyInformation(input.choreography_information),
  };
}
