import React from "react";

type StatusBadgeProps = {
  status: string;
  className?: string;
  statusPrefix?: string;
  children: React.ReactNode;
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className,
  statusPrefix,
  children,
}) => {
  const statusClass = statusPrefix ? `${statusPrefix}${status}` : "";
  const composedClassName = [className, statusClass].filter(Boolean).join(" ");

  return <span className={composedClassName}>{children}</span>;
};
