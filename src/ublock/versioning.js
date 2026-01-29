const VERSION_RE = /^v?\s*([0-9]+(?:\.[0-9]+)*)([a-z].*)?$/i;

function normalizeVersion(input) {
  return String(input || '').trim().replace(/^v/i, '').trim();
}

function splitVersion(input) {
  const normalized = normalizeVersion(input);
  const match = VERSION_RE.exec(normalized);
  if (!match) {
    return { numbers: [], suffix: normalized };
  }
  const numbers = match[1].split('.').map((part) => Number(part));
  const suffix = match[2] ? match[2].toLowerCase() : '';
  return { numbers, suffix };
}

function compareVersions(a, b) {
  const left = splitVersion(a);
  const right = splitVersion(b);
  const max = Math.max(left.numbers.length, right.numbers.length);
  for (let i = 0; i < max; i += 1) {
    const diff = (left.numbers[i] || 0) - (right.numbers[i] || 0);
    if (diff !== 0) return diff;
  }
  if (left.suffix === right.suffix) return 0;
  if (!left.suffix) return 1;
  if (!right.suffix) return -1;
  return left.suffix.localeCompare(right.suffix);
}

module.exports = {
  compareVersions,
  normalizeVersion,
};
