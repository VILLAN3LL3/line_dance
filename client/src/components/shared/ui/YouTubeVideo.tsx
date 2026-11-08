import React from "react";

interface YouTubeVideoProps {
  src: string;
  title: string;
}

export const YouTubeVideo: React.FC<YouTubeVideoProps> = ({ src, title }) => (
  <div className="video-embed-wrapper">
    <iframe
      src={src}
      title={title}
      loading="lazy"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
      referrerPolicy="no-referrer"
      allowFullScreen
      sandbox="allow-same-origin allow-scripts allow-popups allow-presentation"
    />
  </div>
);
