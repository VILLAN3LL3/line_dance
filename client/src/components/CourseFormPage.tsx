import "../styles/CourseFormPage.css";

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { createDanceCourse, getDanceCourses, getDanceGroup, getTrainers, updateDanceCourse } from "../api";
import { DanceCourse, DanceGroup, Trainer } from "../types";

const CourseFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { groupId, courseId } = useParams<{ groupId: string; courseId?: string }>();

  const parsedGroupId = Number(groupId);
  const parsedCourseId = courseId ? Number(courseId) : null;
  const isEditMode = parsedCourseId !== null && Number.isFinite(parsedCourseId);

  const [group, setGroup] = useState<DanceGroup | null>(null);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [existingCourse, setExistingCourse] = useState<DanceCourse | null>(null);

  const [courseIdInput, setCourseIdInput] = useState("");
  const [semester, setSemester] = useState("");
  const [startDate, setStartDate] = useState("");
  const [youtubePlaylistUrl, setYoutubePlaylistUrl] = useState("");
  const [copperknobListUrl, setCopperknobListUrl] = useState("");
  const [spotifyPlaylistUrl, setSpotifyPlaylistUrl] = useState("");
  const [trainerId, setTrainerId] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = useMemo(() => (isEditMode ? "Edit Course" : "Create Course"), [isEditMode]);

  useEffect(() => {
    if (!Number.isFinite(parsedGroupId)) {
      setError("Invalid dance group id");
      return;
    }
    if (courseId && !Number.isFinite(Number(courseId))) {
      setError("Invalid course id");
      return;
    }

    void loadData();
  }, [parsedGroupId, courseId]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [groupData, trainerRows, courses] = await Promise.all([
        getDanceGroup(parsedGroupId),
        getTrainers(),
        getDanceCourses(parsedGroupId),
      ]);

      setGroup(groupData);
      setTrainers(trainerRows);

      if (isEditMode && parsedCourseId !== null) {
        const course = courses.find((item) => item.id === parsedCourseId) ?? null;
        if (!course) {
          setError("Course not found");
          return;
        }

        setExistingCourse(course);
        setCourseIdInput(String(course.id));
        setSemester(course.semester);
        setStartDate(course.start_date ?? "");
        setYoutubePlaylistUrl(course.youtube_playlist_url ?? "");
        setCopperknobListUrl(course.copperknob_list_url ?? "");
        setSpotifyPlaylistUrl(course.spotify_playlist_url ?? "");
        setTrainerId(course.trainer_id ? String(course.trainer_id) : "");
      }
    } catch (err) {
      setError("Failed to load course form data");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!semester.trim()) {
      setError("Semester is required");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      if (isEditMode && parsedCourseId !== null) {
        await updateDanceCourse(
          parsedCourseId,
          semester,
          startDate || undefined,
          youtubePlaylistUrl || undefined,
          copperknobListUrl || undefined,
          spotifyPlaylistUrl || undefined,
          trainerId ? Number.parseInt(trainerId, 10) : undefined
        );
      } else {
        const numericCourseId = courseIdInput ? Number.parseInt(courseIdInput, 10) : undefined;
        await createDanceCourse({
          danceGroupId: parsedGroupId,
          semester,
          startDate: startDate || undefined,
          id: numericCourseId,
          youtubePlaylistUrl: youtubePlaylistUrl || undefined,
          copperknobListUrl: copperknobListUrl || undefined,
          spotifyPlaylistUrl: spotifyPlaylistUrl || undefined,
          trainerId: trainerId ? Number.parseInt(trainerId, 10) : undefined,
        });
      }

      navigate(`/admin/groups/${parsedGroupId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save course");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="course-form-page">
      <div className="course-form-header">
        <button onClick={() => navigate(`/admin/groups/${parsedGroupId}`)} className="btn-back" disabled={isLoading}>
          ← Back to Group
        </button>
        <h2>{title}</h2>
      </div>

      {group && <p className="course-form-subtitle">Group: {group.name}</p>}
      {isEditMode && existingCourse && <p className="course-form-subtitle">Editing course #{existingCourse.id}</p>}

      {error && <div className="error-message">{error}</div>}

      <form className="course-form-card" onSubmit={handleSubmit}>
        {!isEditMode && (
          <div className="course-form-field">
            <label htmlFor="course-id">Course ID (optional)</label>
            <input
              id="course-id"
              type="number"
              value={courseIdInput}
              onChange={(e) => setCourseIdInput(e.target.value)}
              disabled={isLoading}
            />
          </div>
        )}

        <div className="course-form-field">
          <label htmlFor="course-semester">Semester *</label>
          <input
            id="course-semester"
            type="text"
            placeholder="e.g. WS2026"
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            disabled={isLoading}
            required
          />
        </div>

        <div className="course-form-field">
          <label htmlFor="course-start-date">Start Date</label>
          <input
            id="course-start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="course-form-field">
          <label htmlFor="course-trainer">Trainer</label>
          <select
            id="course-trainer"
            value={trainerId}
            onChange={(e) => setTrainerId(e.target.value)}
            disabled={isLoading}
          >
            <option value="">No trainer</option>
            {trainers.map((trainer) => (
              <option key={trainer.id} value={trainer.id}>
                {trainer.name}
              </option>
            ))}
          </select>
        </div>

        <div className="course-form-field">
          <label htmlFor="course-youtube">YouTube Playlist URL</label>
          <input
            id="course-youtube"
            type="url"
            value={youtubePlaylistUrl}
            onChange={(e) => setYoutubePlaylistUrl(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="course-form-field">
          <label htmlFor="course-copperknob">Copperknob List URL</label>
          <input
            id="course-copperknob"
            type="url"
            value={copperknobListUrl}
            onChange={(e) => setCopperknobListUrl(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="course-form-field">
          <label htmlFor="course-spotify">Spotify Playlist URL</label>
          <input
            id="course-spotify"
            type="url"
            value={spotifyPlaylistUrl}
            onChange={(e) => setSpotifyPlaylistUrl(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="course-form-actions">
          <button type="submit" className="btn-primary" disabled={isLoading}>
            {isEditMode ? "Save Changes" : "Create Course"}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate(`/admin/groups/${parsedGroupId}`)}
            disabled={isLoading}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CourseFormPage;
