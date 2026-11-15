import React from "react";

interface ExternalLinkProps {
  href: string;
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  "aria-label"?: string;
  title?: string;
  children: React.ReactNode;
}

export const ExternalLink: React.FC<ExternalLinkProps> = ({
  href,
  className,
  onClick,
  "aria-label": ariaLabel,
  title,
  children,
}) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className={className}
    onClick={onClick}
    aria-label={ariaLabel}
    title={title}
  >
    {children}
  </a>
);
