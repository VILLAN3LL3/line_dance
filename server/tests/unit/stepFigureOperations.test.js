import { describe, expect, it } from 'vitest';
import {
  buildHierarchy,
  checkFigureUsage,
  validateExistingComponents,
  validateFigure,
  validateFigureId,
  validateNoSelfComponent,
} from '../../features/step-figures/operations.js';

describe('step figure operations', () => {
  it('validates and normalizes figure inputs', () => {
    expect(validateFigureId('bad')).toEqual({ error: 'invalid_id' });
    expect(validateFigureId('12')).toEqual({ value: 12 });
    expect(validateFigure({ name: ' ' })).toEqual({ error: 'name_required' });
    expect(validateFigure({ name: ' Waltz ', component_ids: ['2', 2, 0, 'bad', 3] })).toEqual({
      value: { name: 'Waltz', componentIds: [2, 3] },
    });
  });

  it('rejects self references and missing components', () => {
    expect(validateNoSelfComponent(1, [1, 2])).toEqual({ error: 'self_component' });
    expect(validateNoSelfComponent(1, [2])).toEqual({ value: true });
    expect(validateExistingComponents([2, 3], [{ id: 2 }])).toEqual({ error: 'missing_component' });
    expect(validateExistingComponents([2], [{ id: 2 }])).toEqual({ value: true });
  });

  it('prioritizes choreography use over parent use when checking deletion', () => {
    expect(checkFigureUsage({ choreography_usage_count: 1, parent_count: 1 })).toEqual({
      error: 'used_by_choreography',
    });
    expect(checkFigureUsage({ choreography_usage_count: 0, parent_count: 1 })).toEqual({
      error: 'used_as_component',
    });
    expect(checkFigureUsage({ choreography_usage_count: 0, parent_count: 0 })).toEqual({
      value: true,
    });
  });

  it('builds ordered components, parents and usage counts', () => {
    expect(
      buildHierarchy(
        [
          { id: 1, name: 'Parent', used_by_choreography_count: '2' },
          { id: 2, name: 'Child' },
        ],
        [
          {
            parent_step_figure_id: 1,
            child_step_figure_id: 2,
            parent_name: 'Parent',
            child_name: 'Child',
          },
        ],
      ),
    ).toEqual([
      {
        id: 1,
        name: 'Parent',
        components: [{ id: 2, name: 'Child' }],
        parents: [],
        used_by_choreography_count: 2,
      },
      {
        id: 2,
        name: 'Child',
        components: [],
        parents: [{ id: 1, name: 'Parent' }],
        used_by_choreography_count: 0,
      },
    ]);
  });
});
