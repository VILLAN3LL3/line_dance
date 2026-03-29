import "../styles/DanceGroupDetail.css";

import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  addGroupLevel, deleteDanceCourse, exportDanceCoursePdf, fetchChoreographies, getDanceCourses, getDanceGroup, getGroupLevels,
  getLearnedChoreographies, getSessions, removeGroupLevel
} from "../api";
import { Choreography, DanceCourse, DanceGroup, LearnedChoreography, Session } from "../types";
import { CourseStatus, getBerlinTodayIso, getCourseStatus, getCourseStatusLabel } from "../utils/courseStatus";

const DanceGroupDetail: React.FC = () => {
  const navigate = useNavigate();
  const { groupId } = useParams<{ groupId: string }>();
  const parsedGroupId = Number(groupId);
  const [group, setGroup] = useState<DanceGroup | null>(null);
  const [courses, setCourses] = useState<DanceCourse[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [learnedChoreographies, setLearnedChoreographies] = useState<LearnedChoreography[]>([]);
  const [choreographies, setChoreographies] = useState<Choreography[]>([]);
  const [groupLevels, setGroupLevels] = useState<string[]>([]);
  const [newLevel, setNewLevel] = useState("");
  const [showPlannedCourses, setShowPlannedCourses] = useState(false);
  const [showPassedCourses, setShowPassedCourses] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(parsedGroupId)) {
      setError("Invalid dance group id");
      return;
    }
    void loadData();
  }, [parsedGroupId]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [groupData, coursesData, sessionsData, learnedData, choreosData, levelsData] = await Promise.all([
        getDanceGroup(parsedGroupId),
        getDanceCourses(parsedGroupId),
        getSessions(),
        getLearnedChoreographies(parsedGroupId),
        fetchChoreographies(1, 10000),
        getGroupLevels(parsedGroupId),
      ]);
      setGroup(groupData);
      setCourses(coursesData);
      setSessions(sessionsData);
      setLearnedChoreographies(learnedData);
      setChoreographies(choreosData.data);
      setGroupLevels(levelsData);
    } catch (err) {
      setError("Failed to load group data");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCourse = async (courseId: number) => {
    if (!confirm("Are you sure you want to delete this course and all related sessions?")) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await deleteDanceCourse(courseId);
      await loadData();
    } catch (err) {
      setError("Failed to delete course");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCoursePdf = async (course: DanceCourse) => {
    setIsLoading(true);
    setError(null);
    try {
      const pdfBlob = await exportDanceCoursePdf(course.id);
      const downloadUrl = URL.createObjectURL(pdfBlob);
      const safeSemester = course.semester
        .split(/[^a-zA-Z0-9_-]+/)
        .filter(Boolean)
        .join("_");
      const fileName = `Kurs-${course.id}-${safeSemester}.pdf`;

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF-Export fehlgeschlagen");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLevel.trim()) {
      setError("Level name is required");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await addGroupLevel(parsedGroupId, newLevel);
      setNewLevel("");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add level");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveLevel = async (level: string) => {
    if (!confirm(`Remove level "${level}"?`)) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await removeGroupLevel(parsedGroupId, level);
      await loadData();
    } catch (err) {
      setError("Failed to remove level");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const berlinTodayIso = getBerlinTodayIso();

  const learnedStepFigures = Array.from(
    new Set(
      learnedChoreographies
        .filter((learned) => {
          // Include choreographies first scheduled in the past
          return learned.first_learned_date < berlinTodayIso;
        })
        .flatMap(
          (learned) => choreographies.find((c) => c.id === learned.choreography_id)?.step_figures ?? []
        )
    )
  ).sort((a, b) => a.localeCompare(b));

  const handleSearchChoreographies = () => {
    navigate("/", {
      state: {
        initialFilters: {
          step_figures: learnedStepFigures,
          level: groupLevels,
          step_figures_match_mode: "exact",
        },
      },
    });
  };

  const sessionsByCourseId = sessions.reduce<Record<number, Session[]>>((acc, session) => {
    if (!acc[session.dance_course_id]) {
      acc[session.dance_course_id] = [];
    }
    acc[session.dance_course_id].push(session);
    return acc;
  }, {});

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

          return (
            <div key={course.id} className="course-item">
              <div className="course-info">
                <h4>
                  {course.id} <span className="course-semester">({course.semester})</span>
                  <span
                    className={`course-status-badge course-status-${courseStatus}`}
                  >
                    {getCourseStatusLabel(courseStatus)}
                  </span>
                </h4>
                {course.start_date && <p>Started: {new Date(course.start_date).toLocaleDateString()}</p>}
                {course.trainer_name && (
                  <p>
                    Trainer: {course.trainer_name}
                  </p>
                )}
                <div className="course-links">
                  {course.youtube_playlist_url && (
                    <a href={course.youtube_playlist_url} target="_blank" rel="noopener noreferrer">
                      🔗 YouTube
                    </a>
                  )}
                  {course.copperknob_list_url && (
                    <a href={course.copperknob_list_url} target="_blank" rel="noopener noreferrer">
                      🔗 Copperknob
                    </a>
                  )}
                  {course.spotify_playlist_url && (
                    <a href={course.spotify_playlist_url} target="_blank" rel="noopener noreferrer">
                      🔗 Spotify
                    </a>
                  )}
                </div>
              </div>
              <div className="course-actions">
                <button
                  onClick={() => handleExportCoursePdf(course)}
                  className="btn-secondary"
                  disabled={isLoading}
                >
                  📄 PDF Export
                </button>
                <button
                  onClick={() => navigate(`/admin/groups/${parsedGroupId}/courses/${course.id}`)}
                  className="btn-secondary"
                  disabled={isLoading}
                >
                  📅 Manage Sessions
                </button>
                <button
                  onClick={() => navigate(`/admin/groups/${parsedGroupId}/courses/${course.id}/edit`)}
                  className="btn-edit"
                  disabled={isLoading}
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => handleDeleteCourse(course.id)}
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
    <div className="dance-group-detail">
      <div className="detail-header">
        <button onClick={() => navigate("/admin")} className="btn-back">
          ← Back to Groups
        </button>
        <h2>{group?.name ?? "Dance Group"}</h2>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="detail-content">
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

        <section className="section">
          <h3>Group Levels</h3>
          <form onSubmit={handleAddLevel} className="level-form">
            <input
              type="text"
              placeholder="Add a new level (e.g., Beginner, Intermediate)"
              value={newLevel}
              onChange={(e) => setNewLevel(e.target.value)}
              list="available-levels"
              disabled={isLoading}
            />
            <datalist id="available-levels">
              {Array.from(
                new Set(
                  choreographies
                    .map((c) => c.level)
                    .filter((level) => !groupLevels.includes(level))
                )
              )
                .sort((a, b) => a.localeCompare(b))
                .map((level) => (
                  <option key={level} value={level} />
                ))}
            </datalist>
            <button type="submit" className="btn-primary" disabled={isLoading}>
              + Add Level
            </button>
          </form>

          {groupLevels.length === 0 ? (
            <div className="empty-state">No levels configured yet</div>
          ) : (
            <div className="tags-container">
              {groupLevels.map((level) => (
                <span key={level} className="tag">
                  {level}
                  <button
                    type="button"
                    onClick={() => handleRemoveLevel(level)}
                    className="btn-remove"
                    disabled={isLoading}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </section>

        <section className="section">
          <h3>Learned Step Figures</h3>
          {learnedStepFigures.length === 0 ? (
            <div className="empty-state">No step figures learned yet</div>
          ) : (
            <>
              <div className="tags-container">
                {learnedStepFigures.map((figure) => (
                  <span key={figure} className="tag">
                    {figure}
                  </span>
                ))}
              </div>
              <div style={{ marginTop: "15px" }}>
                <button
                  onClick={handleSearchChoreographies}
                  className="btn-primary"
                  disabled={isLoading}
                >
                  Search Choreographies
                </button>
              </div>
            </>
          )}
        </section>

        <section className="section">
          <h3>Learned Choreographies for {group?.name ?? "this group"}</h3>
          {learnedChoreographies.length === 0 ? (
            <div className="empty-state">No choreographies learned yet</div>
          ) : (
            <div className="learned-list">
              <table className="learned-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Level</th>
                    <th>Times Danced</th>
                    <th>First Learned</th>
                    <th>Last Danced</th>
                  </tr>
                </thead>
                <tbody>
                  {[...learnedChoreographies]
                    .sort((a, b) => new Date(a.first_learned_date).getTime() - new Date(b.first_learned_date).getTime())
                    .map((learned) => {
                      const choreography = choreographies.find((c) => c.id === learned.choreography_id);
                      return (
                        <tr
                          key={`${learned.dance_group_id}-${learned.choreography_id}`}
                          onClick={() => navigate(`/choreographies/${learned.choreography_id}`)}
                          className="clickable-row"
                        >
                          <td>{choreography?.name ?? `Unknown (ID: ${learned.choreography_id})`}</td>
                          <td>{choreography?.level ?? "N/A"}</td>
                          <td>{learned.times_danced}</td>
                          <td>{new Date(learned.first_learned_date).toLocaleDateString()}</td>
                          <td>{new Date(learned.last_danced_date).toLocaleDateString()}</td>
                        </tr>
                      );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default DanceGroupDetail;
