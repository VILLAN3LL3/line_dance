function getChoreographyLinkIssues(data) {
  const issues = [];
  for (const field of ['step_sheet_link', 'demo_video_url', 'tutorial_video_url']) {
    const value = data[field];
    if (value === undefined || value === null || value === '') continue;
    if (typeof value !== 'string') {
      issues.push({ field, key: 'invalid_url' });
      continue;
    }
    if (!value.trim()) continue;
    try {
      new URL(value.trim());
    } catch {
      issues.push({ field, key: 'invalid_url' });
    }
  }
  return issues;
}

function getChoreographyInformationIssues(data) {
  const issues = [];
  if (data.choreography_information !== undefined) {
    if (!Array.isArray(data.choreography_information)) {
      issues.push({ field: 'choreography_information', key: 'invalid_information' });
    } else {
      data.choreography_information.forEach((item, index) => {
        if (!item || typeof item.category !== 'string' || typeof item.description !== 'string') {
          issues.push({ field: `choreography_information.${index}`, key: 'invalid_information' });
          return;
        }
        if (!item.category.trim() && item.description.trim()) {
          issues.push({ field: `choreography_information.${index}.category`, key: 'required' });
        }
        if (item.category.trim() && !item.description.trim()) {
          issues.push({ field: `choreography_information.${index}.description`, key: 'required' });
        }
      });
    }
  }
  return issues;
}

export function getChoreographyFieldIssues(data, { partial = false } = {}) {
  const issues = [...getChoreographyLinkIssues(data), ...getChoreographyInformationIssues(data)];
  for (const field of ['name', 'level']) {
    if (partial && data[field] === undefined) continue;
    if (typeof data[field] !== 'string' || !data[field].trim()) {
      issues.push({ field, key: 'required' });
    }
  }
  return issues;
}
