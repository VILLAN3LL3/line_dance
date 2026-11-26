import React from "react";
import { Link } from "react-router-dom";

import { describeSection } from "../model/personal-sections";
import type { PersonalSection } from "../model/personal-sections";

interface PersonalSubmenuProps {
  sections: readonly PersonalSection[];
  /** Path of the current route, to mark the active entry. */
  activePath: string;
  onNavigate: () => void;
}

/** The sections of the personal area as submenu of the sidebar. */
export const PersonalSubmenu: React.FC<PersonalSubmenuProps> = ({
  sections,
  activePath,
  onNavigate,
}) => {
  return (
    <ul className="sidebar-sublinks" aria-label="Personal">
      {sections.map((section) => {
        const isActive = activePath === section.path;
        return (
          <li key={section.id}>
            <Link
              to={section.path}
              className={`sidebar-link sidebar-sublink${isActive ? " active" : ""}`}
              title={describeSection(section)}
              aria-current={isActive ? "page" : undefined}
              onClick={onNavigate}
            >
              <span className="sidebar-icon" aria-hidden="true">
                {section.emoji}
              </span>
              <span className="sidebar-label">{section.label}</span>
              {section.count !== null && <span className="sidebar-badge">{section.count}</span>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
};
