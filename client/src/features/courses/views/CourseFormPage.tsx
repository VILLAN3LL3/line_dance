import "../../../styles/CourseFormPage.css";

import React from "react";

import { UrlInput } from "../../url-check";
import { ActionButton, ActionGroup, BackButton, ErrorMessage, FormField } from "../../../shared/ui";
import { useCourseFormViewModel } from "../viewmodels/useCourseFormViewModel";

const CourseFormPage: React.FC = () => {
  const { state, actions } = useCourseFormViewModel();
  const { values, isLoading, trainers, group, existingCourse } = state;
  const change = actions.changeValues;

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    void actions.submit();
  };

  return (
    <div className="course-form-page">
      <div className="course-form-header">
        <BackButton onClick={actions.goBackToGroup} disabled={isLoading}>
          ← Back to Group
        </BackButton>
        <h2>{state.title}</h2>
      </div>

      {group && <p className="course-form-subtitle">Group: {group.name}</p>}
      {state.isEditMode && existingCourse?.course_id != null && (
        <p className="course-form-subtitle">Editing course #{existingCourse.course_id}</p>
      )}

      {state.routeError && <ErrorMessage message={state.routeError} />}
      {state.error && <ErrorMessage message={state.error} />}

      <form className="course-form-card" onSubmit={handleSubmit}>
        <FormField label="Course ID" htmlFor="course-id" className="course-form-field">
          <input
            id="course-id"
            type="number"
            value={values.courseId}
            onChange={(e) => change({ courseId: e.target.value })}
            disabled={isLoading}
          />
        </FormField>

        <FormField label="Course Name" htmlFor="course-name" className="course-form-field">
          <input
            id="course-name"
            type="text"
            value={values.name}
            onChange={(e) => change({ name: e.target.value })}
            disabled={isLoading}
          />
        </FormField>

        <FormField label="Semester" htmlFor="course-semester" className="course-form-field">
          <input
            id="course-semester"
            type="text"
            placeholder="e.g. WS2026"
            value={values.semester}
            onChange={(e) => change({ semester: e.target.value })}
            disabled={isLoading}
          />
        </FormField>

        <FormField label="Start Date" htmlFor="course-start-date" className="course-form-field">
          <input
            id="course-start-date"
            type="date"
            value={values.startDate}
            onChange={(e) => change({ startDate: e.target.value })}
            disabled={isLoading}
          />
        </FormField>

        <FormField label="Trainer" htmlFor="course-trainer" className="course-form-field">
          <select
            id="course-trainer"
            value={values.trainerId}
            onChange={(e) => change({ trainerId: e.target.value })}
            disabled={isLoading}
          >
            <option value="">No trainer</option>
            {trainers.map((trainer) => (
              <option key={trainer.id} value={trainer.id}>
                {trainer.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label="YouTube Playlist URL"
          htmlFor="course-youtube"
          className="course-form-field"
        >
          <UrlInput
            id="course-youtube"
            name="youtube_playlist_url"
            value={values.youtubePlaylistUrl}
            onChange={(e) => change({ youtubePlaylistUrl: e.target.value })}
            disabled={isLoading}
          />
        </FormField>

        <FormField
          label="Copperknob List URL"
          htmlFor="course-copperknob"
          className="course-form-field"
        >
          <UrlInput
            id="course-copperknob"
            name="copperknob_list_url"
            value={values.copperknobListUrl}
            onChange={(e) => change({ copperknobListUrl: e.target.value })}
            disabled={isLoading}
          />
        </FormField>

        <FormField
          label="Spotify Playlist URL"
          htmlFor="course-spotify"
          className="course-form-field"
        >
          <UrlInput
            id="course-spotify"
            name="spotify_playlist_url"
            value={values.spotifyPlaylistUrl}
            onChange={(e) => change({ spotifyPlaylistUrl: e.target.value })}
            disabled={isLoading}
          />
        </FormField>

        <ActionGroup className="course-form-actions">
          <ActionButton type="submit" variant="primary" disabled={isLoading}>
            {state.isEditMode ? "Save Changes" : "Create Course"}
          </ActionButton>
          <ActionButton
            type="button"
            variant="secondary"
            onClick={actions.goBackToGroup}
            disabled={isLoading}
          >
            Cancel
          </ActionButton>
        </ActionGroup>
      </form>
    </div>
  );
};

export default CourseFormPage;
