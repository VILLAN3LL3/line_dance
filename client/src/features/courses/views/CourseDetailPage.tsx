import "../../../styles/CourseDetail.css";

import React from "react";

import { BackButton, confirmAction, ErrorMessage } from "../../../shared/ui";
import { useCourseDetailViewModel } from "../viewmodels/useCourseDetailViewModel";
import CourseDetailSessionsSection from "./CourseDetailSessionsSection";

const CourseDetailPage: React.FC = () => {
  const { state, actions } = useCourseDetailViewModel();
  const { forms, suggestions, picker } = state;

  const preventDefaultThen = (action: () => Promise<void>) => (e: React.SyntheticEvent) => {
    e.preventDefault();
    void action();
  };

  const confirmThen =
    <Args extends unknown[]>(message: string, action: (...args: Args) => Promise<void> | void) =>
    (...args: Args) => {
      if (confirmAction(message)) void action(...args);
    };

  const handleConfirmSwap = (sessionId: number) => {
    if (!forms.swapTargetSessionId) return;
    confirmThen(
      "Swap choreographies and comments between these two sessions?",
      actions.confirmSwap,
    )(sessionId);
  };

  return (
    <div className="course-detail">
      <div className="detail-header">
        <BackButton onClick={actions.goBack}>Back</BackButton>
        <h2>{state.headerTitle}</h2>
      </div>

      {state.error && <ErrorMessage message={state.error} />}

      <div className="detail-content">
        <CourseDetailSessionsSection
          sessions={state.sessions}
          visibleSessions={state.visibleSessions}
          selectedSessionId={state.selectedSessionId}
          berlinTodayIso={state.berlinTodayIso}
          isLoading={state.isLoading}
          showPassedSessions={state.showPassedSessions}
          newSessionDate={forms.newDate}
          onToggleShowPassedSessions={actions.toggleShowPassedSessions}
          onNewSessionDateChange={actions.forms.changeNewDate}
          newSessionComment={forms.newComment}
          onNewSessionCommentChange={actions.forms.changeNewComment}
          onCreateSession={preventDefaultThen(actions.createSession)}
          onSelectSession={actions.selectSession}
          onDeleteSession={confirmThen(
            "Are you sure you want to delete this session?",
            actions.deleteSession,
          )}
          editingSessionId={forms.editingSessionId}
          editSessionDate={forms.editDate}
          editSessionComment={forms.editComment}
          onStartEditSession={actions.forms.startEdit}
          onEditSessionDateChange={actions.forms.changeEditDate}
          onEditSessionCommentChange={actions.forms.changeEditComment}
          onSaveEditSession={(sessionId) => void actions.saveEditedSession(sessionId)}
          onCancelEditSession={actions.forms.cancelEdit}
          swappingSessionId={forms.swappingSessionId}
          swapTargetSessionId={forms.swapTargetSessionId}
          onStartSwap={actions.forms.startSwap}
          onSwapTargetChange={actions.forms.changeSwapTarget}
          onConfirmSwap={handleConfirmSwap}
          onCancelSwap={actions.forms.cancelSwap}
          onReorderContents={(sessionIds) => void actions.reorderContents(sessionIds)}
          sessionSuggestions={suggestions.suggestions}
          sessionKnownFigures={suggestions.knownFigures}
          sessionMaxLevelValue={suggestions.maxLevelValue}
          suggestingForSessionId={suggestions.loadingSessionId}
          onToggleSuggestions={(sessionId) => void actions.toggleSuggestions(sessionId)}
          selectedChoreographyId={picker.selectedId}
          selectedChoreographyQuery={picker.query}
          selectableChoreographies={state.selectableChoreographies}
          sessionChoreographies={state.sessionChoreographies}
          availableChoreographies={state.availableChoreographies}
          cardViewModel={state.cardViewModel}
          getChoreographyOptionLabel={state.getChoreographyOptionLabel}
          onChoreographyInputChange={(e) => actions.changeChoreographyQuery(e.target.value)}
          onAddChoreography={preventDefaultThen(actions.addChoreography)}
          onRemoveChoreography={confirmThen(
            "Remove this choreography from the session?",
            actions.removeChoreography,
          )}
          onEditChoreography={actions.editChoreography}
          onDeleteChoreography={confirmThen(
            "Are you sure you want to delete this choreography?",
            actions.deleteChoreography,
          )}
        />
      </div>
    </div>
  );
};

export default CourseDetailPage;
