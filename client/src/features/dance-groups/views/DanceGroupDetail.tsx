import "../../../styles/DanceGroupDetail.css";

import React from "react";

import { BackButton, confirmAction, ErrorMessage } from "../../../shared/ui";
import { useDanceGroupDetailViewModel } from "../viewmodels/useDanceGroupDetailViewModel";
import { DanceGroupCoursesSection } from "./DanceGroupCoursesSection";
import { DanceGroupLearnedSection } from "./DanceGroupLearnedSection";
import { DanceGroupLevelsSection } from "./DanceGroupLevelsSection";

const DanceGroupDetail: React.FC = () => {
  const { state, actions } = useDanceGroupDetailViewModel();

  const handleDeleteCourse = async (courseId: number) => {
    if (!confirmAction("Are you sure you want to delete this course and all related sessions?")) {
      return;
    }
    await actions.deleteCourse(courseId);
  };

  return (
    <div className="dance-group-detail">
      <div className="detail-header">
        <BackButton onClick={actions.backToGroups}>Back to Groups</BackButton>
        <h2>{state.groupName ?? "Dance Group"}</h2>
      </div>

      {state.error && <ErrorMessage message={state.error} />}

      <div className="detail-content">
        <DanceGroupCoursesSection
          courses={state.courses}
          sessionsByCourseId={state.sessionsByCourseId}
          isLoading={state.isLoading}
          parsedGroupId={state.groupId}
          onDeleteCourse={handleDeleteCourse}
          onExportCoursePdf={actions.exportCoursePdf}
          onExportParticipantPdf={actions.exportParticipantPdf}
        />

        <DanceGroupLevelsSection
          maxGroupLevelValue={state.maxGroupLevelValue}
          levelOptions={state.levelOptions}
          isLoading={state.isLoading}
          onMaxGroupLevelValueChange={actions.changeMaxGroupLevel}
        />

        <DanceGroupLearnedSection
          learnedChoreographies={state.learnedChoreographies}
          choreographies={state.choreographies}
          stepFigureSuggestions={state.stepFigureSuggestions}
          maxGroupLevelValue={state.maxGroupLevelValue}
          groupName={state.groupName ?? "this group"}
          isLoading={state.isLoading}
          baseStepFigures={state.baseStepFigures}
          allStepFigures={state.allStepFigures}
          suggestionMusic={state.suggestionMusic}
          genreOptions={state.genreOptions}
          onBaseStepFiguresChange={actions.changeBaseStepFigures}
          onSuggestionMusicChange={actions.changeSuggestionMusic}
        />
      </div>
    </div>
  );
};

export default DanceGroupDetail;
