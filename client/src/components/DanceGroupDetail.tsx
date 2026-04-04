import "../styles/DanceGroupDetail.css";

import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  addGroupLevel,
  deleteDanceCourse,
  exportDanceCoursePdf,
  fetchChoreographies,
  getDanceCourses,
  getDanceGroup,
  getGroupLevels,
  getLearnedChoreographies,
  getSessions,
  removeGroupLevel,
} from "../api";
import { Choreography, DanceCourse, DanceGroup, LearnedChoreography, Session } from "../types";
import { DanceGroupCoursesSection } from "./DanceGroupCoursesSection";
import { DanceGroupLearnedSection } from "./DanceGroupLearnedSection";
import { DanceGroupLevelsSection } from "./DanceGroupLevelsSection";

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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [groupData, coursesData, sessionsData, learnedData, choreosData, levelsData] =
        await Promise.all([
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
  }, [parsedGroupId]);

  useEffect(() => {
    if (!Number.isFinite(parsedGroupId)) {
      setError("Invalid dance group id");
      return;
    }
    void loadData();
  }, [parsedGroupId, loadData]);

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

  const handleAddLevel = async (levelValue: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await addGroupLevel(parsedGroupId, levelValue);
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

  const sessionsByCourseId = sessions.reduce<Record<number, Session[]>>((acc, session) => {
    if (!acc[session.dance_course_id]) {
      acc[session.dance_course_id] = [];
    }
    acc[session.dance_course_id].push(session);
    return acc;
  }, {});

  return (
    <div className="dance-group-detail">
      <div className="detail-header">
        <button onClick={() => navigate("/admin")} className="btn-back">
          Back to Groups
        </button>
        <h2>{group?.name ?? "Dance Group"}</h2>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="detail-content">
        <DanceGroupCoursesSection
          courses={courses}
          sessionsByCourseId={sessionsByCourseId}
          isLoading={isLoading}
          parsedGroupId={parsedGroupId}
          onDeleteCourse={handleDeleteCourse}
          onExportCoursePdf={handleExportCoursePdf}
        />

        <DanceGroupLevelsSection
          groupLevels={groupLevels}
          choreographies={choreographies}
          isLoading={isLoading}
          onAddLevel={handleAddLevel}
          onRemoveLevel={handleRemoveLevel}
        />

        <DanceGroupLearnedSection
          learnedChoreographies={learnedChoreographies}
          choreographies={choreographies}
          groupLevels={groupLevels}
          groupName={group?.name ?? "this group"}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default DanceGroupDetail;
