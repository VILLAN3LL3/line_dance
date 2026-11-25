import "../../styles/FlipCard.css";

import React, { useState } from "react";

import { hasTextSelection } from "../browser/selection";

interface FlipCardProps {
  front: React.ReactNode;
  back: React.ReactNode;
  /** Names the card in the keyboard control, e.g. the dance name. */
  label: string;
}

type Edge = "left" | "right" | null;

/** How far the card tilts when the pointer rests on one of its side edges. */
const PEEK_DEGREES = 14;

/** Clicks on these (and anything that stops the click) keep their own meaning and do not flip. */
const OWN_CLICK_SELECTOR =
  "a, button, input, select, textarea, label, summary, iframe, [role='button'], [contenteditable='true']";

const peekAngle = (edge: Edge): number => {
  if (edge === "left") return PEEK_DEGREES;
  return edge === "right" ? -PEEK_DEGREES : 0;
};

/**
 * Shows two faces like a playing card. Resting the pointer on the left or right edge tilts the card
 * a little towards that side; a click on the card turns it completely, in the direction of the
 * tilt. The visible keyboard control stays reachable for assistive technology, and only the
 * visible face is reachable by keyboard and screen readers.
 */
export const FlipCard: React.FC<FlipCardProps> = ({ front, back, label }) => {
  const [angle, setAngle] = useState(0);
  const [edge, setEdge] = useState<Edge>(null);
  const flipped = Math.abs(Math.round(angle / 180)) % 2 === 1;

  const flip = () => setAngle((current) => current + (edge === "right" ? -180 : 180));

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.defaultPrevented) return;
    if ((event.target as Element).closest(OWN_CLICK_SELECTOR)) return;
    if (hasTextSelection()) return;
    flip();
  };

  const edgeProps = (side: "left" | "right") => ({
    "aria-hidden": true,
    className: `flip-card-edge flip-card-edge-${side}`,
    onMouseEnter: () => setEdge(side),
    onMouseLeave: () => setEdge(null),
  });

  return (
    // The keyboard equivalent of the click is the button below.
    <div className="flip-card" data-flipped={flipped} onClick={handleClick}>
      <div
        className="flip-card-inner"
        style={{ transform: `rotateY(${angle + peekAngle(edge)}deg)` }}
      >
        <div className="flip-card-face flip-card-front" aria-hidden={flipped} inert={flipped}>
          {front}
        </div>
        <div className="flip-card-face flip-card-back" aria-hidden={!flipped} inert={!flipped}>
          {back}
        </div>
      </div>
      <div {...edgeProps("left")} />
      <div {...edgeProps("right")} />
      <button
        type="button"
        className="sr-only flip-card-toggle"
        aria-label={flipped ? `Show front of ${label}` : `Show back of ${label}`}
        aria-pressed={flipped}
        onClick={flip}
      >
        {flipped ? "Show dance" : "Flip card"}
      </button>
    </div>
  );
};
