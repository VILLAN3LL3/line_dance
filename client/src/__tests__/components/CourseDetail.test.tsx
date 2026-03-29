import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import {
  addChoreographyToSession, createSession, deleteSession, fetchChoreographies, getDanceCourses, getSessionChoreographies, getSessions,
  removeChoreographyFromSession
} from "../../api";
import CourseDetail from "../../components/CourseDetail";

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../api', () => ({
  addChoreographyToSession: vi.fn(),
  createSession: vi.fn(),
  deleteSession: vi.fn(),
  fetchChoreographies: vi.fn(),
  getDanceCourses: vi.fn(),
  getSessionChoreographies: vi.fn(),
  getSessions: vi.fn(),
  removeChoreographyFromSession: vi.fn(),
}));

describe('CourseDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(getDanceCourses).mockResolvedValue([
      {
        id: 7,
        dance_group_id: 2,
        dance_group_name: 'Group Two',
        semester: 'WS 2025',
        created_at: '2024-01-01',
      },
    ]);
    vi.mocked(getSessions).mockResolvedValue([
      {
        id: 11,
        dance_course_id: 7,
        session_date: '2025-01-15',
        dance_group_name: 'Group Two',
        semester: 'WS 2025',
        created_at: '2024-01-01',
      },
    ]);
    vi.mocked(fetchChoreographies).mockResolvedValue({
      data: [
        {
          id: 101,
          name: 'Dance One',
          level: 'Beginner',
          authors: [],
          tags: [],
          step_figures: [],
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ],
      pagination: { page: 1, limit: 10000, total: 1, totalPages: 1 },
    });
    vi.mocked(getSessionChoreographies).mockResolvedValue([]);
    vi.mocked(createSession).mockResolvedValue({
      id: 12,
      dance_course_id: 7,
      session_date: '2025-02-01',
      dance_group_name: 'Group Two',
      semester: 'WS 2025',
      created_at: '2024-01-01',
    });
    vi.mocked(addChoreographyToSession).mockResolvedValue({ id: 1, session_id: 11, choreography_id: 101, created_at: '2024-01-01' });
    vi.mocked(deleteSession).mockResolvedValue({ message: 'ok' });
    vi.mocked(removeChoreographyFromSession).mockResolvedValue({ message: 'ok' });
  });

  function renderWithRoute() {
    return render(
      <MemoryRouter initialEntries={['/admin/groups/2/courses/7']}>
        <Routes>
          <Route path="/admin/groups/:groupId/courses/:courseId" element={<CourseDetail />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('creates a new session from the session form', async () => {
    renderWithRoute();

    await screen.findByText(/Course: 7/);

    fireEvent.change(screen.getByDisplayValue(''), { target: { value: '2025-02-01' } });
    fireEvent.click(screen.getByRole('button', { name: '+ Add Session' }));

    await waitFor(() => {
      expect(createSession).toHaveBeenCalledWith(7, '2025-02-01');
    });
  });

  it('selects a session and adds choreography to that session', async () => {
    renderWithRoute();

    await screen.findByText(/Course: 7/);

    fireEvent.click(screen.getByRole('button', { name: /manage/i }));

    const input = screen.getByPlaceholderText('Search choreography by name...');
    fireEvent.change(input, { target: { value: 'Dance One (Beginner)' } });
    const addButton = screen.getByRole('button', { name: '+ Add to Session' });
    await waitFor(() => {
      expect(addButton).toBeEnabled();
    });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(addChoreographyToSession).toHaveBeenCalledWith(11, 101);
    });
  });
});
