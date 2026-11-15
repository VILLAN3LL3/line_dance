const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "www.music.youtube.com",
  "youtu.be",
  "www.youtu.be",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

function parseUrl(rawUrl?: string): URL | null {
  if (!rawUrl?.trim()) {
    return null;
  }

  // Accept copied iframe snippets from YouTube's share dialog.
  const iframeSrcMatch = new RegExp(/src\s*=\s*"([^"]+)"/i).exec(rawUrl);
  const candidate = iframeSrcMatch?.[1] ?? rawUrl;

  // Only decode &amp; since that's the common issue with YouTube's share dialog.
  // Avoid decoding other entities to prevent encoding bypass attacks.
  const normalized = candidate.trim().replace(/&amp;/gi, "&");

  try {
    const url = new URL(normalized);
    // Validate that the parsed URL is actually a YouTube URL
    if (!isYouTubeHost(url.hostname)) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

function isYouTubeHost(hostname: string): boolean {
  return YOUTUBE_HOSTS.has(hostname.toLowerCase());
}

function getVideoId(url: URL): string | null {
  const host = url.hostname.toLowerCase();

  if (host === "youtu.be" || host === "www.youtu.be") {
    const shortId = url.pathname.split("/").find(Boolean);
    return shortId || null;
  }

  if (!isYouTubeHost(host)) {
    return null;
  }

  const watchId = url.searchParams.get("v");
  if (watchId) {
    return watchId;
  }

  const pathParts = url.pathname.split("/").filter(Boolean);
  if (pathParts[0] === "embed" && pathParts[1]) {
    return pathParts[1];
  }
  if (pathParts[0] === "shorts" && pathParts[1]) {
    return pathParts[1];
  }

  return null;
}

export function getYouTubeVideoEmbedUrl(rawUrl?: string): string | null {
  const url = parseUrl(rawUrl);
  if (!url || !isYouTubeHost(url.hostname)) {
    return null;
  }

  const videoId = getVideoId(url);
  if (!videoId) {
    return null;
  }

  return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}`;
}

export function getYouTubePlaylistPageUrl(rawUrl?: string): string | null {
  const url = parseUrl(rawUrl);
  if (!url || !isYouTubeHost(url.hostname)) {
    return null;
  }

  const playlistId = url.searchParams.get("list");
  if (!playlistId) {
    return null;
  }

  return `https://www.youtube.com/playlist?list=${encodeURIComponent(playlistId)}`;
}
