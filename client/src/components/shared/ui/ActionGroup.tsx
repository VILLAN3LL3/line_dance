import React from "react";

type ActionGroupProps = {
  className: string;
  children: React.ReactNode;
};

export const ActionGroup: React.FC<ActionGroupProps> = ({ className, children }) => (
  <div className={className}>{children}</div>
);
