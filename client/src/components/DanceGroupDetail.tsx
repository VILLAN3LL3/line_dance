import "../styles/DanceGroupDetail.css";

import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  addGroupLevel, createDanceCourse, deleteDanceCourse, exportDanceCoursePdf, fetchChoreographies, getDanceCourses, getDanceGroup,
  getGroupLevels, getLearnedChoreographies, removeGroupLevel, updateDanceCourse
} from "../api";
import { Choreography, DanceCourse, DanceGroup, LearnedChoreography } from "../types";

const DanceGroupDetail: React.FC = () => {
  const navigate = useNavigate();
  const { groupId } = useParams<{ groupId: string }>();
  const parsedGroupId = Number(groupId);
  const [group, setGroup] = useState<DanceGroup | null>(null);
  const [courses, setCourses] = useState<DanceCourse[]>([]);
  const [learnedChoreographies, setLearnedChoreographies] = useState<LearnedChoreography[]>([]);
  const [choreographies, setChoreographies] = useState<Choreography[]>([]);
  const [groupLevels, setGroupLevels] = useState<string[]>([]);
  const [newCourseId, setNewCourseId] = useState("");
  const [newSemester, setNewSemester] = useState("");
  const [newStartDate, setNewStartDate] = useState("");
  const [newYoutubePlaylistUrl, setNewYoutubePlaylistUrl] = useState("");
  const [newCopperknobListUrl, setNewCopperknobListUrl] = useState("");
  const [newSpotifyPlaylistUrl, setNewSpotifyPlaylistUrl] = useState("");
  const [editingCourseId, setEditingCourseId] = useState<number | null>(null);
  const [editSemester, setEditSemester] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editYoutubePlaylistUrl, setEditYoutubePlaylistUrl] = useState("");
  const [editCopperknobListUrl, setEditCopperknobListUrl] = useState("");
  const [editSpotifyPlaylistUrl, setEditSpotifyPlaylistUrl] = useState("");
  const [newLevel, setNewLevel] = useState("");
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
      const [groupData, coursesData, learnedData, choreosData, levelsData] = await Promise.all([
        getDanceGroup(parsedGroupId),
        getDanceCourses(parsedGroupId),
        getLearnedChoreographies(parsedGroupId),
        fetchChoreographies(1, 10000),
        getGroupLevels(parsedGroupId),
      ]);
      setGroup(groupData);
      setCourses(coursesData);
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

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSemester.trim()) {
      setError("Semester is required");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const courseId = newCourseId ? Number.parseInt(newCourseId, 10) : undefined;
      await createDanceCourse(
        parsedGroupId,
        newSemester,
        newStartDate || undefined,
        courseId,
        newYoutubePlaylistUrl || undefined,
        newCopperknobListUrl || undefined,
        newSpotifyPlaylistUrl || undefined
      );
      setNewCourseId("");
      setNewSemester("");
      setNewStartDate("");
      setNewYoutubePlaylistUrl("");
      setNewCopperknobListUrl("");
      setNewSpotifyPlaylistUrl("");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create course");
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

  const handleStartEditCourse = (course: DanceCourse) => {
    setEditingCourseId(course.id);
    setEditSemester(course.semester);
    setEditStartDate(course.start_date ?? "");
    setEditYoutubePlaylistUrl(course.youtube_playlist_url ?? "");
    setEditCopperknobListUrl(course.copperknob_list_url ?? "");
    setEditSpotifyPlaylistUrl(course.spotify_playlist_url ?? "");
  };

  const handleCancelEditCourse = () => {
    setEditingCourseId(null);
    setEditSemester("");
    setEditStartDate("");
    setEditYoutubePlaylistUrl("");
    setEditCopperknobListUrl("");
    setEditSpotifyPlaylistUrl("");
  };

  const handleUpdateCourse = async (e: React.FormEvent, courseId: number) => {
    e.preventDefault();
    if (!editSemester.trim()) {
      setError("Semester is required");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await updateDanceCourse(
        courseId,
        editSemester,
        editStartDate || undefined,
        editYoutubePlaylistUrl || undefined,
        editCopperknobListUrl || undefined,
        editSpotifyPlaylistUrl || undefined
      );
      handleCancelEditCourse();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update course");
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

  const learnedStepFigures = Array.from(
    new Set(
      learnedChoreographies
        .filter((learned) => {
          // Get today's date in Berlin timezone
          const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Europe/Berlin',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          });
          const berlinToday = formatter.format(new Date());
          
          // Include choreographies first scheduled in the past
          return learned.first_learned_date < berlinToday;
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
          <h3>Dance Courses</h3>

          <form onSubmit={handleCreateCourse} className="course-form">
            <input
              type="number"
              placeholder="ID (optional)"
              value={newCourseId}
              onChange={(e) => setNewCourseId(e.target.value)}
              disabled={isLoading}
            />
            <input
              type="text"
              placeholder="Semester (e.g. WS2025)"
              value={newSemester}
              onChange={(e) => setNewSemester(e.target.value)}
              disabled={isLoading}
            />
            <input
              type="date"
              placeholder="Start Date"
              value={newStartDate}
              onChange={(e) => setNewStartDate(e.target.value)}
              disabled={isLoading}
            />
             <input
               type="url"
               placeholder="YouTube Playlist URL"
               value={newYoutubePlaylistUrl}
               onChange={(e) => setNewYoutubePlaylistUrl(e.target.value)}
               disabled={isLoading}
             />
             <input
               type="url"
               placeholder="Copperknob List URL"
               value={newCopperknobListUrl}
               onChange={(e) => setNewCopperknobListUrl(e.target.value)}
               disabled={isLoading}
             />
             <input
               type="url"
               placeholder="Spotify Playlist URL"
               value={newSpotifyPlaylistUrl}
               onChange={(e) => setNewSpotifyPlaylistUrl(e.target.value)}
               disabled={isLoading}
             />
            <button type="submit" className="btn-primary" disabled={isLoading}>
              + Add Course
            </button>
          </form>

          {isLoading && <div className="loading">Loading...</div>}

          {courses.length === 0 ? (
            <div className="empty-state">No courses yet</div>
          ) : (
            <div className="courses-list">
              {courses.map((course) => (
                <div key={course.id} className="course-item">
                  {editingCourseId === course.id ? (
                    <form className="course-edit-form" onSubmit={(e) => handleUpdateCourse(e, course.id)}>
                      <h4>Edit Course {course.id}</h4>
                      <input
                        type="text"
                        placeholder="Semester (e.g. WS2025)"
                        value={editSemester}
                        onChange={(e) => setEditSemester(e.target.value)}
                        disabled={isLoading}
                        required
                      />
                      <input
                        type="date"
                        placeholder="Start Date"
                        value={editStartDate}
                        onChange={(e) => setEditStartDate(e.target.value)}
                        disabled={isLoading}
                      />
                      <input
                        type="url"
                        placeholder="YouTube Playlist URL"
                        value={editYoutubePlaylistUrl}
                        onChange={(e) => setEditYoutubePlaylistUrl(e.target.value)}
                        disabled={isLoading}
                      />
                      <input
                        type="url"
                        placeholder="Copperknob List URL"
                        value={editCopperknobListUrl}
                        onChange={(e) => setEditCopperknobListUrl(e.target.value)}
                        disabled={isLoading}
                      />
                      <input
                        type="url"
                        placeholder="Spotify Playlist URL"
                        value={editSpotifyPlaylistUrl}
                        onChange={(e) => setEditSpotifyPlaylistUrl(e.target.value)}
                        disabled={isLoading}
                      />
                      <div className="course-edit-actions">
                        <button type="submit" className="btn-primary" disabled={isLoading}>
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEditCourse}
                          className="btn-secondary"
                          disabled={isLoading}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="course-info">
                        <h4>
                          {course.id} <span className="course-semester">({course.semester})</span>
                        </h4>
                        {course.start_date && <p>Started: {new Date(course.start_date).toLocaleDateString()}</p>}
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
                          onClick={() => handleStartEditCourse(course)}
                          className="btn-secondary"
                          disabled={isLoading}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDeleteCourse(course.id)}
                          className="btn-danger"
                          disabled={isLoading}
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
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
