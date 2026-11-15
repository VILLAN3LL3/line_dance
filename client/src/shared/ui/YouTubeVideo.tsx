import React from "react";

interface YouTubeVideoProps {
  src: string;
  title: string;
}

export const YouTubeVideo: React.FC<YouTubeVideoProps> = ({ src, title }) => (
  <div className="video-embed-wrapper">
    <iframe
      width="560"
      height="315"
      src={src}
      title={title}
      referrerPolicy="strict-origin-when-cross-origin"
      allow="autoplay; encrypted-media"
      allowFullScreen
    />
  </div>
);
