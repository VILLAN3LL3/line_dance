import React from "react";

type BackButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
};

export const BackButton: React.FC<BackButtonProps> = ({
  onClick,
  disabled = false,
  className = "btn-back",
  children = "\u2190 Back",
}) => (
  <button type="button" onClick={onClick} className={className} disabled={disabled}>
    {children}
  </button>
);
