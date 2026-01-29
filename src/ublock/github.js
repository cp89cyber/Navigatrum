const { compareVersions, normalizeVersion } = require('./versioning');

const ASSET_RE = /^uBlock0_.+\.chromium\.zip$/i;

function pickLatestReleases(releases = []) {
  let latestStable = null;
  let latestPrerelease = null;

  for (const release of releases) {
    const version = normalizeVersion(release.tag_name);
    const asset = (release.assets || []).find((item) => ASSET_RE.test(item.name));
    if (!asset) continue;

    const entry = {
      version,
      assetUrl: asset.browser_download_url,
      id: release.id ?? null,
    };

    if (release.prerelease) {
      if (!latestPrerelease || compareVersions(entry.version, latestPrerelease.version) > 0) {
        latestPrerelease = entry;
      }
    } else {
      if (!latestStable || compareVersions(entry.version, latestStable.version) > 0) {
        latestStable = entry;
      }
    }
  }

  return { latestStable, latestPrerelease };
}

module.exports = {
  pickLatestReleases,
};
