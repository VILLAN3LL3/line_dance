import React from "react";

import { PersonalSubmenu, usePersonalSections } from "../features/personal";

interface PersonalSidebarMenuProps {
  activePath: string;
  onNavigate: () => void;
}

/** Loads the counts of the personal area only while the submenu is shown. */
export const PersonalSidebarMenu: React.FC<PersonalSidebarMenuProps> = ({
  activePath,
  onNavigate,
}) => (
  <PersonalSubmenu
    sections={usePersonalSections()}
    activePath={activePath}
    onNavigate={onNavigate}
  />
);
