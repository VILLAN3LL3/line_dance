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
  if (!rawUrl || !rawUrl.trim()) {
    return null;
  }

  // Accept copied iframe snippets from YouTube's share dialog.
  const iframeSrcMatch = rawUrl.match(/src\s*=\s*"([^"]+)"/i);
  const candidate = iframeSrcMatch?.[1] ?? rawUrl;

  // Decode common HTML entities so query params like &amp;list= are parsed correctly.
  const normalized = candidate
    .trim()
    .replace(/&amp;/gi, "&")
    .replace(/&#38;/g, "&")
    .replace(/&quot;/gi, '"');

  try {
    return new URL(normalized);
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
    const shortId = url.pathname.split("/").filter(Boolean)[0];
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