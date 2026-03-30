const base = 'http://localhost:3001/api/choreographies/search';
const levels = ['Absolute Beginner', 'Easy Beginner', 'Beginner'];
const figures = [
  'Point', 'Rock Step', 'Grapevine', 'Heel Switch', 'Heel Bounce', 'Hitch', 'Coaster Step', 'Pivot', 'Brush', 'Diagonal Step',
  'Hip Bump', 'Hip Sway', 'Kick', 'Swivel', 'Rocking Chair', 'Scuff', 'Drag', 'Knee Pop', 'Cross Step', 'Shoop',
];

async function run(includeFlick) {
  const params = new URLSearchParams();
  for (const level of levels) params.append('level[]', level);
  for (const figure of figures) params.append('step_figures[]', figure);
  if (includeFlick) params.append('step_figures[]', 'Flick');
  params.set('max_count', '32');
  params.set('step_figures_match_mode', 'exact');
  params.set('page', '1');
  params.set('limit', '10000');

  const response = await fetch(`${base}?${params.toString()}`);
  const payload = await response.json();
  return {
    status: response.status,
    total: payload?.pagination?.total ?? 0,
    names: Array.isArray(payload?.data) ? payload.data.map((x) => x.name) : [],
  };
}

const withoutFlick = await run(false);
const withFlick = await run(true);

const removed = withoutFlick.names.filter((name) => !withFlick.names.includes(name));

console.log('without Flick status:', withoutFlick.status, 'total:', withoutFlick.total);
console.log('with Flick status:', withFlick.status, 'total:', withFlick.total);
console.log('removed by adding Flick:', removed.length);
if (removed.length > 0) {
  console.log('examples removed:', removed.slice(0, 10).join(' | '));
}
