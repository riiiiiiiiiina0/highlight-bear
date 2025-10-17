import { initOAuthListener } from './modules/oauth.js';
import {
  backupRulesToRaindrop,
  restoreRulesFromRaindrop,
} from './modules/raindropBackup.js';
import { scheduleAutoBackup } from './modules/autoBackup.js';

// ============================================================================
// Initialization
// ============================================================================

// Initialize OAuth listener
initOAuthListener();

// Auto restore on startup
executeAutoRestore('startup');

// Setup periodic auto restore (every 5 minutes)
const AUTO_RESTORE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
setInterval(() => {
  executeAutoRestore('periodic');
}, AUTO_RESTORE_INTERVAL_MS);

// ============================================================================
// Action Button Click Handler
// ============================================================================

chrome.action.onClicked.addListener(async (tab) => {
  const optionsUrl = chrome.runtime.getURL('src/options/options.html');
  const tabUrl = tab.url;

  if (
    tabUrl &&
    (tabUrl.startsWith('http://') || tabUrl.startsWith('https://'))
  ) {
    const newRuleData = {
      url: tabUrl,
      title: tab.title || '',
    };

    // Save the data to local storage and then open the options page
    await chrome.storage.local.set({ newRuleData });
    chrome.tabs.create({ url: optionsUrl });
  } else {
    // If it's not a standard webpage, just open the options page
    // without sending any data.
    chrome.tabs.create({ url: optionsUrl });
  }
});

// ============================================================================
// Message Handlers
// ============================================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Manual backup
  if (message.action === 'backup_to_raindrop') {
    (async () => {
      try {
        const result = await backupRulesToRaindrop();
        sendResponse(result);
      } catch (error) {
        sendResponse({
          success: false,
          message: `Backup failed: ${error.message}`,
        });
      }
    })();
    return true; // Keep channel open for async response
  }

  // Manual restore
  if (message.action === 'restore_from_raindrop') {
    (async () => {
      try {
        const result = await restoreRulesFromRaindrop();
        sendResponse(result);
      } catch (error) {
        sendResponse({
          success: false,
          message: `Restore failed: ${error.message}`,
        });
      }
    })();
    return true;
  }

  // Schedule auto backup
  if (message.action === 'schedule_auto_backup') {
    scheduleAutoBackup(message.reason || 'manual');
    sendResponse({ success: true });
    return true;
  }
});

// ============================================================================
// Storage Change Listener for Auto Backup
// ============================================================================

chrome.storage.onChanged.addListener((changes, areaName) => {
  // Trigger auto backup when rules change
  if (areaName === 'sync' && changes.highlighterRules) {
    console.log('[Background] Rules changed, scheduling auto backup');
    scheduleAutoBackup('rules_changed');
  }

  // Auto restore when OAuth token is added (user just logged in)
  if (areaName === 'sync' && changes.oauthAccessToken) {
    const { oldValue, newValue } = changes.oauthAccessToken;

    // If token was just added (not updated)
    if (!oldValue && newValue) {
      console.log('[Background] OAuth login detected, triggering auto restore');
      executeAutoRestore('oauth_login', { notifyOnSuccess: true });
    }
  }
});

// ============================================================================
// Auto Restore Function
// ============================================================================

let isRestoreInProgress = false;

async function executeAutoRestore(source, options = {}) {
  const { notifyOnSuccess = false, notifyOnFailure = false } = options;

  // Prevent concurrent restores
  if (isRestoreInProgress) {
    console.log('[Auto Restore] Already in progress, skipping');
    return null;
  }

  isRestoreInProgress = true;

  try {
    console.log(`[Auto Restore] Starting from source: ${source}`);

    const result = await restoreRulesFromRaindrop();

    if (result.success) {
      console.log('[Auto Restore] Success:', result.message);

      if (notifyOnSuccess) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: chrome.runtime.getURL('icons/icon-128x128.png'),
          title: 'Auto Restore Successful',
          message: result.message,
        });
      }
    } else {
      console.log('[Auto Restore] Failed:', result.message);

      if (notifyOnFailure) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: chrome.runtime.getURL('icons/icon-128x128.png'),
          title: 'Auto Restore Failed',
          message: result.message,
        });
      }
    }

    return result;
  } catch (error) {
    console.error('[Auto Restore] Error:', error);
    return {
      success: false,
      message: `Auto restore failed: ${error.message}`,
    };
  } finally {
    isRestoreInProgress = false;
  }
}

// ============================================================================
// Extension Lifecycle Events
// ============================================================================

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install' || details.reason === 'update') {
    console.log(
      '[Background] Extension installed/updated, triggering auto restore',
    );
    executeAutoRestore(`onInstalled:${details.reason}`);
  }
});

chrome.runtime.onStartup.addListener(() => {
  console.log('[Background] Browser started, triggering auto restore');
  executeAutoRestore('onStartup');
});
