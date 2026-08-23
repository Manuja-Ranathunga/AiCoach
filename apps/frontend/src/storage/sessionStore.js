// The ONLY file that talks to storage/db.js. Everything else (CameraView,
// HistoryScreen, ProgressScreen, SettingsScreen, useSpeechFeedback) goes
// through the functions here instead. That keeps db.js free to change
// its schema/backend without anything else in the app noticing, and
// keeps the "what if storage fails" handling in exactly one place: every
// function below catches its own errors and returns a safe fallback
// (null / [] / false) rather than throwing, so a broken or unavailable
// IndexedDB (private browsing, quota exceeded, etc.) degrades the app
// instead of crashing it. Callers that care can check getStorageStatus()
// after a failed call to show a one-time warning.

import {
  STORES,
  dbGet,
  dbGetAll,
  dbGetAllByIndexRange,
  dbPut,
  dbDelete,
  dbClear,
  estimateStorageUsage,
} from './db';
import { computeAggregateStats } from '../core/progressAnalytics';

const SETTINGS_ID = 'voiceSettings';

let storageAvailable = true;
let lastError = null;

function markUnavailable(error) {
  storageAvailable = false;
  lastError = error;
}

export function getStorageStatus() {
  return { available: storageAvailable, error: lastError?.message ?? null };
}

export async function saveSession(session) {
  try {
    await dbPut(STORES.SESSIONS, session);
    return true;
  } catch (error) {
    markUnavailable(error);
    return false;
  }
}

export async function getSession(id) {
  try {
    return (await dbGet(STORES.SESSIONS, id)) ?? null;
  } catch (error) {
    markUnavailable(error);
    return null;
  }
}

export async function getAllSessions() {
  try {
    const all = await dbGetAll(STORES.SESSIONS);
    return all.sort((a, b) => b.startedAt - a.startedAt);
  } catch (error) {
    markUnavailable(error);
    return [];
  }
}

export async function getRecentSessions(limit = 20) {
  return (await getAllSessions()).slice(0, limit);
}

export async function getSessionsInRange(startDate, endDate) {
  try {
    const range = IDBKeyRange.bound(+startDate, +endDate);
    const rows = await dbGetAllByIndexRange(STORES.SESSIONS, 'startedAt', range);
    return rows.sort((a, b) => b.startedAt - a.startedAt);
  } catch (error) {
    markUnavailable(error);
    return [];
  }
}

// Most recent session started today that was never explicitly finished
// (see CameraView's handleDone) — a refresh or crash mid-workout leaves
// exactly this behind.
export async function getUnfinishedSessionToday() {
  const sessions = await getAllSessions();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return sessions.find((session) => session.active && session.startedAt >= startOfToday.getTime()) ?? null;
}

export async function deleteSession(id) {
  try {
    await dbDelete(STORES.SESSIONS, id);
    return true;
  } catch (error) {
    markUnavailable(error);
    return false;
  }
}

export async function getAggregateStats() {
  return computeAggregateStats(await getAllSessions());
}

export async function saveSettings(settings) {
  try {
    await dbPut(STORES.SETTINGS, { id: SETTINGS_ID, ...settings });
    return true;
  } catch (error) {
    markUnavailable(error);
    return false;
  }
}

export async function loadSettings() {
  try {
    const row = await dbGet(STORES.SETTINGS, SETTINGS_ID);
    if (!row) return null;
    const settings = { ...row };
    delete settings.id;
    return settings;
  } catch (error) {
    markUnavailable(error);
    return null;
  }
}

// Triggers a JSON file download of everything in storage. Lives here
// (not db.js) because it's a browser-download concern layered on top of
// the raw data, not part of the storage schema itself.
export async function exportAllData() {
  try {
    const [sessions, settingsRow] = await Promise.all([dbGetAll(STORES.SESSIONS), dbGet(STORES.SETTINGS, SETTINGS_ID)]);

    const payload = {
      schemaVersion: 1,
      exportedAt: Date.now(),
      sessions,
      settings: settingsRow ?? null,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `aicoach-export-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    markUnavailable(error);
    return false;
  }
}

// Restores sessions/settings from a previously exported JSON file.
// Validation failures (bad JSON, wrong shape) are reported distinctly
// from storage failures — a malformed file doesn't mean IndexedDB itself
// is broken, so it shouldn't trip the same "storage unavailable" warning.
export async function importData(json) {
  let data;
  try {
    data = typeof json === 'string' ? JSON.parse(json) : json;
  } catch {
    return { success: false, error: 'That file is not valid JSON.' };
  }

  if (!data || !Array.isArray(data.sessions)) {
    return { success: false, error: 'That file does not look like an AI Coach export.' };
  }

  try {
    for (const session of data.sessions) {
      await dbPut(STORES.SESSIONS, session);
    }
    if (data.settings) await dbPut(STORES.SETTINGS, data.settings);
    return { success: true, sessionsImported: data.sessions.length };
  } catch (error) {
    markUnavailable(error);
    return { success: false, error: 'Could not write the imported data to storage.' };
  }
}

export async function clearAllData() {
  try {
    await Promise.all([dbClear(STORES.SESSIONS), dbClear(STORES.SETTINGS)]);
    return true;
  } catch (error) {
    markUnavailable(error);
    return false;
  }
}

export async function getStorageEstimate() {
  try {
    return await estimateStorageUsage();
  } catch {
    return null;
  }
}
