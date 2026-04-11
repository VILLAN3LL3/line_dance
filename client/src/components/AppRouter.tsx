import "../styles/AppRouter.css";

import React from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";

import { App as ChoreographySearch } from "./app/App";
import ChoreographyCreatePage from "./choreographies/ChoreographyCreatePage";
import ChoreographyDetail from "./choreographies/ChoreographyDetail";
import StepFigureHierarchyAdmin from "./choreographies/StepFigureHierarchyAdmin";
import CourseDetail from "./courses/CourseDetail";
import CourseFormPage from "./courses/CourseFormPage";
import DanceGroupDetail from "./dance-groups/DanceGroupDetail";
import { DanceGroupsAdmin } from "./dance-groups/DanceGroupsAdmin";
import { ExternalLink } from "./shared/ui";
import TrainersAdmin from "./trainers/TrainersAdmin";

export const AppRouter: React.FC = () => {
  const location = useLocation();
  const swaggerDocsUrl = "http://localhost:3001/api/docs";
  const isStepFiguresRoute = location.pathname.startsWith("/admin/step-figures");
  const isDanceGroupsRoute =
    location.pathname === "/admin" || location.pathname.startsWith("/admin/groups");

  return (
    <div className="app-router">
      <nav className="main-nav">
        <div className="nav-container">
          <h1 className="nav-title">
            <Link to="/" className="nav-title-link" aria-label="Line Dance Home">
              💃 Line Dance
            </Link>
          </h1>
          <ul className="nav-links">
            <li>
              <Link to="/" className={`nav-link ${location.pathname === "/" ? "active" : ""}`}>
                🎵 Choreographies
              </Link>
            </li>
            <li>
              <Link
                to="/admin"
                className={`nav-link ${isDanceGroupsRoute && !isStepFiguresRoute ? "active" : ""}`}
              >
                👥 Dance Groups
              </Link>
            </li>
            <li>
              <Link
                to="/admin/step-figures"
                className={`nav-link ${isStepFiguresRoute ? "active" : ""}`}
              >
                🪜 Step Figures
              </Link>
            </li>
            <li>
              <Link
                to="/trainers"
                className={`nav-link ${location.pathname.startsWith("/trainers") ? "active" : ""}`}
              >
                🧑‍🏫 Trainers
              </Link>
            </li>
            <li>
              <ExternalLink
                href={swaggerDocsUrl}
                className="nav-icon-link"
                aria-label="Open API documentation"
                title="Open API documentation"
              >
                ℹ️
              </ExternalLink>
            </li>
          </ul>
        </div>
      </nav>

      <main className="router-content">
        <Routes>
          <Route path="/" element={<ChoreographySearch />} />
          <Route path="/choreographies/new" element={<ChoreographyCreatePage />} />
          <Route path="/choreographies/:id" element={<ChoreographyDetail />} />
          <Route path="/admin" element={<DanceGroupsAdmin mode="list" />} />
          <Route path="/admin/step-figures" element={<StepFigureHierarchyAdmin />} />
          <Route path="/admin/groups/new" element={<DanceGroupsAdmin mode="create" />} />
          <Route path="/admin/groups/:groupId" element={<DanceGroupDetail />} />
          <Route path="/admin/groups/:groupId/courses/new" element={<CourseFormPage />} />
          <Route
            path="/admin/groups/:groupId/courses/:courseId/edit"
            element={<CourseFormPage />}
          />
          <Route path="/admin/groups/:groupId/courses/:courseId" element={<CourseDetail />} />
          <Route path="/trainers" element={<TrainersAdmin />} />
        </Routes>
      </main>
    </div>
  );
};
