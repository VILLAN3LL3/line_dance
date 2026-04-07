import React from "react";

type ActionButtonVariant = "primary" | "secondary" | "delete" | "edit";

interface ActionButtonProps {
  children: React.ReactNode;
  variant?: ActionButtonVariant;
  className?: string;
  type?: "button" | "submit" | "reset";
  title?: string;
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  children,
  variant,
  className,
  type = "button",
  title,
  disabled = false,
  onClick,
}) => {
  const classes = [variant && `btn-${variant}`, className].filter(Boolean).join(" ");
  return (
    <button type={type} onClick={onClick} className={classes} title={title} disabled={disabled}>
      {children}
    </button>
  );
};
