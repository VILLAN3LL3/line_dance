import React from "react";

type TagGroupProps = {
  className: string;
  children: React.ReactNode;
};

export const TagGroup: React.FC<TagGroupProps> = ({ className, children }) => (
  <div className={className}>{children}</div>
);
