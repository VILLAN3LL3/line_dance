// Basic SSRF guard — reject URLs pointing to private / loopback address space.
const PRIVATE_HOSTNAME_PATTERN =
  /^(localhost|.*\.local|.*\.internal)$|^127\.|^10\.|^172\.(1[6-9]|2\d|3[01])\.|^192\.168\./;

function isAllowedUrl(raw) {
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false;
  }

  if (PRIVATE_HOSTNAME_PATTERN.test(parsed.hostname)) {
    return false;
  }

  return true;
}

const REQUEST_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; LineDanceBot/1.0)',
};

const YOUTUBE_HOSTNAMES = new Set(['www.youtube.com', 'youtube.com', 'youtu.be', 'm.youtube.com']);

function isYouTubeUrl(parsed) {
  return YOUTUBE_HOSTNAMES.has(parsed.hostname);
}

async function probeUrl(url, signal) {
  const parsed = new URL(url);

  // YouTube returns 200 for every watch URL — even for non-existent videos.
  // The oEmbed endpoint correctly returns 404 for invalid video IDs.
  if (isYouTubeUrl(parsed)) {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    return fetch(oembedUrl, {
      method: 'GET',
      headers: REQUEST_HEADERS,
      signal,
      redirect: 'follow',
    });
  }
  const headResponse = await fetch(url, {
    method: 'HEAD',
    headers: REQUEST_HEADERS,
    signal,
    redirect: 'follow',
  });

  // Some servers (e.g. copperknob.co.uk) reject HEAD with 405/501.
  // Fall back to a GET in that case.
  if (headResponse.status === 405 || headResponse.status === 501) {
    return fetch(url, {
      method: 'GET',
      headers: REQUEST_HEADERS,
      signal,
      redirect: 'follow',
    });
  }

  return headResponse;
}

export async function checkUrl(req, res) {
  const raw = req.query.url;

  if (typeof raw !== 'string' || !raw.trim()) {
    return res.status(400).json({ error: 'Missing url query parameter' });
  }

  if (!isAllowedUrl(raw)) {
    return res.status(400).json({ error: 'URL not allowed' });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    let response;
    try {
      response = await probeUrl(raw, controller.signal);
    } finally {
      clearTimeout(timeout);
    }

    return res.json({ ok: response.ok, status: response.status });
  } catch {
    return res.json({ ok: false, status: null });
  }
}
