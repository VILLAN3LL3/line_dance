import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import { DanceCourse, Session } from "../../types";
import {
  CourseStatus,
  getBerlinTodayIso,
  getCourseStatus,
  getCourseStatusLabel,
} from "../../utils/courseStatus";
import { getYouTubePlaylistPageUrl } from "../../utils/youtube";
import {
  ActionButton,
  ActionGroup,
  CheckboxFilter,
  EmptyState,
  ExternalLink,
  LoadingState,
  Section,
  StatusBadge,
} from "../shared/ui";

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
    coursesContent = <EmptyState>No courses yet</EmptyState>;
  } else if (filteredCourses.length === 0) {
    coursesContent = <EmptyState>No running courses for the selected filters</EmptyState>;
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
                  <StatusBadge
                    status={courseStatus}
                    className="course-status-badge"
                    statusPrefix="course-status-"
                  >
                    {getCourseStatusLabel(courseStatus)}
                  </StatusBadge>
                </h4>
                {course.start_date && (
                  <p>Started: {new Date(course.start_date).toLocaleDateString()}</p>
                )}
                {course.trainer_name && <p>Trainer: {course.trainer_name}</p>}
                <div className="course-links">
                  {course.youtube_playlist_url && (
                    <ExternalLink href={playlistPageUrl ?? course.youtube_playlist_url}>
                      Link: YouTube
                    </ExternalLink>
                  )}
                  {course.copperknob_list_url && (
                    <ExternalLink href={course.copperknob_list_url}>Link: Copperknob</ExternalLink>
                  )}
                  {course.spotify_playlist_url && (
                    <ExternalLink href={course.spotify_playlist_url}>Link: Spotify</ExternalLink>
                  )}
                </div>
              </div>
              <ActionGroup className="course-actions">
                <ActionButton
                  onClick={() => onExportCoursePdf(course)}
                  variant="secondary"
                  disabled={isLoading}
                >
                  PDF Export
                </ActionButton>
                <ActionButton
                  onClick={() => navigate(`/admin/groups/${parsedGroupId}/courses/${course.id}`)}
                  variant="secondary"
                  disabled={isLoading}
                >
                  Manage Sessions
                </ActionButton>
                <ActionButton
                  onClick={() =>
                    navigate(`/admin/groups/${parsedGroupId}/courses/${course.id}/edit`)
                  }
                  variant="edit"
                  disabled={isLoading}
                >
                  Edit
                </ActionButton>
                <ActionButton
                  onClick={() => onDeleteCourse(course.id)}
                  variant="delete"
                  disabled={isLoading}
                >
                  Delete
                </ActionButton>
              </ActionGroup>
            </div>
          );
        })}
      </div>
    );
  }

  const sectionActions = (
    <div className="course-header-controls">
      <CheckboxFilter
        checked={showPlannedCourses}
        onChange={setShowPlannedCourses}
        disabled={isLoading}
      >
        Planned
      </CheckboxFilter>
      <CheckboxFilter
        checked={showPassedCourses}
        onChange={setShowPassedCourses}
        disabled={isLoading}
      >
        Passed
      </CheckboxFilter>
      <ActionButton
        variant="primary"
        onClick={() => navigate(`/admin/groups/${parsedGroupId}/courses/new`)}
        disabled={isLoading}
      >
        + New Course
      </ActionButton>
    </div>
  );

  return (
    <Section title="Dance Courses" actions={sectionActions}>
      {isLoading && <LoadingState />}
      {coursesContent}
    </Section>
  );
};
