import "../../styles/FlipCard.css";

import React, { useState } from "react";

interface FlipCardProps {
  front: React.ReactNode;
  back: React.ReactNode;
  /** Names the card in the toggle button, e.g. the dance name. */
  label: string;
}

/** Shows two faces like a playing card; only the visible face is reachable by keyboard and screen readers. */
export const FlipCard: React.FC<FlipCardProps> = ({ front, back, label }) => {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className={`flip-card${flipped ? " flipped" : ""}`}>
      <div className="flip-card-inner">
        <div className="flip-card-face flip-card-front" aria-hidden={flipped} inert={flipped}>
          {front}
        </div>
        <div className="flip-card-face flip-card-back" aria-hidden={!flipped} inert={!flipped}>
          {back}
        </div>
      </div>
      <button
        type="button"
        className="btn-secondary btn-small flip-card-toggle"
        aria-label={flipped ? `Show front of ${label}` : `Show back of ${label}`}
        aria-pressed={flipped}
        onClick={() => setFlipped((current) => !current)}
      >
        🔄 {flipped ? "Show dance" : "Flip card"}
      </button>
    </div>
  );
};
