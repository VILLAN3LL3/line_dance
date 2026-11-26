import { describe, expect, it } from 'vitest';
import {
  TOP_CHOREOGRAPHERS,
  buildRepertoireStatistics,
  tempoClass,
} from '../../features/statistics/operations.ts';
import type { RepertoireStatistics } from '../../contracts/api.ts';
import type { AuthorRow, RepertoireRow } from '../../features/statistics/operations.ts';

function row(id: number, overrides: Partial<RepertoireRow> = {}): RepertoireRow {
  return {
    choreography_id: id,
    creation_year: 2020,
    level_name: 'BEGINNER',
    level_value: 30,
    learned_on: '2026-01-15',
    bpm: 120,
    genre: 'Country',
    ...overrides,
  };
}

const build = (
  rows: RepertoireRow[],
  authors: AuthorRow[] = [],
  practice: { month: string; practices: number }[] = [],
): RepertoireStatistics => buildRepertoireStatistics(rows, authors, practice);

const labels = (items: { label: string; count: number }[]): string[] =>
  items.map((item) => `${item.label}:${item.count}`);

describe('tempoClass', () => {
  it('uses the lower bound of a class and puts missing values to unknown', () => {
    expect([null, 0, 99, 100, 119, 120, 159, 160, 250].map((bpm) => tempoClass(bpm).key)).toEqual([
      'unknown',
      'unknown',
      'bpm-0',
      'bpm-100',
      'bpm-100',
      'bpm-120',
      'bpm-140',
      'bpm-160',
      'bpm-160',
    ]);
  });
});

describe('buildRepertoireStatistics', () => {
  it('is empty without learned dances', () => {
    const stats = build([]);
    expect(stats).toMatchObject({
      total: 0,
      levels: [],
      genres: [],
      choreographers: [],
      other_choreographers: 0,
      years: [],
      timeline: { months: [], undated: 0 },
    });
    expect(stats.tempo.every((item) => item.count === 0)).toBe(true);
    expect(stats.tempo).toHaveLength(5);
  });

  it('orders the levels by their value and puts unknown last', () => {
    const stats = build([
      row(1, { level_name: 'IMPROVER', level_value: 70 }),
      row(2, { level_name: 'ABSOLUTE BEGINNER', level_value: 10 }),
      row(3, { level_name: null, level_value: null }),
      row(4, { level_name: 'IMPROVER', level_value: 70 }),
    ]);
    expect(labels(stats.levels)).toEqual(['ABSOLUTE BEGINNER:1', 'IMPROVER:2', 'Unknown:1']);
  });

  it('counts the tempo classes, with unknown only when needed', () => {
    const stats = build([row(1, { bpm: 95 }), row(2, { bpm: 130 }), row(3, { bpm: 131 })]);
    expect(labels(stats.tempo)).toEqual([
      'Below 100 BPM:1',
      '100–119 BPM:0',
      '120–139 BPM:2',
      '140–159 BPM:0',
      '160 BPM and above:0',
    ]);
    expect(labels(build([row(1, { bpm: null })]).tempo).at(-1)).toBe('Unknown:1');
  });

  it('counts genres by frequency, ignoring case, with unknown last', () => {
    const stats = build([
      row(1, { genre: 'Country' }),
      row(2, { genre: 'country' }),
      row(3, { genre: 'Pop' }),
      row(4, { genre: null }),
      row(5, { genre: ' ' }),
      row(6, { genre: 'Latin' }),
    ]);
    expect(labels(stats.genres)).toEqual(['Country:2', 'Latin:1', 'Pop:1', 'Unknown:2']);
  });

  it('lists the years ascending with unknown last', () => {
    const stats = build([
      row(1, { creation_year: 2021 }),
      row(2, { creation_year: 2019 }),
      row(3, { creation_year: null }),
      row(4, { creation_year: 2021 }),
    ]);
    expect(labels(stats.years)).toEqual(['2019:1', '2021:2', 'Unknown:1']);
  });

  describe('choreographers', () => {
    it('counts a dance for each of its choreographers, only for learned dances', () => {
      const stats = build(
        [row(1), row(2), row(3)],
        [
          { choreography_id: 1, author_name: 'Ann' },
          { choreography_id: 1, author_name: 'Bob' },
          { choreography_id: 2, author_name: 'Ann' },
          { choreography_id: 2, author_name: 'ann' },
          { choreography_id: 99, author_name: 'Zed' },
        ],
      );
      expect(labels(stats.choreographers)).toEqual(['Ann:2', 'Bob:1', 'Unknown:1']);
      expect(stats.other_choreographers).toBe(0);
    });

    it('shows the most frequent ones and counts the rest', () => {
      const dances = Array.from({ length: 14 }, (_, index) => row(index + 1));
      const authors = dances.map((dance) => ({
        choreography_id: dance.choreography_id,
        author_name: `Author ${String(dance.choreography_id).padStart(2, '0')}`,
      }));
      const stats = build(dances, [...authors, { choreography_id: 14, author_name: 'Author 01' }]);
      expect(stats.choreographers).toHaveLength(TOP_CHOREOGRAPHERS);
      expect(stats.choreographers[0]).toMatchObject({ label: 'Author 01', count: 2 });
      expect(stats.other_choreographers).toBe(4);
    });
  });

  describe('timeline', () => {
    it('fills the gaps between months and accumulates the learned dances', () => {
      const stats = build(
        [
          row(1, { learned_on: '2026-01-10' }),
          row(2, { learned_on: '2026-01-20' }),
          row(3, { learned_on: '2026-04-02' }),
          row(4, { learned_on: null }),
        ],
        [],
        [{ month: '2026-03', practices: 7 }],
      );
      expect(stats.timeline.undated).toBe(1);
      expect(stats.timeline.months).toEqual([
        { month: '2026-01', learned: 2, total_learned: 3, practices: 0 },
        { month: '2026-02', learned: 0, total_learned: 3, practices: 0 },
        { month: '2026-03', learned: 0, total_learned: 3, practices: 7 },
        { month: '2026-04', learned: 1, total_learned: 4, practices: 0 },
      ]);
    });

    it('crosses the turn of the year and covers practice outside the learned months', () => {
      const stats = build(
        [row(1, { learned_on: '2025-11-30' })],
        [],
        [
          { month: '2026-02', practices: 2 },
          { month: '2025-10', practices: 1 },
        ],
      );
      expect(stats.timeline.months.map((month) => month.month)).toEqual([
        '2025-10',
        '2025-11',
        '2025-12',
        '2026-01',
        '2026-02',
      ]);
      expect(stats.timeline.months[0]).toMatchObject({
        learned: 0,
        total_learned: 0,
        practices: 1,
      });
      expect(stats.timeline.months[4].total_learned).toBe(1);
    });

    it('has no months when only dances without a date exist', () => {
      expect(build([row(1, { learned_on: null })]).timeline).toEqual({ months: [], undated: 1 });
    });
  });
});
