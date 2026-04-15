import React from "react";

import { getSessionBadgeLabel, getSessionBadgeStatus } from "../../utils/courseStatus";
import {
  ActionButton,
  ActionGroup,
  CheckboxFilter,
  EmptyState,
  LoadingState,
  Section,
  StatusBadge,
} from "../shared/ui";

import type { Session } from "../../types";

type CourseDetailSessionsSectionProps = {
  sessions: Session[];
  visibleSessions: Session[];
  selectedSessionId: number | null;
  berlinTodayIso: string;
  isLoading: boolean;
  showPassedSessions: boolean;
  newSessionDate: string;
  newSessionComment: string;
  onToggleShowPassedSessions: (checked: boolean) => void;
  onNewSessionDateChange: (value: string) => void;
  onNewSessionCommentChange: (value: string) => void;
  onCreateSession: (event: React.SyntheticEvent<HTMLFormElement>) => void;
  onSelectSession: (session: Session) => void;
  onDeleteSession: (sessionId: number) => void;
  editingSessionId: number | null;
  editSessionDate: string;
  editSessionComment: string;
  onStartEditSession: (session: Session) => void;
  onEditSessionDateChange: (value: string) => void;
  onEditSessionCommentChange: (value: string) => void;
  onSaveEditSession: (sessionId: number) => void;
  onCancelEditSession: () => void;
};

const CourseDetailSessionsSection: React.FC<CourseDetailSessionsSectionProps> = ({
  sessions,
  visibleSessions,
  selectedSessionId,
  berlinTodayIso,
  isLoading,
  showPassedSessions,
  newSessionDate,
  newSessionComment,
  onToggleShowPassedSessions,
  onNewSessionDateChange,
  onNewSessionCommentChange,
  onCreateSession,
  onSelectSession,
  onDeleteSession,
  editingSessionId,
  editSessionDate,
  editSessionComment,
  onStartEditSession,
  onEditSessionDateChange,
  onEditSessionCommentChange,
  onSaveEditSession,
  onCancelEditSession,
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

          const isEditing = editingSessionId === session.id;

          return (
            <div
              key={session.id}
              className={`session-item ${selectedSessionId === session.id ? "active" : ""}`}
            >
              {isEditing ? (
                <div className="session-edit-form">
                  <input
                    type="date"
                    value={editSessionDate}
                    onChange={(e) => onEditSessionDateChange(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                  <input
                    type="text"
                    value={editSessionComment}
                    onChange={(e) => onEditSessionCommentChange(e.target.value)}
                    placeholder="Comment (optional)"
                    disabled={isLoading}
                    className="session-comment-input"
                  />
                  <ActionGroup>
                    <ActionButton
                      variant="primary"
                      onClick={() => onSaveEditSession(session.id)}
                      disabled={isLoading}
                    >
                      Save
                    </ActionButton>
                    <ActionButton
                      variant="secondary"
                      onClick={onCancelEditSession}
                      disabled={isLoading}
                    >
                      Cancel
                    </ActionButton>
                  </ActionGroup>
                </div>
              ) : (
                <>
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
                    {session.comment && <p className="session-comment">{session.comment}</p>}
                  </div>
                  <ActionGroup className="session-actions">
                    <ActionButton
                      onClick={() => onSelectSession(session)}
                      variant="secondary"
                      className={selectedSessionId === session.id ? "active" : undefined}
                      disabled={isLoading}
                    >
                      {selectedSessionId === session.id ? "✓ " : ""}Manage
                    </ActionButton>
                    <ActionButton
                      onClick={() => onStartEditSession(session)}
                      variant="secondary"
                      disabled={isLoading}
                    >
                      Edit
                    </ActionButton>
                    <ActionButton
                      onClick={() => onDeleteSession(session.id)}
                      variant="delete"
                      disabled={isLoading}
                    >
                      Delete
                    </ActionButton>
                  </ActionGroup>
                </>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <Section
      title="Sessions"
      actions={
        <CheckboxFilter
          checked={showPassedSessions}
          onChange={onToggleShowPassedSessions}
          disabled={isLoading}
        >
          Show passed sessions
        </CheckboxFilter>
      }
    >
      <form onSubmit={onCreateSession} className="session-form">
        <input
          type="date"
          value={newSessionDate}
          onChange={(event) => onNewSessionDateChange(event.target.value)}
          disabled={isLoading}
          required
        />
        <input
          type="text"
          value={newSessionComment}
          onChange={(event) => onNewSessionCommentChange(event.target.value)}
          placeholder="Comment (optional)"
          disabled={isLoading}
          className="session-comment-input"
        />
        <ActionButton type="submit" variant="primary" disabled={isLoading}>
          + Add Session
        </ActionButton>
      </form>

      {isLoading && <LoadingState />}

      {sessionsContent}
    </Section>
  );
};

export default CourseDetailSessionsSection;
