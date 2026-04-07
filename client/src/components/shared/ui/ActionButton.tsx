import React from "react";

interface ActionButtonProps {
  children: React.ReactNode;
  className: string;
  title?: string;
  disabled?: boolean;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  children,
  className,
  title,
  disabled = false,
  onClick,
}) => (
  <button type="button" onClick={onClick} className={className} title={title} disabled={disabled}>
    {children}
  </button>
);
