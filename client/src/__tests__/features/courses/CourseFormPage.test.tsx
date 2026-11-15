import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fireEvent, screen, waitFor } from "@testing-library/react";

import {
  createDanceCourse,
  getDanceCourses,
  updateDanceCourse,
} from "../../../features/courses/api";
import CourseFormPage from "../../../features/courses/views/CourseFormPage";
import { getDanceGroup } from "../../../features/dance-groups/api";
import { getTrainers } from "../../../features/trainers/api";
import { renderWithQueryClient as render } from "../../helpers/renderWithQueryClient";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../../../features/courses/api", () => ({
  createDanceCourse: vi.fn(),
  getDanceCourses: vi.fn(),
  updateDanceCourse: vi.fn(),
}));
vi.mock("../../../features/dance-groups/api", () => ({ getDanceGroup: vi.fn() }));
vi.mock("../../../features/trainers/api", () => ({ getTrainers: vi.fn() }));

describe("CourseFormPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDanceGroup).mockResolvedValue({
      id: 5,
      name: "Group Five",
      created_at: "2024-01-01",
    });
    vi.mocked(getTrainers).mockResolvedValue([
      { id: 2, name: "Trainer One", phone: "123", email: "t@e.com", created_at: "2024-01-01" },
    ]);
    vi.mocked(getDanceCourses).mockResolvedValue([
      {
        id: 9,
        course_id: 9,
        name: "Existing Course",
        dance_group_id: 5,
        dance_group_name: "Group Five",
        semester: "WS 2025",
        start_date: "2025-01-01",
        trainer_id: 2,
        created_at: "2024-01-01",
      },
    ]);
    vi.mocked(createDanceCourse).mockResolvedValue({
      id: 10,
      course_id: null,
      name: "New Course",
      dance_group_id: 5,
      dance_group_name: "Group Five",
      semester: "WS 2026",
      created_at: "2024-01-01",
    });
    vi.mocked(updateDanceCourse).mockResolvedValue({
      id: 9,
      course_id: 9,
      name: "Existing Course",
      dance_group_id: 5,
      dance_group_name: "Group Five",
      semester: "SS 2026",
      created_at: "2024-01-01",
    });
  });

  it("creates a new course and navigates back to group page", async () => {
    render(
      <MemoryRouter initialEntries={["/admin/groups/5/courses/new"]}>
        <Routes>
          <Route path="/admin/groups/:groupId/courses/new" element={<CourseFormPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByRole("heading", { level: 2, name: "Create Course" });

    fireEvent.change(screen.getByLabelText("Course Name"), {
      target: { value: "New Course" },
    });
    fireEvent.change(screen.getByLabelText("Semester"), { target: { value: "WS 2026" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Course" }));

    await waitFor(() => {
      expect(createDanceCourse).toHaveBeenCalledWith(
        expect.objectContaining({
          danceGroupId: 5,
          semester: "WS 2026",
          name: "New Course",
        }),
      );
      expect(mockNavigate).toHaveBeenCalledWith("/admin/groups/5");
    });
  });

  it("shows the server's course conflict message instead of the HTTP status", async () => {
    vi.mocked(createDanceCourse).mockRejectedValue(
      Object.assign(new Error("Request failed with status code 400"), {
        isAxiosError: true,
        response: { status: 400, data: { error: "This course ID is already in use" } },
      }),
    );
    render(
      <MemoryRouter initialEntries={["/admin/groups/5/courses/new"]}>
        <Routes>
          <Route path="/admin/groups/:groupId/courses/new" element={<CourseFormPage />} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByText("Group: Group Five");
    fireEvent.change(screen.getByLabelText("Course Name"), { target: { value: "New Course" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Course" }));
    expect(await screen.findByText("This course ID is already in use")).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("shows a duplicate course ID next to the field and clears it when the ID changes", async () => {
    vi.mocked(createDanceCourse).mockRejectedValue(
      Object.assign(new Error("Request failed with status code 400"), {
        isAxiosError: true,
        response: {
          status: 400,
          data: {
            error: "This course ID is already in use",
            issues: [{ field: "course_id", key: "duplicate" }],
          },
        },
      }),
    );
    render(
      <MemoryRouter initialEntries={["/admin/groups/5/courses/new"]}>
        <Routes>
          <Route path="/admin/groups/:groupId/courses/new" element={<CourseFormPage />} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByText("Group: Group Five");
    const id = screen.getByLabelText("Course ID");
    fireEvent.change(id, { target: { value: "9" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Course" }));
    await screen.findByText("This course ID is already in use.");
    expect(id).toHaveAttribute("aria-invalid", "true");
    expect(id).toHaveAccessibleDescription("This course ID is already in use.");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Course Name"), { target: { value: "Other" } });
    expect(id).toHaveAttribute("aria-invalid", "true");
    fireEvent.change(id, { target: { value: "10" } });
    expect(id).not.toHaveAttribute("aria-invalid");
    expect(screen.queryByText("This course ID is already in use.")).not.toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
    vi.mocked(createDanceCourse).mockResolvedValue({
      id: 10,
      course_id: 10,
      name: "Other",
      dance_group_id: 5,
      dance_group_name: "Group Five",
      semester: null,
      created_at: "2024-01-01",
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Course" }));
    await waitFor(() => {
      expect(createDanceCourse).toHaveBeenLastCalledWith(expect.objectContaining({ courseId: 10 }));
      expect(mockNavigate).toHaveBeenCalledWith("/admin/groups/5");
    });
  });

  it("shows a duplicate name on edit and clears it when the semester changes", async () => {
    vi.mocked(getDanceCourses).mockResolvedValue([
      {
        id: 9,
        course_id: null,
        name: "Existing Course",
        dance_group_id: 5,
        dance_group_name: "Group Five",
        semester: "WS 2025",
        created_at: "2024-01-01",
      },
    ]);
    vi.mocked(updateDanceCourse).mockRejectedValue(
      Object.assign(new Error("Request failed with status code 400"), {
        isAxiosError: true,
        response: {
          status: 400,
          data: {
            error: "A course without an ID already has this name in this group and semester",
            issues: [{ field: "name", key: "duplicate" }],
          },
        },
      }),
    );
    render(
      <MemoryRouter initialEntries={["/admin/groups/5/courses/9/edit"]}>
        <Routes>
          <Route
            path="/admin/groups/:groupId/courses/:courseId/edit"
            element={<CourseFormPage />}
          />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByDisplayValue("WS 2025");
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    const message = "A course without an ID already has this name in this group and semester.";
    await screen.findByText(message);
    const name = screen.getByLabelText("Course Name");
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(name).toHaveAccessibleDescription(message);
    fireEvent.change(screen.getByLabelText("Semester"), { target: { value: "SS 2026" } });
    expect(name).not.toHaveAttribute("aria-invalid");
    expect(screen.queryByText(message)).not.toBeInTheDocument();
  });

  it("shows a general message for an unknown backend issue", async () => {
    vi.mocked(createDanceCourse).mockRejectedValue(
      Object.assign(new Error("Request failed with status code 400"), {
        isAxiosError: true,
        response: {
          status: 400,
          data: { error: "Unexpected validation issue", issues: [{ field: "x", key: "unknown" }] },
        },
      }),
    );
    render(
      <MemoryRouter initialEntries={["/admin/groups/5/courses/new"]}>
        <Routes>
          <Route path="/admin/groups/:groupId/courses/new" element={<CourseFormPage />} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByText("Group: Group Five");
    fireEvent.change(screen.getByLabelText("Course Name"), { target: { value: "Course" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Course" }));
    expect(await screen.findByText("Unexpected validation issue")).toBeInTheDocument();
  });

  it("loads existing course in edit mode and submits update", async () => {
    render(
      <MemoryRouter initialEntries={["/admin/groups/5/courses/9/edit"]}>
        <Routes>
          <Route
            path="/admin/groups/:groupId/courses/:courseId/edit"
            element={<CourseFormPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByDisplayValue("WS 2025")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Course ID"), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("Semester"), { target: { value: "SS 2026" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(updateDanceCourse).toHaveBeenCalledWith(9, {
        semester: "SS 2026",
        name: "Existing Course",
        startDate: "2025-01-01",
        youtubePlaylistUrl: undefined,
        copperknobListUrl: undefined,
        spotifyPlaylistUrl: undefined,
        trainerId: 2,
        courseId: 10,
      });
      expect(mockNavigate).toHaveBeenCalledWith("/admin/groups/5");
    });
  });
});
