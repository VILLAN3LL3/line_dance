import React from "react";

interface ClearFiltersIconProps {
  className?: string;
}

export const ClearFiltersIcon: React.FC<ClearFiltersIconProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" focusable="false" className={className}>
    <path
      d="M3 5h18l-7 8v5l-4 2v-7L3 5z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M5 19L19 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
