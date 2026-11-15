import React from "react";

interface CardProps {
  className: string;
  header: React.ReactNode;
  content: React.ReactNode;
  actions?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ className, header, content, actions }) => (
  <div className={className}>
    <div className="card-header">{header}</div>
    <div className="card-content">{content}</div>
    {actions && <div className="card-actions">{actions}</div>}
  </div>
);
