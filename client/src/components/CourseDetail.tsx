import "../styles/CourseDetail.css";

import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  addChoreographyToSession,
  createSession,
  deleteSession,
  fetchChoreographies,
  getDanceCourses,
  getSessionChoreographies,
  getSessions,
  removeChoreographyFromSession,
} from "../api";
import { Choreography, DanceCourse, Session, SessionChoreography } from "../types";

const CourseDetail: React.FC = () => {
  const navigate = useNavigate();
  const { groupId, courseId } = useParams<{ groupId: string; courseId: string }>();
  const parsedGroupId = Number(groupId);
  const parsedCourseId = Number(courseId);
  const [course, setCourse] = useState<DanceCourse | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [sessionChoreographies, setSessionChoreographies] = useState<SessionChoreography[]>([]);
  const [availableChoreographies, setAvailableChoreographies] = useState<Choreography[]>([]);
  const [newSessionDate, setNewSessionDate] = useState("");
  const [selectedChoreographyId, setSelectedChoreographyId] = useState<string>("");
  const [selectedChoreographyQuery, setSelectedChoreographyQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedSessionId = selectedSession?.id ?? null;

  const getChoreographyOptionLabel = (choreography: Choreography) =>
    `${choreography.name} (${choreography.level})`;

  const selectableChoreographies = availableChoreographies.filter(
    (choreography) =>
      !sessionChoreographies.some(
        (sessionChoreography) => sessionChoreography.choreography_id === choreography.id,
      ),
  );

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [coursesData, sessionsData, choreosData] = await Promise.all([
        getDanceCourses(parsedGroupId),
        getSessions(parsedCourseId),
        fetchChoreographies(1, 10000),
      ]);
      const matchedCourse = coursesData.find((item) => item.id === parsedCourseId) ?? null;
      if (!matchedCourse) {
        setCourse(null);
        setSessions([]);
        setSelectedSession(null);
        setSessionChoreographies([]);
        setSelectedChoreographyId("");
        setSelectedChoreographyQuery("");
        setError("Course not found");
        return;
      }

      setCourse(matchedCourse);
      setSessions(sessionsData);
      setAvailableChoreographies(choreosData.data);

      if (selectedSessionId !== null) {
        const refreshedSelectedSession =
          sessionsData.find((item) => item.id === selectedSessionId) ?? null;
        if (refreshedSelectedSession) {
          const choreosInSession = await getSessionChoreographies(refreshedSelectedSession.id);
          setSessionChoreographies(choreosInSession);
        } else {
          setSelectedSession(null);
          setSessionChoreographies([]);
          setSelectedChoreographyId("");
          setSelectedChoreographyQuery("");
        }
      }
    } catch (err) {
      setError("Failed to load course data");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [parsedGroupId, parsedCourseId, selectedSessionId]);

  useEffect(() => {
    if (!Number.isFinite(parsedGroupId) || !Number.isFinite(parsedCourseId)) {
      setError("Invalid route parameters");
      return;
    }
    void loadData();
  }, [parsedGroupId, parsedCourseId, loadData]);

  const handleCreateSession = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newSessionDate) {
      setError("Session date is required");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await createSession(parsedCourseId, newSessionDate);
      setNewSessionDate("");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId: number) => {
    if (!confirm("Are you sure you want to delete this session?")) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await deleteSession(sessionId);
      if (selectedSession?.id === sessionId) {
        setSelectedSession(null);
        setSessionChoreographies([]);
        setSelectedChoreographyId("");
        setSelectedChoreographyQuery("");
      }
      await loadData();
    } catch (err) {
      setError("Failed to delete session");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSession = async (session: Session) => {
    setSelectedSession(session);
    setSelectedChoreographyId("");
    setSelectedChoreographyQuery("");
    setIsLoading(true);
    try {
      const choreosInSession = await getSessionChoreographies(session.id);
      setSessionChoreographies(choreosInSession);
    } catch (err) {
      setError("Failed to load session choreographies");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChoreographyInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSelectedChoreographyQuery(value);

    const matchedChoreography = selectableChoreographies.find(
      (choreography) =>
        getChoreographyOptionLabel(choreography) === value || choreography.name === value,
    );

    setSelectedChoreographyId(matchedChoreography ? String(matchedChoreography.id) : "");
  };

  const handleAddChoreography = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedSession || !selectedChoreographyId) {
      setError("Please select a choreography");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await addChoreographyToSession(
        selectedSession.id,
        Number.parseInt(selectedChoreographyId, 10),
      );
      setSelectedChoreographyId("");
      setSelectedChoreographyQuery("");
      const choreosInSession = await getSessionChoreographies(selectedSession.id);
      setSessionChoreographies(choreosInSession);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add choreography");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveChoreography = async (choreographyId: number) => {
    const toRemove = sessionChoreographies.find((item) => item.choreography_id === choreographyId);
    if (!toRemove || !selectedSession) {
      return;
    }

    if (!confirm("Remove this choreography from the session?")) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await removeChoreographyFromSession(toRemove.id);
      const choreosInSession = await getSessionChoreographies(selectedSession.id);
      setSessionChoreographies(choreosInSession);
    } catch (err) {
      setError("Failed to remove choreography");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="course-detail">
      <div className="detail-header">
        <button onClick={() => navigate(`/admin/groups/${parsedGroupId}`)} className="btn-back">
          ← Back
        </button>
        <h2>
          Course: {course?.id} ({course?.semester ?? "Unknown Semester"})
        </h2>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="detail-content">
        <section className="section">
          <h3>Sessions</h3>

          <form onSubmit={handleCreateSession} className="session-form">
            <input
              type="date"
              value={newSessionDate}
              onChange={(e) => setNewSessionDate(e.target.value)}
              disabled={isLoading}
              required
            />
            <button type="submit" className="btn-primary" disabled={isLoading}>
              + Add Session
            </button>
          </form>

          {isLoading && <div className="loading">Loading...</div>}

          {sessions.length === 0 ? (
            <div className="empty-state">No sessions yet</div>
          ) : (
            <div className="sessions-list">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`session-item ${selectedSession?.id === session.id ? "active" : ""}`}
                >
                  <div className="session-info">
                    <h4>{new Date(session.session_date).toLocaleDateString()}</h4>
                    <p>
                      {new Date(session.session_date).toLocaleDateString("de-DE", {
                        weekday: "long",
                      })}
                    </p>
                  </div>
                  <div className="session-actions">
                    <button
                      onClick={() => handleSelectSession(session)}
                      className={`btn-secondary ${selectedSession?.id === session.id ? "active" : ""}`}
                      disabled={isLoading}
                    >
                      {selectedSession?.id === session.id ? "✓ " : ""}Manage
                    </button>
                    <button
                      onClick={() => handleDeleteSession(session.id)}
                      className="btn-delete"
                      disabled={isLoading}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {selectedSession && (
          <section className="section">
            <h3>
              Choreographies for {new Date(selectedSession.session_date).toLocaleDateString()}
            </h3>

            <form onSubmit={handleAddChoreography} className="choreo-form">
              <div className="choreo-autocomplete">
                <input
                  type="text"
                  value={selectedChoreographyQuery}
                  onChange={handleChoreographyInputChange}
                  list="session-choreography-options"
                  placeholder="Search choreography by name..."
                  className="choreo-autocomplete-input"
                  disabled={isLoading}
                />
                <datalist id="session-choreography-options">
                  {selectableChoreographies.map((choreography) => (
                    <option
                      key={choreography.id}
                      value={getChoreographyOptionLabel(choreography)}
                    />
                  ))}
                </datalist>
              </div>
              <button
                type="submit"
                className="btn-primary"
                disabled={isLoading || !selectedChoreographyId}
              >
                + Add to Session
              </button>
            </form>

            {!isLoading && selectableChoreographies.length === 0 && (
              <p className="choreo-autocomplete-hint">
                All choreographies are already in this session.
              </p>
            )}

            {!isLoading && selectableChoreographies.length > 0 && (
              <p className="choreo-autocomplete-hint">
                Start typing to autocomplete a choreography name.
              </p>
            )}

            {sessionChoreographies.length === 0 ? (
              <div className="empty-state">No choreographies in this session yet</div>
            ) : (
              <div className="choreographies-list">
                {sessionChoreographies.map((sessionChoreography) => {
                  const choreography = availableChoreographies.find(
                    (item) => item.id === sessionChoreography.choreography_id,
                  );

                  return (
                    <div key={sessionChoreography.id} className="choreography-item">
                      <div className="choreo-info">
                        <h4>{choreography?.name}</h4>
                        <p>{choreography?.level}</p>
                      </div>
                      <button
                        onClick={() =>
                          handleRemoveChoreography(sessionChoreography.choreography_id)
                        }
                        className="btn-delete"
                        disabled={isLoading}
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default CourseDetail;
