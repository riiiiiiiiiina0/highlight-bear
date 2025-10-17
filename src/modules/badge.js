/**
 * Badge Module for Highlighter Bear
 * Handles action button badge updates
 */

let temporaryBadgeTimeout = null;

/**
 * Set a temporary badge that will revert after a delay
 */
export const setTemporaryBadge = (
  text,
  durationMs = 3000,
  color = '#4285f4',
) => {
  // Clear any existing timeout
  if (temporaryBadgeTimeout) {
    clearTimeout(temporaryBadgeTimeout);
    temporaryBadgeTimeout = null;
  }

  // Set the temporary badge
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });

  // Schedule revert to normal badge (clear)
  temporaryBadgeTimeout = setTimeout(() => {
    temporaryBadgeTimeout = null;
    chrome.action.setBadgeText({ text: '' });
  }, durationMs);
};

/**
 * Show backup in progress badge
 */
export const showBackupInProgressBadge = () => {
  // Clear any existing timeout
  if (temporaryBadgeTimeout) {
    clearTimeout(temporaryBadgeTimeout);
    temporaryBadgeTimeout = null;
  }

  chrome.action.setBadgeText({ text: '⟳' });
  chrome.action.setBadgeBackgroundColor({ color: '#FFA500' }); // Orange
};

/**
 * Show backup success badge (clears after 3 seconds)
 */
export const showBackupSuccessBadge = () => {
  setTemporaryBadge('✓', 3000, '#00AA00'); // Green
};

/**
 * Show backup failure badge (clears after 5 seconds)
 */
export const showBackupFailureBadge = () => {
  setTemporaryBadge('✗', 5000, '#FF0000'); // Red
};

