const BARE_DOMAIN_RE = /^[a-z0-9.-]+\.[a-z]{2,}$/i;

function normalizeUserUrl(input) {
  const raw = String(input || '').trim();
  if (!raw) {
    return 'https://duckduckgo.com';
  }

  try {
    const url = new URL(raw);
    return url.toString();
  } catch (err) {
    // Not a valid absolute URL. Continue.
  }

  if (BARE_DOMAIN_RE.test(raw)) {
    return `https://${raw}`;
  }

  const query = encodeURIComponent(raw);
  return `https://duckduckgo.com/?q=${query}`;
}

module.exports = {
  normalizeUserUrl,
};
