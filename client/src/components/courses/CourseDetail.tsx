import "../../styles/CourseDetail.css";

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
} from "../../api";
import { Choreography, DanceCourse, Session, SessionChoreography } from "../../types";
import { getBerlinTodayIso } from "../../utils/courseStatus";
import { ErrorMessage } from "../shared/ui";
import CourseDetailChoreographiesSection from "./CourseDetailChoreographiesSection";
import CourseDetailSessionsSection from "./CourseDetailSessionsSection";

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
  const [showPassedSessions, setShowPassedSessions] = useState(false);
  const [selectedChoreographyId, setSelectedChoreographyId] = useState<string>("");
  const [selectedChoreographyQuery, setSelectedChoreographyQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedSessionId = selectedSession?.id ?? null;
  const berlinTodayIso = getBerlinTodayIso();

  const visibleSessions = sessions.filter((session) => {
    if (showPassedSessions) {
      return true;
    }

    return session.session_date.slice(0, 10) >= berlinTodayIso;
  });

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
          Back
        </button>
        <h2>
          Course: {course?.id} ({course?.semester ?? "Unknown Semester"})
        </h2>
      </div>

      {error && <ErrorMessage message={error} />}

      <div className="detail-content">
        <CourseDetailSessionsSection
          sessions={sessions}
          visibleSessions={visibleSessions}
          selectedSessionId={selectedSessionId}
          berlinTodayIso={berlinTodayIso}
          isLoading={isLoading}
          showPassedSessions={showPassedSessions}
          newSessionDate={newSessionDate}
          onToggleShowPassedSessions={setShowPassedSessions}
          onNewSessionDateChange={setNewSessionDate}
          onCreateSession={handleCreateSession}
          onSelectSession={handleSelectSession}
          onDeleteSession={handleDeleteSession}
        />

        {selectedSession && (
          <CourseDetailChoreographiesSection
            selectedSession={selectedSession}
            isLoading={isLoading}
            selectedChoreographyId={selectedChoreographyId}
            selectedChoreographyQuery={selectedChoreographyQuery}
            selectableChoreographies={selectableChoreographies}
            sessionChoreographies={sessionChoreographies}
            availableChoreographies={availableChoreographies}
            getChoreographyOptionLabel={getChoreographyOptionLabel}
            onChoreographyInputChange={handleChoreographyInputChange}
            onAddChoreography={handleAddChoreography}
            onRemoveChoreography={handleRemoveChoreography}
          />
        )}
      </div>
    </div>
  );
};

export default CourseDetail;
