import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { createDanceCourse, getDanceCourses, getDanceGroup, getTrainers, updateDanceCourse } from "../../api";
import CourseFormPage from "../../components/CourseFormPage";

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../api', () => ({
  createDanceCourse: vi.fn(),
  getDanceCourses: vi.fn(),
  getDanceGroup: vi.fn(),
  getTrainers: vi.fn(),
  updateDanceCourse: vi.fn(),
}));

describe('CourseFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDanceGroup).mockResolvedValue({ id: 5, name: 'Group Five', created_at: '2024-01-01' });
    vi.mocked(getTrainers).mockResolvedValue([{ id: 2, name: 'Trainer One', phone: '123', email: 't@e.com', created_at: '2024-01-01' }]);
    vi.mocked(getDanceCourses).mockResolvedValue([
      {
        id: 9,
        dance_group_id: 5,
        dance_group_name: 'Group Five',
        semester: 'WS 2025',
        start_date: '2025-01-01',
        trainer_id: 2,
        created_at: '2024-01-01',
      },
    ]);
    vi.mocked(createDanceCourse).mockResolvedValue({
      id: 10,
      dance_group_id: 5,
      dance_group_name: 'Group Five',
      semester: 'WS 2026',
      created_at: '2024-01-01',
    });
    vi.mocked(updateDanceCourse).mockResolvedValue({
      id: 9,
      dance_group_id: 5,
      dance_group_name: 'Group Five',
      semester: 'SS 2026',
      created_at: '2024-01-01',
    });
  });

  it('creates a new course and navigates back to group page', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/groups/5/courses/new']}>
        <Routes>
          <Route path="/admin/groups/:groupId/courses/new" element={<CourseFormPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { level: 2, name: 'Create Course' });

    fireEvent.change(screen.getByLabelText('Semester *'), { target: { value: 'WS 2026' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Course' }));

    await waitFor(() => {
      expect(createDanceCourse).toHaveBeenCalledWith(
        expect.objectContaining({
          danceGroupId: 5,
          semester: 'WS 2026',
        }),
      );
      expect(mockNavigate).toHaveBeenCalledWith('/admin/groups/5');
    });
  });

  it('loads existing course in edit mode and submits update', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/groups/5/courses/9/edit']}>
        <Routes>
          <Route path="/admin/groups/:groupId/courses/:courseId/edit" element={<CourseFormPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByDisplayValue('WS 2025')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Semester *'), { target: { value: 'SS 2026' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(updateDanceCourse).toHaveBeenCalledWith(
        9,
        'SS 2026',
        '2025-01-01',
        undefined,
        undefined,
        undefined,
        2,
      );
      expect(mockNavigate).toHaveBeenCalledWith('/admin/groups/5');
    });
  });
});
