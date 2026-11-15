import React from "react";

interface SectionProps {
  title: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export const Section: React.FC<SectionProps> = ({
  title,
  actions,
  className = "section",
  children,
}) => (
  <section className={className}>
    {actions ? (
      <div className="section-header-row">
        <h3>{title}</h3>
        {actions}
      </div>
    ) : (
      <h3>{title}</h3>
    )}
    {children}
  </section>
);
