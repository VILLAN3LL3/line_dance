import "../styles/AppRouter.css";

import React, { useState } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";

import { App as ChoreographySearch } from "./app/App";
import ChoreographersPage from "./choreographies/ChoreographersPage";
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
  const [isOpen, setIsOpen] = useState(true);
  const swaggerDocsUrl = "http://localhost:3001/api/docs";
  const isStepFiguresRoute = location.pathname.startsWith("/admin/step-figures");
  const isChoreographersRoute = location.pathname.startsWith("/choreographers");
  const isDanceGroupsRoute =
    location.pathname === "/admin" || location.pathname.startsWith("/admin/groups");

  const closeMobile = () => {
    if (window.innerWidth < 768) setIsOpen(false);
  };

  return (
    <div className={`app-router${isOpen ? " sidebar-is-open" : ""}`}>
      {/* Mobile-only top bar */}
      <div className="mobile-header">
        <button
          className="sidebar-toggle"
          onClick={() => setIsOpen((o) => !o)}
          aria-label={isOpen ? "Close menu" : "Open menu"}
          aria-expanded={isOpen}
        >
          {isOpen ? "✕" : "☰"}
        </button>
        <Link to="/" className="mobile-title-link" onClick={closeMobile}>
          <h1 className="nav-title">💃 Line Dance</h1>
        </Link>
      </div>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div className="sidebar-overlay" onClick={() => setIsOpen(false)} aria-hidden="true" />
      )}

      <aside className={`sidebar${isOpen ? " sidebar--open" : ""}`} aria-label="Main navigation">
        <div className="sidebar-header">
          <button
            className="sidebar-toggle"
            onClick={() => setIsOpen((o) => !o)}
            aria-label={isOpen ? "Collapse menu" : "Expand menu"}
            aria-expanded={isOpen}
          >
            ☰
          </button>
          <Link to="/" className="sidebar-title-link" aria-label="Line Dance Home">
            <h1 className="nav-title">💃 Line Dance</h1>
          </Link>
        </div>

        <nav>
          <ul className="sidebar-links">
            <li>
              <Link
                to="/"
                className={`sidebar-link${location.pathname === "/" ? " active" : ""}`}
                title="Choreographies"
                onClick={closeMobile}
              >
                <span className="sidebar-icon">🎵</span>
                <span className="sidebar-label">Choreographies</span>
              </Link>
            </li>
            <li>
              <Link
                to="/choreographers"
                className={`sidebar-link${isChoreographersRoute ? " active" : ""}`}
                title="Choreographers"
                onClick={closeMobile}
              >
                <span className="sidebar-icon">🎭</span>
                <span className="sidebar-label">Choreographers</span>
              </Link>
            </li>
            <li>
              <Link
                to="/admin"
                className={`sidebar-link${
                  isDanceGroupsRoute && !isStepFiguresRoute ? " active" : ""
                }`}
                title="Dance Groups"
                onClick={closeMobile}
              >
                <span className="sidebar-icon">👥</span>
                <span className="sidebar-label">Dance Groups</span>
              </Link>
            </li>
            <li>
              <Link
                to="/admin/step-figures"
                className={`sidebar-link${isStepFiguresRoute ? " active" : ""}`}
                title="Step Figures"
                onClick={closeMobile}
              >
                <span className="sidebar-icon">🪜</span>
                <span className="sidebar-label">Step Figures</span>
              </Link>
            </li>
            <li>
              <Link
                to="/trainers"
                className={`sidebar-link${
                  location.pathname.startsWith("/trainers") ? " active" : ""
                }`}
                title="Trainers"
                onClick={closeMobile}
              >
                <span className="sidebar-icon">🧑‍🏫</span>
                <span className="sidebar-label">Trainers</span>
              </Link>
            </li>
          </ul>
        </nav>

        <div className="sidebar-footer">
          <ExternalLink
            href={swaggerDocsUrl}
            className="sidebar-link"
            title="API Docs"
            aria-label="Open API documentation"
          >
            <span className="sidebar-icon">ℹ️</span>
            <span className="sidebar-label">API Docs</span>
          </ExternalLink>
        </div>
      </aside>

      <main className="router-content">
        <Routes>
          <Route path="/" element={<ChoreographySearch />} />
          <Route path="/choreographies/new" element={<ChoreographyCreatePage />} />
          <Route path="/choreographies/:id" element={<ChoreographyDetail />} />
          <Route path="/choreographers" element={<ChoreographersPage />} />
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
