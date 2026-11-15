import React, { useLayoutEffect, useRef, useState } from "react";

export const ChoreographerNames: React.FC<{ authors: string[] }> = ({ authors }) => {
  const textRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const names = authors.join(", ");

  useLayoutEffect(() => {
    const element = textRef.current;
    if (!element) return;

    const measureOverflow = () => {
      const lineHeight = Number.parseFloat(getComputedStyle(element).lineHeight);
      setIsOverflowing(element.scrollHeight > lineHeight * 2 + 1);
    };

    measureOverflow();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measureOverflow);
      return () => window.removeEventListener("resize", measureOverflow);
    }

    const observer = new ResizeObserver(measureOverflow);
    observer.observe(element);
    return () => observer.disconnect();
  }, [names]);

  if (authors.length === 0) return null;

  const textClassName = [
    "authors-text",
    !isExpanded && "authors-text-collapsed",
    isOverflowing && !isExpanded && "authors-text-faded",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="authors">
      <strong>Choreographers:</strong>
      <div ref={textRef} className={textClassName}>
        {isOverflowing ? (
          <button
            type="button"
            className="authors-toggle"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? "Show fewer choreographers" : "Show all choreographers"}
            title={isExpanded ? "Show fewer choreographers" : "Show all choreographers"}
            onClick={(event) => {
              event.stopPropagation();
              setIsExpanded((current) => !current);
            }}
            onKeyDown={(event) => event.stopPropagation()}
          >
            {names}
          </button>
        ) : (
          names
        )}
      </div>
    </div>
  );
};
