import fs from 'fs';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), '.settings.json');

const DEFAULT_SETTINGS = {
  legiscanApiKey: '',
  congressApiKey: '',
  pollInterval: 60,
  trackedJurisdictions: ['U.S. Congress', 'Nebraska'],
};

export function getSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch {
    // fall through to defaults
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(updates) {
  const current = getSettings();
  const merged = { ...current, ...updates };
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(merged, null, 2), 'utf-8');
  return merged;
}

/**
 * Returns settings with API keys masked for safe client display.
 */
export function getMaskedSettings() {
  const settings = getSettings();
  return {
    ...settings,
    legiscanApiKey: maskKey(settings.legiscanApiKey),
    congressApiKey: maskKey(settings.congressApiKey),
    hasLegiscanKey: settings.legiscanApiKey.length > 0,
    hasCongressKey: settings.congressApiKey.length > 0,
  };
}

function maskKey(key) {
  if (!key || key.length < 8) return key ? '••••••••' : '';
  return key.slice(0, 4) + '••••••••' + key.slice(-4);
}
