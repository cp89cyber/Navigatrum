const fs = require('node:fs/promises');
const path = require('node:path');

function defaultState() {
  return {
    currentVersion: null,
    currentPath: null,
    lastCheckAt: null,
    latestStable: null,
    latestPrerelease: null,
    lastReleaseIds: {
      stable: null,
      prerelease: null,
    },
  };
}

async function readState(stateFile) {
  try {
    const raw = await fs.readFile(stateFile, 'utf8');
    return { ...defaultState(), ...JSON.parse(raw) };
  } catch (error) {
    return defaultState();
  }
}

async function writeState(stateFile, next) {
  await fs.mkdir(path.dirname(stateFile), { recursive: true });
  const payload = { ...defaultState(), ...next };
  await fs.writeFile(stateFile, JSON.stringify(payload, null, 2));
  return payload;
}

module.exports = {
  defaultState,
  readState,
  writeState,
};
