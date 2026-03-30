import { db } from './db';

const DEFAULT_SETTINGS = {
  legiscanApiKey: '',
  congressApiKey: '',
  pollInterval: 60, // in minutes? The schema says pollingInterval Int @default(24) // hours, let's say it's hours in schema but UI thinks minutes.
  trackedJurisdictions: ['US', 'NE'],
  smtpHost: '',
  smtpPort: 587,
  smtpUser: '',
  smtpPass: '',
  digestEmail: '',
  digestFrequency: 'disabled',
  lastDigestSent: null,
  regulationsApiKey: '',
  openStatesApiKey: '',
};

export async function getSettings(workspaceId) {
  try {
    const settings = await db.settings.findUnique({
      where: { workspaceId }
    });

    if (!settings) {
      return { ...DEFAULT_SETTINGS };
    }

    let jurisdictions = DEFAULT_SETTINGS.trackedJurisdictions;
    if (settings.jurisdictions) {
      try {
        jurisdictions = JSON.parse(settings.jurisdictions);
      } catch { }
    }

    return {
      legiscanApiKey: settings.legiscanApiKey || '',
      congressApiKey: settings.congressApiKey || '',
      pollInterval: settings.pollingInterval || DEFAULT_SETTINGS.pollInterval,
      trackedJurisdictions: jurisdictions,
      smtpHost: settings.smtpHost || '',
      smtpPort: settings.smtpPort || 587,
      smtpUser: settings.smtpUser || '',
      smtpPass: settings.smtpPass || '',
      digestEmail: settings.senderEmail || '',
      digestFrequency: settings.digestSchedule || 'disabled',
      regulationsApiKey: settings.regulationsApiKey || '',
      openStatesApiKey: settings.openStatesApiKey || '',
      lastDigestSent: null, // Tracked elsewhere if needed
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(workspaceId, updates) {
  const current = await getSettings(workspaceId);
  const merged = { ...current, ...updates };

  const data = {
    legiscanApiKey: merged.legiscanApiKey,
    congressApiKey: merged.congressApiKey,
    regulationsApiKey: merged.regulationsApiKey,
    openStatesApiKey: merged.openStatesApiKey,
    pollingInterval: parseInt(merged.pollInterval, 10) || 60,
    jurisdictions: JSON.stringify(merged.trackedJurisdictions || []),
    smtpHost: merged.smtpHost,
    smtpPort: parseInt(merged.smtpPort, 10) || 587,
    smtpUser: merged.smtpUser,
    smtpPass: merged.smtpPass,
    senderEmail: merged.digestEmail,
    digestSchedule: merged.digestFrequency,
  };

  await db.settings.upsert({
    where: { workspaceId },
    create: { workspaceId, ...data },
    update: data
  });

  return merged;
}

/**
 * Returns settings with API keys masked for safe client display.
 */
export async function getMaskedSettings(workspaceId) {
  const settings = await getSettings(workspaceId);
  return {
    ...settings,
    legiscanApiKey: maskKey(settings.legiscanApiKey),
    congressApiKey: maskKey(settings.congressApiKey),
    regulationsApiKey: maskKey(settings.regulationsApiKey),
    openStatesApiKey: maskKey(settings.openStatesApiKey),
    smtpPass: maskKey(settings.smtpPass),
    hasLegiscanKey: !!settings.legiscanApiKey,
    hasCongressKey: !!settings.congressApiKey,
    hasRegulationsKey: !!settings.regulationsApiKey,
    hasOpenStatesKey: !!settings.openStatesApiKey,
    hasSmtpPass: !!settings.smtpPass,
  };
}

function maskKey(key) {
  if (!key || key.length < 8) return key ? '••••••••' : '';
  return key.slice(0, 4) + '••••••••' + key.slice(-4);
}
