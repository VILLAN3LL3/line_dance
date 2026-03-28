import "../styles/AppRouter.css";

import React from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";

import { App as ChoreographySearch } from "./App";
import ChoreographyDetail from "./ChoreographyDetail";
import CourseDetail from "./CourseDetail";
import DanceGroupDetail from "./DanceGroupDetail";
import { DanceGroupsAdmin } from "./DanceGroupsAdmin";

export const AppRouter: React.FC = () => {
  const location = useLocation();

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
                🎵 Choreography Search
              </Link>
            </li>
            <li>
              <Link
                to="/admin"
                className={`nav-link ${location.pathname.startsWith('/admin') ? 'active' : ''}`}
              >
                👥 Dance Group Admin
              </Link>
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
          <Route path="/admin/groups/:groupId/courses/:courseId" element={<CourseDetail />} />
        </Routes>
      </main>
    </div>
  );
};
