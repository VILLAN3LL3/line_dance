import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import { DanceCourse, Session } from "../types";
import { CourseStatus, getBerlinTodayIso, getCourseStatus, getCourseStatusLabel } from "../utils/courseStatus";
import { getYouTubePlaylistPageUrl } from "../utils/youtube";

interface DanceGroupCoursesSectionProps {
  courses: DanceCourse[];
  sessionsByCourseId: Record<number, Session[]>;
  isLoading: boolean;
  parsedGroupId: number;
  onDeleteCourse: (courseId: number) => Promise<void>;
  onExportCoursePdf: (course: DanceCourse) => Promise<void>;
}

export const DanceGroupCoursesSection: React.FC<DanceGroupCoursesSectionProps> = ({
  courses,
  sessionsByCourseId,
  isLoading,
  parsedGroupId,
  onDeleteCourse,
  onExportCoursePdf,
}) => {
  const navigate = useNavigate();
  const [showPlannedCourses, setShowPlannedCourses] = useState(false);
  const [showPassedCourses, setShowPassedCourses] = useState(false);

  const berlinTodayIso = getBerlinTodayIso();

  const visibleCourseStatuses = new Set<CourseStatus>([
    "running",
    ...(showPlannedCourses ? ["planned" as const] : []),
    ...(showPassedCourses ? ["passed" as const] : []),
  ]);

  const filteredCourses = courses.filter((course) => {
    const courseSessions = sessionsByCourseId[course.id] ?? [];
    const courseStatus = getCourseStatus(course, courseSessions, berlinTodayIso);
    return visibleCourseStatuses.has(courseStatus);
  });

  let coursesContent: React.ReactNode;
  if (courses.length === 0) {
    coursesContent = <div className="empty-state">No courses yet</div>;
  } else if (filteredCourses.length === 0) {
    coursesContent = <div className="empty-state">No running courses for the selected filters</div>;
  } else {
    coursesContent = (
      <div className="courses-list">
        {filteredCourses.map((course) => {
          const courseSessions = sessionsByCourseId[course.id] ?? [];
          const courseStatus = getCourseStatus(course, courseSessions, berlinTodayIso);
          const playlistPageUrl = getYouTubePlaylistPageUrl(course.youtube_playlist_url);

          return (
            <div key={course.id} className="course-item">
              <div className="course-info">
                <h4>
                  {course.id} <span className="course-semester">({course.semester})</span>
                  <span className={`course-status-badge course-status-${courseStatus}`}>
                    {getCourseStatusLabel(courseStatus)}
                  </span>
                </h4>
                {course.start_date && (
                  <p>Started: {new Date(course.start_date).toLocaleDateString()}</p>
                )}
                {course.trainer_name && <p>Trainer: {course.trainer_name}</p>}
                <div className="course-links">
                  {course.youtube_playlist_url && (
                    <a
                      href={playlistPageUrl ?? course.youtube_playlist_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Link: YouTube
                    </a>
                  )}
                  {course.copperknob_list_url && (
                    <a href={course.copperknob_list_url} target="_blank" rel="noopener noreferrer">
                      Link: Copperknob
                    </a>
                  )}
                  {course.spotify_playlist_url && (
                    <a href={course.spotify_playlist_url} target="_blank" rel="noopener noreferrer">
                      Link: Spotify
                    </a>
                  )}
                </div>
              </div>
              <div className="course-actions">
                <button
                  onClick={() => onExportCoursePdf(course)}
                  className="btn-secondary"
                  disabled={isLoading}
                >
                  PDF Export
                </button>
                <button
                  onClick={() => navigate(`/admin/groups/${parsedGroupId}/courses/${course.id}`)}
                  className="btn-secondary"
                  disabled={isLoading}
                >
                  Manage Sessions
                </button>
                <button
                  onClick={() =>
                    navigate(`/admin/groups/${parsedGroupId}/courses/${course.id}/edit`)
                  }
                  className="btn-edit"
                  disabled={isLoading}
                >
                  Edit
                </button>
                <button
                  onClick={() => onDeleteCourse(course.id)}
                  className="btn-delete"
                  disabled={isLoading}
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <section className="section">
      <div className="section-header-row">
        <h3>Dance Courses</h3>
        <div className="course-header-controls">
          <label className="status-filter">
            <input
              type="checkbox"
              checked={showPlannedCourses}
              onChange={(event) => setShowPlannedCourses(event.target.checked)}
              disabled={isLoading}
            />{" "}
            Planned
          </label>
          <label className="status-filter">
            <input
              type="checkbox"
              checked={showPassedCourses}
              onChange={(event) => setShowPassedCourses(event.target.checked)}
              disabled={isLoading}
            />{" "}
            Passed
          </label>
          <button
            className="btn-primary"
            type="button"
            onClick={() => navigate(`/admin/groups/${parsedGroupId}/courses/new`)}
            disabled={isLoading}
          >
            + New Course
          </button>
        </div>
      </div>

      {isLoading && <div className="loading">Loading...</div>}

      {coursesContent}
    </section>
  );
};
