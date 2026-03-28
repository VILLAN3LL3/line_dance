import "../styles/AppRouter.css";

import React from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";

import { App as ChoreographySearch } from "./App";
import ChoreographyDetail from "./ChoreographyDetail";
import CourseDetail from "./CourseDetail";
import CourseFormPage from "./CourseFormPage";
import DanceGroupDetail from "./DanceGroupDetail";
import { DanceGroupsAdmin } from "./DanceGroupsAdmin";
import TrainersAdmin from "./TrainersAdmin";

export const AppRouter: React.FC = () => {
  const location = useLocation();
  const swaggerDocsUrl = "http://localhost:3001/api/docs";

  return (
    <div className="app-router">
      <nav className="main-nav">
        <div className="nav-container">
          <h1 className="nav-title">Line Dance</h1>
          <ul className="nav-links">
            <li>
              <Link
                to="/"
                className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
              >
                🎵 Choreographies
              </Link>
            </li>
            <li>
              <Link
                to="/admin"
                className={`nav-link ${location.pathname.startsWith('/admin') ? 'active' : ''}`}
              >
                👥 Dance Groups
              </Link>
            </li>
            <li>
              <Link
                to="/trainers"
                className={`nav-link ${location.pathname.startsWith('/trainers') ? 'active' : ''}`}
              >
                🧑‍🏫 Trainers
              </Link>
            </li>
            <li>
              <a
                href={swaggerDocsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="nav-icon-link"
                aria-label="Open API documentation"
                title="Open API documentation"
              >
                ℹ️
              </a>
            </li>
          </ul>
        </div>
      </nav>

      <main className="router-content">
        <Routes>
          <Route path="/" element={<ChoreographySearch />} />
          <Route path="/choreographies/:id" element={<ChoreographyDetail />} />
          <Route path="/admin" element={<DanceGroupsAdmin mode="list" />} />
          <Route path="/admin/groups/new" element={<DanceGroupsAdmin mode="create" />} />
          <Route path="/admin/groups/:groupId" element={<DanceGroupDetail />} />
          <Route path="/admin/groups/:groupId/courses/new" element={<CourseFormPage />} />
          <Route path="/admin/groups/:groupId/courses/:courseId/edit" element={<CourseFormPage />} />
          <Route path="/admin/groups/:groupId/courses/:courseId" element={<CourseDetail />} />
          <Route path="/trainers" element={<TrainersAdmin />} />
        </Routes>
      </main>
    </div>
  );
};
