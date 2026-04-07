import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, className = "", title }) => (
  <span className={className} title={title}>
    {children}
  </span>
);
