import React, { useState } from "react";

interface StarRatingProps {
  rating: number | null;
  readOnly?: boolean;
  compact?: boolean;
  onChange?: (rating: number | null) => void | Promise<void>;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  readOnly = false,
  compact = false,
  onChange,
}) => {
  const [hovered, setHovered] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const displayed = hovered ?? rating ?? 0;

  const handleClick = async (star: number, closeAfter = false) => {
    if (readOnly || !onChange) return;
    const nextRating = rating === star ? null : star;
    await onChange(nextRating);
    if (closeAfter) {
      setHovered(null);
      setIsExpanded(false);
    }
  };

  const starChar = "\u2605";

  const stars = ([1, 2, 3, 4, 5] as const).map((star) => {
    const isFilled = displayed >= star;
    const cls = ["star", isFilled ? "star-filled" : "", readOnly ? "" : "star-interactive"]
      .filter(Boolean)
      .join(" ");
    const starLabel = star === 1 ? "Rate 1 star" : `Rate ${star} stars`;

    if (readOnly) {
      return (
        <span key={star} className={cls}>
          {starChar}
        </span>
      );
    }

    return (
      <button
        key={star}
        type="button"
        className={cls}
        onClick={(event) => {
          event.stopPropagation();
          void handleClick(star, compact);
        }}
        onMouseEnter={() => setHovered(star)}
        onMouseLeave={() => setHovered(null)}
        aria-label={starLabel}
      >
        {starChar}
      </button>
    );
  });

  if (compact && !readOnly) {
    return (
      <span
        className={[
          "star-rating-pill",
          isExpanded ? "star-rating-pill-expanded" : "",
          "star-rating",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label={`Rating: ${rating ?? "none"} out of 5`}
      >
        {!isExpanded && (
          <button
            type="button"
            className="star-rating-pill-summary"
            aria-label={`Open rating editor. Current rating ${rating ?? 0} out of 5`}
            onClick={(event) => {
              event.stopPropagation();
              setIsExpanded(true);
            }}
          >
            <span className="star-rating-pill-icon" aria-hidden="true">
              ★
            </span>
            <span className="star-rating-pill-value">{rating ?? 0}</span>
          </button>
        )}
        {isExpanded && (
          <button
            type="button"
            className="star-rating-pill-close-area"
            aria-label="Close rating editor"
            onClick={(event) => {
              event.stopPropagation();
              setHovered(null);
              setIsExpanded(false);
            }}
          />
        )}
        <span className="star-rating-pill-editor" aria-hidden={!isExpanded}>
          {stars}
        </span>
      </span>
    );
  }

  return (
    <span className="star-rating" aria-label={`Rating: ${rating ?? "none"} out of 5`}>
      {stars}
    </span>
  );
};
