import React from "react";

import { getSessionBadgeLabel, getSessionBadgeStatus } from "../../utils/courseStatus";
import { ActionGroup, EmptyState, LoadingState, StatusBadge } from "../shared/ui";

import type { Session } from "../../types";

type CourseDetailSessionsSectionProps = {
  sessions: Session[];
  visibleSessions: Session[];
  selectedSessionId: number | null;
  berlinTodayIso: string;
  isLoading: boolean;
  showPassedSessions: boolean;
  newSessionDate: string;
  onToggleShowPassedSessions: (checked: boolean) => void;
  onNewSessionDateChange: (value: string) => void;
  onCreateSession: (event: React.SyntheticEvent<HTMLFormElement>) => void;
  onSelectSession: (session: Session) => void;
  onDeleteSession: (sessionId: number) => void;
};

const CourseDetailSessionsSection: React.FC<CourseDetailSessionsSectionProps> = ({
  sessions,
  visibleSessions,
  selectedSessionId,
  berlinTodayIso,
  isLoading,
  showPassedSessions,
  newSessionDate,
  onToggleShowPassedSessions,
  onNewSessionDateChange,
  onCreateSession,
  onSelectSession,
  onDeleteSession,
}) => {
  let sessionsContent: React.ReactNode;
  if (sessions.length === 0) {
    sessionsContent = <EmptyState>No sessions yet</EmptyState>;
  } else if (visibleSessions.length === 0) {
    sessionsContent = <EmptyState>No planned sessions</EmptyState>;
  } else {
    sessionsContent = (
      <div className="sessions-list">
        {visibleSessions.map((session) => {
          const sessionBadgeStatus = getSessionBadgeStatus(session.session_date, berlinTodayIso);

          return (
            <div
              key={session.id}
              className={`session-item ${selectedSessionId === session.id ? "active" : ""}`}
            >
              <div className="session-info">
                <h4>
                  {new Date(session.session_date).toLocaleDateString()}
                  {sessionBadgeStatus && (
                    <StatusBadge
                      status={sessionBadgeStatus}
                      className="session-status-badge"
                      statusPrefix="session-status-"
                    >
                      {getSessionBadgeLabel(sessionBadgeStatus)}
                    </StatusBadge>
                  )}
                </h4>
                <p>
                  {new Date(session.session_date).toLocaleDateString("de-DE", {
                    weekday: "long",
                  })}
                </p>
              </div>
              <ActionGroup className="session-actions">
                <button
                  onClick={() => onSelectSession(session)}
                  className={`btn-secondary ${selectedSessionId === session.id ? "active" : ""}`}
                  disabled={isLoading}
                >
                  {selectedSessionId === session.id ? "✓ " : ""}Manage
                </button>
                <button
                  onClick={() => onDeleteSession(session.id)}
                  className="btn-delete"
                  disabled={isLoading}
                >
                  Delete
                </button>
              </ActionGroup>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <section className="section">
      <div className="session-header-row">
        <h3>Sessions</h3>
        <label className="status-filter">
          <input
            type="checkbox"
            checked={showPassedSessions}
            onChange={(event) => onToggleShowPassedSessions(event.target.checked)}
            disabled={isLoading}
          />{" "}
          Show passed sessions
        </label>
      </div>

      <form onSubmit={onCreateSession} className="session-form">
        <input
          type="date"
          value={newSessionDate}
          onChange={(event) => onNewSessionDateChange(event.target.value)}
          disabled={isLoading}
          required
        />
        <button type="submit" className="btn-primary" disabled={isLoading}>
          + Add Session
        </button>
      </form>

      {isLoading && <LoadingState />}

      {sessionsContent}
    </section>
  );
};

export default CourseDetailSessionsSection;
