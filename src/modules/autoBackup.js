/**
 * Auto Backup Module for Highlighter Bear
 * Handles automatic backup scheduling with debouncing
 */

import { backupRulesToRaindrop } from './raindropBackup.js';
import {
  showBackupInProgressBadge,
  showBackupSuccessBadge,
  showBackupFailureBadge,
} from './badge.js';

// Configuration
const BACKUP_DEBOUNCE_MS = 5000; // 5 seconds

// State
let backupTimeoutId = null;
let isBackupRunning = false;
let backupAbortController = null;

/**
 * Check if auto backup is enabled
 */
async function isAutoBackupEnabled() {
  const data = await chrome.storage.sync.get({ autoBackupEnabled: false });
  return data.autoBackupEnabled;
}

/**
 * Schedule an auto backup with debouncing
 */
export async function scheduleAutoBackup(reason = 'unknown') {
  // Check if auto backup is enabled
  const enabled = await isAutoBackupEnabled();
  if (!enabled) {
    console.log('[Auto Backup] Disabled, skipping backup');
    return;
  }

  console.log(`[Auto Backup] Backup scheduled (reason: ${reason})`);

  // Cancel any pending backup
  if (backupTimeoutId !== null) {
    clearTimeout(backupTimeoutId);
    backupTimeoutId = null;
  }

  // Cancel any ongoing backup
  if (backupAbortController) {
    backupAbortController.abort();
    backupAbortController = null;
  }

  // Schedule new backup after debounce period
  backupTimeoutId = setTimeout(async () => {
    backupTimeoutId = null;
    await executeBackup();
  }, BACKUP_DEBOUNCE_MS);
}

/**
 * Execute the backup
 */
async function executeBackup() {
  // Cancel any ongoing backup
  if (isBackupRunning) {
    cancelOngoingBackup();
  }

  try {
    isBackupRunning = true;
    backupAbortController = new AbortController();

    console.log('[Auto Backup] Executing backup...');

    // Show in-progress indicator
    showBackupInProgressBadge();

    const result = await backupRulesToRaindrop();

    // Only update UI if backup wasn't cancelled
    if (!backupAbortController.signal.aborted) {
      if (result.success) {
        console.log('[Auto Backup] Success:', result.message);
        showBackupSuccessBadge();
      } else {
        console.error('[Auto Backup] Failed:', result.message);
        showBackupFailureBadge();

        // Optionally notify user of failure
        chrome.notifications.create({
          type: 'basic',
          iconUrl: chrome.runtime.getURL('icons/icon-128x128.png'),
          title: 'Auto Backup Failed',
          message: result.message,
        });
      }
    }
  } catch (error) {
    if (!backupAbortController?.signal.aborted) {
      console.error('[Auto Backup] Error:', error);
      showBackupFailureBadge();
    }
  } finally {
    isBackupRunning = false;
    backupAbortController = null;
  }
}

/**
 * Cancel ongoing backup
 */
function cancelOngoingBackup() {
  if (backupAbortController) {
    console.log('[Auto Backup] Cancelling ongoing backup...');
    backupAbortController.abort();
    backupAbortController = null;
  }
}

/**
 * Cancel scheduled backup
 */
export function cancelScheduledBackup() {
  if (backupTimeoutId !== null) {
    console.log('[Auto Backup] Cancelling scheduled backup...');
    clearTimeout(backupTimeoutId);
    backupTimeoutId = null;
  }
  cancelOngoingBackup();
}
