import React from "react";

import type { Session } from "../types";
import { getSessionBadgeLabel, getSessionBadgeStatus } from "../utils/courseStatus";

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
    sessionsContent = <div className="empty-state">No sessions yet</div>;
  } else if (visibleSessions.length === 0) {
    sessionsContent = <div className="empty-state">No planned sessions</div>;
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
                    <span className={`session-status-badge session-status-${sessionBadgeStatus}`}>
                      {getSessionBadgeLabel(sessionBadgeStatus)}
                    </span>
                  )}
                </h4>
                <p>
                  {new Date(session.session_date).toLocaleDateString("de-DE", {
                    weekday: "long",
                  })}
                </p>
              </div>
              <div className="session-actions">
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
              </div>
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

      {isLoading && <div className="loading">Loading...</div>}

      {sessionsContent}
    </section>
  );
};

export default CourseDetailSessionsSection;
